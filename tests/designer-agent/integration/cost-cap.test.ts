// Wave 3 RED — DES-T5.5 Cost cap enforcement
// Testes FALHAM (RED) até Wave 4 implementar enforcement de custo máximo.
//
// Por que falha: DesignCarrosselUseCaseInput/Deps não aceita `costCapBrl`.
// Use case atual não aborta nem sinaliza quando custo total ultrapassa cap.
// Wave 4 deve:
//   1. Adicionar `costCapBrl?: number` em DesignCarrosselUseCaseInput
//   2. Ao final da geração, se total > costCap, marcar status='cost_exceeded'
//      OU emitir span 'cost_cap_exceeded' com diagnóstico
//   3. Não abortar mid-flight — completa, sinaliza, deixa caller decidir

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
  FakeObservability
} from '../../social-media-agent/unit/fakes.js';

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

// Validator que sempre retorna brand abaixo do threshold → força 3 attempts por slide.
class AlwaysBadValidator implements BrandValidator {
  public calls: BrandValidationInput[] = [];
  async validate(input: BrandValidationInput): Promise<BrandValidationOutput> {
    this.calls.push(input);
    return {
      score: 0.85,
      decision: 'retry',
      issues: [],
      costBrl: 0.025,
      latencyMs: 800
    };
  }
}

const slideSpecsBase = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    order: i + 1,
    role:
      i === 0
        ? ('hook' as const)
        : i === n - 1
          ? ('cta' as const)
          : ('point' as const),
    visualBrief: `Slide ${i + 1} visual brief com fundo dark e gradient azul`
  }));

describe('Wave 3 RED — DES-T5.5 Cost cap enforcement', () => {
  let imagen: FakeImageGen;
  let ideogram: FakeImageGen;
  let obs: FakeObservability;

  beforeEach(() => {
    imagen = new FakeImageGen('imagen_4');
    ideogram = new FakeImageGen('ideogram_v2');
    obs = new FakeObservability();
  });

  it('RED: 7 slides com 3 attempts cada (todos brand bad) → cost > R$ 3 dispara status="cost_exceeded"', async () => {
    // 7 slides * 3 attempts * R$ 0.21 = R$ 4.41 → > R$ 3 cap
    const validator = new AlwaysBadValidator();
    const useCase = new DesignCarrosselUseCase({
      imagenAdapter: imagen,
      ideogramAdapter: ideogram,
      brandValidator: validator,
      brandGuide,
      observability: obs,
      concurrencyLimit: 1
    });

    const briefing = DesignBriefing.create({
      tema: 'tema sobre cost cap enforcement teste',
      numSlides: 7,
      dominantMode: 'dark',
      caller: 'client_direct',
      tenantId: 'novais-digital-internal'
    });

    const carrossel = await useCase.execute({
      briefing,
      slideSpecs: slideSpecsBase(7),
      mode: 'shadow',
      costCapBrl: 3.0
    } as Parameters<DesignCarrosselUseCase['execute']>[0]);

    // RED: atualmente status é 'degraded' (brand failures) — cost cap não é checado
    expect(carrossel.totalCostBrl).toBeGreaterThan(3.0);
    expect(carrossel.status).toBe('cost_exceeded');
  });

  it('RED: span "cost_cap_exceeded" é emitido com cap + actual + delta', async () => {
    const validator = new AlwaysBadValidator();
    const useCase = new DesignCarrosselUseCase({
      imagenAdapter: imagen,
      ideogramAdapter: ideogram,
      brandValidator: validator,
      brandGuide,
      observability: obs,
      concurrencyLimit: 1
    });

    const briefing = DesignBriefing.create({
      tema: 'tema sobre cost cap span observability',
      numSlides: 7,
      dominantMode: 'dark',
      caller: 'client_direct',
      tenantId: 'novais-digital-internal'
    });

    await useCase.execute({
      briefing,
      slideSpecs: slideSpecsBase(7),
      mode: 'shadow',
      costCapBrl: 3.0
    } as Parameters<DesignCarrosselUseCase['execute']>[0]);

    // RED: span de cost cap não é emitido atualmente
    const capSpan = obs.spans.find((s) => s.span.name === 'cost_cap_exceeded');
    expect(capSpan).toBeDefined();
  });

  it('RED: cost dentro do cap → status="completed" (sem sinalização de cost_exceeded)', async () => {
    const validator = new (class implements BrandValidator {
      public calls: BrandValidationInput[] = [];
      async validate(input: BrandValidationInput): Promise<BrandValidationOutput> {
        this.calls.push(input);
        return {
          score: 0.995,
          decision: 'accept',
          issues: [],
          costBrl: 0.025,
          latencyMs: 800
        };
      }
    })();

    const useCase = new DesignCarrosselUseCase({
      imagenAdapter: imagen,
      ideogramAdapter: ideogram,
      brandValidator: validator,
      brandGuide,
      observability: obs
    });

    const briefing = DesignBriefing.create({
      tema: 'tema sobre cost dentro do cap',
      numSlides: 5,
      dominantMode: 'dark',
      caller: 'client_direct',
      tenantId: 'novais-digital-internal'
    });

    const carrossel = await useCase.execute({
      briefing,
      slideSpecs: slideSpecsBase(5),
      mode: 'shadow',
      costCapBrl: 3.0
    } as Parameters<DesignCarrosselUseCase['execute']>[0]);

    // 5 slides * R$ 0.21 = R$ 1.05 (sem retry) — bem abaixo do cap
    expect(carrossel.totalCostBrl).toBeLessThan(3.0);
    expect(carrossel.status).toBe('completed');
  });

  it('RED: costCapBrl ausente → comportamento atual (sem enforcement, retrocompatível)', async () => {
    const validator = new AlwaysBadValidator();
    const useCase = new DesignCarrosselUseCase({
      imagenAdapter: imagen,
      ideogramAdapter: ideogram,
      brandValidator: validator,
      brandGuide,
      observability: obs,
      concurrencyLimit: 1
    });

    const briefing = DesignBriefing.create({
      tema: 'tema sem cost cap — retrocompat',
      numSlides: 5,
      dominantMode: 'dark',
      caller: 'client_direct',
      tenantId: 'novais-digital-internal'
    });

    const carrossel = await useCase.execute({
      briefing,
      slideSpecs: slideSpecsBase(5),
      mode: 'shadow'
      // sem costCapBrl
    });

    // Sem cap → comportamento atual: degraded (brand fail) sem cost_exceeded
    expect(carrossel.status).not.toBe('cost_exceeded');
  });
});
