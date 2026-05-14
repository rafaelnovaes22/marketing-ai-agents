// Fakes específicos do copywriter-agent. Reusa FakeObservability do social-media
// re-exportando para conveniência local.

import type {
  EmbeddingsProvider,
  EmbeddingsInput,
  EmbeddingsOutput
} from '../../../src/domain/ports/EmbeddingsProvider.js';
import type {
  VoiceValidator,
  VoiceValidationInput,
  VoiceValidationOutput
} from '../../../src/domain/ports/VoiceValidator.js';
import type {
  LLMProvider,
  LLMGenerateInput,
  LLMGenerateOutput,
  VisionInput
} from '../../../src/domain/ports/LLMProvider.js';

export { FakeObservability } from '../../social-media-agent/unit/fakes.js';

// ───── ProgrammableLLM ─────────────────────────────────────────────
// Permite encadear respostas/erros por chamada (para testar ResilientLLMProvider).

type ProgrammedStep =
  | { kind: 'success'; output: Partial<LLMGenerateOutput> & { text: string } }
  | { kind: 'error'; status: number; message?: string };

export class ProgrammableLLM implements LLMProvider {
  public calls: LLMGenerateInput[] = [];
  public visionCalls: VisionInput[] = [];
  private idx = 0;

  constructor(
    private readonly steps: ProgrammedStep[],
    private readonly model: string = 'fake-llm'
  ) {}

  async generate(input: LLMGenerateInput): Promise<LLMGenerateOutput> {
    this.calls.push(input);
    return this.consumeStep();
  }

  async generateWithVision(input: VisionInput): Promise<LLMGenerateOutput> {
    this.visionCalls.push(input);
    return this.consumeStep();
  }

  modelName(): string {
    return this.model;
  }

  private consumeStep(): LLMGenerateOutput {
    const step = this.steps[Math.min(this.idx, this.steps.length - 1)];
    this.idx++;
    if (step.kind === 'error') {
      const err = new Error(step.message ?? `HTTP ${step.status}`);
      (err as Error & { status?: number }).status = step.status;
      throw err;
    }
    return {
      text: step.output.text,
      inputTokens: step.output.inputTokens ?? 100,
      outputTokens: step.output.outputTokens ?? 50,
      cachedInputTokens: step.output.cachedInputTokens ?? 0,
      costBrl: step.output.costBrl ?? 0.01,
      latencyMs: step.output.latencyMs ?? 50,
      modelUsed: step.output.modelUsed ?? this.model
    };
  }
}

// ───── DeterministicEmbeddings ─────────────────────────────────────
// Mapeia textos → vetores conhecidos por similaridade controlada.

export class DeterministicEmbeddings implements EmbeddingsProvider {
  public calls: EmbeddingsInput[] = [];

  constructor(
    private readonly vectorByText: Map<string, number[]>,
    private readonly dim: number = 4,
    private readonly costPerCall: number = 0.001
  ) {}

  async embed(input: EmbeddingsInput): Promise<EmbeddingsOutput> {
    this.calls.push(input);
    const vectors = input.texts.map((t) => {
      const v = this.vectorByText.get(t);
      if (!v) {
        throw new Error(
          `DeterministicEmbeddings: vetor não registrado para texto: "${t}"`
        );
      }
      if (v.length !== this.dim) {
        throw new Error(
          `DeterministicEmbeddings: vetor com dim ${v.length} ≠ ${this.dim}`
        );
      }
      return v;
    });
    return {
      vectors,
      modelUsed: 'deterministic',
      costBrl: this.costPerCall,
      latencyMs: 5
    };
  }

  dimensions(): number {
    return this.dim;
  }
}

// ───── ProgrammableVoiceValidator ──────────────────────────────────

export class ProgrammableVoiceValidator implements VoiceValidator {
  public calls: VoiceValidationInput[] = [];
  private idx = 0;

  constructor(private readonly scores: number[]) {}

  async validate(input: VoiceValidationInput): Promise<VoiceValidationOutput> {
    this.calls.push(input);
    const score = this.scores[Math.min(this.idx, this.scores.length - 1)];
    this.idx++;
    return {
      score,
      decision: score < 0.6 ? 'reroll' : score < 0.75 ? 'accept_with_warning' : 'accept',
      issues:
        score < 0.75
          ? [
              {
                dimension: 'lexico',
                severity: 'warning',
                description: 'léxico fora do padrão tom'
              }
            ]
          : [],
      costBrl: 0.005,
      latencyMs: 50
    };
  }
}
