// Domain entity: Slide individual do carrossel
// Imutável após criação (value object)

export type SlideRole =
  | 'hook'              // Slide 1 — afirmação polêmica
  | 'context'           // Slide 2 — contexto/credibilidade
  | 'point'             // Slides 3-N-1 — pontos práticos
  | 'binary_contrast'   // Slide opcional — "X faz A, Y faz B"
  | 'cta';              // Último slide — call to action

export type ImageProviderUsed = 'imagen_4' | 'ideogram_v2';

export interface SlideInput {
  order: number;
  role: SlideRole;
  textOverlay?: string;       // Texto que aparece sobre a imagem
  visualBrief: string;        // Descrição para o image generator
  imageUrl?: string;          // Preenchido após geração
  brandScore?: number;        // 0.0-1.0 do BrandValidator
  imageProviderUsed?: ImageProviderUsed;
}

export class Slide {
  readonly order: number;
  readonly role: SlideRole;
  readonly textOverlay: string | null;
  readonly visualBrief: string;
  readonly imageUrl: string | null;
  readonly brandScore: number | null;
  readonly imageProviderUsed: ImageProviderUsed | null;

  private constructor(input: SlideInput) {
    if (input.order < 1 || input.order > 7) {
      throw new Error(`Order inválido: ${input.order}. Slides 1-7.`);
    }
    if (!input.visualBrief || input.visualBrief.trim().length === 0) {
      throw new Error('visualBrief não pode ser vazio');
    }

    this.order = input.order;
    this.role = input.role;
    this.textOverlay = input.textOverlay?.trim() || null;
    this.visualBrief = input.visualBrief.trim();
    this.imageUrl = input.imageUrl ?? null;
    this.brandScore = input.brandScore ?? null;
    this.imageProviderUsed = input.imageProviderUsed ?? null;
  }

  static create(input: SlideInput): Slide {
    return new Slide(input);
  }

  /**
   * Slides com texto destacado vão para Ideogram v2 (melhor renderização).
   * Slides puramente visuais vão para Imagen 4 (mais barato).
   * Decisão referenciada em ADR-002-DS + plan.md seção 4.
   */
  precisaIdeogram(): boolean {
    if (!this.textOverlay) return false;
    const wordCount = this.textOverlay.split(/\s+/).length;
    return wordCount >= 4;
  }

  comImageUrl(url: string, score: number, provider: ImageProviderUsed): Slide {
    return new Slide({
      order: this.order,
      role: this.role,
      textOverlay: this.textOverlay || undefined,
      visualBrief: this.visualBrief,
      imageUrl: url,
      brandScore: score,
      imageProviderUsed: provider
    });
  }

  isCompleto(): boolean {
    return this.imageUrl !== null && this.brandScore !== null;
  }

  brandPassou(threshold = 0.96): boolean {
    return this.brandScore !== null && this.brandScore >= threshold;
  }
}
