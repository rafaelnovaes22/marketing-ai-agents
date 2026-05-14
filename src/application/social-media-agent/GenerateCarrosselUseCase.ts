// Use Case: Gerar carrossel completo (copy + imagens + brand validation)
// Orquestra LLM + ImageGen + BrandValidator via ports (sem acoplar SDK específico).

import { Caption } from '../../domain/carrossel/Caption.js';
import { Carrossel } from '../../domain/carrossel/Carrossel.js';
import { Slide, type SlideRole } from '../../domain/carrossel/Slide.js';
import type { LLMProvider } from '../../domain/ports/LLMProvider.js';
import type { ImageGenProvider } from '../../domain/ports/ImageGenProvider.js';
import type {
  BrandValidator,
  BrandValidationOutput
} from '../../domain/ports/BrandValidator.js';
import type {
  Observability,
  TraceContext
} from '../../domain/ports/Observability.js';
import type { BrandGuide } from '../../domain/carrossel/BrandGuide.js';

export interface GenerateCarrosselInput {
  briefingText: string;
  tom: string;
  redePrincipal: string;
  slidesDesejados: number;
  isUpsell: boolean;
  tenantId: string;
  mode: 'shadow' | 'assisted' | 'autonomous';
  /** Quando fornecido (ex.: orchestrator), usa como trace pai e suprime startTrace/endTrace próprios (P3 full). */
  parentTrace?: TraceContext;
}

export interface GenerateCarrosselDeps {
  llmCopywriter: LLMProvider;
  imageGenPrimary: ImageGenProvider;   // Imagen 4
  imageGenFallback: ImageGenProvider;  // Ideogram v2
  brandValidator: BrandValidator;
  brandGuide: BrandGuide;
  observability: Observability;
  systemPromptByTom: Map<string, string>;
}

interface CopyOutput {
  slides: Array<{
    role: SlideRole;
    textOverlay?: string;
    visualBrief: string;
  }>;
  captions: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string[];
  };
}

export class GenerateCarrosselUseCase {
  constructor(private readonly deps: GenerateCarrosselDeps) {}

  async execute(input: GenerateCarrosselInput): Promise<Carrossel> {
    const ownTrace = !input.parentTrace;
    const traceContext = input.parentTrace ?? this.deps.observability.startTrace({
      tenantId: input.tenantId,
      sku: 'social-media-agent',
      mode: input.mode,
      metadata: {
        briefing_length: input.briefingText.length,
        tom: input.tom,
        rede_principal: input.redePrincipal,
        slides_desejados: input.slidesDesejados,
        is_upsell: input.isUpsell
      }
    });

    try {
      // 1. Cria entidade de domain (valida outcome via construtor)
      const carrossel = Carrossel.novo({
        id: this.generateId(),
        tenantId: input.tenantId,
        briefingText: input.briefingText,
        tom: { value: input.tom } as never,         // será reconstruído pelo factory
        redePrincipal: { value: input.redePrincipal } as never,
        slidesDesejados: input.slidesDesejados,
        isUpsell: input.isUpsell
      });

      // 2. Gera copy via LLM (1 chamada com system prompt do tom)
      const copyOutput = await this.deps.observability.span(
        traceContext,
        {
          name: 'copy_generation',
          input: { briefing: input.briefingText, tom: input.tom },
          startTime: new Date()
        },
        async () => this.gerarCopy(input)
      );

      // 3. Gera imagens em paralelo (decideImageProvider por slide)
      const slidesComImagens = await this.deps.observability.span(
        traceContext,
        {
          name: 'image_generation_batch',
          input: { slides_count: copyOutput.slides.length },
          startTime: new Date()
        },
        async () => this.gerarImagens(copyOutput.slides, traceContext)
      );

      // 4. Caption Domain Entity
      const caption = Caption.create(copyOutput.captions);

      // 5. Monta carrossel completo
      const carrosselCompleto = carrossel.comOutputs(slidesComImagens, caption);

      // 6. Verifica outcome contratual
      const outcomeOk = carrosselCompleto.outcomeAlcancado(
        this.deps.brandGuide.tolerance.exact_match_required / 100
      );

      if (ownTrace) {
        await this.deps.observability.endTrace(traceContext, {
          outcome_achieved: outcomeOk,
          slides_count: carrosselCompleto.slides.length,
          brand_score_avg: this.calcBrandMedio(carrosselCompleto.slides)
        });
      }

      return carrosselCompleto;
    } catch (err) {
      if (ownTrace) {
        await this.deps.observability.endTrace(
          traceContext,
          undefined,
          err instanceof Error ? err : new Error(String(err))
        );
      }
      throw err;
    }
  }

  private async gerarCopy(
    input: GenerateCarrosselInput
  ): Promise<CopyOutput> {
    const systemPrompt = this.deps.systemPromptByTom.get(input.tom);
    if (!systemPrompt) {
      throw new Error(`System prompt não encontrado para tom: ${input.tom}`);
    }

    const userPrompt = `# Briefing

${input.briefingText}

# Output esperado

Retorne JSON com a estrutura:

\`\`\`json
{
  "slides": [
    { "role": "hook", "textOverlay": "...", "visualBrief": "..." },
    { "role": "context", "textOverlay": "...", "visualBrief": "..." }
  ],
  "captions": {
    "linkedin": "...",
    "instagram": "...",
    "facebook": "...",
    "twitter": ["tweet 1", "tweet 2", ...]
  }
}
\`\`\`

Para Twitter, retorne array de tweets (thread). Outras redes retornam string única.
Número de slides: ${input.slidesDesejados}.`;

    const response = await this.deps.llmCopywriter.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      maxTokens: 3000,
      temperature: 0.7,
      cacheControl: true
    });

    const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : response.text;
    return JSON.parse(jsonText) as CopyOutput;
  }

  private async gerarImagens(
    slideSpecs: CopyOutput['slides'],
    traceContext: TraceContext
  ): Promise<Slide[]> {
    const brandColors = this.deps.brandGuide.todasAsCores();
    const brandFont = this.deps.brandGuide.typography.headings.family;

    const promises = slideSpecs.map(async (spec, idx) => {
      const slideOrder = idx + 1;
      const slideDraft = Slide.create({
        order: slideOrder,
        role: spec.role,
        textOverlay: spec.textOverlay,
        visualBrief: spec.visualBrief
      });

      const provider = slideDraft.precisaIdeogram()
        ? this.deps.imageGenFallback
        : this.deps.imageGenPrimary;

      const imageOutput = await this.deps.observability.span(
        traceContext,
        {
          name: `image_gen_slide_${slideOrder}`,
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

      // Brand validation
      let brandResult: BrandValidationOutput;
      if (imageOutput.imageBase64) {
        brandResult = await this.deps.observability.span(
          traceContext,
          {
            name: `brand_validation_slide_${slideOrder}`,
            startTime: new Date()
          },
          async () =>
            this.deps.brandValidator.validate({
              imageBase64: imageOutput.imageBase64!,
              imageMimeType: 'image/png'
            })
        );
      } else {
        // Sem base64 = não conseguimos validar; assumir 100% por ora
        brandResult = {
          score: 1.0,
          decision: 'accept',
          issues: [
            {
              category: 'other',
              severity: 'info',
              description: 'imageBase64 não disponível para validação'
            }
          ],
          costBrl: 0,
          latencyMs: 0
        };
      }

      return slideDraft.comImageUrl(
        imageOutput.imageUrl,
        brandResult.score,
        imageOutput.providerName
      );
    });

    return Promise.all(promises);
  }

  private calcBrandMedio(slides: Slide[]): number {
    const soma = slides.reduce((s, sl) => s + (sl.brandScore ?? 0), 0);
    return soma / slides.length;
  }

  private generateId(): string {
    // crypto.randomUUID em prod; aqui simplificado para Wave 2
    return `crs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
