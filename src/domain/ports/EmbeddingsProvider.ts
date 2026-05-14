// Port: Embeddings Provider
// Usado pelo DiversityCheck (ads Tipo C) via cosine similarity entre primary_text.
// Adapter padrão: OpenAI text-embedding-3-small (ADR-002-CW T1.8).

export interface EmbeddingsInput {
  texts: string[];
  metadata?: Record<string, string>;
}

export interface EmbeddingsOutput {
  vectors: number[][]; // mesma ordem de input.texts
  modelUsed: string;
  costBrl: number;
  latencyMs: number;
}

export interface EmbeddingsProvider {
  embed(input: EmbeddingsInput): Promise<EmbeddingsOutput>;
  dimensions(): number;
}
