// Domain entity: Tom de voz disponível
// Sem deps externas (C7)

export const TOM_VALUES = [
  'brand_voice_ceo',
  'executivo_b2b',
  'casual_b2c',
  'tecnico_dev',
  'institucional'
] as const;

export type TomValue = typeof TOM_VALUES[number];

export class Tom {
  private constructor(public readonly value: TomValue) {}

  static create(value: string): Tom {
    if (!TOM_VALUES.includes(value as TomValue)) {
      throw new Error(
        `Tom inválido: ${value}. Valores aceitos: ${TOM_VALUES.join(', ')}`
      );
    }
    return new Tom(value as TomValue);
  }

  static founderVoice(): Tom {
    return new Tom('brand_voice_ceo');
  }

  /**
   * Slug do system prompt correspondente em prompts/social-media-agent/system-prompts/{slug}.md
   */
  promptSlug(): string {
    return this.value;
  }

  equals(other: Tom): boolean {
    return this.value === other.value;
  }
}
