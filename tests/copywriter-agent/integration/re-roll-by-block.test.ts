// Wave 3 RED — T2.7 Re-roll por bloco (deferred de Wave 2)
// Testes FALHAM (RED) até Wave 4 implementar retry de bloco individual.
//
// Por que falha: quando LLM retorna landing com seção faltando, o use case
// lança erro imediatamente (Landing.create falha). Wave 4 deve capturar
// SchemaValidationError de bloco e retentar APENAS o bloco faltante (max 2x).

import { beforeEach, describe, expect, it } from 'vitest';
import { GenerateCopywriterOutputUseCase } from '../../../src/application/copywriter-agent/GenerateCopywriterOutputUseCase.js';
import { FakeObservability, ProgrammableLLM } from '../unit/fakes.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TOM = 'brand_voice_ceo';

const promptMaps = () => ({
  systemPromptByTom: new Map([[TOM, 'PROMPT_TOM']]),
  systemPromptByFramework: new Map([['pas', 'PROMPT_PAS']]),
  systemPromptByOutputType: new Map([['landing', 'PROMPT_OUTPUT_LANDING']])
});

const BASE_INPUT = {
  tenantId: 'acme',
  outputType: 'landing',
  framework: 'pas',
  tomSlug: TOM,
  product: 'Acme Forge',
  audience: 'Founders B2B',
  goal: 'Inscrição',
  context: 'Lançamento de curso intensivo de 14 dias com 7 agentes IA para marketing.',
  isUpsell: false,
  mode: 'shadow' as const
};

// Landing com todas as 6 seções obrigatórias.
const FULL_LANDING_JSON = `\`\`\`json
{
  "landing": {
    "hero": { "headline": "Headline", "subheadline": "Sub", "cta": "Quero" },
    "sections": [
      { "kind": "problem", "body": "Problema." },
      { "kind": "agitation", "body": "Custo." },
      { "kind": "solution", "body": "Solução." },
      { "kind": "social_proof", "body": "Cases.", "bullets": ["A", "B", "C"] },
      { "kind": "objections", "body": "Objeções.", "bullets": ["x", "y"] },
      { "kind": "final_cta", "body": "Comece." }
    ],
    "ctas": [],
    "word_count": 1750
  }
}
\`\`\``;

// Landing SEM final_cta — simula LLM que trunca / esquece o último bloco.
const LANDING_MISSING_FINAL_CTA_JSON = `\`\`\`json
{
  "landing": {
    "hero": { "headline": "Headline", "subheadline": "Sub", "cta": "Quero" },
    "sections": [
      { "kind": "problem", "body": "Problema." },
      { "kind": "agitation", "body": "Custo." },
      { "kind": "solution", "body": "Solução." },
      { "kind": "social_proof", "body": "Cases.", "bullets": ["A", "B", "C"] },
      { "kind": "objections", "body": "Objeções.", "bullets": ["x", "y"] }
    ],
    "ctas": [],
    "word_count": 1750
  }
}
\`\`\``;

// Landing SEM social_proof (apenas 2 bullets) — simula schema incompleto.
const LANDING_INSUFFICIENT_SOCIAL_PROOF = `\`\`\`json
{
  "landing": {
    "hero": { "headline": "Headline", "subheadline": "Sub", "cta": "Quero" },
    "sections": [
      { "kind": "problem", "body": "Problema." },
      { "kind": "agitation", "body": "Custo." },
      { "kind": "solution", "body": "Solução." },
      { "kind": "social_proof", "body": "Cases.", "bullets": ["Só um"] },
      { "kind": "objections", "body": "Objeções.", "bullets": ["x", "y"] },
      { "kind": "final_cta", "body": "Comece." }
    ],
    "ctas": [],
    "word_count": 1750
  }
}
\`\`\``;

// ─── Testes RED (T2.7) ───────────────────────────────────────────────────────

describe('Wave 3 RED — T2.7 Re-roll por bloco', () => {
  let obs: FakeObservability;

  beforeEach(() => {
    obs = new FakeObservability();
  });

  it('RED: landing com final_cta faltando → use case retenta e retorna completed (2 chamadas ao LLM)', async () => {
    // 1ª chamada: landing sem final_cta
    // 2ª chamada: landing completa (re-roll bem-sucedido)
    //
    // COMPORTAMENTO ATUAL: lança "Landing faltando seções obrigatórias: final_cta"
    // COMPORTAMENTO ALVO (Wave 4): retenta e retorna completed

    const llm = new ProgrammableLLM([
      { kind: 'success', output: { text: LANDING_MISSING_FINAL_CTA_JSON } },
      { kind: 'success', output: { text: FULL_LANDING_JSON } }
    ]);

    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      ...promptMaps()
    });

    const out = await useCase.execute(BASE_INPUT);

    // RED: atualmente lança erro → este expect nunca é alcançado
    expect(out.status).toBe('completed');
    expect(out.outcomeAlcancado()).toBe(true);
    expect(llm.calls).toHaveLength(2); // 1 original + 1 re-roll
  });

  it('RED: social_proof com bullets insuficientes → use case retenta o bloco faltante', async () => {
    const llm = new ProgrammableLLM([
      { kind: 'success', output: { text: LANDING_INSUFFICIENT_SOCIAL_PROOF } },
      { kind: 'success', output: { text: FULL_LANDING_JSON } }
    ]);

    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      ...promptMaps()
    });

    const out = await useCase.execute(BASE_INPUT);

    expect(out.status).toBe('completed');
    expect(llm.calls).toHaveLength(2);
  });

  it('RED: re-roll com bloco ainda incompleto na 2ª tentativa → lança erro após esgotar (max 2 re-rolls)', async () => {
    // 3 chamadas, todas com seção faltando → deve esgotar e lançar SchemaValidationError
    const llm = new ProgrammableLLM([
      { kind: 'success', output: { text: LANDING_MISSING_FINAL_CTA_JSON } },
      { kind: 'success', output: { text: LANDING_MISSING_FINAL_CTA_JSON } },
      { kind: 'success', output: { text: LANDING_MISSING_FINAL_CTA_JSON } }
    ]);

    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      ...promptMaps()
    });

    await expect(useCase.execute(BASE_INPUT)).rejects.toThrow();

    // Deve ter tentado no máximo 3x (1 original + 2 re-rolls)
    expect(llm.calls.length).toBeLessThanOrEqual(3);
    expect(llm.calls.length).toBeGreaterThan(1); // pelo menos 1 re-roll foi feito
  });

  it('RED: re-roll é registrado em observability com span "re_roll_block"', async () => {
    const llm = new ProgrammableLLM([
      { kind: 'success', output: { text: LANDING_MISSING_FINAL_CTA_JSON } },
      { kind: 'success', output: { text: FULL_LANDING_JSON } }
    ]);

    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      ...promptMaps()
    });

    try {
      await useCase.execute(BASE_INPUT);
    } catch {
      // pode falhar — interessa apenas verificar se o span foi emitido
    }

    // RED: atualmente nenhum span de re-roll é emitido
    const reRollSpans = obs.spans.filter((s) =>
      s.span.name.includes('re_roll')
    );
    expect(reRollSpans.length).toBeGreaterThan(0);
  });
});
