// Domain entity: Brand Guide carregado do YAML
// Sem deps externas — parsing fica no infrastructure layer

export interface ColorPalette {
  primary: {
    navy_deep: string;
    royal_blue: string;
    cyan_accent: string;
    white: string;
  };
  secondary: {
    off_white: string;
    text_secondary: string;
    card_bg_dark: string;
  };
  status: {
    badge_red: string;
    badge_green: string;
  };
}

export interface Typography {
  headings: { family: string; weights: number[] };
  body: { family: string; weights: number[] };
  logo: { family: string; weight: number };
}

export interface BrandToleranceConfig {
  exact_match_required: number;  // % ex: 99
  warning_threshold: number;     // % ex: 96
  rejection_threshold: number;   // % ex: 96
}

export class BrandGuide {
  constructor(
    public readonly version: string,
    public readonly brandName: string,
    public readonly tagline: string,
    public readonly colors: ColorPalette,
    public readonly typography: Typography,
    public readonly tolerance: BrandToleranceConfig,
    public readonly raw: Record<string, unknown>  // YAML completo para acesso flexível
  ) {}

  /**
   * Retorna lista plana de todas as cores válidas da marca (hex strings).
   * Usado pelo BrandValidator.
   */
  todasAsCores(): string[] {
    return [
      ...Object.values(this.colors.primary),
      ...Object.values(this.colors.secondary),
      ...Object.values(this.colors.status)
    ];
  }

  /**
   * Decide ação baseado no brand score.
   */
  decisaoBrandScore(score: number): 'accept' | 'accept_with_warning' | 'retry' {
    const scorePercent = score * 100;
    if (scorePercent >= this.tolerance.exact_match_required) return 'accept';
    if (scorePercent >= this.tolerance.warning_threshold) {
      return 'accept_with_warning';
    }
    return 'retry';
  }
}
