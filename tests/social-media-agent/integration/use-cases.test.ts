// Testes integration dos use cases — sem APIs reais (usa fakes)
// Cobre fluxo completo: GenerateCarrossel + PublishMultiNetwork

import { describe, expect, it, beforeEach } from 'vitest';
import { GenerateCarrosselUseCase } from '../../../src/application/social-media-agent/GenerateCarrosselUseCase.js';
import { PublishMultiNetworkUseCase } from '../../../src/application/social-media-agent/PublishMultiNetworkUseCase.js';
import { RedeSocial } from '../../../src/domain/carrossel/RedeSocial.js';
import { BrandGuide } from '../../../src/domain/carrossel/BrandGuide.js';
import {
  FakeLLM,
  FakeImageGen,
  FakeBrandValidator,
  FakeSocialPublisher,
  FakeObservability
} from '../unit/fakes.js';

const briefingValido =
  'Carrossel sobre IA generativa para industriais B2B, tom the CEO, foco em ROI';

// Mock JSON que o LLM "retorna" no fake
const llmMockOutput = JSON.stringify({
  slides: [
    {
      role: 'hook',
      textOverlay: 'IA não substitui você. Substitui quem não usa.',
      visualBrief: 'Dark background com gradient azul, texto destacado'
    },
    {
      role: 'context',
      textOverlay: '73%',
      visualBrief: 'Imagem industrial moderna com chart de adoção'
    },
    {
      role: 'point',
      visualBrief: 'Pessoa em controle de operação com IA na tela'
    },
    {
      role: 'point',
      visualBrief: 'Dashboard com métricas antes/depois'
    },
    {
      role: 'cta',
      textOverlay: '#FocoNaExecução',
      visualBrief: 'Logo Novais Digital centralizado em background cyan gradient'
    }
  ],
  captions: {
    linkedin:
      'A pergunta que ouço toda semana: "CEO, vou perder meu emprego para a IA?" Resposta direta: você não vai perder para a IA. Vai perder para quem usa IA. #FocoNaExecução',
    instagram:
      'IA não substitui você. Substitui quem não usa. ⚡ #FocoNaExecução',
    facebook:
      'A pergunta que ouço toda semana. Spoiler: você não vai perder para a IA. #FocoNaExecução',
    twitter: [
      'IA não substitui você. Substitui quem não usa.',
      '73% das indústrias B2B testaram IA em 2026. Só 12% capturaram valor.',
      'Comece pela operação. Pessoas erram menos quando processo é claro.',
      'O caminho mais curto entre o problema e o resultado se chama execução.',
      '#FocoNaExecução'
    ]
  }
});

const brandGuideFake = new BrandGuide(
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

describe('GenerateCarrosselUseCase (integration com fakes)', () => {
  let llm: FakeLLM;
  let imagenImagen4: FakeImageGen;
  let imagenIdeogram: FakeImageGen;
  let brandValidator: FakeBrandValidator;
  let obs: FakeObservability;
  let useCase: GenerateCarrosselUseCase;

  beforeEach(() => {
    llm = new FakeLLM(`\`\`\`json\n${llmMockOutput}\n\`\`\``);
    imagenImagen4 = new FakeImageGen('imagen_4');
    imagenIdeogram = new FakeImageGen('ideogram_v2');
    brandValidator = new FakeBrandValidator(0.99);
    obs = new FakeObservability();

    const systemPromptByTom = new Map<string, string>();
    systemPromptByTom.set(
      'brand_voice_ceo',
      '# System prompt mock para tom the CEO'
    );

    useCase = new GenerateCarrosselUseCase({
      llmCopywriter: llm,
      imageGenPrimary: imagenImagen4,
      imageGenFallback: imagenIdeogram,
      brandValidator,
      brandGuide: brandGuideFake,
      observability: obs,
      systemPromptByTom
    });
  });

  it('gera carrossel completo (5 slides) com outcome alcançado', async () => {
    const carrossel = await useCase.execute({
      briefingText: briefingValido,
      tom: 'brand_voice_ceo',
      redePrincipal: 'linkedin',
      slidesDesejados: 5,
      isUpsell: false,
      tenantId: 'novais-digital-internal',
      mode: 'shadow'
    });

    expect(carrossel.status).toBe('completed');
    expect(carrossel.slides).toHaveLength(5);
    expect(carrossel.caption).not.toBeNull();
    expect(carrossel.outcomeAlcancado()).toBe(true);
  });

  it('chama LLM 1x para copy (com prompt caching)', async () => {
    await useCase.execute({
      briefingText: briefingValido,
      tom: 'brand_voice_ceo',
      redePrincipal: 'linkedin',
      slidesDesejados: 5,
      isUpsell: false,
      tenantId: 'novais-digital-internal',
      mode: 'shadow'
    });

    expect(llm.calls).toHaveLength(1);
    expect(llm.calls[0].cacheControl).toBe(true);
  });

  it('roteia slides com texto longo para Ideogram (ADR-002-DS)', async () => {
    await useCase.execute({
      briefingText: briefingValido,
      tom: 'brand_voice_ceo',
      redePrincipal: 'linkedin',
      slidesDesejados: 5,
      isUpsell: false,
      tenantId: 'novais-digital-internal',
      mode: 'shadow'
    });

    // Slide 1 tem 7 palavras de texto → Ideogram
    // Slide 5 tem 1 palavra (#FocoNaExecução) → Imagen
    const ideogramCalls = imagenIdeogram.calls.length;
    const imagenCalls = imagenImagen4.calls.length;

    expect(ideogramCalls).toBeGreaterThan(0);
    expect(imagenCalls).toBeGreaterThan(0);
    expect(ideogramCalls + imagenCalls).toBe(5);
  });

  it('grava traces no observability', async () => {
    await useCase.execute({
      briefingText: briefingValido,
      tom: 'brand_voice_ceo',
      redePrincipal: 'linkedin',
      slidesDesejados: 5,
      isUpsell: false,
      tenantId: 'novais-digital-internal',
      mode: 'shadow'
    });

    expect(obs.traces.length).toBe(1);
    expect(obs.traces[0].context.sku).toBe('social-media-agent');
    expect(obs.traces[0].context.mode).toBe('shadow');
    expect(obs.spans.length).toBeGreaterThan(5); // copy + image_batch + ≥5 image spans + validations
  });

  it('falha graciosamente quando system prompt do tom não existe', async () => {
    await expect(
      useCase.execute({
        briefingText: briefingValido,
        tom: 'tom_inexistente' as never,
        redePrincipal: 'linkedin',
        slidesDesejados: 5,
        isUpsell: false,
        tenantId: 'novais-digital-internal',
        mode: 'shadow'
      })
    ).rejects.toThrow();
  });
});

describe('PublishMultiNetworkUseCase (integration com fakes)', () => {
  it('publica em 3 redes Zernio + 1 Twitter usando publishers corretos', async () => {
    const llm = new FakeLLM(`\`\`\`json\n${llmMockOutput}\n\`\`\``);
    const imagenImagen4 = new FakeImageGen('imagen_4');
    const imagenIdeogram = new FakeImageGen('ideogram_v2');
    const brandValidator = new FakeBrandValidator(0.99);
    const obs = new FakeObservability();

    const systemPromptByTom = new Map<string, string>();
    systemPromptByTom.set('brand_voice_ceo', '# mock');

    const generateUseCase = new GenerateCarrosselUseCase({
      llmCopywriter: llm,
      imageGenPrimary: imagenImagen4,
      imageGenFallback: imagenIdeogram,
      brandValidator,
      brandGuide: brandGuideFake,
      observability: obs,
      systemPromptByTom
    });

    const carrossel = await generateUseCase.execute({
      briefingText: briefingValido,
      tom: 'brand_voice_ceo',
      redePrincipal: 'linkedin',
      slidesDesejados: 5,
      isUpsell: false,
      tenantId: 'novais-digital-internal',
      mode: 'shadow'
    });

    const zernioPublisher = new FakeSocialPublisher([
      'linkedin',
      'instagram',
      'facebook'
    ]);
    const twitterPublisher = new FakeSocialPublisher(['twitter']);

    const publishUseCase = new PublishMultiNetworkUseCase({
      publisherZernio: zernioPublisher,
      publisherTwitter: twitterPublisher,
      observability: obs
    });

    const results = await publishUseCase.execute(carrossel);

    expect(results).toHaveLength(4);

    const twitterResult = results.find((r) => r.rede === 'twitter');
    expect(twitterResult?.output.status).toBe('published');

    expect(zernioPublisher.calls).toHaveLength(3); // 3 redes via Zernio
    expect(twitterPublisher.calls).toHaveLength(1); // 1 rede via Twitter dedicado
  });

  it('rejeita publicação se outcome não alcançado', async () => {
    // Carrossel "fake" sem slides preenchidos
    const obs = new FakeObservability();
    const publisherZernio = new FakeSocialPublisher([
      'linkedin',
      'instagram',
      'facebook'
    ]);
    const publisherTwitter = new FakeSocialPublisher(['twitter']);

    const useCase = new PublishMultiNetworkUseCase({
      publisherZernio,
      publisherTwitter,
      observability: obs
    });

    const carrosselIncompleto = {
      id: 'fake',
      tenantId: 't',
      status: 'pending',
      slides: [],
      caption: null,
      outcomeAlcancado: () => false
    } as never;

    await expect(useCase.execute(carrosselIncompleto)).rejects.toThrow(
      /outcome contratual/
    );
  });

  it('Twitter recebe array de tweets (modo thread)', async () => {
    const llm = new FakeLLM(`\`\`\`json\n${llmMockOutput}\n\`\`\``);
    const imagenImagen4 = new FakeImageGen('imagen_4');
    const imagenIdeogram = new FakeImageGen('ideogram_v2');
    const brandValidator = new FakeBrandValidator(0.99);
    const obs = new FakeObservability();
    const systemPromptByTom = new Map<string, string>();
    systemPromptByTom.set('brand_voice_ceo', '# mock');

    const generateUseCase = new GenerateCarrosselUseCase({
      llmCopywriter: llm,
      imageGenPrimary: imagenImagen4,
      imageGenFallback: imagenIdeogram,
      brandValidator,
      brandGuide: brandGuideFake,
      observability: obs,
      systemPromptByTom
    });

    const carrossel = await generateUseCase.execute({
      briefingText: briefingValido,
      tom: 'brand_voice_ceo',
      redePrincipal: 'twitter',
      slidesDesejados: 5,
      isUpsell: false,
      tenantId: 'novais-digital-internal',
      mode: 'shadow'
    });

    const twitterPublisher = new FakeSocialPublisher(['twitter']);
    const zernioPublisher = new FakeSocialPublisher([
      'linkedin',
      'instagram',
      'facebook'
    ]);

    const publishUseCase = new PublishMultiNetworkUseCase({
      publisherZernio: zernioPublisher,
      publisherTwitter: twitterPublisher,
      observability: obs
    });

    await publishUseCase.execute(carrossel, [RedeSocial.create('twitter')]);

    const call = twitterPublisher.calls[0];
    expect(call).toBeDefined();
    expect(Array.isArray(call.caption)).toBe(true);
    expect((call.caption as string[]).length).toBeGreaterThan(1);
  });
});
