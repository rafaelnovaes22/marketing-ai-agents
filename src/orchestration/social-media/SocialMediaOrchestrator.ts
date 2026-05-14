// SocialMediaOrchestrator — primeiro grafo LangGraph do projeto (ADR-005-PROJ).
//
// Encadeia 3 nodes que compõem o pipeline do social-media-agent:
//
//   START → generate_carrossel → publish_multi_network → END
//                ↑ design_validation (opcional, ADR-004-DES composition)
//
// • generate_carrossel — invoca GenerateCarrosselUseCase (copy + imagens +
//   brand validation por slide).
// • design_validation  — opcional. Quando ligado, invoca DesignCarrosselUseCase
//   para gerar relatório de brand compliance dedicado (composability:
//   designer-agent reaproveitado por social-media-agent).
// • publish_multi_network — invoca PublishMultiNetworkUseCase nas 4 redes.
//
// Princípios reforçados:
//   P1 (LangGraph runtime)  — único arquivo orchestration por agent.
//   P2 (BaseGraphState C8)  — herda tenantId/traceContext/mode obrigatórios.
//   P3 (parent-aware trace) — cada node abre 1 span no traceContext do grafo;
//                              o use case publish-multi-network já é
//                              parent-aware (recebe traceContext). As outras
//                              use cases abrem o próprio trace; o trace
//                              raiz do grafo (no LangSmithAdapter) é separado
//                              mas referenciado por metadata.parent_trace_id
//                              — limitação documentada para refator C5 (P3 full).
//   P4 (DI manual)          — sem container; factory recebe deps via parâmetro.

import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

import { BaseGraphState, validateBaseInput } from '../state/BaseGraphState.js';
import { GenerateCarrosselUseCase } from '../../application/social-media-agent/GenerateCarrosselUseCase.js';
import {
  PublishMultiNetworkUseCase,
  type PublishResult
} from '../../application/social-media-agent/PublishMultiNetworkUseCase.js';
import { DesignCarrosselUseCase } from '../../application/designer-agent/DesignCarrosselUseCase.js';
import { DesignBriefing } from '../../domain/designer/DesignBriefing.js';
import { Carrossel } from '../../domain/carrossel/Carrossel.js';
import { DesignCarrossel } from '../../domain/designer/DesignCarrossel.js';
import { RedeSocial } from '../../domain/carrossel/RedeSocial.js';
import type { Observability, TraceContext } from '../../domain/ports/Observability.js';

// ─── Briefing público do orchestrator ────────────────────────────────────

export interface SocialMediaOrchestratorBriefing {
  briefingText: string;
  tom: string;
  redePrincipal: 'linkedin' | 'instagram' | 'facebook' | 'twitter';
  slidesDesejados: number;
  isUpsell: boolean;
  /** Quando true, roda DesignCarrosselUseCase em paralelo como reforço. */
  enableDesignValidation?: boolean;
  /** Default: todas as 4 redes. */
  redesPublicacao?: RedeSocial[];
}

// ─── State ───────────────────────────────────────────────────────────────

export const SocialMediaState = Annotation.Root({
  ...BaseGraphState.spec,
  briefing: Annotation<SocialMediaOrchestratorBriefing>({
    reducer: (_, next) => next,
    default: () => ({
      briefingText: '',
      tom: '',
      redePrincipal: 'linkedin',
      slidesDesejados: 5,
      isUpsell: false
    })
  }),
  carrossel: Annotation<Carrossel | null>({
    reducer: (_, next) => next,
    default: () => null
  }),
  designReport: Annotation<DesignCarrossel | null>({
    reducer: (_, next) => next,
    default: () => null
  }),
  publications: Annotation<PublishResult[]>({
    reducer: (_, next) => next,
    default: () => []
  }),
  error: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null
  })
});

export type SocialMediaStateType = typeof SocialMediaState.State;

// ─── Dependencies ────────────────────────────────────────────────────────

export interface SocialMediaOrchestratorDeps {
  generateCarrossel: GenerateCarrosselUseCase;
  designCarrossel: DesignCarrosselUseCase;
  publishMultiNetwork: PublishMultiNetworkUseCase;
  observability: Observability;
}

// ─── Factory P4 (DI manual) ──────────────────────────────────────────────

/**
 * Cria e compila o grafo do social-media-agent.
 * Retorna `CompiledStateGraph` pronto para `.invoke()`.
 *
 * Uso típico (composition root):
 *
 *   const graph = createSocialMediaOrchestrator({ generateCarrossel, ... });
 *   const result = await graph.invoke(
 *     validateBaseInput({ tenantId, traceContext, mode }) as never,
 *     { ...stateExtras }
 *   );
 */
export function createSocialMediaOrchestrator(deps: SocialMediaOrchestratorDeps) {
  const graph = new StateGraph(SocialMediaState)
    .addNode('generate_carrossel', async (state) =>
      runGenerateCarrosselNode(state, deps)
    )
    .addNode('design_validation', async (state) =>
      runDesignValidationNode(state, deps)
    )
    .addNode('publish_multi_network', async (state) =>
      runPublishNode(state, deps)
    )
    .addEdge(START, 'generate_carrossel')
    .addConditionalEdges(
      'generate_carrossel',
      (state: SocialMediaStateType) =>
        state.briefing.enableDesignValidation === true
          ? 'design_validation'
          : 'publish_multi_network'
    )
    .addEdge('design_validation', 'publish_multi_network')
    .addEdge('publish_multi_network', END);

  return graph.compile();
}

// ─── Node implementations (1 span no traceContext do grafo) ─────────────

async function runGenerateCarrosselNode(
  state: SocialMediaStateType,
  deps: SocialMediaOrchestratorDeps
): Promise<Partial<SocialMediaStateType>> {
  const trace: TraceContext = state.traceContext;

  const carrossel = await deps.observability.span(
    trace,
    {
      name: 'node:generate_carrossel',
      input: {
        slidesDesejados: state.briefing.slidesDesejados,
        tom: state.briefing.tom,
        redePrincipal: state.briefing.redePrincipal
      },
      startTime: new Date()
    },
    async () =>
      deps.generateCarrossel.execute({
        briefingText: state.briefing.briefingText,
        tom: state.briefing.tom,
        redePrincipal: state.briefing.redePrincipal,
        slidesDesejados: state.briefing.slidesDesejados,
        isUpsell: state.briefing.isUpsell,
        tenantId: state.tenantId,
        mode: state.mode
      })
  );

  return { carrossel };
}

async function runDesignValidationNode(
  state: SocialMediaStateType,
  deps: SocialMediaOrchestratorDeps
): Promise<Partial<SocialMediaStateType>> {
  if (!state.carrossel) {
    return { error: 'design_validation chamado sem carrossel no state' };
  }

  const trace: TraceContext = state.traceContext;
  const briefing = DesignBriefing.create({
    tema: state.briefing.briefingText.slice(0, 200),
    numSlides: state.briefing.slidesDesejados,
    dominantMode: 'dark',
    caller: 'social-media-agent',
    tenantId: state.tenantId
  });

  const slideSpecs = state.carrossel.slides.map((slide) => ({
    order: slide.order,
    role: slide.role,
    textOverlay: slide.textOverlay ?? undefined,
    visualBrief: slide.visualBrief
  }));

  const designReport = await deps.observability.span(
    trace,
    {
      name: 'node:design_validation',
      input: { numSlides: slideSpecs.length },
      startTime: new Date()
    },
    async () =>
      deps.designCarrossel.execute({
        briefing,
        slideSpecs,
        mode: state.mode
      })
  );

  return { designReport };
}

async function runPublishNode(
  state: SocialMediaStateType,
  deps: SocialMediaOrchestratorDeps
): Promise<Partial<SocialMediaStateType>> {
  if (!state.carrossel) {
    return { error: 'publish_multi_network chamado sem carrossel no state' };
  }

  const trace: TraceContext = state.traceContext;
  const redes = state.briefing.redesPublicacao ?? RedeSocial.todas();

  const publications = await deps.observability.span(
    trace,
    {
      name: 'node:publish_multi_network',
      input: { redes: redes.map((r) => r.value) },
      startTime: new Date()
    },
    async () => deps.publishMultiNetwork.execute(state.carrossel!, redes, trace)
  );

  return { publications };
}

// ─── Convenience runner — startTrace + invoke + endTrace ────────────────

export interface RunSocialMediaInput {
  tenantId: string;
  mode: 'shadow' | 'assisted' | 'autonomous';
  briefing: SocialMediaOrchestratorBriefing;
}

export interface RunSocialMediaOutput {
  carrossel: Carrossel | null;
  designReport: DesignCarrossel | null;
  publications: PublishResult[];
  traceId: string;
}

/**
 * Helper para invocar o grafo com `startTrace` + `endTrace` automáticos.
 * Encapsula a montagem do `traceContext` raiz — o consumidor só passa
 * o briefing e o tenant.
 */
export async function runSocialMediaOrchestrator(
  graph: ReturnType<typeof createSocialMediaOrchestrator>,
  deps: Pick<SocialMediaOrchestratorDeps, 'observability'>,
  input: RunSocialMediaInput
): Promise<RunSocialMediaOutput> {
  const traceContext = deps.observability.startTrace({
    tenantId: input.tenantId,
    sku: 'social-media-orchestrator',
    mode: input.mode,
    metadata: {
      tom: input.briefing.tom,
      rede_principal: input.briefing.redePrincipal,
      slides_desejados: input.briefing.slidesDesejados,
      design_validation: input.briefing.enableDesignValidation === true
    }
  });

  const initialState = validateBaseInput({
    tenantId: input.tenantId,
    mode: input.mode,
    traceContext
  });

  try {
    const result = (await graph.invoke({
      ...initialState,
      briefing: input.briefing
    } as Partial<SocialMediaStateType>)) as SocialMediaStateType;

    await deps.observability.endTrace(traceContext, {
      published_count: result.publications.length,
      carrossel_completed: result.carrossel?.status === 'completed'
    });

    return {
      carrossel: result.carrossel,
      designReport: result.designReport,
      publications: result.publications,
      traceId: traceContext.traceId
    };
  } catch (err) {
    await deps.observability.endTrace(
      traceContext,
      undefined,
      err instanceof Error ? err : new Error(String(err))
    );
    throw err;
  }
}
