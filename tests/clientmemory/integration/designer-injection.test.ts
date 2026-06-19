// Testes — injeção de ClientMemory no designer (ADR-007-PROJ).
// Designer gera IMAGENS: a memória vira diretrizes visuais COMPACTAS anexadas ao
// prompt de cada slide (não o markdown verboso). Verifica enriquecimento, span,
// gating de confiança e zero-impacto sem clientMemory.

import { beforeEach, describe, expect, it } from 'vitest';
import { DesignCarrosselUseCase } from '../../../src/application/designer-agent/DesignCarrosselUseCase.js';
import { DesignBriefing } from '../../../src/domain/designer/DesignBriefing.js';
import { BrandGuide } from '../../../src/domain/carrossel/BrandGuide.js';
import {
  FakeImageGen,
  FakeBrandValidator,
  FakeObservability
} from '../../social-media-agent/unit/fakes.js';
import type {
  ClientFact,
  ClientMemory,
  ClientMemorySnapshot
} from '../../../src/domain/ports/ClientMemory.js';

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

const slideSpecs = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    order: i + 1,
    role: i === 0 ? ('hook' as const) : i === n - 1 ? ('cta' as const) : ('point' as const),
    visualBrief: `Slide ${i + 1} fundo dark gradient azul`
  }));

class FakeClientMemory implements ClientMemory {
  public loads: string[] = [];
  constructor(private readonly facts: ClientFact[], private readonly soul: string | null = null) {}
  async load(tenantId: string): Promise<ClientMemorySnapshot> {
    this.loads.push(tenantId);
    return { tenantId, soul: this.soul, facts: this.facts, promptFragment: 'irrelevante p/ imagem' };
  }
}

const fact = (over: Partial<ClientFact>): ClientFact => ({
  section: 'confirmed_patterns',
  confidence: 'assisted',
  date: '2026-06-19',
  runId: 'ls-1',
  text: 'fato',
  ...over
});

function makeBriefing() {
  return DesignBriefing.create({
    tema: 'lançamento SaaS',
    numSlides: 5,
    dominantMode: 'dark',
    caller: 'client_direct',
    tenantId: 'cliente-design-001'
  });
}

describe('Injeção de ClientMemory no designer', () => {
  let imagen: FakeImageGen;
  let ideogram: FakeImageGen;
  let obs: FakeObservability;

  beforeEach(() => {
    imagen = new FakeImageGen('imagen_4');
    ideogram = new FakeImageGen('ideogram_v2');
    obs = new FakeObservability();
  });

  function build(clientMemory?: ClientMemory) {
    return new DesignCarrosselUseCase({
      imagenAdapter: imagen,
      ideogramAdapter: ideogram,
      brandValidator: new FakeBrandValidator(0.995),
      brandGuide,
      observability: obs,
      clientMemory
    });
  }

  it('anexa diretrizes confirmadas ao prompt de imagem de TODOS os slides', async () => {
    const clientMemory = new FakeClientMemory([
      fact({ text: 'fundo sempre escuro, sem stock photos de pessoas' }),
      fact({ text: 'paleta restrita a azul royal + cyan' })
    ]);
    await build(clientMemory).execute({ briefing: makeBriefing(), slideSpecs: slideSpecs(5), mode: 'shadow' });

    expect(imagen.calls.length).toBe(5);
    for (const call of imagen.calls) {
      expect(call.prompt).toContain('Preferências visuais do cliente:');
      expect(call.prompt).toContain('sem stock photos de pessoas');
      expect(call.prompt).toContain('paleta restrita');
    }
    expect(clientMemory.loads).toEqual(['cliente-design-001']);
  });

  it('emite span client_memory_load com metadata (C6)', async () => {
    const clientMemory = new FakeClientMemory([fact({ text: 'sem gradientes' })], 'soul presente');
    await build(clientMemory).execute({ briefing: makeBriefing(), slideSpecs: slideSpecs(5), mode: 'shadow' });

    const span = obs.spans.find((s) => s.span.name === 'client_memory_load');
    expect(span).toBeDefined();
    expect(span?.span.metadata?.client_directives_injected).toBe(true);
    expect(span?.span.metadata?.client_soul_present).toBe(true);
  });

  it('gating C4: fatos local NÃO viram diretrizes (piso shadow)', async () => {
    const clientMemory = new FakeClientMemory([
      fact({ text: 'preferência ainda não confirmada', confidence: 'local' })
    ]);
    await build(clientMemory).execute({ briefing: makeBriefing(), slideSpecs: slideSpecs(5), mode: 'shadow' });

    for (const call of imagen.calls) {
      expect(call.prompt).not.toContain('Preferências visuais do cliente:');
      expect(call.prompt).not.toContain('ainda não confirmada');
    }
  });

  it('sem clientMemory: prompt intocado e nenhum span de memória (zero impacto)', async () => {
    await build().execute({ briefing: makeBriefing(), slideSpecs: slideSpecs(5), mode: 'shadow' });
    expect(obs.spans.find((s) => s.span.name === 'client_memory_load')).toBeUndefined();
    for (const call of imagen.calls) {
      expect(call.prompt).not.toContain('Preferências visuais do cliente:');
    }
  });
});
