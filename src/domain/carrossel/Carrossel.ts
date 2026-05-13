// Domain entity raiz: Carrossel
// Aggregate root — coordena Slide[] + Caption

import { Caption } from './Caption.js';
import { RedeSocial } from './RedeSocial.js';
import { Slide } from './Slide.js';
import { Tom } from './Tom.js';

export type CarrosselStatus =
  | 'pending'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface CarrosselInput {
  id: string;
  tenantId: string;
  briefingText: string;
  tom: Tom;
  redePrincipal: RedeSocial;
  slidesDesejados: number;
  isUpsell: boolean;
}

export class Carrossel {
  readonly id: string;
  readonly tenantId: string;
  readonly briefingText: string;
  readonly tom: Tom;
  readonly redePrincipal: RedeSocial;
  readonly slidesDesejados: number;
  readonly isUpsell: boolean;
  readonly slides: Slide[];
  readonly caption: Caption | null;
  readonly status: CarrosselStatus;
  readonly createdAt: Date;

  private constructor(
    input: CarrosselInput & {
      slides: Slide[];
      caption: Caption | null;
      status: CarrosselStatus;
      createdAt: Date;
    }
  ) {
    this.id = input.id;
    this.tenantId = input.tenantId;
    this.briefingText = input.briefingText;
    this.tom = input.tom;
    this.redePrincipal = input.redePrincipal;
    this.slidesDesejados = input.slidesDesejados;
    this.isUpsell = input.isUpsell;
    this.slides = input.slides;
    this.caption = input.caption;
    this.status = input.status;
    this.createdAt = input.createdAt;
  }

  /**
   * Cria novo carrossel a partir do briefing — começa em status 'pending'.
   * Aplica regras de validação do outcome contratual (spec.md seção 1).
   */
  static novo(input: CarrosselInput): Carrossel {
    if (!input.briefingText || input.briefingText.trim().length < 20) {
      throw new Error(
        'Briefing muito curto (mínimo 20 chars). Forneça: tema + público + rede.'
      );
    }

    // Default: 4-5 slides (ADR-001-DS). Upsell aceita 6-7.
    if (input.isUpsell) {
      if (input.slidesDesejados < 6 || input.slidesDesejados > 7) {
        throw new Error('Upsell aceita 6-7 slides apenas');
      }
    } else {
      if (input.slidesDesejados < 4 || input.slidesDesejados > 5) {
        throw new Error(
          'Padrão aceita 4-5 slides. Para 6-7, marque isUpsell=true (preço R$ 16)'
        );
      }
    }

    return new Carrossel({
      ...input,
      slides: [],
      caption: null,
      status: 'pending',
      createdAt: new Date()
    });
  }

  /**
   * Após geração, monta o carrossel completo.
   */
  comOutputs(slides: Slide[], caption: Caption): Carrossel {
    if (slides.length !== this.slidesDesejados) {
      throw new Error(
        `Esperado ${this.slidesDesejados} slides, recebido ${slides.length}`
      );
    }
    return new Carrossel({
      id: this.id,
      tenantId: this.tenantId,
      briefingText: this.briefingText,
      tom: this.tom,
      redePrincipal: this.redePrincipal,
      slidesDesejados: this.slidesDesejados,
      isUpsell: this.isUpsell,
      slides,
      caption,
      status: 'completed',
      createdAt: this.createdAt
    });
  }

  /**
   * Verifica se outcome contratual foi cumprido (spec.md seção 1.2).
   */
  outcomeAlcancado(brandThreshold = 0.99): boolean {
    if (this.status !== 'completed') return false;
    if (this.slides.length !== this.slidesDesejados) return false;
    if (!this.caption) return false;

    const todosSlidesCompletos = this.slides.every((s) => s.isCompleto());
    if (!todosSlidesCompletos) return false;

    const brandMedio =
      this.slides.reduce((sum, s) => sum + (s.brandScore ?? 0), 0) /
      this.slides.length;
    if (brandMedio < brandThreshold) return false;

    const captionValida = this.caption.validar();
    if (!captionValida.ok) return false;

    return true;
  }

  precoFinal(): number {
    return this.isUpsell ? 16.0 : 12.0;
  }
}
