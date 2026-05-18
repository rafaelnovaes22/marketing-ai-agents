// Adapter: Anthropic Claude (Sonnet 4.6)
// Implementa LLMProvider port. Acoplamento ao SDK Anthropic confinado AQUI.

import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMProvider,
  LLMGenerateInput,
  LLMGenerateOutput,
  VisionInput
} from '../../../domain/ports/LLMProvider.js';

// Preços oficiais Claude Sonnet 4.6 (em USD por 1M tokens)
const PRICE_INPUT_USD_PER_MTOK = 3.0;
const PRICE_INPUT_CACHED_USD_PER_MTOK = 0.3;
const PRICE_OUTPUT_USD_PER_MTOK = 15.0;
const USD_TO_BRL = 5.3;

export interface ClaudeAdapterConfig {
  apiKey: string;
  model?: string;                // default: 'claude-sonnet-4-6'
  defaultMaxTokens?: number;     // default: 4096
}

export class ClaudeAdapter implements LLMProvider {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly defaultMaxTokens: number;

  constructor(config: ClaudeAdapterConfig) {
    if (!config.apiKey) {
      throw new Error('ClaudeAdapter requer ANTHROPIC_API_KEY');
    }
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? 'claude-sonnet-4-6';
    this.defaultMaxTokens = config.defaultMaxTokens ?? 4096;
  }

  async generate(input: LLMGenerateInput): Promise<LLMGenerateOutput> {
    const start = Date.now();

    const systemMessages = input.messages.filter((m) => m.role === 'system');
    const otherMessages = input.messages.filter((m) => m.role !== 'system');

    const systemContent = systemMessages.map((m) => m.content).join('\n\n');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: input.maxTokens ?? this.defaultMaxTokens,
      temperature: input.temperature ?? 0.7,
      system: input.cacheControl
        ? ([
            { type: 'text', text: systemContent, cache_control: { type: 'ephemeral' } }
          ] as unknown as Anthropic.TextBlockParam[])
        : systemContent || undefined,
      messages: otherMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      metadata: input.metadata?.user_id ? { user_id: input.metadata.user_id } : undefined
    });

    const latencyMs = Date.now() - start;

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const inputTokens = response.usage.input_tokens;
    const cachedInputTokens = (response.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0;
    const outputTokens = response.usage.output_tokens;
    const costBrl = this.calcCustoBrl(inputTokens, cachedInputTokens, outputTokens);

    return {
      text,
      inputTokens,
      outputTokens,
      cachedInputTokens,
      costBrl,
      latencyMs,
      modelUsed: this.model
    };
  }

  async generateWithVision(input: VisionInput): Promise<LLMGenerateOutput> {
    const start = Date.now();
    const systemMessages = input.messages.filter((m) => m.role === 'system');
    const otherMessages = input.messages.filter((m) => m.role !== 'system');

    const systemContent = systemMessages.map((m) => m.content).join('\n\n');

    // Última mensagem user recebe as imagens
    const lastUserIdx = otherMessages.findLastIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) {
      throw new Error('generateWithVision requer ao menos uma mensagem user');
    }

    const messagesWithImages: Anthropic.MessageParam[] = otherMessages.map(
      (m, idx) => {
        if (idx === lastUserIdx) {
          const imageBlocks: Anthropic.ImageBlockParam[] = input.images.map(
            (img) => ({
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: img.mimeType,
                data: img.base64
              }
            })
          );
          return {
            role: 'user' as const,
            content: [
              ...imageBlocks,
              { type: 'text' as const, text: m.content }
            ]
          };
        }
        return {
          role: m.role as 'user' | 'assistant',
          content: m.content
        };
      }
    );

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: input.maxTokens ?? this.defaultMaxTokens,
      temperature: input.temperature ?? 0.3,
      system: systemContent || undefined,
      messages: messagesWithImages
    });

    const latencyMs = Date.now() - start;
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cachedInputTokens: (response.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0,
      costBrl: this.calcCustoBrl(
        response.usage.input_tokens,
        (response.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0,
        response.usage.output_tokens
      ),
      latencyMs,
      modelUsed: this.model
    };
  }

  modelName(): string {
    return this.model;
  }

  private calcCustoBrl(
    inputTokens: number,
    cachedInputTokens: number,
    outputTokens: number
  ): number {
    const nonCached = Math.max(0, inputTokens - cachedInputTokens);
    const usd =
      (nonCached / 1_000_000) * PRICE_INPUT_USD_PER_MTOK +
      (cachedInputTokens / 1_000_000) * PRICE_INPUT_CACHED_USD_PER_MTOK +
      (outputTokens / 1_000_000) * PRICE_OUTPUT_USD_PER_MTOK;
    return Number((usd * USD_TO_BRL).toFixed(4));
  }
}
