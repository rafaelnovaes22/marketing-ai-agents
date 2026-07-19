// Integration tests — DesignCarrosselUseCase
// REUSO de fakes do social-media-agent (FakeImageGen, FakeBrandValidator, FakeObservability).
// Cobre: happy path, retry, fallback cross-provider, brand failure.

import { describe, expect, it, beforeEach } from 'vitest';
import { DesignCarrosselUseCase } from '../../../src/application/designer-agent/DesignCarrosselUseCase.js';
import { DesignBriefing } from '../../../src/domain/designer/DesignBriefing.js';
import { BrandGuide } from '../../../src/domain/carrossel/BrandGuide.js';
import type {
  BrandValidator,
  BrandValidationInput,
  BrandValidationOutput
} from '../../../src/domain/ports/BrandValidator.js';
import {
  FakeImageGen,
  FakeBrandValidator,
  FakeObservability
} from '../../social-media-agent/unit/fakes.js';

// ───────── Brand guide canônico (mesmo do social-media) ─────────────

const brandGuide = new BrandGuide(
  '1.0.0',
  'Novais Digital',
  'tagline',
  {
    primary: {
      navy_deep: '#0A1628',
      royal_blue: '#2563EB',
      cyan_accent: '#5EEAD4',
      white: '#FFFFFF'
    },
    secondary: {
      off_white: '#F5F7FA',
      text_secondary: '#6B7280',
      card_bg_dark: '#0F1B2D'
    },
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

// Fake brand validator que pode variar resposta por chamada (para simular retry)
class SequentialBrandValidator implements BrandValidator {
  public calls: BrandValidationInput[] = [];
  private idx = 0;

  constructor(private readonly scores: number[]) {}

  async validate(input: BrandValidationInput): Promise<BrandValidationOutput> {
    this.calls.push(input);
    const score = this.scores[Math.min(this.idx, this.scores.length - 1)];
    this.idx++;
    return {
      score,
      decision:
        score >= 0.99
          ? 'accept'
          : score >= 0.96
            ? 'accept_with_warning'
            : 'retry',
      issues:
        score < 0.99
          ? [
              {
                category: 'color',
                severity: 'warning',
                description: 'cor levemente fora da paleta'
              }
            ]
          : [],
      costBrl: 0.025,
      latencyMs: 800
    };
  }
}

const slideSpecsBase = (numSlides: number) =>
  Array.from({ length: numSlides }, (_, i) => ({
    order: i + 1,
    role:
      i === 0
        ? ('hook' as const)
        : i === numSlides - 1
          ? ('cta' as const)
          : ('point' as const),
    visualBrief: `Slide ${i + 1} visual brief com fundo dark e gradient azul`,
    textOverlay: i === 0 ? 'IA não substitui você' : undefined
  }));

describe('DesignCarrosselUseCase (integration com fakes)', () => {
  let imagen: FakeImageGen;
  let ideogram: FakeImageGen;
  let obs: FakeObservability;

  beforeEach(() => {
    imagen = new FakeImageGen('imagen_4');
    ideogram = new FakeImageGen('ideogram_v2');
    obs = new FakeObservability();
  });

  it('happy path: 5 slides on-brand → carrossel completed', async () => {
    const validator = new FakeBrandValidator(0.995);
    const useCase = new DesignCarrosselUseCase({
      imagenAdapter: imagen,
      ideogramAdapter: ideogram,
      brandValidator: validator,
      brandGuide,
      observability: obs
    });

    const briefing = DesignBriefing.create({
      tema: 'lançamento produto SaaS B2B',
      numSlides: 5,
      dominantMode: 'dark',
      caller: 'client_direct',
      tenantId: 'novais-digital-internal'
    });

    const carrossel = await useCase.execute({
      briefing,
      slideSpecs: slideSpecsBase(5),
      mode: 'shadow'
    });

    expect(carrossel.status).toBe('completed');
    expect(carrossel.slides).toHaveLength(5);
    expect(carrossel.outcomeAlcancado()).toBe(true);
    expect(carrossel.report.todosPassaram()).toBe(true);
    // Cada slide validou 1x (sem retry)
    expect(validator.calls).toHaveLength(5);
    // Trace gravado
    expect(obs.traces).toHaveLength(1);
    expect(obs.traces[0].context.sku).toBe('designer-agent');
  });

  it('retry: slide reprova 1ª vez, passa na 2ª (mesmo provider)', async () => {
    // Slide 1 = [0.95 (retry), 0.995 (ok)] — outros ok direto
    const validator = new SequentialBrandValidator([
      0.95, 0.995, // slide 1: retry → ok
      0.995, 0.995, 0.995, 0.995 // demais 4 ok direto
    ]);
    const useCase = new DesignCarrosselUseCase({
      imagenAdapter: imagen,
      ideogramAdapter: ideogram,
      brandValidator: validator,
      brandGuide,
      observability: obs,
      concurrencyLimit: 1 // serial para ordem determinística
    });

    const briefing = DesignBriefing.create({
      tema: 'governança de IA para industrial',
      numSlides: 5,
      dominantMode: 'dark',
      caller: 'social-media-agent',
      tenantId: 'novais-digital-internal'
    });

    const carrossel = await useCase.execute({
      briefing,
      slideSpecs: slideSpecsBase(5),
      mode: 'shadow'
    });

    expect(carrossel.status).toBe('completed');
    expect(carrossel.report.totalRetries()).toBe(1);
    // Slide 1 teve 2 validações
    expect(validator.calls.length).toBeGreaterThanOrEqual(6);
  });

  it('fallback cross-provider: 2 retries no Imagen falham → Ideogram salva', async () => {
    // Slide 1: 0.90, 0.92 (Imagen ambas falham) → Ideogram 0.995 (passa)
    // Slides 2-5: ok direto
    const validator = new SequentialBrandValidator([
      0.9, 0.92, 0.995, // slide 1: retry → fallback ok
      0.995, 0.995, 0.995, 0.995
    ]);
    const useCase = new DesignCarrosselUseCase({
      imagenAdapter: imagen,
      ideogramAdapter: ideogram,
      brandValidator: validator,
      brandGuide,
      observability: obs,
      concurrencyLimit: 1
    });

    const briefing = DesignBriefing.create({
      tema: 'tema sobre arquitetura ai-native',
      numSlides: 5,
      dominantMode: 'dark',
      caller: 'client_direct',
      tenantId: 'novais-digital-internal'
    });

    // Slide 1 sem textOverlay → vai pro Imagen como primary
    const specs = slideSpecsBase(5).map((s, i) =>
      i === 0 ? { ...s, textOverlay: undefined } : s
    );

    const carrossel = await useCase.execute({
      briefing,
      slideSpecs: specs,
      mode: 'shadow'
    });

    expect(carrossel.status).toBe('completed');
    // Slide 1: Imagen 2x + Ideogram 1x = 3 chamadas para slide 1
    // Demais 4 slides: 1 chamada Imagen cada = 4
    expect(imagen.calls.length + ideogram.calls.length).toBe(7);
    expect(ideogram.calls.length).toBeGreaterThanOrEqual(1);
    // Report registra fallback no slide 1
    const slide1Entry = carrossel.report.entries.find(
      (e) => e.slideOrder === 1
    );
    expect(slide1Entry?.fallbackTriggered).toBe(true);
    expect(slide1Entry?.providerUsed).toBe('ideogram_v2');
  });

  it('brand failure: 3 tentativas falham → status=degraded', async () => {
    // Slide 1 falha em todas as 3 tentativas
    const validator = new SequentialBrandValidator([
      0.85, 0.86, 0.87, // slide 1: 3 falhas
      0.995, 0.995, 0.995, 0.995
    ]);
    const useCase = new DesignCarrosselUseCase({
      imagenAdapter: imagen,
      ideogramAdapter: ideogram,
      brandValidator: validator,
      brandGuide,
      observability: obs,
      concurrencyLimit: 1
    });

    const briefing = DesignBriefing.create({
      tema: 'tema problemático para teste de degraded',
      numSlides: 5,
      dominantMode: 'dark',
      caller: 'client_direct',
      tenantId: 'novais-digital-internal'
    });

    const specs = slideSpecsBase(5).map((s, i) =>
      i === 0 ? { ...s, textOverlay: undefined } : s
    );

    const carrossel = await useCase.execute({
      briefing,
      slideSpecs: specs,
      mode: 'shadow'
    });

    expect(carrossel.status).toBe('degraded');
    expect(carrossel.report.todosPassaram()).toBe(false);
    expect(carrossel.report.isDegraded()).toBe(true);
    expect(carrossel.outcomeAlcancado()).toBe(false);
  });

  it('decideImageProvider rota textOverlay longo para Ideogram (ADR-002-DES)', async () => {
    const validator = new FakeBrandValidator(0.995);
    const useCase = new DesignCarrosselUseCase({
      imagenAdapter: imagen,
      ideogramAdapter: ideogram,
      brandValidator: validator,
      brandGuide,
      observability: obs
    });

    // Slide com textOverlay grande (≥4 words) → Ideogram
    const ideogramProv = useCase.decideImageProvider({
      order: 1,
      role: 'hook',
      visualBrief: 'x',
      textOverlay: 'IA não substitui você nunca'
    });
    expect(ideogramProv.providerName()).toBe('ideogram_v2');

    // Slide sem texto → Imagen
    const imagenProv = useCase.decideImageProvider({
      order: 2,
      role: 'point',
      visualBrief: 'x'
    });
    expect(imagenProv.providerName()).toBe('imagen_4');

    // Hero number "73%" → Ideogram
    const heroProv = useCase.decideImageProvider({
      order: 3,
      role: 'context',
      visualBrief: 'x',
      textOverlay: '73%'
    });
    expect(heroProv.providerName()).toBe('ideogram_v2');

    // Override explícito requiresLiteralText
    const literalProv = useCase.decideImageProvider({
      order: 4,
      role: 'point',
      visualBrief: 'x',
      requiresLiteralText: true
    });
    expect(literalProv.providerName()).toBe('ideogram_v2');
  });
});
