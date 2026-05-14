// Integration tests — GenerateCopywriterOutputUseCase
// Cobre 3 caminhos (landing, email_sequence, ad_set) + erros de roteamento.

import { describe, expect, it, beforeEach } from 'vitest';
import { GenerateCopywriterOutputUseCase } from '../../../src/application/copywriter-agent/GenerateCopywriterOutputUseCase.js';
import { FakeObservability, ProgrammableLLM } from '../unit/fakes.js';

const TOM = 'brand_voice_ceo';

const promptMaps = () => ({
  systemPromptByTom: new Map([[TOM, 'PROMPT_TOM']]),
  systemPromptByFramework: new Map([
    ['pas', 'PROMPT_PAS'],
    ['aida', 'PROMPT_AIDA'],
    ['soap-opera', 'PROMPT_SOAP']
  ]),
  systemPromptByOutputType: new Map([
    ['landing', 'PROMPT_OUTPUT_LANDING'],
    ['email-sequence', 'PROMPT_OUTPUT_EMAIL'],
    ['ad-set', 'PROMPT_OUTPUT_ADSET']
  ])
});

const landingJson = `\`\`\`json
{
  "landing": {
    "hero": { "headline": "Headline", "subheadline": "Subheadline", "cta": "Quero" },
    "sections": [
      { "kind": "problem", "body": "Problema" },
      { "kind": "agitation", "body": "Custo" },
      { "kind": "solution", "body": "Solução" },
      { "kind": "social_proof", "body": "Cases", "bullets": ["A", "B", "C"] },
      { "kind": "objections", "body": "Respostas", "bullets": ["x", "y"] },
      { "kind": "final_cta", "body": "Vamos" }
    ],
    "ctas": [],
    "word_count": 1750
  }
}
\`\`\``;

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

const adSetJson = `\`\`\`json
{
  "ad_set": {
    "variations": [
      { "angle": "pain", "headline": "Feed vazio?", "primary_text": "Você posta há meses sem resultado.", "description": "Saiba" },
      { "angle": "aspiration", "headline": "Vire referência", "primary_text": "Conteúdo vira pipeline em 14 dias.", "description": "Ver" },
      { "angle": "fomo", "headline": "Últimas vagas", "primary_text": "Turma fecha em 48h.", "description": "Reserve" },
      { "angle": "authority", "headline": "300+ founders", "primary_text": "Método validado em 50 cases.", "description": "Saber" },
      { "angle": "social_proof", "headline": "João dobrou", "primary_text": "Dobrei pipeline em 30 dias.", "description": "Cases" }
    ]
  }
}
\`\`\``;

describe('GenerateCopywriterOutputUseCase (integration)', () => {
  let obs: FakeObservability;

  beforeEach(() => {
    obs = new FakeObservability();
  });

  it('landing: produz CopywriterOutput completed com payload Landing', async () => {
    const llm = new ProgrammableLLM([{ kind: 'success', output: { text: landingJson } }]);
    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      ...promptMaps()
    });

    const out = await useCase.execute({
      tenantId: 'acme',
      outputType: 'landing',
      framework: 'pas',
      tomSlug: TOM,
      product: 'Acme Forge',
      audience: 'Founders B2B',
      goal: 'Inscrição',
      context: 'Lançamento de curso intensivo de 14 dias com 7 agentes.',
      isUpsell: false,
      mode: 'shadow'
    });

    expect(out.status).toBe('completed');
    expect(out.outcomeAlcancado()).toBe(true);
    expect(out.briefing.outputType.value).toBe('landing');
    expect(llm.calls).toHaveLength(1);
    expect(obs.traces).toHaveLength(1);
    expect(obs.traces[0].context.sku).toBe('copywriter-agent');
  });

  it('email_sequence: produz CopywriterOutput com payload EmailSequence', async () => {
    const llm = new ProgrammableLLM([{ kind: 'success', output: { text: emailJson } }]);
    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      ...promptMaps()
    });

    const out = await useCase.execute({
      tenantId: 'acme',
      outputType: 'email_sequence',
      framework: 'soap_opera',
      tomSlug: TOM,
      product: 'Acme Forge',
      audience: 'Founders B2B',
      goal: 'Engajar leads',
      context: 'Sequência de 3 emails de aquecimento para waitlist Acme Forge.',
      isUpsell: false,
      mode: 'shadow'
    });

    expect(out.status).toBe('completed');
    expect(out.briefing.outputType.value).toBe('email_sequence');
  });

  it('ad_set: produz CopywriterOutput com payload AdSet (5 ângulos)', async () => {
    const llm = new ProgrammableLLM([{ kind: 'success', output: { text: adSetJson } }]);
    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      ...promptMaps()
    });

    const out = await useCase.execute({
      tenantId: 'acme',
      outputType: 'ad_set',
      framework: 'pas',
      tomSlug: TOM,
      product: 'Acme Forge',
      audience: 'Founders B2B',
      goal: 'Cliques em Meta',
      context: 'Set de 5 anúncios Meta para campanha de waitlist Acme Forge.',
      isUpsell: false,
      mode: 'shadow'
    });

    expect(out.status).toBe('completed');
    expect(out.briefing.outputType.value).toBe('ad_set');
  });

  it('erro: prompt de tom ausente', async () => {
    const llm = new ProgrammableLLM([{ kind: 'success', output: { text: landingJson } }]);
    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      systemPromptByTom: new Map(),
      systemPromptByFramework: new Map([['pas', 'P']]),
      systemPromptByOutputType: new Map([['landing', 'P']])
    });

    await expect(
      useCase.execute({
        tenantId: 'acme',
        outputType: 'landing',
        framework: 'pas',
        tomSlug: TOM,
        product: 'Acme Forge',
        audience: 'Founders B2B',
        goal: 'Inscrição',
        context: 'Lançamento de curso intensivo de 14 dias com 7 agentes.',
        isUpsell: false,
        mode: 'shadow'
      })
    ).rejects.toThrow(/tom não encontrado/);

    // Mesmo no erro, observability registra trace fechado com erro
    expect(obs.traces[0].error).toBeDefined();
  });

  it('erro: LLM retorna JSON inválido', async () => {
    const llm = new ProgrammableLLM([
      { kind: 'success', output: { text: 'isso não é json' } }
    ]);
    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      ...promptMaps()
    });

    await expect(
      useCase.execute({
        tenantId: 'acme',
        outputType: 'landing',
        framework: 'pas',
        tomSlug: TOM,
        product: 'Acme Forge',
        audience: 'Founders B2B',
        goal: 'Inscrição',
        context: 'Lançamento de curso intensivo de 14 dias com 7 agentes.',
        isUpsell: false,
        mode: 'shadow'
      })
    ).rejects.toThrow();
  });
});
