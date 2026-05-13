// Domain aggregate root: DesignCarrossel
// Orquestra N Slides (REUSO de src/domain/carrossel/Slide.ts) + BrandComplianceReport.
//
// Diferença vs Carrossel (social-media): DesignCarrossel só lida com DESIGN
// (imagens + brand compliance). Sem caption, sem publicação, sem outcome de redes.

import { Slide } from '../carrossel/Slide.js';
import { BrandComplianceReport } from './BrandComplianceReport.js';
import type { DesignBriefing } from './DesignBriefing.js';

export type DesignStatus = 'pending' | 'generating' | 'completed' | 'degraded' | 'failed';

export interface DesignCarrosselInput {
  id: string;
  briefing: DesignBriefing;
  slides: Slide[];
  report: BrandComplianceReport;
  totalLatencyMs: number;
  totalCostBrl: number;
}

export class DesignCarrossel {
  readonly id: string;
  readonly briefing: DesignBriefing;
  readonly slides: Slide[];
  readonly report: BrandComplianceReport;
  readonly totalLatencyMs: number;
  readonly totalCostBrl: number;
  readonly status: DesignStatus;

  private constructor(input: DesignCarrosselInput) {
    if (input.slides.length !== input.briefing.numSlides) {
      throw new Error(
        `Quantidade de slides (${input.slides.length}) difere do briefing (${input.briefing.numSlides})`
      );
    }
    // Slides devem cobrir order 1..N
    const ordersExpected = Array.from(
      { length: input.briefing.numSlides },
      (_, i) => i + 1
    );
    const ordersGot = input.slides.map((s) => s.order).sort((a, b) => a - b);
    if (JSON.stringify(ordersExpected) !== JSON.stringify(ordersGot)) {
      throw new Error(
        `Orders inválidos: esperado [${ordersExpected.join(',')}], recebido [${ordersGot.join(',')}]`
      );
    }

    this.id = input.id;
    this.briefing = input.briefing;
    this.slides = [...input.slides].sort((a, b) => a.order - b.order);
    this.report = input.report;
    this.totalLatencyMs = input.totalLatencyMs;
    this.totalCostBrl = input.totalCostBrl;

    if (!this.report.todosPassaram()) {
      this.status = this.report.isDegraded() ? 'degraded' : 'failed';
    } else {
      this.status = 'completed';
    }
  }

  static assemble(input: DesignCarrosselInput): DesignCarrossel {
    return new DesignCarrossel(input);
  }

  /** Outcome contratual atingido (spec §1.2). */
  outcomeAlcancado(): boolean {
    return (
      this.status === 'completed' &&
      this.totalLatencyMs <= this.briefing.slaSeconds() * 1000 &&
      this.report.todosPassaram()
    );
  }

  slaViolated(): boolean {
    return this.totalLatencyMs > this.briefing.slaSeconds() * 1000;
  }

  /** Manifest JSON serializável (spec §1.1 + §1.2). */
  toManifest(): {
    id: string;
    tenantId: string;
    status: DesignStatus;
    numSlides: number;
    variant: string;
    slides: Array<{
      slide_index: number;
      provider_used: string;
      brand_score: number;
      retry_count: number;
      image_url: string | null;
    }>;
    brand_score_avg: number;
    total_retries: number;
    provider_split: { imagen: number; ideogram: number };
    total_latency_ms: number;
    total_cost_brl: number;
    sla_violated: boolean;
    degraded: boolean;
  } {
    return {
      id: this.id,
      tenantId: this.briefing.tenantId,
      status: this.status,
      numSlides: this.slides.length,
      variant: this.briefing.variant,
      slides: this.slides.map((s, idx) => {
        const entry = this.report.entries[idx];
        return {
          slide_index: s.order,
          provider_used: s.imageProviderUsed ?? 'imagen_4',
          brand_score: s.brandScore ?? 0,
          retry_count: entry?.retryCount ?? 0,
          image_url: s.imageUrl
        };
      }),
      brand_score_avg: this.report.scoreMedio(),
      total_retries: this.report.totalRetries(),
      provider_split: this.report.providerSplit(),
      total_latency_ms: this.totalLatencyMs,
      total_cost_brl: this.totalCostBrl,
      sla_violated: this.slaViolated(),
      degraded: this.report.isDegraded()
    };
  }
}
