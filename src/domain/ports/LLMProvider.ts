// Port: LLM Provider
// Interface que isola domain de SDK específico (C7).
// Adapters em src/infrastructure/adapters/llm/ implementam.

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMGenerateInput {
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  cacheControl?: boolean;  // Anthropic prompt caching
  metadata?: Record<string, string>;  // Para Langfuse
}

export interface LLMGenerateOutput {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  costBrl: number;
  latencyMs: number;
  modelUsed: string;
}

export interface VisionInput extends LLMGenerateInput {
  images: Array<{
    base64: string;
    mimeType: 'image/jpeg' | 'image/png';
  }>;
}

export interface LLMProvider {
  generate(input: LLMGenerateInput): Promise<LLMGenerateOutput>;
  generateWithVision(input: VisionInput): Promise<LLMGenerateOutput>;
  modelName(): string;
}
