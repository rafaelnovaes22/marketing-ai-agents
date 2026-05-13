// Fakes para testes — implementam os ports sem chamar APIs reais
// Usados em testes integration de use cases (sem custo, sem latência real)

import type {
  LLMProvider,
  LLMGenerateInput,
  LLMGenerateOutput,
  VisionInput
} from '../../../src/domain/ports/LLMProvider.js';
import type {
  ImageGenProvider,
  ImageGenInput,
  ImageGenOutput
} from '../../../src/domain/ports/ImageGenProvider.js';
import type {
  BrandValidator,
  BrandValidationInput,
  BrandValidationOutput
} from '../../../src/domain/ports/BrandValidator.js';
import type {
  SocialPublisher,
  PublishInput,
  PublishOutput
} from '../../../src/domain/ports/SocialPublisher.js';
import type {
  Observability,
  TraceContext,
  SpanInput
} from '../../../src/domain/ports/Observability.js';
import type { RedeValue } from '../../../src/domain/carrossel/RedeSocial.js';

// ───── FakeLLM ────────────────────────────────────────────────────

export class FakeLLM implements LLMProvider {
  public calls: LLMGenerateInput[] = [];
  public visionCalls: VisionInput[] = [];

  constructor(public mockText: string = '{}') {}

  async generate(input: LLMGenerateInput): Promise<LLMGenerateOutput> {
    this.calls.push(input);
    return {
      text: this.mockText,
      inputTokens: 1000,
      outputTokens: 500,
      cachedInputTokens: 700,
      costBrl: 0.05,
      latencyMs: 100,
      modelUsed: 'fake-claude-sonnet-4.6'
    };
  }

  async generateWithVision(input: VisionInput): Promise<LLMGenerateOutput> {
    this.visionCalls.push(input);
    return {
      text: this.mockText,
      inputTokens: 1500,
      outputTokens: 200,
      cachedInputTokens: 0,
      costBrl: 0.04,
      latencyMs: 200,
      modelUsed: 'fake-claude-sonnet-4.6-vision'
    };
  }

  modelName(): string {
    return 'fake-claude-sonnet-4.6';
  }
}

// ───── FakeImageGen ───────────────────────────────────────────────

export class FakeImageGen implements ImageGenProvider {
  public calls: ImageGenInput[] = [];

  constructor(
    private readonly _providerName: 'imagen_4' | 'ideogram_v2' = 'imagen_4'
  ) {}

  async generate(input: ImageGenInput): Promise<ImageGenOutput> {
    this.calls.push(input);
    return {
      imageUrl: `https://fake-cdn.local/${this._providerName}/${Date.now()}.png`,
      imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWNgYGBgAAAABQABXvMqOgAAAABJRU5ErkJggg==',
      costBrl: this._providerName === 'imagen_4' ? 0.21 : 0.11,
      latencyMs: 2000,
      providerName: this._providerName,
      modelVersion: `fake-${this._providerName}-v1`
    };
  }

  providerName(): 'imagen_4' | 'ideogram_v2' {
    return this._providerName;
  }
}

// ───── FakeBrandValidator ─────────────────────────────────────────

export class FakeBrandValidator implements BrandValidator {
  public calls: BrandValidationInput[] = [];

  constructor(public mockScore: number = 0.99) {}

  async validate(input: BrandValidationInput): Promise<BrandValidationOutput> {
    this.calls.push(input);
    return {
      score: this.mockScore,
      decision:
        this.mockScore >= 0.99
          ? 'accept'
          : this.mockScore >= 0.96
            ? 'accept_with_warning'
            : 'retry',
      issues: [],
      costBrl: 0.025,
      latencyMs: 800
    };
  }
}

// ───── FakeSocialPublisher ────────────────────────────────────────

export class FakeSocialPublisher implements SocialPublisher {
  public calls: PublishInput[] = [];
  public shouldFail: boolean = false;

  constructor(private readonly _supportedRedes: RedeValue[]) {}

  supportsRede(rede: RedeValue): boolean {
    return this._supportedRedes.includes(rede);
  }

  async publish(input: PublishInput): Promise<PublishOutput> {
    this.calls.push(input);
    if (this.shouldFail) {
      return {
        status: 'failed',
        errorMessage: 'Fake failure',
        costBrl: 0,
        latencyMs: 50,
        attemptsCount: 1
      };
    }
    return {
      status: 'published',
      externalPostId: `fake_post_${Date.now()}`,
      externalUrl: `https://fake.local/post/${Date.now()}`,
      costBrl: 0.053,
      latencyMs: 500,
      attemptsCount: 1
    };
  }
}

// ───── FakeObservability ──────────────────────────────────────────

export class FakeObservability implements Observability {
  public traces: Array<{ context: TraceContext; output?: unknown; error?: Error }> = [];
  public spans: Array<{ traceId: string; span: SpanInput; ok: boolean }> = [];

  startTrace(
    context: Omit<TraceContext, 'traceId'> & { traceId?: string }
  ): TraceContext {
    const ctx: TraceContext = {
      traceId: context.traceId ?? `trace_${Date.now()}_${Math.random()}`,
      tenantId: context.tenantId,
      sku: context.sku,
      mode: context.mode,
      metadata: context.metadata
    };
    this.traces.push({ context: ctx });
    return ctx;
  }

  async span<T>(
    context: TraceContext,
    spanInput: SpanInput,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      const out = await fn();
      this.spans.push({ traceId: context.traceId, span: spanInput, ok: true });
      return out;
    } catch (err) {
      this.spans.push({ traceId: context.traceId, span: spanInput, ok: false });
      throw err;
    }
  }

  async endTrace(
    context: TraceContext,
    output?: unknown,
    error?: Error
  ): Promise<void> {
    const trace = this.traces.find((t) => t.context.traceId === context.traceId);
    if (trace) {
      trace.output = output;
      trace.error = error;
    }
  }
}
