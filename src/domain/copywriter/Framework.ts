// Domain value object: Framework de copywriting
// 5 frameworks canônicos (ADR-004-CW). Sem deps externas (C7).

export const FRAMEWORK_VALUES = [
  'pas',          // Problem, Agitation, Solution (landing default)
  'aida',         // Attention, Interest, Desire, Action
  '4ps',          // Picture, Promise, Proof, Push
  'storybrand',   // Hero, Problem, Guide, Plan, Success
  'soap_opera'    // Soap Opera Sequence (email default)
] as const;

export type FrameworkValue = typeof FRAMEWORK_VALUES[number];

/**
 * Mapping: output_type → frameworks que fazem sentido para ele.
 * Bloqueia combinações sem sentido (ex.: soap_opera para landing).
 */
const FRAMEWORK_BY_OUTPUT: Record<string, ReadonlyArray<FrameworkValue>> = {
  landing: ['pas', 'aida', '4ps', 'storybrand'],
  email_sequence: ['soap_opera', 'aida', 'storybrand'],
  ad_set: ['pas', 'aida', '4ps']
};

export class Framework {
  private constructor(public readonly value: FrameworkValue) {}

  static create(value: string): Framework {
    if (!FRAMEWORK_VALUES.includes(value as FrameworkValue)) {
      throw new Error(
        `Framework inválido: ${value}. Aceitos: ${FRAMEWORK_VALUES.join(', ')}`
      );
    }
    return new Framework(value as FrameworkValue);
  }

  static pas(): Framework {
    return new Framework('pas');
  }

  static aida(): Framework {
    return new Framework('aida');
  }

  static storybrand(): Framework {
    return new Framework('storybrand');
  }

  static soapOpera(): Framework {
    return new Framework('soap_opera');
  }

  /**
   * Slug para `prompts/copywriter-agent/system-prompts/framework-{slug}.md`
   */
  promptSlug(): string {
    return this.value.replace('_', '-');
  }

  /**
   * Valida que esse framework é compatível com o output_type alvo.
   */
  compativelCom(outputType: string): boolean {
    const allowed = FRAMEWORK_BY_OUTPUT[outputType];
    if (!allowed) return false;
    return allowed.includes(this.value);
  }

  equals(other: Framework): boolean {
    return this.value === other.value;
  }
}
