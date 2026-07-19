// Composition Root — wire-up de todos os adapters reais a partir do .env.
//
// Pré-requisitos (.env):
//   ANTHROPIC_API_KEY            — Claude (LLM + BrandValidator)
//   LANGSMITH_API_KEY            — tracing C6
//   LANGSMITH_PROJECT            — ex: marketing-ai-agents-dev
//   LANGSMITH_API_URL            — default: https://api.smith.langchain.com
//   LANGSMITH_TRACING            — "true"|"false" (default: true)
//   GOOGLE_CLOUD_PROJECT_ID      — Vertex AI Imagen 4
//   IDEOGRAM_API_KEY             — fallback imagens com texto
//   ZERNIO_API_KEY               — publicação LI/IG/FB
//   TWITTER_API_KEY              — publicação Twitter (thread)
//   TWITTER_API_SECRET
//   TWITTER_ACCESS_TOKEN
//   TWITTER_ACCESS_TOKEN_SECRET

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LangSmithAdapter } from '../adapters/observability/LangSmithAdapter.js';
import { ClaudeAdapter } from '../adapters/llm/ClaudeAdapter.js';
import { ResilientLLMProvider } from '../adapters/llm/ResilientLLMProvider.js';
import { ImagenAdapter } from '../adapters/image-gen/ImagenAdapter.js';
import { IdeogramAdapter } from '../adapters/image-gen/IdeogramAdapter.js';
import { BrandValidatorAdapter } from '../adapters/brand/BrandValidatorAdapter.js';
import { ZernioAdapter } from '../adapters/social-publishers/ZernioAdapter.js';
import { TwitterAdapter } from '../adapters/social-publishers/TwitterAdapter.js';
import { BrandGuide } from '../../domain/carrossel/BrandGuide.js';
import { GenerateCarrosselUseCase } from '../../application/social-media-agent/GenerateCarrosselUseCase.js';
import { DesignCarrosselUseCase } from '../../application/designer-agent/DesignCarrosselUseCase.js';
import { PublishMultiNetworkUseCase } from '../../application/social-media-agent/PublishMultiNetworkUseCase.js';
import {
  createSocialMediaOrchestrator,
  runSocialMediaOrchestrator,
  type SocialMediaOrchestratorDeps,
  type RunSocialMediaInput,
  type RunSocialMediaOutput
} from '../../orchestration/social-media/SocialMediaOrchestrator.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  return val;
}

// ─── BrandGuide (Phase 1 — single-tenant Novais Digital) ─────────────────────────────

function buildNovaisBrandGuide(): BrandGuide {
  return new BrandGuide(
    '1.0.0',
    'Novais Digital',
    'Inteligência que acelera resultados.',
    {
      primary: {
        navy_deep:   '#0A1628',
        royal_blue:  '#2563EB',
        cyan_accent: '#5EEAD4',
        white:       '#FFFFFF'
      },
      secondary: {
        off_white:       '#F5F7FA',
        text_secondary:  '#6B7280',
        card_bg_dark:    '#0F1B2D'
      },
      status: {
        badge_red:   '#DC2626',
        badge_green: '#10B981'
      }
    },
    {
      headings: { family: 'Inter', weights: [800] },
      body:     { family: 'Inter', weights: [400] },
      logo:     { family: 'Inter', weight: 700 }
    },
    { exact_match_required: 99, warning_threshold: 96, rejection_threshold: 96 },
    {}
  );
}

// ─── System prompts loader ────────────────────────────────────────────────────

function loadSystemPrompts(promptsRoot: string): Map<string, string> {
  const toms: Array<{ key: string; relPath: string }> = [
    { key: 'brand_voice_ceo', relPath: 'social-media-agent/system-prompts/brand_voice_ceo.md' }
  ];

  const map = new Map<string, string>();
  for (const { key, relPath } of toms) {
    try {
      map.set(key, readFileSync(join(promptsRoot, relPath), 'utf-8'));
    } catch {
      // Prompt ausente — use case lança na 1ª execução real (detectado em smoke test)
    }
  }
  return map;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CompositionConfig {
  /** Raiz dos arquivos de prompts. Default: process.cwd()/prompts */
  promptsRoot?: string;
}

/** Instancia todas as deps reais do SocialMediaOrchestrator a partir do .env. */
export function createSocialMediaDeps(config: CompositionConfig = {}): SocialMediaOrchestratorDeps {
  const promptsRoot = config.promptsRoot ?? join(process.cwd(), 'prompts');

  const observability = new LangSmithAdapter({
    apiKey:          requireEnv('LANGSMITH_API_KEY'),
    projectName:     requireEnv('LANGSMITH_PROJECT'),
    apiUrl:          process.env['LANGSMITH_API_URL'],
    tracingEnabled:  process.env['LANGSMITH_TRACING'] !== 'false'
  });

  const claudeBase     = new ClaudeAdapter({ apiKey: requireEnv('ANTHROPIC_API_KEY') });
  const llmCopywriter  = new ResilientLLMProvider({ primary: claudeBase });
  const brandGuide     = buildNovaisBrandGuide();

  const brandValidator = new BrandValidatorAdapter({ llmProvider: claudeBase, brandGuide });

  const imageGenPrimary  = new ImagenAdapter({ projectId: requireEnv('GOOGLE_CLOUD_PROJECT_ID') });
  const imageGenFallback = new IdeogramAdapter({ apiKey: requireEnv('IDEOGRAM_API_KEY') });

  const publisherZernio  = new ZernioAdapter({ apiKey: requireEnv('ZERNIO_API_KEY') });
  const publisherTwitter = new TwitterAdapter({
    apiKey:             requireEnv('TWITTER_API_KEY'),
    apiSecret:          requireEnv('TWITTER_API_SECRET'),
    accessToken:        requireEnv('TWITTER_ACCESS_TOKEN'),
    accessTokenSecret:  requireEnv('TWITTER_ACCESS_TOKEN_SECRET')
  });

  const systemPromptByTom = loadSystemPrompts(promptsRoot);

  const generateCarrossel = new GenerateCarrosselUseCase({
    llmCopywriter,
    imageGenPrimary,
    imageGenFallback,
    brandValidator,
    brandGuide,
    observability,
    systemPromptByTom
  });

  const designCarrossel = new DesignCarrosselUseCase({
    imagenAdapter:   imageGenPrimary,
    ideogramAdapter: imageGenFallback,
    brandValidator,
    brandGuide,
    observability
  });

  const publishMultiNetwork = new PublishMultiNetworkUseCase({
    publisherZernio,
    publisherTwitter,
    observability
  });

  return { generateCarrossel, designCarrossel, publishMultiNetwork, observability };
}

/**
 * Ponto de entrada para uso em produção / SHADOW run.
 * Cria deps + grafo e expõe `run()` direto.
 *
 * Exemplo:
 *   const { run } = createProductionSocialMediaPipeline();
 *   const out = await run({ tenantId: 'novais-digital-internal', mode: 'shadow', briefing: {...} });
 */
export function createProductionSocialMediaPipeline(config?: CompositionConfig): {
  run: (input: RunSocialMediaInput) => Promise<RunSocialMediaOutput>;
} {
  const deps  = createSocialMediaDeps(config);
  const graph = createSocialMediaOrchestrator(deps);

  return {
    run: (input) => runSocialMediaOrchestrator(graph, deps, input)
  };
}
