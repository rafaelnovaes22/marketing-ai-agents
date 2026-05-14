// Wrapper LLMProvider — ADR-002-CW (T2.14)
// Política:
//   • Retry com backoff exponencial em 429/529/5xx (até `maxRetries`).
//   • Circuit breaker: após `breakerThreshold` 529 consecutivos no `breakerWindowMs`,
//     o breaker abre e roteia para `fallback` (Mistral) até `breakerCooldownMs`.
//   • Métricas expostas via callback opcional `onFallback` para Langfuse.
//
// Os adapters primário e fallback continuam implementando LLMProvider — este wrapper
// é também um LLMProvider, mantendo o resto da aplicação inalterada.

import type {
  LLMProvider,
  LLMGenerateInput,
  LLMGenerateOutput,
  VisionInput
} from '../../../domain/ports/LLMProvider.js';

export interface ResilientLLMConfig {
  primary: LLMProvider;
  fallback?: LLMProvider;
  maxRetries?: number;          // default 3
  baseDelayMs?: number;         // default 250
  maxDelayMs?: number;          // default 8000
  breakerThreshold?: number;    // default 3 (529 consecutivos)
  breakerWindowMs?: number;     // default 60_000
  breakerCooldownMs?: number;   // default 60_000
  onFallback?: (info: FallbackInfo) => void;
  /**
   * Função usada para sleep. Injetável para testes (default: setTimeout-based).
   */
  sleepFn?: (ms: number) => Promise<void>;
  /**
   * Clock atual. Injetável para testes determinísticos (default: Date.now).
   */
  now?: () => number;
}

export interface FallbackInfo {
  reason: 'anthropic_overloaded' | 'breaker_open';
  attempt: number;
  primaryError?: string;
  timestamp: number;
}

interface LLMErrorShape {
  status?: number;
  message?: string;
}

export class ResilientLLMProvider implements LLMProvider {
  private readonly primary: LLMProvider;
  private readonly fallback: LLMProvider | undefined;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly breakerThreshold: number;
  private readonly breakerWindowMs: number;
  private readonly breakerCooldownMs: number;
  private readonly onFallback?: (info: FallbackInfo) => void;
  private readonly sleepFn: (ms: number) => Promise<void>;
  private readonly now: () => number;

  // Estado do breaker (instance-level — uma instância por SKU/processo)
  private consecutive529s: number[] = []; // timestamps (now())
  private breakerOpenedAt: number | null = null;

  constructor(config: ResilientLLMConfig) {
    this.primary = config.primary;
    this.fallback = config.fallback;
    this.maxRetries = config.maxRetries ?? 3;
    this.baseDelayMs = config.baseDelayMs ?? 250;
    this.maxDelayMs = config.maxDelayMs ?? 8_000;
    this.breakerThreshold = config.breakerThreshold ?? 3;
    this.breakerWindowMs = config.breakerWindowMs ?? 60_000;
    this.breakerCooldownMs = config.breakerCooldownMs ?? 60_000;
    this.onFallback = config.onFallback;
    this.sleepFn = config.sleepFn ?? defaultSleep;
    this.now = config.now ?? Date.now;
  }

  async generate(input: LLMGenerateInput): Promise<LLMGenerateOutput> {
    return this.executeWithResilience(
      (p) => p.generate(input),
      'generate'
    );
  }

  async generateWithVision(input: VisionInput): Promise<LLMGenerateOutput> {
    return this.executeWithResilience(
      (p) => p.generateWithVision(input),
      'generateWithVision'
    );
  }

  modelName(): string {
    return this.primary.modelName();
  }

  /** Exposto para observabilidade/diagnóstico. */
  breakerState(): 'closed' | 'open' {
    return this.isBreakerOpen() ? 'open' : 'closed';
  }

  private async executeWithResilience(
    call: (p: LLMProvider) => Promise<LLMGenerateOutput>,
    opName: string
  ): Promise<LLMGenerateOutput> {
    // Breaker aberto: usa fallback direto (não tenta primário).
    if (this.isBreakerOpen()) {
      if (!this.fallback) {
        throw new Error(
          `ResilientLLMProvider.${opName}: circuit breaker aberto e nenhum fallback configurado`
        );
      }
      this.emitFallback({
        reason: 'breaker_open',
        attempt: 0,
        timestamp: this.now()
      });
      return call(this.fallback);
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const out = await call(this.primary);
        this.recordSuccess();
        return out;
      } catch (err) {
        lastError = err;
        const status = extractStatus(err);

        if (status === 529) this.record529();
        const retryable = isRetryableStatus(status);

        if (!retryable) throw err;

        // Breaker disparou neste erro: roteia imediatamente para fallback.
        if (this.isBreakerOpen() && this.fallback) {
          this.emitFallback({
            reason: 'anthropic_overloaded',
            attempt,
            primaryError: errMessage(err),
            timestamp: this.now()
          });
          return call(this.fallback);
        }

        if (attempt < this.maxRetries) {
          await this.sleepFn(this.computeBackoff(attempt));
          continue;
        }
      }
    }

    // Esgotou retries — tenta fallback se houver.
    if (this.fallback) {
      this.emitFallback({
        reason: 'anthropic_overloaded',
        attempt: this.maxRetries,
        primaryError: errMessage(lastError),
        timestamp: this.now()
      });
      return call(this.fallback);
    }

    throw lastError;
  }

  private computeBackoff(attempt: number): number {
    // 2^(attempt-1) * base, com jitter [0,1) e cap em maxDelayMs.
    const exp = Math.pow(2, attempt - 1) * this.baseDelayMs;
    const jitter = Math.random() * this.baseDelayMs;
    return Math.min(exp + jitter, this.maxDelayMs);
  }

  private record529(): void {
    const t = this.now();
    this.consecutive529s.push(t);
    // Limpa entradas fora da janela
    this.consecutive529s = this.consecutive529s.filter(
      (ts) => t - ts <= this.breakerWindowMs
    );
    if (this.consecutive529s.length >= this.breakerThreshold) {
      this.breakerOpenedAt = t;
    }
  }

  private recordSuccess(): void {
    // Sucesso reseta a janela de 529 consecutivos
    this.consecutive529s = [];
  }

  private isBreakerOpen(): boolean {
    if (this.breakerOpenedAt === null) return false;
    const elapsed = this.now() - this.breakerOpenedAt;
    if (elapsed >= this.breakerCooldownMs) {
      // Half-open: fecha e dá uma chance ao primário.
      this.breakerOpenedAt = null;
      this.consecutive529s = [];
      return false;
    }
    return true;
  }

  private emitFallback(info: FallbackInfo): void {
    if (this.onFallback) {
      try {
        this.onFallback(info);
      } catch {
        // Callback não pode quebrar o fluxo principal
      }
    }
  }
}

// ─────────── Helpers ─────────────

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractStatus(err: unknown): number | undefined {
  const e = err as LLMErrorShape | null;
  if (e && typeof e === 'object' && typeof e.status === 'number') {
    return e.status;
  }
  // Anthropic SDK encoda status em mensagem em alguns casos: "529 Overloaded"
  const msg = errMessage(err);
  const match = msg.match(/\b(429|529|5\d{2})\b/);
  return match ? parseInt(match[1], 10) : undefined;
}

function isRetryableStatus(status: number | undefined): boolean {
  if (status === undefined) return false;
  return status === 429 || status === 529 || (status >= 500 && status < 600);
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}
