// Wave 3 RED — Partial-recovery via Promise.allSettled
// Testes FALHAM (RED) até Wave 4 migrar Promise.all → Promise.allSettled em generateAllSlides.
//
// Por que falha: hoje, se 1 ImageGenProvider.generate() lança erro catastrófico,
// Promise.all rejeita e aborta o carrossel todo (mesmo que outros 6 slides estejam OK).
// Lifecycle-stage.md DES-T2.4 nota: "migrar para allSettled em Wave 4 se quisermos parcial-recovery".
//
// Comportamento alvo Wave 4:
//   1. 1 slide cataclismicamente falha → outros 6 completam normalmente
//   2. Slide falho aparece no manifest com status=failed + erro registrado
//   3. Carrossel completo retorna status='degraded' (≥1 slide failed)
//   4. Observability registra span de falha do slide específico

import { describe, expect, it, beforeEach } from 'vitest';
import { DesignCarrosselUseCase } from '../../../src/application/designer-agent/DesignCarrosselUseCase.js';
import { DesignBriefing } from '../../../src/domain/designer/DesignBriefing.js';
import { BrandGuide } from '../../../src/domain/carrossel/BrandGuide.js';
import type {
  ImageGenProvider,
  ImageGenInput,
  ImageGenOutput
} from '../../../src/domain/ports/ImageGenProvider.js';
import { FakeImageGen, FakeBrandValidator, FakeObservability } from '../../social-media-agent/unit/fakes.js';

const brandGuide = new BrandGuide(
  '1.0.0',
  'Novais Digital',
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

// Fake que falha cataclismicamente na N-ésima chamada (simulando 500 do provider).
class FailingAfterNImageGen implements ImageGenProvider {
  public calls: ImageGenInput[] = [];
  private idx = 0;
  constructor(
    private readonly _providerName: 'imagen_4' | 'ideogram_v2',
    private readonly failOnIndex: number, // 0-based — qual chamada falha
    private readonly errorMessage = 'PROVIDER_500'
  ) {}

  async generate(input: ImageGenInput): Promise<ImageGenOutput> {
    this.calls.push(input);
    const currentIdx = this.idx++;
    if (currentIdx === this.failOnIndex) {
      throw new Error(this.errorMessage);
    }
    return {
      imageUrl: `https://fake-cdn.local/${this._providerName}/${Date.now()}_${currentIdx}.png`,
      imageBase64:
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWNgYGBgAAAABQABXvMqOgAAAABJRU5ErkJggg==',
      costBrl: 0.21,
      latencyMs: 2000,
      providerName: this._providerName,
      modelVersion: `fake-${this._providerName}-v1`
    };
  }

  providerName(): 'imagen_4' | 'ideogram_v2' {
    return this._providerName;
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
    visualBrief: `Slide ${i + 1} fundo dark gradient azul`
  }));

describe('Wave 3 RED — Partial-recovery via Promise.allSettled', () => {
  let obs: FakeObservability;

  beforeEach(() => {
    obs = new FakeObservability();
  });

  it('RED: 1 slide com Imagen 500 catastrófico → outros 4 completam (status=degraded)', async () => {
    // Imagen falha na 1ª chamada (slide 1 Attempt 1). Demais slides OK.
    const imagen = new FailingAfterNImageGen('imagen_4', 0, 'IMAGEN_500');
    const ideogram = new FailingAfterNImageGen('ideogram_v2', 999, ''); // nunca falha
    const validator = new FakeBrandValidator(0.995);

    const useCase = new DesignCarrosselUseCase({
      imagenAdapter: imagen,
      ideogramAdapter: ideogram,
      brandValidator: validator,
      brandGuide,
      observability: obs,
      concurrencyLimit: 5
    });

    const briefing = DesignBriefing.create({
      tema: 'tema sobre partial recovery via allSettled',
      numSlides: 5,
      dominantMode: 'dark',
      caller: 'client_direct',
      tenantId: 'novais-digital-internal'
    });

    // RED: atualmente Promise.all aborta o carrossel inteiro
    const carrossel = await useCase.execute({
      briefing,
      slideSpecs: slideSpecsBase(5),
      mode: 'shadow'
    });

    expect(carrossel.status).toBe('degraded');
    expect(carrossel.slides.length).toBeGreaterThanOrEqual(4); // 4 slides OK
    // Manifest deve ter ≥1 slide com image_url=null (o falho)
    const manifest = carrossel.toManifest();
    const failedSlide = manifest.slides.find((s) => s.image_url === null);
    expect(failedSlide).toBeDefined();
  });

  it('RED: span de falha do slide específico é emitido', async () => {
    const imagen = new FailingAfterNImageGen('imagen_4', 0, 'IMAGEN_500');
    const ideogram = new FailingAfterNImageGen('ideogram_v2', 999, '');
    const validator = new FakeBrandValidator(0.995);

    const useCase = new DesignCarrosselUseCase({
      imagenAdapter: imagen,
      ideogramAdapter: ideogram,
      brandValidator: validator,
      brandGuide,
      observability: obs,
      concurrencyLimit: 5
    });

    const briefing = DesignBriefing.create({
      tema: 'tema sobre partial recovery span observability',
      numSlides: 5,
      dominantMode: 'dark',
      caller: 'client_direct',
      tenantId: 'novais-digital-internal'
    });

    try {
      await useCase.execute({
        briefing,
        slideSpecs: slideSpecsBase(5),
        mode: 'shadow'
      });
    } catch {
      // pode falhar — interessa apenas verificar se span foi emitido antes
    }

    // RED: span 'slide_generation_failed' não é emitido atualmente
    const failureSpan = obs.spans.find((s) =>
      s.span.name.includes('slide_generation_failed') ||
      s.span.name.includes('slide_failed')
    );
    expect(failureSpan).toBeDefined();
  });

  it('RED: TODOS os providers falham para 1 slide → marca esse slide como failed sem abortar', async () => {
    // Ambos providers falham para slide 1 (Imagen 3x + Ideogram 1x — total 4 attempts em ladder)
    // Mas só falha categoria 1ª: outras chamadas dos demais 4 slides funcionam normalmente
    const imagen = new (class implements ImageGenProvider {
      public calls: ImageGenInput[] = [];
      async generate(input: ImageGenInput): Promise<ImageGenOutput> {
        this.calls.push(input);
        // Só falha se for o slide 1 (testando pelo conteúdo do prompt)
        if (input.prompt.startsWith('Slide 1')) throw new Error('IMAGEN_500');
        return {
          imageUrl: `https://fake/imagen/${Date.now()}.png`,
          imageBase64: 'data',
          costBrl: 0.21,
          latencyMs: 2000,
          providerName: 'imagen_4',
          modelVersion: 'v1'
        };
      }
      providerName(): 'imagen_4' {
        return 'imagen_4';
      }
    })();
    const ideogram = new (class implements ImageGenProvider {
      public calls: ImageGenInput[] = [];
      async generate(input: ImageGenInput): Promise<ImageGenOutput> {
        this.calls.push(input);
        if (input.prompt.startsWith('Slide 1')) throw new Error('IDEOGRAM_500');
        return {
          imageUrl: `https://fake/ideogram/${Date.now()}.png`,
          imageBase64: 'data',
          costBrl: 0.11,
          latencyMs: 2000,
          providerName: 'ideogram_v2',
          modelVersion: 'v1'
        };
      }
      providerName(): 'ideogram_v2' {
        return 'ideogram_v2';
      }
    })();

    const validator = new FakeBrandValidator(0.995);
    const useCase = new DesignCarrosselUseCase({
      imagenAdapter: imagen,
      ideogramAdapter: ideogram,
      brandValidator: validator,
      brandGuide,
      observability: obs,
      concurrencyLimit: 5
    });

    const briefing = DesignBriefing.create({
      tema: 'tema sobre ambos providers falham para 1 slide',
      numSlides: 5,
      dominantMode: 'dark',
      caller: 'client_direct',
      tenantId: 'novais-digital-internal'
    });

    // RED: hoje aborta. Wave 4: deve retornar carrossel com slide 1 failed, 2-5 OK
    const carrossel = await useCase.execute({
      briefing,
      slideSpecs: slideSpecsBase(5),
      mode: 'shadow'
    });

    expect(carrossel.status).toBe('degraded');
    const manifest = carrossel.toManifest();
    const slide1 = manifest.slides.find((s) => s.slide_index === 1);
    expect(slide1?.image_url).toBeNull();
  });
});
