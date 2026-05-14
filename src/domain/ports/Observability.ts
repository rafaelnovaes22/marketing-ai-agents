// Port: Observability (C6)
// Implementação primária: LangSmith (ADR-006-PROJ). Fallback: logs estruturados Pino.

export interface TraceContext {
  traceId: string;
  spanId?: string;
  tenantId: string;
  sku: string;                   // 'social-media-agent'
  mode: 'shadow' | 'assisted' | 'autonomous';
  metadata?: Record<string, unknown>;
}

export interface SpanInput {
  name: string;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  costBrl?: number;
  startTime: Date;
  endTime?: Date;
}

export interface Observability {
  startTrace(context: Omit<TraceContext, 'traceId'> & { traceId?: string }): TraceContext;
  span<T>(context: TraceContext, span: SpanInput, fn: () => Promise<T>): Promise<T>;
  endTrace(context: TraceContext, output?: unknown, error?: Error): Promise<void>;
}
