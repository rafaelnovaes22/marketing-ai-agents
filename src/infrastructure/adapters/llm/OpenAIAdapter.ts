// Adapter: OpenAI Chat Completions (GPT-4o / GPT-4o-mini)
// Implementa LLMProvider port via fetch nativo — sem SDK adicional.
// Usado em benchmark e como fallback opcional no ResilientLLMProvider.
//
// Modelos suportados + preços USD/1M tokens (2025):
//   gpt-4o          input $2.50  output $10.00  cached $1.25
//   gpt-4o-mini     input $0.15  output $0.60   cached $0.075
//   gpt-4.1         input $2.00  output $8.00   cached $0.50
//   gpt-4.1-mini    input $0.40  output $1.60   cached $0.10

import type {
  LLMProvider,
  LLMGenerateInput,
  LLMGenerateOutput,
  VisionInput
} from '../../../domain/ports/LLMProvider.js';

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const USD_TO_BRL = 5.3;

interface ModelPricing {
  inputPerMTok:  number;
  outputPerMTok: number;
  cachedPerMTok: number;
}

const PRICING: Record<string, ModelPricing> = {
  // GPT-5.x (2026)
  'gpt-5.5':         { inputPerMTok: 5.00,  outputPerMTok: 30.00, cachedPerMTok: 2.50  },
  'gpt-5.5-pro':     { inputPerMTok: 30.00, outputPerMTok:180.00, cachedPerMTok:15.00  },
  'gpt-5.4':         { inputPerMTok: 2.50,  outputPerMTok: 15.00, cachedPerMTok: 1.25  },
  // GPT-4.x (2025)
  'gpt-4o':          { inputPerMTok: 2.50,  outputPerMTok: 10.00, cachedPerMTok: 1.25  },
  'gpt-4o-mini':     { inputPerMTok: 0.15,  outputPerMTok:  0.60, cachedPerMTok: 0.075 },
  'gpt-4.1':         { inputPerMTok: 2.00,  outputPerMTok:  8.00, cachedPerMTok: 0.50  },
  'gpt-4.1-mini':    { inputPerMTok: 0.40,  outputPerMTok:  1.60, cachedPerMTok: 0.10  },
  // Reasoning (o-series)
  'o3':              { inputPerMTok: 2.00,  outputPerMTok:  8.00, cachedPerMTok: 0.50  },
  'o4-mini':         { inputPerMTok: 0.55,  outputPerMTok:  2.20, cachedPerMTok: 0.14  },
};

export interface OpenAIAdapterConfig {
  apiKey: string;
  model?: string;           // default: 'gpt-4o'
  defaultMaxTokens?: number; // default: 4096
}

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
  model: string;
}

export class OpenAIAdapter implements LLMProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly defaultMaxTokens: number;

  constructor(config: OpenAIAdapterConfig) {
    if (!config.apiKey) throw new Error('OpenAIAdapter requer OPENAI_API_KEY');
    this.apiKey          = config.apiKey;
    this.model           = config.model ?? 'gpt-4o';
    this.defaultMaxTokens = config.defaultMaxTokens ?? 4096;
  }

  async generate(input: LLMGenerateInput): Promise<LLMGenerateOutput> {
    const start = Date.now();

    const messages = input.messages.map((m) => ({ role: m.role, content: m.content }));

    const body = {
      model:      this.model,
      messages,
      ...this.tokenParam(input.maxTokens ?? this.defaultMaxTokens),
      temperature: input.temperature ?? 0.7
    };

    const data = await this.post<OpenAIResponse>(body);
    const latencyMs = Date.now() - start;

    const text       = data.choices[0]?.message.content ?? '';
    const inputToks  = data.usage.prompt_tokens;
    const outputToks = data.usage.completion_tokens;
    const cachedToks = data.usage.prompt_tokens_details?.cached_tokens ?? 0;

    return {
      text,
      inputTokens:        inputToks,
      outputTokens:       outputToks,
      cachedInputTokens:  cachedToks,
      costBrl:            this.calcCostBrl(inputToks, cachedToks, outputToks),
      latencyMs,
      modelUsed:          data.model
    };
  }

  async generateWithVision(input: VisionInput): Promise<LLMGenerateOutput> {
    const start = Date.now();

    // Monta mensagens com image_url (base64 inline)
    const messages = input.messages.map((m, idx) => {
      const isLastUser = m.role === 'user' && idx === input.messages.findLastIndex((x) => x.role === 'user');
      if (isLastUser && input.images.length > 0) {
        return {
          role: 'user',
          content: [
            ...input.images.map((img) => ({
              type: 'image_url',
              image_url: { url: `data:${img.mimeType};base64,${img.base64}` }
            })),
            { type: 'text', text: m.content }
          ]
        };
      }
      return { role: m.role, content: m.content };
    });

    const body = {
      model:       this.model,
      messages,
      ...this.tokenParam(input.maxTokens ?? this.defaultMaxTokens),
      temperature: input.temperature ?? 0.3
    };

    const data = await this.post<OpenAIResponse>(body);
    const latencyMs = Date.now() - start;

    const text       = data.choices[0]?.message.content ?? '';
    const inputToks  = data.usage.prompt_tokens;
    const outputToks = data.usage.completion_tokens;
    const cachedToks = data.usage.prompt_tokens_details?.cached_tokens ?? 0;

    return {
      text,
      inputTokens:        inputToks,
      outputTokens:       outputToks,
      cachedInputTokens:  cachedToks,
      costBrl:            this.calcCostBrl(inputToks, cachedToks, outputToks),
      latencyMs,
      modelUsed:          data.model
    };
  }

  modelName(): string {
    return this.model;
  }

  /** GPT-5.x e o-series usam max_completion_tokens; modelos antigos usam max_tokens. */
  private tokenParam(n: number): Record<string, number> {
    const usesNew = /^(gpt-5|o\d)/.test(this.model);
    return usesNew ? { max_completion_tokens: n } : { max_tokens: n };
  }

  private async post<T>(body: unknown): Promise<T> {
    const res = await fetch(OPENAI_ENDPOINT, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API ${res.status}: ${err}`);
    }

    return res.json() as Promise<T>;
  }

  private calcCostBrl(inputToks: number, cachedToks: number, outputToks: number): number {
    const pricing  = PRICING[this.model] ?? PRICING['gpt-4o'];
    const nonCached = Math.max(0, inputToks - cachedToks);
    const usd =
      (nonCached  / 1_000_000) * pricing.inputPerMTok +
      (cachedToks / 1_000_000) * pricing.cachedPerMTok +
      (outputToks / 1_000_000) * pricing.outputPerMTok;
    return Number((usd * USD_TO_BRL).toFixed(4));
  }
}
