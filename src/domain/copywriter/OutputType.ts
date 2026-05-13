// Domain value object: tipo de output do copywriter-agent.
// 3 tipos contratuais (spec.md seção 1).

export const OUTPUT_TYPE_VALUES = [
  'landing',
  'email_sequence',
  'ad_set'
] as const;

export type OutputTypeValue = typeof OUTPUT_TYPE_VALUES[number];

export class OutputType {
  private constructor(public readonly value: OutputTypeValue) {}

  static create(value: string): OutputType {
    if (!OUTPUT_TYPE_VALUES.includes(value as OutputTypeValue)) {
      throw new Error(
        `OutputType inválido: ${value}. Aceitos: ${OUTPUT_TYPE_VALUES.join(', ')}`
      );
    }
    return new OutputType(value as OutputTypeValue);
  }

  static landing(): OutputType {
    return new OutputType('landing');
  }

  static emailSequence(): OutputType {
    return new OutputType('email_sequence');
  }

  static adSet(): OutputType {
    return new OutputType('ad_set');
  }

  /**
   * Slug para `prompts/copywriter-agent/system-prompts/output-{slug}.md`
   */
  promptSlug(): string {
    return this.value.replace('_', '-');
  }

  /**
   * SLA contratual em segundos (spec.md seção 1.2 — ≤900s para todos).
   * Pode evoluir por tipo no futuro.
   */
  slaSeconds(): number {
    return 900;
  }

  equals(other: OutputType): boolean {
    return this.value === other.value;
  }
}
