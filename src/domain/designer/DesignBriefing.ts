// Domain entity: DesignBriefing — input do designer-agent
// Imutável (value object). Validação no construtor.
//
// Reuso intencional: NÃO duplica Slide.ts de carrossel/ — esta entity
// representa apenas o INPUT do briefing; os slides resultantes usam
// a Slide existente em src/domain/carrossel/Slide.ts.

export type DominantMode = 'dark' | 'light';
export type DesignVariant = 'standard' | 'economic';
export type Caller = 'social-media-agent' | 'client_direct' | 'founder_direct';

export interface DesignBriefingInput {
  tema: string;
  numSlides: number; // 5–7 (5 = economic, 7 = standard default)
  dominantMode: DominantMode;
  caller: Caller;
  variant?: DesignVariant; // default inferido por numSlides
  tenantId: string;
  brandStrictness?: number; // 0.0–1.0; default 0.99 (gate hard ADR-001-DES)
}

export class DesignBriefing {
  readonly tema: string;
  readonly numSlides: number;
  readonly dominantMode: DominantMode;
  readonly caller: Caller;
  readonly variant: DesignVariant;
  readonly tenantId: string;
  readonly brandStrictness: number;

  private constructor(input: DesignBriefingInput) {
    if (!input.tema || input.tema.trim().length < 10) {
      throw new Error(
        'Briefing inválido: tema precisa ter ≥10 caracteres (forneça tema, num_slides, dominant_mode)'
      );
    }
    if (input.numSlides < 5 || input.numSlides > 7) {
      throw new Error(
        `numSlides inválido: ${input.numSlides}. v0.1.0 aceita 5-7 (upsell em ADR futura).`
      );
    }
    if (!['dark', 'light'].includes(input.dominantMode)) {
      throw new Error(`dominantMode inválido: ${input.dominantMode}`);
    }
    if (!input.tenantId || input.tenantId.trim().length === 0) {
      throw new Error('tenantId obrigatório (C8)');
    }
    const strictness = input.brandStrictness ?? 0.99;
    if (strictness < 0.9 || strictness > 1.0) {
      throw new Error(
        `brandStrictness fora de range [0.9, 1.0]: ${strictness}`
      );
    }

    this.tema = input.tema.trim();
    this.numSlides = input.numSlides;
    this.dominantMode = input.dominantMode;
    this.caller = input.caller;
    this.variant =
      input.variant ?? (input.numSlides <= 5 ? 'economic' : 'standard');
    this.tenantId = input.tenantId;
    this.brandStrictness = strictness;
  }

  static create(input: DesignBriefingInput): DesignBriefing {
    return new DesignBriefing(input);
  }

  /** Preço em BRL conforme spec §1 + ADR-001-DES. */
  precoFinal(): number {
    return this.variant === 'economic' ? 15.0 : 20.0;
  }

  /** SLA contratual em segundos (20min). */
  slaSeconds(): number {
    return 1200;
  }
}
