// Domain entity: AdSet — 5 variações de anúncio Meta (Tipo C).
// Spec.md seção 1.1 Tipo C.

export const AD_ANGLES = [
  'pain',
  'aspiration',
  'fomo',
  'authority',
  'social_proof'
] as const;

export type AdAngle = typeof AD_ANGLES[number];

export interface AdVariation {
  angle: AdAngle;
  headline: string;       // ≤40 chars
  primaryText: string;    // ≤125 chars recomendado
  description: string;    // ≤30 chars
}

export interface AdSetInput {
  schemaVersion: string;
  variations: AdVariation[];
  diversityScore?: number; // 1 − cosine_similarity médio (preenchido após embedding check)
}

const META_LIMITS = {
  headline: 40,
  primaryText: 125,
  description: 30
} as const;

const REQUIRED_VARIATIONS = 5;
const DIVERSITY_MIN = 0.45;

export class AdSet {
  readonly schemaVersion: string;
  readonly variations: ReadonlyArray<AdVariation>;
  readonly diversityScore: number | null;

  private constructor(input: AdSetInput) {
    this.schemaVersion = input.schemaVersion;
    this.variations = input.variations;
    this.diversityScore = input.diversityScore ?? null;
  }

  static create(input: AdSetInput): AdSet {
    if (!input.schemaVersion || !/^\d+\.\d+\.\d+$/.test(input.schemaVersion)) {
      throw new Error(
        `schemaVersion inválido: ${input.schemaVersion} (ADR-003-CW)`
      );
    }
    if (input.variations.length !== REQUIRED_VARIATIONS) {
      throw new Error(
        `AdSet exige exatamente ${REQUIRED_VARIATIONS} variações. Recebido: ${input.variations.length}`
      );
    }

    // Cada ad cobre 1 dos 5 ângulos distintos.
    const angles = new Set(input.variations.map((v) => v.angle));
    if (angles.size !== REQUIRED_VARIATIONS) {
      throw new Error(
        `AdSet exige ${REQUIRED_VARIATIONS} ângulos distintos. Recebidos: ${[...angles].join(',')}`
      );
    }

    // Limites Meta
    for (const v of input.variations) {
      if (v.headline.length > META_LIMITS.headline) {
        throw new Error(
          `Headline (${v.angle}) excede ${META_LIMITS.headline} chars: ${v.headline.length}`
        );
      }
      if (v.primaryText.length > META_LIMITS.primaryText) {
        throw new Error(
          `primaryText (${v.angle}) excede ${META_LIMITS.primaryText} chars: ${v.primaryText.length}`
        );
      }
      if (v.description.length > META_LIMITS.description) {
        throw new Error(
          `description (${v.angle}) excede ${META_LIMITS.description} chars: ${v.description.length}`
        );
      }
    }

    return new AdSet(input);
  }

  /**
   * AdSet com diversityScore calculado.
   */
  comDiversityScore(score: number): AdSet {
    return new AdSet({
      schemaVersion: this.schemaVersion,
      variations: [...this.variations],
      diversityScore: score
    });
  }

  /**
   * Diversidade ≥ 0,45 (spec.md critério aceite).
   */
  diversidadeOk(): boolean {
    if (this.diversityScore === null) return false;
    return this.diversityScore >= DIVERSITY_MIN;
  }

  precoFinal(): number {
    return 80.0;
  }
}
