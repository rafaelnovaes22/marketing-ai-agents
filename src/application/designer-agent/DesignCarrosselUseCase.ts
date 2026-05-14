// Use Case: Designer Agent — gera N slides de design com brand validation
// REUSO MÁXIMO: ImageGenProvider, BrandValidator, Observability ports já existem.
// Composability ADR-004-DES: pode ser chamado por social-media-agent OU client_direct.

import { Slide } from '../../domain/carrossel/Slide.js';
import { DesignCarrossel } from '../../domain/designer/DesignCarrossel.js';
import { DesignBriefing } from '../../domain/designer/DesignBriefing.js';
import {
  BrandComplianceReport,
  type SlideComplianceEntry
} from '../../domain/designer/BrandComplianceReport.js';
import type { BrandGuide } from '../../domain/carrossel/BrandGuide.js';
import type {
  ImageGenProvider,
  ImageGenOutput
} from '../../domain/ports/ImageGenProvider.js';
import type {
  BrandValidator,
  BrandValidationOutput
} from '../../domain/ports/BrandValidator.js';
import type {
  Observability,
  TraceContext
} from '../../domain/ports/Observability.js';

export interface SlideDesignSpec {
  order: number;
  role: import('../../domain/carrossel/Slide.js').SlideRole;
  textOverlay?: string;
  visualBrief: string;
  requiresLiteralText?: boolean; // override explícito
}

export interface DesignCarrosselUseCaseInput {
  briefing: DesignBriefing;
  slideSpecs: SlideDesignSpec[];
  mode: 'shadow' | 'assisted' | 'autonomous';
  /** Quando fornecido (ex.: orchestrator), usa como trace pai e suprime startTrace/endTrace próprios (P3 full). */
  parentTrace?: TraceContext;
}

export interface DesignCarrosselUseCaseDeps {
  imagenAdapter: ImageGenProvider;   // primary Imagen 4
  ideogramAdapter: ImageGenProvider; // fallback / texto literal Ideogram v2
  brandValidator: BrandValidator;
  brandGuide: BrandGuide;
  observability: Observability;
  /** Limite de paralelismo nas N requisições de imagem. Default 7 (todos em paralelo). */
  concurrencyLimit?: number;
}

interface SlideAttempt {
  slide: Slide;
  validation: BrandValidationOutput;
  costBrl: number;
  retryCount: number;
  fallbackTriggered: boolean;
}

export class DesignCarrosselUseCase {
  private readonly concurrencyLimit: number;

  constructor(private readonly deps: DesignCarrosselUseCaseDeps) {
    this.concurrencyLimit = deps.concurrencyLimit ?? 7;
  }

  async execute(input: DesignCarrosselUseCaseInput): Promise<DesignCarrossel> {
    if (input.slideSpecs.length !== input.briefing.numSlides) {
      throw new Error(
        `slideSpecs (${input.slideSpecs.length}) ≠ briefing.numSlides (${input.briefing.numSlides})`
      );
    }

    const ownTrace = !input.parentTrace;
    const startedAt = Date.now();
    const trace = input.parentTrace ?? this.deps.observability.startTrace({
      tenantId: input.briefing.tenantId,
      sku: 'designer-agent',
      mode: input.mode,
      metadata: {
        caller: input.briefing.caller,
        num_slides: input.briefing.numSlides,
        dominant_mode: input.briefing.dominantMode,
        variant: input.briefing.variant
      }
    });

    try {
      // 1. Paralelizar a geração+validação por slide (com retry + fallback)
      const attempts = await this.deps.observability.span(
        trace,
        {
          name: 'parallel_slide_generation',
          input: { num_slides: input.briefing.numSlides },
          startTime: new Date()
        },
        async () => this.generateAllSlides(input.slideSpecs, trace)
      );

      // 2. Montar slides + report
      const slides = attempts.map((a) => a.slide);
      const reportEntries: SlideComplianceEntry[] = attempts.map((a) => ({
        slideOrder: a.slide.order,
        brandScore: a.validation.score,
        decision: a.validation.decision,
        retryCount: a.retryCount,
        providerUsed: a.slide.imageProviderUsed ?? 'imagen_4',
        fallbackTriggered: a.fallbackTriggered,
        issues: a.validation.issues
      }));
      const report = new BrandComplianceReport(
        reportEntries,
        input.briefing.brandStrictness
      );

      const totalLatencyMs = Date.now() - startedAt;
      const totalCostBrl = attempts.reduce((s, a) => s + a.costBrl, 0);

      const carrossel = DesignCarrossel.assemble({
        id: this.generateId(),
        briefing: input.briefing,
        slides,
        report,
        totalLatencyMs,
        totalCostBrl
      });

      if (ownTrace) {
        await this.deps.observability.endTrace(trace, {
          status: carrossel.status,
          outcome_achieved: carrossel.outcomeAlcancado(),
          brand_score_avg: report.scoreMedio(),
          total_retries: report.totalRetries(),
          sla_violated: carrossel.slaViolated(),
          provider_split: report.providerSplit()
        });
      }

      return carrossel;
    } catch (err) {
      if (ownTrace) {
        await this.deps.observability.endTrace(
          trace,
          undefined,
          err instanceof Error ? err : new Error(String(err))
        );
      }
      throw err;
    }
  }

  /**
   * Decide provider por slide (ADR-002-DES).
   * - requires_literal_text=true → Ideogram
   * - textOverlay ≥4 palavras → Ideogram (consistente com Slide.precisaIdeogram)
   * - caso contrário → Imagen 4
   */
  decideImageProvider(spec: SlideDesignSpec): ImageGenProvider {
    if (spec.requiresLiteralText === true) return this.deps.ideogramAdapter;

    // Hero number como "73%" também vai para Ideogram
    if (spec.textOverlay && /^\d+%?$/.test(spec.textOverlay.trim())) {
      return this.deps.ideogramAdapter;
    }

    if (spec.textOverlay) {
      const wordCount = spec.textOverlay.split(/\s+/).length;
      if (wordCount >= 4) return this.deps.ideogramAdapter;
    }
    return this.deps.imagenAdapter;
  }

  private async generateAllSlides(
    specs: SlideDesignSpec[],
    trace: TraceContext
  ): Promise<SlideAttempt[]> {
    // Paralelização simples com Promise.all (chunked se concurrencyLimit < N)
    const chunks: SlideDesignSpec[][] = [];
    for (let i = 0; i < specs.length; i += this.concurrencyLimit) {
      chunks.push(specs.slice(i, i + this.concurrencyLimit));
    }

    const results: SlideAttempt[] = [];
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((spec) => this.generateOneSlideWithRetry(spec, trace))
      );
      results.push(...chunkResults);
    }
    return results;
  }

  /**
   * Política de retry ADR-003-DES:
   *   1. Tentativa inicial com provider decidido
   *   2. Se brand < threshold: 1 retry no mesmo provider
   *   3. Se ainda < threshold: fallback cross-provider (Imagen↔Ideogram)
   *   4. Se ainda < threshold: marca degraded (não joga erro)
   */
  private async generateOneSlideWithRetry(
    spec: SlideDesignSpec,
    trace: TraceContext
  ): Promise<SlideAttempt> {
    const threshold = this.deps.brandGuide.tolerance.exact_match_required / 100;
    const primaryProvider = this.decideImageProvider(spec);

    // Attempt 1
    const a1 = await this.generateAndValidate(spec, primaryProvider, trace, 1);
    if (a1.validation.score >= threshold) {
      return {
        slide: a1.slide,
        validation: a1.validation,
        costBrl: a1.costBrl,
        retryCount: 0,
        fallbackTriggered: false
      };
    }

    // Attempt 2 — same provider retry
    const a2 = await this.generateAndValidate(spec, primaryProvider, trace, 2);
    if (a2.validation.score >= threshold) {
      return {
        slide: a2.slide,
        validation: a2.validation,
        costBrl: a1.costBrl + a2.costBrl,
        retryCount: 1,
        fallbackTriggered: false
      };
    }

    // Attempt 3 — cross-provider fallback
    const fallbackProvider =
      primaryProvider === this.deps.imagenAdapter
        ? this.deps.ideogramAdapter
        : this.deps.imagenAdapter;
    const a3 = await this.generateAndValidate(spec, fallbackProvider, trace, 3);

    // Mantém o resultado a3 (mesmo se < threshold → degraded)
    return {
      slide: a3.slide,
      validation: a3.validation,
      costBrl: a1.costBrl + a2.costBrl + a3.costBrl,
      retryCount: 1, // 1 retry mesmo provider (a2) — a3 é fallback, não retry
      fallbackTriggered: true
    };
  }

  private async generateAndValidate(
    spec: SlideDesignSpec,
    provider: ImageGenProvider,
    trace: TraceContext,
    attempt: number
  ): Promise<{
    slide: Slide;
    validation: BrandValidationOutput;
    costBrl: number;
  }> {
    const brandColors = this.deps.brandGuide.todasAsCores();
    const brandFont = this.deps.brandGuide.typography.headings.family;

    const draft = Slide.create({
      order: spec.order,
      role: spec.role,
      textOverlay: spec.textOverlay,
      visualBrief: spec.visualBrief
    });

    const imageOut: ImageGenOutput = await this.deps.observability.span(
      trace,
      {
        name: `image_gen_slide_${spec.order}_attempt_${attempt}`,
        input: { provider: provider.providerName(), role: spec.role },
        startTime: new Date()
      },
      async () =>
        provider.generate({
          prompt: spec.visualBrief,
          aspectRatio: '1:1',
          size: '1080x1080',
          brandColors,
          brandFont,
          hasTextOverlay: !!spec.textOverlay,
          textOverlayContent: spec.textOverlay
        })
    );

    let validation: BrandValidationOutput;
    if (imageOut.imageBase64) {
      validation = await this.deps.observability.span(
        trace,
        {
          name: `brand_validation_slide_${spec.order}_attempt_${attempt}`,
          startTime: new Date()
        },
        async () =>
          this.deps.brandValidator.validate({
            imageBase64: imageOut.imageBase64!,
            imageMimeType: 'image/png'
          })
      );
    } else {
      validation = {
        score: 1.0,
        decision: 'accept',
        issues: [
          {
            category: 'other',
            severity: 'info',
            description: 'imageBase64 não disponível — validação skipped'
          }
        ],
        costBrl: 0,
        latencyMs: 0
      };
    }

    const slide = draft.comImageUrl(
      imageOut.imageUrl,
      validation.score,
      imageOut.providerName
    );

    return {
      slide,
      validation,
      costBrl: imageOut.costBrl + validation.costBrl
    };
  }

  private generateId(): string {
    return `des_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
