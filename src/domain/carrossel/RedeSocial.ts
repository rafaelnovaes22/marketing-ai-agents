// Domain entity: Rede social suportada
// Sem deps externas (C7)

export const REDE_VALUES = [
  'linkedin',
  'instagram',
  'facebook',
  'twitter'
] as const;

export type RedeValue = typeof REDE_VALUES[number];

export class RedeSocial {
  private constructor(public readonly value: RedeValue) {}

  static create(value: string): RedeSocial {
    if (!REDE_VALUES.includes(value as RedeValue)) {
      throw new Error(
        `Rede inválida: ${value}. Valores aceitos: ${REDE_VALUES.join(', ')}`
      );
    }
    return new RedeSocial(value as RedeValue);
  }

  static todas(): RedeSocial[] {
    return REDE_VALUES.map((v) => new RedeSocial(v));
  }

  /**
   * Twitter usa modo thread (ADR-003-DS).
   * Outras redes aceitam caption longa única.
   */
  usaModoThread(): boolean {
    return this.value === 'twitter';
  }

  /**
   * Limite de caracteres por unidade de publicação.
   * - Twitter: 280 por tweet (thread)
   * - LinkedIn: 3000 caption
   * - Instagram: 2200 caption
   * - Facebook: 63206 (efetivamente sem limite prático)
   */
  limiteCaracteres(): number {
    switch (this.value) {
      case 'twitter':
        return 280;
      case 'linkedin':
        return 3000;
      case 'instagram':
        return 2200;
      case 'facebook':
        return 5000; // limite prático
    }
  }

  equals(other: RedeSocial): boolean {
    return this.value === other.value;
  }
}
