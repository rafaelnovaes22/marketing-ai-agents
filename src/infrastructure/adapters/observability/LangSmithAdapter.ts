// Adapter: LangSmith (Observability port — C6 obrigatório para ai_enabled=true)
// Substitui LangfuseAdapter (ADR-006-PROJ).
//
// Modelo de trace:
//   Trace      = 1 execução completa do SKU (ex: 1 carrossel publicado)
//   Span filho = etapa interna (copy_generation, image_generation, brand_validation, publication)
//
// API LangSmith: `RunTree` representa o nó (root ou span). `createChild()`
// cria spans aninhados. `.postRun()` envia a criação ao backend; `.end()`
// fecha com outputs. O envio é fire-and-foundryt (background batcher).

import { Client } from 'langsmith';
import { RunTree } from 'langsmith/run_trees';
import type {
  Observability,
  SpanInput,
  TraceContext
} from '../../../domain/ports/Observability.js';

export interface LangSmithAdapterConfig {
  apiKey: string;
  /**
   * Projeto LangSmith (ex.: marketing-ai-agents-dev | marketing-ai-agents-prod).
   * Override por trace via metadata se necessário.
   */
  projectName: string;
  /**
   * Endpoint da API. Default: https://api.smith.langchain.com
   * (Cloud). Self-host: https://<seu-host>/api.
   */
  apiUrl?: string;
  /**
   * Se false, adapter vira no-op (útil em tests). Default: true.
   */
  tracingEnabled?: boolean;
}

/**
 * Adapter de Observability sobre LangSmith.
 *
 * Mantém um Map traceId → RunTree raiz para permitir criação de spans
 * aninhados (`span()`) e fechamento (`endTrace()`) por chamadas
 * subsequentes — a porta `Observability` é stateless por design (devolve
 * apenas `TraceContext`), então o estado vivo do `RunTree` precisa ficar
 * dentro do adapter.
 */
export class LangSmithAdapter implements Observability {
  private readonly client: Client;
  private readonly projectName: string;
  private readonly tracingEnabled: boolean;
  private readonly activeRuns = new Map<string, RunTree>();

  constructor(config: LangSmithAdapterConfig) {
    if (!config.apiKey) {
      throw new Error('LangSmithAdapter requer LANGSMITH_API_KEY');
    }
    if (!config.projectName) {
      throw new Error('LangSmithAdapter requer projectName');
    }
    this.client = new Client({
      apiKey: config.apiKey,
      apiUrl: config.apiUrl ?? 'https://api.smith.langchain.com'
    });
    this.projectName = config.projectName;
    this.tracingEnabled = config.tracingEnabled ?? true;
  }

  startTrace(
    context: Omit<TraceContext, 'traceId'> & { traceId?: string }
  ): TraceContext {
    const root = new RunTree({
      name: `${context.sku}-execution`,
      run_type: 'chain',
      id: context.traceId,
      project_name: this.projectName,
      client: this.client,
      tracingEnabled: this.tracingEnabled,
      inputs: {
        tenantId: context.tenantId,
        sku: context.sku,
        mode: context.mode
      },
      metadata: {
        sku: context.sku,
        mode: context.mode,
        tenantId: context.tenantId,
        ...context.metadata
      },
      tags: [context.sku, context.mode]
    });

    // Fire-and-foundryt — postRun envia ao batcher; falha não pode quebrar use case.
    void root.postRun().catch(() => {
      /* swallow — telemetria não pode derrubar produção */
    });

    this.activeRuns.set(root.id, root);

    return {
      traceId: root.id,
      tenantId: context.tenantId,
      sku: context.sku,
      mode: context.mode,
      metadata: context.metadata
    };
  }

  async span<T>(
    context: TraceContext,
    spanInput: SpanInput,
    fn: () => Promise<T>
  ): Promise<T> {
    const parent = this.activeRuns.get(context.traceId);
    if (!parent) {
      // Trace não rastreado por este adapter (ex.: parentTrace vindo do grafo
      // mas execução fora do mesmo processo). Roda fn() sem instrumentar e
      // não propaga erro de telemetria.
      return fn();
    }

    const child = parent.createChild({
      name: spanInput.name,
      run_type: 'tool',
      inputs: spanInput.input ? (spanInput.input as Record<string, unknown>) : {},
      start_time: spanInput.startTime.getTime(),
      metadata: spanInput.metadata
    });

    void child.postRun().catch(() => {
      /* swallow */
    });

    const t0 = Date.now();
    try {
      const output = await fn();
      void child
        .end(
          { output },
          undefined,
          Date.now(),
          {
            ...spanInput.metadata,
            costBrl: spanInput.costBrl,
            latencyMs: Date.now() - t0
          }
        )
        .catch(() => {
          /* swallow */
        });
      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      void child
        .end(
          { error: message },
          message,
          Date.now(),
          {
            ...spanInput.metadata,
            costBrl: spanInput.costBrl,
            latencyMs: Date.now() - t0
          }
        )
        .catch(() => {
          /* swallow */
        });
      throw err;
    }
  }

  async endTrace(
    context: TraceContext,
    output?: unknown,
    error?: Error
  ): Promise<void> {
    const root = this.activeRuns.get(context.traceId);
    if (!root) return;

    try {
      await root.end(
        error ? { error: error.message } : (output as Record<string, unknown> | undefined),
        error?.message,
        Date.now(),
        {
          ...context.metadata,
          status: error ? 'failed' : 'completed'
        }
      );
      await root.patchRun();
    } catch {
      /* swallow — telemetria não pode derrubar produção */
    } finally {
      this.activeRuns.delete(context.traceId);
    }
  }
}
