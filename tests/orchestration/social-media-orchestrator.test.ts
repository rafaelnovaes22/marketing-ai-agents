// Integration test do SocialMediaOrchestrator (C4 do plano LangGraph)
//
// Cobertura:
//   - Grafo compila com BaseGraphState + state específico
//   - Pipeline default: generate_carrossel → publish_multi_network
//   - Pipeline com design_validation: generate → design_validation → publish
//   - Cada node abre 1 span no traceContext do grafo (P3)
//   - Trace raiz do grafo é finalizado (endTrace chamado)
//   - C8 bloqueia tenantId vazio no boundary

import { describe, expect, it, beforeEach } from 'vitest';

import {
  createSocialMediaOrchestrator,
  runSocialMediaOrchestrator
} from '../../src/orchestration/social-media/SocialMediaOrchestrator.js';

import { GenerateCarrosselUseCase } from '../../src/application/social-media-agent/GenerateCarrosselUseCase.js';
import { PublishMultiNetworkUseCase } from '../../src/application/social-media-agent/PublishMultiNetworkUseCase.js';
import { DesignCarrosselUseCase } from '../../src/application/designer-agent/DesignCarrosselUseCase.js';
import { BrandGuide } from '../../src/domain/carrossel/BrandGuide.js';

import {
  FakeLLM,
  FakeImageGen,
  FakeBrandValidator,
  FakeSocialPublisher,
  FakeObservability
} from '../social-media-agent/unit/fakes.js';

// ─── Fixtures ────────────────────────────────────────────────────────────

const llmMockOutput = JSON.stringify({
  slides: [
    {
      role: 'hook',
      textOverlay: 'IA não substitui você. Substitui quem não usa.',
      visualBrief: 'Dark background com gradient azul'
    },
    {
      role: 'context',
      textOverlay: '73%',
      visualBrief: 'Imagem industrial moderna com chart'
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
      visualBrief: 'Logo Novais Digital centralizado'
    }
  ],
  captions: {
    linkedin: 'Caption LinkedIn de teste. #FocoNaExecução',
    instagram: 'Caption IG. #FocoNaExecução',
    facebook: 'Caption Facebook. #FocoNaExecução',
    twitter: [
      'Tweet 1',
      'Tweet 2',
      'Tweet 3',
      'Tweet 4',
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

function buildDeps() {
  const llm = new FakeLLM(`\`\`\`json\n${llmMockOutput}\n\`\`\``);
  const imagenPrimary = new FakeImageGen('imagen_4');
  const imagenFallback = new FakeImageGen('ideogram_v2');
  const brandValidator = new FakeBrandValidator(0.99);
  const obs = new FakeObservability();
  const zernio = new FakeSocialPublisher(['linkedin', 'instagram', 'facebook']);
  const twitter = new FakeSocialPublisher(['twitter']);

  const systemPromptByTom = new Map<string, string>();
  systemPromptByTom.set('brand_voice_ceo', '# mock prompt');

  const generateCarrossel = new GenerateCarrosselUseCase({
    llmCopywriter: llm,
    imageGenPrimary: imagenPrimary,
    imageGenFallback: imagenFallback,
    brandValidator,
    brandGuide: brandGuideFake,
    observability: obs,
    systemPromptByTom
  });

  const designCarrossel = new DesignCarrosselUseCase({
    imagenAdapter: imagenPrimary,
    ideogramAdapter: imagenFallback,
    brandValidator,
    brandGuide: brandGuideFake,
    observability: obs
  });

  const publishMultiNetwork = new PublishMultiNetworkUseCase({
    publisherZernio: zernio,
    publisherTwitter: twitter,
    observability: obs
  });

  return {
    deps: {
      generateCarrossel,
      designCarrossel,
      publishMultiNetwork,
      observability: obs
    },
    obs,
    zernio,
    twitter,
    llm
  };
}

// ─── Specs ───────────────────────────────────────────────────────────────

describe('SocialMediaOrchestrator (integration com fakes)', () => {
  let bundle: ReturnType<typeof buildDeps>;

  beforeEach(() => {
    bundle = buildDeps();
  });

  it('compila o grafo com BaseGraphState + state específico', () => {
    const graph = createSocialMediaOrchestrator(bundle.deps);
    expect(graph).toBeDefined();
    expect(typeof graph.invoke).toBe('function');
  });

  it('pipeline default: generate_carrossel → publish_multi_network', async () => {
    const graph = createSocialMediaOrchestrator(bundle.deps);

    const result = await runSocialMediaOrchestrator(graph, bundle.deps, {
      tenantId: 'novais-digital-internal',
      mode: 'shadow',
      briefing: {
        briefingText:
          'Carrossel sobre IA generativa para industriais B2B, foco em ROI',
        tom: 'brand_voice_ceo',
        redePrincipal: 'linkedin',
        slidesDesejados: 5,
        isUpsell: false
      }
    });

    expect(result.carrossel).not.toBeNull();
    expect(result.carrossel?.status).toBe('completed');
    expect(result.carrossel?.slides).toHaveLength(5);
    expect(result.publications).toHaveLength(4);
    expect(result.designReport).toBeNull(); // design_validation off por default
    expect(result.traceId).toBeDefined();

    // 3 redes Zernio (LI/IG/FB) + 1 Twitter = 4 publicações
    expect(bundle.zernio.calls).toHaveLength(3);
    expect(bundle.twitter.calls).toHaveLength(1);
  });

  it('pipeline com design_validation: 3 nodes encadeados', async () => {
    const graph = createSocialMediaOrchestrator(bundle.deps);

    const result = await runSocialMediaOrchestrator(graph, bundle.deps, {
      tenantId: 'novais-digital-internal',
      mode: 'shadow',
      briefing: {
        briefingText: 'Carrossel sobre IA com design validation ativado',
        tom: 'brand_voice_ceo',
        redePrincipal: 'linkedin',
        slidesDesejados: 5,
        isUpsell: false,
        enableDesignValidation: true
      }
    });

    expect(result.carrossel?.status).toBe('completed');
    expect(result.designReport).not.toBeNull();
    expect(result.publications).toHaveLength(4);

    // Cada node abriu 1 span próprio no trace raiz do grafo (3 spans)
    const orchestratorTraceId = result.traceId;
    const orchestratorSpans = bundle.obs.spans.filter(
      (s) => s.traceId === orchestratorTraceId
    );
    expect(orchestratorSpans.map((s) => s.span.name)).toEqual(
      expect.arrayContaining([
        'node:generate_carrossel',
        'node:design_validation',
        'node:publish_multi_network'
      ])
    );
  });

  it('grava trace raiz do orchestrator com sku social-media-orchestrator', async () => {
    const graph = createSocialMediaOrchestrator(bundle.deps);

    await runSocialMediaOrchestrator(graph, bundle.deps, {
      tenantId: 'novais-digital-internal',
      mode: 'shadow',
      briefing: {
        briefingText: 'Briefing válido para teste de trace',
        tom: 'brand_voice_ceo',
        redePrincipal: 'linkedin',
        slidesDesejados: 5,
        isUpsell: false
      }
    });

    const orchestratorTrace = bundle.obs.traces.find(
      (t) => t.context.sku === 'social-media-orchestrator'
    );
    expect(orchestratorTrace).toBeDefined();
    expect(orchestratorTrace?.context.tenantId).toBe('novais-digital-internal');
    expect(orchestratorTrace?.context.mode).toBe('shadow');
    // endTrace foi chamado → output presente
    expect(orchestratorTrace?.output).toBeDefined();
  });

  it('cross-agent composition (P3 full): spans de generate + design dentro do trace raiz do orchestrator', async () => {
    const graph = createSocialMediaOrchestrator(bundle.deps);

    const result = await runSocialMediaOrchestrator(graph, bundle.deps, {
      tenantId: 'novais-digital-internal',
      mode: 'shadow',
      briefing: {
        briefingText: 'Briefing com design_validation ativo',
        tom: 'brand_voice_ceo',
        redePrincipal: 'linkedin',
        slidesDesejados: 5,
        isUpsell: false,
        enableDesignValidation: true
      }
    });

    // P3 full: apenas 1 trace raiz (orchestrator).
    // Use cases não chamam startTrace quando invocados com parentTrace.
    expect(bundle.obs.traces).toHaveLength(1);
    expect(bundle.obs.traces[0].context.sku).toBe('social-media-orchestrator');

    // Spans de todos os use cases aparecem como filhos do trace raiz do orchestrator.
    const orchestratorSpans = bundle.obs.spans.filter(
      (s) => s.traceId === result.traceId
    );
    const spanNames = orchestratorSpans.map((s) => s.span.name);
    expect(spanNames).toEqual(
      expect.arrayContaining([
        'node:generate_carrossel',   // node wrapper
        'copy_generation',           // GenerateCarrosselUseCase interno
        'image_generation_batch',    // GenerateCarrosselUseCase interno
        'node:design_validation',    // node wrapper
        'parallel_slide_generation', // DesignCarrosselUseCase interno
        'node:publish_multi_network' // node wrapper
      ])
    );
  });

  it('C8: rejeita invocação com tenantId vazio no boundary', async () => {
    const graph = createSocialMediaOrchestrator(bundle.deps);

    await expect(
      runSocialMediaOrchestrator(graph, bundle.deps, {
        tenantId: '',
        mode: 'shadow',
        briefing: {
          briefingText: 'Briefing válido',
          tom: 'brand_voice_ceo',
          redePrincipal: 'linkedin',
          slidesDesejados: 5,
          isUpsell: false
        }
      })
    ).rejects.toThrow(/tenantId obrigatório/);
  });

  it('propaga erro de use case sem comer informação', async () => {
    const graph = createSocialMediaOrchestrator(bundle.deps);

    await expect(
      runSocialMediaOrchestrator(graph, bundle.deps, {
        tenantId: 'novais-digital-internal',
        mode: 'shadow',
        briefing: {
          briefingText:
            'Briefing suficientemente longo para passar na validação de tamanho mínimo',
          // Tom inexistente → GenerateCarrosselUseCase lança
          tom: 'tom_inexistente',
          redePrincipal: 'linkedin',
          slidesDesejados: 5,
          isUpsell: false
        }
      })
    ).rejects.toThrow(/System prompt não encontrado/);

    // endTrace ainda foi chamado com erro
    const trace = bundle.obs.traces.find(
      (t) => t.context.sku === 'social-media-orchestrator'
    );
    expect(trace?.error).toBeDefined();
  });
});
