// Adapter: Langfuse (Observability port — C6 obrigatório para ai_enabled=true)
// Trace = 1 carrossel; spans = copy_generation, image_generation, brand_validation, publication.

import { Langfuse } from 'langfuse';
import type {
  Observability,
  SpanInput,
  TraceContext
} from '../../../domain/ports/Observability.js';

export interface LangfuseAdapterConfig {
  publicKey: string;
  secretKey: string;
  host?: string;  // default Langfuse Cloud
}

export class LangfuseAdapter implements Observability {
  private readonly client: Langfuse;

  constructor(config: LangfuseAdapterConfig) {
    if (!config.publicKey || !config.secretKey) {
      throw new Error(
        'LangfuseAdapter requer LANGFUSE_PUBLIC_KEY e LANGFUSE_SECRET_KEY'
      );
    }
    this.client = new Langfuse({
      publicKey: config.publicKey,
      secretKey: config.secretKey,
      baseUrl: config.host ?? 'https://cloud.langfuse.com'
    });
  }

  startTrace(
    context: Omit<TraceContext, 'traceId'> & { traceId?: string }
  ): TraceContext {
    const trace = this.client.trace({
      id: context.traceId,
      name: `${context.sku}-execution`,
      userId: context.tenantId,
      metadata: {
        sku: context.sku,
        mode: context.mode,
        ...context.metadata
      },
      tags: [context.sku, context.mode]
    });

    return {
      traceId: trace.id,
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
    const langfuseSpan = this.client.span({
      traceId: context.traceId,
      name: spanInput.name,
      input: spanInput.input,
      startTime: spanInput.startTime,
      metadata: spanInput.metadata
    });

    try {
      const output = await fn();
      langfuseSpan.update({
        output,
        metadata: {
          ...spanInput.metadata,
          costBrl: spanInput.costBrl
        }
      });
      langfuseSpan.end();
      return output;
    } catch (err) {
      langfuseSpan.update({
        output: { error: err instanceof Error ? err.message : String(err) },
        level: 'ERROR'
      });
      langfuseSpan.end();
      throw err;
    }
  }

  async endTrace(
    context: TraceContext,
    output?: unknown,
    error?: Error
  ): Promise<void> {
    this.client.trace({
      id: context.traceId,
      output: error ? { error: error.message } : output,
      metadata: {
        ...context.metadata,
        status: error ? 'failed' : 'completed'
      }
    });

    await this.client.flushAsync();
  }
}
