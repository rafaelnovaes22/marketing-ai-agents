// Use Case: DiversityCheck (T2.12 / ADR-002-CW).
// Calcula 1 − cosine_similarity médio entre os 5 primary_text de um AdSet.
// Threshold de aceite: ≥ 0,45 (spec) — alarme operacional em < 0,42 (lifecycle).
//
// Mantém-se em application/ porque o algoritmo (cosine) é puro e o port
// EmbeddingsProvider isola SDK específico.

import { AdSet } from '../../domain/copywriter/AdSet.js';
import type { EmbeddingsProvider } from '../../domain/ports/EmbeddingsProvider.js';
import type { Observability, TraceContext } from '../../domain/ports/Observability.js';

export interface DiversityCheckInput {
  adSet: AdSet;
  tenantId: string;
  parentTrace?: TraceContext;
}

export interface DiversityCheckOutput {
  /** 1 − cosine_similarity médio entre pares (0..1, maior = mais diverso). */
  diversityScore: number;
  /** Score por par (10 pares = C(5,2)). */
  pairwiseSimilarity: Array<{ a: number; b: number; similarity: number }>;
  /** AdSet com diversityScore preenchido (imutável — domain replace). */
  adSetWithScore: AdSet;
  costBrl: number;
  latencyMs: number;
}

export interface DiversityCheckDeps {
  embeddings: EmbeddingsProvider;
  observability: Observability;
}

const PAIR_COUNT = 10; // C(5,2)

export class DiversityCheckUseCase {
  constructor(private readonly deps: DiversityCheckDeps) {}

  async execute(input: DiversityCheckInput): Promise<DiversityCheckOutput> {
    const startedAt = Date.now();
    const texts = input.adSet.variations.map((v) => v.primaryText);

    if (texts.length !== 5) {
      throw new Error(
        `DiversityCheck exige 5 variações. Recebido: ${texts.length}`
      );
    }

    // Embedding em batch (1 chamada para os 5 textos).
    const embeddingResult = await this.runSpan(input.parentTrace, async () =>
      this.deps.embeddings.embed({
        texts,
        metadata: {
          sku: 'copywriter-agent',
          component: 'diversity_check',
          tenant_id: input.tenantId
        }
      })
    );

    const vectors = embeddingResult.vectors;
    if (vectors.length !== 5) {
      throw new Error(
        `EmbeddingsProvider retornou ${vectors.length} vetores (esperado 5)`
      );
    }

    const pairwiseSimilarity = computePairwiseCosine(vectors);
    if (pairwiseSimilarity.length !== PAIR_COUNT) {
      throw new Error(
        `Esperado ${PAIR_COUNT} pares de similaridade. Obtido: ${pairwiseSimilarity.length}`
      );
    }

    const meanSimilarity =
      pairwiseSimilarity.reduce((acc, p) => acc + p.similarity, 0) / PAIR_COUNT;
    const diversityScore = clamp01(1 - meanSimilarity);

    return {
      diversityScore,
      pairwiseSimilarity,
      adSetWithScore: input.adSet.comDiversityScore(diversityScore),
      costBrl: embeddingResult.costBrl,
      latencyMs: Date.now() - startedAt
    };
  }

  private async runSpan<T>(
    parent: TraceContext | undefined,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!parent) return fn();
    return this.deps.observability.span(
      parent,
      {
        name: 'diversity_check_embeddings',
        startTime: new Date()
      },
      fn
    );
  }
}

// ─────────── Utilitários puros (exportados para testes) ─────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `cosineSimilarity: dimensões diferentes (${a.length} vs ${b.length})`
    );
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

export function computePairwiseCosine(
  vectors: number[][]
): Array<{ a: number; b: number; similarity: number }> {
  const result: Array<{ a: number; b: number; similarity: number }> = [];
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      result.push({
        a: i,
        b: j,
        similarity: cosineSimilarity(vectors[i], vectors[j])
      });
    }
  }
  return result;
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
