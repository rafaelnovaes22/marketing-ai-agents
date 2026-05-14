// Adapter: OpenAI text-embedding-3-small (ADR-002-CW T1.8).
// Usa fetch nativo (Node 20+) — evita dependência adicional além do @anthropic-ai/sdk.
//
// Preços oficiais (USD/1M tokens):
//   text-embedding-3-small: $0,02
// Dimensions: 1536 (default — não reduzido).

import type {
  EmbeddingsProvider,
  EmbeddingsInput,
  EmbeddingsOutput
} from '../../../domain/ports/EmbeddingsProvider.js';

const ENDPOINT = 'https://api.openai.com/v1/embeddings';
const MODEL_DEFAULT = 'text-embedding-3-small';
const DIMENSIONS = 1536;
const PRICE_USD_PER_MTOK = 0.02;
const USD_TO_BRL = 5.3;

export interface OpenAIEmbeddingsConfig {
  apiKey: string;
  model?: string;
  organization?: string;
  timeoutMs?: number;
}

interface OpenAIResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { prompt_tokens: number; total_tokens: number };
}

export class OpenAIEmbeddingsAdapter implements EmbeddingsProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly organization?: string;
  private readonly timeoutMs: number;

  constructor(config: OpenAIEmbeddingsConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAIEmbeddingsAdapter requer OPENAI_API_KEY');
    }
    this.apiKey = config.apiKey;
    this.model = config.model ?? MODEL_DEFAULT;
    this.organization = config.organization;
    this.timeoutMs = config.timeoutMs ?? 15_000;
  }

  async embed(input: EmbeddingsInput): Promise<EmbeddingsOutput> {
    if (input.texts.length === 0) {
      throw new Error('OpenAIEmbeddingsAdapter: input.texts vazio');
    }

    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const resp = await fetch(ENDPOINT, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.model,
          input: input.texts,
          encoding_format: 'float'
        }),
        signal: controller.signal
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(
          `OpenAI embeddings retornou ${resp.status}: ${body.slice(0, 200)}`
        );
      }

      const json = (await resp.json()) as OpenAIResponse;
      const vectors = json.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);

      const costBrl = this.computeCost(json.usage.total_tokens);

      return {
        vectors,
        modelUsed: this.model,
        costBrl,
        latencyMs: Date.now() - start
      };
    } finally {
      clearTimeout(timer);
    }
  }

  dimensions(): number {
    return DIMENSIONS;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    };
    if (this.organization) headers['OpenAI-Organization'] = this.organization;
    return headers;
  }

  private computeCost(tokens: number): number {
    return (tokens / 1_000_000) * PRICE_USD_PER_MTOK * USD_TO_BRL;
  }
}
