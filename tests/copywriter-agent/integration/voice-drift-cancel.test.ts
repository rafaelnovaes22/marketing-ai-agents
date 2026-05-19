// Wave 3 RED — T4.3 Voice Drift Cancel + Re-roll
// Testes FALHAM (RED) até Wave 4 plugar VoiceValidator em GenerateCopywriterOutputUseCase.
//
// Por que falha: GenerateCopywriterDeps não tem campo voiceValidator.
// O use case atual não chama VoiceValidator em nenhum momento.
// Wave 4 deve:
//   1. Adicionar voiceValidator?: VoiceValidator em GenerateCopywriterDeps
//   2. Chamar validate() no output gerado (full_landing para Tipo A)
//   3. Se decision = 'reroll', retentar com prompt de correção (max 2x)
//   4. Registrar score e re-rolls em observability

import { beforeEach, describe, expect, it } from 'vitest';
import { GenerateCopywriterOutputUseCase } from '../../../src/application/copywriter-agent/GenerateCopywriterOutputUseCase.js';
import {
  FakeObservability,
  ProgrammableLLM,
  ProgrammableVoiceValidator
} from '../unit/fakes.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TOM = 'brand_voice_ceo';

const promptMaps = () => ({
  systemPromptByTom: new Map([[TOM, 'PROMPT_TOM']]),
  systemPromptByFramework: new Map([
    ['pas', 'PROMPT_PAS'],
    ['soap-opera', 'PROMPT_SOAP']
  ]),
  systemPromptByOutputType: new Map([
    ['landing', 'PROMPT_LANDING'],
    ['email-sequence', 'PROMPT_EMAIL'],
    ['ad-set', 'PROMPT_ADSET']
  ])
});

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

const BASE_LANDING_INPUT = {
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

// ─── Testes RED (T4.3) ───────────────────────────────────────────────────────

describe('Wave 3 RED — T4.3 Voice Drift Cancel + Re-roll', () => {
  let obs: FakeObservability;

  beforeEach(() => {
    obs = new FakeObservability();
  });

  it('RED: quando voiceValidator aprova (score ≥ 0.75), use case retorna completed sem re-roll', async () => {
    // voice score 0.9 = accept → apenas 1 chamada ao LLM
    const voice = new ProgrammableVoiceValidator([0.9]);
    const llm = new ProgrammableLLM([
      { kind: 'success', output: { text: FULL_LANDING_JSON } }
    ]);

    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      // RED: voiceValidator não está em GenerateCopywriterDeps ainda
      ...(promptMaps() as object),
      voiceValidator: voice
    } as Parameters<typeof GenerateCopywriterOutputUseCase>[0]);

    const out = await useCase.execute(BASE_LANDING_INPUT);

    expect(out.status).toBe('completed');
    expect(llm.calls).toHaveLength(1);
    // RED: voice não é chamado atualmente
    expect(voice.calls).toHaveLength(1);
    expect(voice.calls[0].unitKind).toBe('full_landing');
    expect(voice.calls[0].tomSlug).toBe(TOM);
  });

  it('RED: quando voiceValidator decide reroll (score < 0.60), use case retenta com prompt de correção', async () => {
    // 1ª geração: score 0.4 → reroll
    // 2ª geração: score 0.9 → accept
    const voice = new ProgrammableVoiceValidator([0.4, 0.9]);
    const llm = new ProgrammableLLM([
      { kind: 'success', output: { text: FULL_LANDING_JSON } },
      { kind: 'success', output: { text: FULL_LANDING_JSON } }
    ]);

    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      ...(promptMaps() as object),
      voiceValidator: voice
    } as Parameters<typeof GenerateCopywriterOutputUseCase>[0]);

    const out = await useCase.execute(BASE_LANDING_INPUT);

    // RED: atualmente voice não é invocado → use case retorna completed sem re-roll
    expect(out.status).toBe('completed');
    expect(voice.calls).toHaveLength(2);  // 2 chamadas: 1 fail + 1 pass
    expect(llm.calls).toHaveLength(2);    // 2 gerações: 1 original + 1 re-roll com correção
  });

  it('RED: re-roll de voz esgotado (2x reroll) → status failed e observability registra falha', async () => {
    // Ambas gerações com score abaixo do threshold
    const voice = new ProgrammableVoiceValidator([0.4, 0.35]);
    const llm = new ProgrammableLLM([
      { kind: 'success', output: { text: FULL_LANDING_JSON } },
      { kind: 'success', output: { text: FULL_LANDING_JSON } }
    ]);

    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      ...(promptMaps() as object),
      voiceValidator: voice
    } as Parameters<typeof GenerateCopywriterOutputUseCase>[0]);

    await expect(useCase.execute(BASE_LANDING_INPUT)).rejects.toThrow(/voz|voice|tom|score/i);

    // observability deve registrar o trace com erro
    expect(obs.traces[0]?.error).toBeDefined();
  });

  it('RED: voice score é registrado em observability (span voice_validation com score no metadata)', async () => {
    const voice = new ProgrammableVoiceValidator([0.85]);
    const llm = new ProgrammableLLM([
      { kind: 'success', output: { text: FULL_LANDING_JSON } }
    ]);

    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      ...(promptMaps() as object),
      voiceValidator: voice
    } as Parameters<typeof GenerateCopywriterOutputUseCase>[0]);

    try {
      await useCase.execute(BASE_LANDING_INPUT);
    } catch {
      // ignorar erro — interessa apenas o span emitido
    }

    // RED: nenhum span de voice_validation existe atualmente
    const voiceSpan = obs.spans.find((s) => s.span.name === 'voice_validation');
    expect(voiceSpan).toBeDefined();
  });

  it('RED: voiceValidator NÃO é invocado para email_sequence (apenas Tipo A landing)', async () => {
    const voice = new ProgrammableVoiceValidator([0.9]);
    const emailJson = `\`\`\`json
{
  "email_sequence": {
    "emails": [
      { "position": 1, "subject": "S1", "preview_text": "p", "body": "${'palavra '.repeat(60)}", "cta": "ok", "send_offset_hours": 0, "references_previous": false },
      { "position": 2, "subject": "S2", "preview_text": "p", "body": "${'palavra '.repeat(60)}", "cta": "ok", "send_offset_hours": 24, "references_previous": true },
      { "position": 3, "subject": "S3", "preview_text": "p", "body": "${'palavra '.repeat(60)}", "cta": "ok", "send_offset_hours": 48, "references_previous": true }
    ],
    "total_word_count": 1500
  }
}
\`\`\``;

    const llm = new ProgrammableLLM([
      { kind: 'success', output: { text: emailJson } }
    ]);

    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      systemPromptByTom: new Map([[TOM, 'PROMPT_TOM']]),
      systemPromptByFramework: new Map([['soap-opera', 'PROMPT_SOAP']]),
      systemPromptByOutputType: new Map([['email-sequence', 'PROMPT_EMAIL']]),
      ...(({} as object)),
      voiceValidator: voice
    } as Parameters<typeof GenerateCopywriterOutputUseCase>[0]);

    await useCase.execute({
      ...BASE_LANDING_INPUT,
      outputType: 'email_sequence',
      framework: 'soap_opera'
    });

    // voice NÃO deve ser chamado para email (T4.3 é Tipo A apenas)
    expect(voice.calls).toHaveLength(0);
  });
});
