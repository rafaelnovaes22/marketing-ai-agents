// Domain entity: Landing page (Tipo A do copywriter-agent).
// Estrutura obrigatória — spec.md seção 1.1 Tipo A.

export interface LandingHero {
  headline: string;
  subheadline: string;
  cta: string;
}

export type LandingSectionKind =
  | 'problem'
  | 'agitation'
  | 'solution'
  | 'social_proof'
  | 'objections'
  | 'final_cta';

export interface LandingSection {
  kind: LandingSectionKind;
  body: string;          // Markdown ou texto puro
  bullets?: string[];    // Itens (úteis para social_proof, objections)
}

export interface LandingInput {
  schemaVersion: string;        // ex.: '1.0.0' (ADR-003-CW)
  hero: LandingHero;
  sections: LandingSection[];
  ctas: string[];               // Lista de CTAs adicionais além do final_cta
  wordCount: number;
  isUpsell: boolean;
}

/**
 * Range de palavras (spec.md ADR-001-CW).
 * Default: 1.500-2.000. Upsell: 2.500-3.500.
 */
const WORDS_DEFAULT_MIN = 1500;
const WORDS_DEFAULT_MAX = 2000;
const WORDS_UPSELL_MIN = 2500;
const WORDS_UPSELL_MAX = 3500;

const SECOES_OBRIGATORIAS: readonly LandingSectionKind[] = [
  'problem',
  'agitation',
  'solution',
  'social_proof',
  'objections',
  'final_cta'
];

export class Landing {
  readonly schemaVersion: string;
  readonly hero: LandingHero;
  readonly sections: ReadonlyArray<LandingSection>;
  readonly ctas: ReadonlyArray<string>;
  readonly wordCount: number;
  readonly isUpsell: boolean;

  private constructor(input: LandingInput) {
    this.schemaVersion = input.schemaVersion;
    this.hero = input.hero;
    this.sections = input.sections;
    this.ctas = input.ctas;
    this.wordCount = input.wordCount;
    this.isUpsell = input.isUpsell;
  }

  static create(input: LandingInput): Landing {
    if (!input.schemaVersion || !/^\d+\.\d+\.\d+$/.test(input.schemaVersion)) {
      throw new Error(
        `schemaVersion inválido: ${input.schemaVersion}. Formato esperado: x.y.z (ADR-003-CW)`
      );
    }
    if (!input.hero.headline || !input.hero.subheadline || !input.hero.cta) {
      throw new Error('Hero exige headline, subheadline e cta preenchidos');
    }

    // Garante presença de todas as seções obrigatórias.
    const kinds = new Set(input.sections.map((s) => s.kind));
    const faltando = SECOES_OBRIGATORIAS.filter((k) => !kinds.has(k));
    if (faltando.length > 0) {
      throw new Error(
        `Landing faltando seções obrigatórias: ${faltando.join(', ')}`
      );
    }

    // Social proof exige ≥ 3 itens, objections ≥ 2.
    const socialProof = input.sections.find((s) => s.kind === 'social_proof');
    if (socialProof && (socialProof.bullets?.length ?? 0) < 3) {
      throw new Error('social_proof exige ≥ 3 itens (spec.md seção 1.1)');
    }
    const objections = input.sections.find((s) => s.kind === 'objections');
    if (objections && (objections.bullets?.length ?? 0) < 2) {
      throw new Error('objections exige ≥ 2 itens (spec.md seção 1.1)');
    }

    return new Landing(input);
  }

  /**
   * Verifica se a contagem de palavras está no range esperado (±10% tolerância
   * — spec.md critério de aceite 1.2).
   */
  volumeOk(): boolean {
    const tolerance = 0.1;
    const [min, max] = this.isUpsell
      ? [WORDS_UPSELL_MIN, WORDS_UPSELL_MAX]
      : [WORDS_DEFAULT_MIN, WORDS_DEFAULT_MAX];
    const minWithTol = Math.floor(min * (1 - tolerance));
    const maxWithTol = Math.ceil(max * (1 + tolerance));
    return this.wordCount >= minWithTol && this.wordCount <= maxWithTol;
  }

  /**
   * Preço-final R$ 80 base + R$ 30 upsell (spec.md seção 4).
   */
  precoFinal(): number {
    return this.isUpsell ? 110.0 : 80.0;
  }
}
