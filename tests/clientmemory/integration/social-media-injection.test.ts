// Testes — injeção de ClientMemory no social-media-agent (ADR-007-PROJ).
// Mesma forma do copywriter: memória entra como último bloco do system prompt
// de gerarCopy. Verifica injeção, span e zero-impacto sem clientMemory.

import { beforeEach, describe, expect, it } from 'vitest';
import { GenerateCarrosselUseCase } from '../../../src/application/social-media-agent/GenerateCarrosselUseCase.js';
import { BrandGuide } from '../../../src/domain/carrossel/BrandGuide.js';
import {
  FakeLLM,
  FakeImageGen,
  FakeBrandValidator,
  FakeObservability
} from '../../social-media-agent/unit/fakes.js';
import type {
  ClientFact,
  ClientMemory,
  ClientMemorySnapshot
} from '../../../src/domain/ports/ClientMemory.js';

const llmMock = JSON.stringify({
  slides: [
    { role: 'hook', textOverlay: 'H', visualBrief: 'b1' },
    { role: 'context', textOverlay: '73%', visualBrief: 'b2' },
    { role: 'point', visualBrief: 'b3' },
    { role: 'point', visualBrief: 'b4' },
    { role: 'cta', textOverlay: '#x', visualBrief: 'b5' }
  ],
  captions: { linkedin: 'l', instagram: 'i', facebook: 'f', twitter: ['t1', 't2'] }
});

const brandGuide = new BrandGuide(
  '1.0.0',
  'Acme',
  'tagline',
  {
    primary: { navy_deep: '#0A1628', royal_blue: '#2563EB', cyan_accent: '#5EEAD4', white: '#FFFFFF' },
    secondary: { off_white: '#F5F7FA', text_secondary: '#6B7280', card_bg_dark: '#0F1B2D' },
    status: { badge_red: '#DC2626', badge_green: '#10B981' }
  },
  {
    headings: { family: 'Inter', weights: [800] },
    body: { family: 'Inter', weights: [400] },
    logo: { family: 'Inter', weight: 700 }
  },
  { exact_match_required: 99, warning_threshold: 96, rejection_threshold: 96 },
  {}
);

const FRAGMENT = '# Memória deste cliente (self-harness)\n\n## Fatos aprendidos (confirmados)\n### pitfalls\n- [assisted] Evitar hashtags genéricas';

class FakeClientMemory implements ClientMemory {
  public loads: string[] = [];
  constructor(private readonly snapshot: Partial<ClientMemorySnapshot>) {}
  async load(tenantId: string): Promise<ClientMemorySnapshot> {
    this.loads.push(tenantId);
    return {
      tenantId,
      soul: this.snapshot.soul ?? null,
      facts: this.snapshot.facts ?? ([] as ClientFact[]),
      promptFragment: this.snapshot.promptFragment ?? ''
    };
  }
}

const INPUT = {
  briefingText: 'Carrossel sobre IA generativa B2B, tom the CEO',
  tom: 'brand_voice_ceo',
  redePrincipal: 'linkedin' as const,
  slidesDesejados: 5,
  isUpsell: false,
  tenantId: 'cliente-sm-001',
  mode: 'shadow' as const
};

describe('Injeção de ClientMemory no social-media-agent', () => {
  let llm: FakeLLM;
  let obs: FakeObservability;

  beforeEach(() => {
    llm = new FakeLLM(`\`\`\`json\n${llmMock}\n\`\`\``);
    obs = new FakeObservability();
  });

  function build(clientMemory?: ClientMemory) {
    const systemPromptByTom = new Map<string, string>([['brand_voice_ceo', 'PROMPT_TOM_SM']]);
    return new GenerateCarrosselUseCase({
      llmCopywriter: llm,
      imageGenPrimary: new FakeImageGen('imagen_4'),
      imageGenFallback: new FakeImageGen('ideogram_v2'),
      brandValidator: new FakeBrandValidator(0.99),
      brandGuide,
      observability: obs,
      systemPromptByTom,
      clientMemory
    });
  }

  it('injeta o fragment como último bloco do system prompt', async () => {
    const clientMemory = new FakeClientMemory({ soul: 'x', promptFragment: FRAGMENT });
    await build(clientMemory).execute(INPUT);

    const system = llm.calls[0].messages.find((m) => m.role === 'system')?.content ?? '';
    expect(system).toContain('Evitar hashtags genéricas');
    expect(system.indexOf('PROMPT_TOM_SM')).toBeLessThan(system.indexOf('Memória deste cliente'));
    expect(clientMemory.loads).toEqual(['cliente-sm-001']);
  });

  it('emite span client_memory_load (C6)', async () => {
    await build(new FakeClientMemory({ soul: 's', promptFragment: FRAGMENT })).execute(INPUT);
    const span = obs.spans.find((s) => s.span.name === 'client_memory_load');
    expect(span).toBeDefined();
    expect(span?.span.metadata?.client_soul_present).toBe(true);
  });

  it('sem clientMemory: system prompt sem bloco de memória e sem span (zero impacto)', async () => {
    await build().execute(INPUT);
    expect(obs.spans.find((s) => s.span.name === 'client_memory_load')).toBeUndefined();
    const system = llm.calls[0].messages.find((m) => m.role === 'system')?.content ?? '';
    expect(system).not.toContain('Memória deste cliente');
  });
});
