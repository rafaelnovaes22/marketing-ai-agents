// Adapter: Google Vertex AI Imagen 4
// Implementa ImageGenProvider port.
// IMPLEMENTAÇÃO INICIAL: skeleton com TODO marcado para Wave 2.
// Wave 1 valida apenas estrutura + custos.

import type {
  ImageGenProvider,
  ImageGenInput,
  ImageGenOutput
} from '../../../domain/ports/ImageGenProvider.js';

// Preço Imagen 4 (em USD por imagem) — usado em Wave 2 (fetch real)
// @ts-expect-error — referência preservada para implementação Wave 2
const PRICE_PER_IMAGE_USD = 0.04;
// @ts-expect-error — referência preservada para implementação Wave 2
const USD_TO_BRL = 5.3;

export interface ImagenAdapterConfig {
  projectId: string;
  location?: string;     // default: 'us-central1'
  credentials?: string;  // path para service-account.json
}

export class ImagenAdapter implements ImageGenProvider {
  // @ts-expect-error — utilizado em Wave 2 (Vertex AI SDK)
  private readonly projectId: string;
  // @ts-expect-error — utilizado em Wave 2 (Vertex AI SDK)
  private readonly location: string;

  constructor(config: ImagenAdapterConfig) {
    if (!config.projectId) {
      throw new Error('ImagenAdapter requer GOOGLE_CLOUD_PROJECT_ID');
    }
    this.projectId = config.projectId;
    this.location = config.location ?? 'us-central1';
  }

  async generate(input: ImageGenInput): Promise<ImageGenOutput> {

    // TODO Wave 2: implementar chamada real ao Vertex AI Imagen 4
    // const { PredictionServiceClient } = await import('@google-cloud/aiplatform');
    // const client = new PredictionServiceClient({ ... });
    // const response = await client.predict({ ... });

    // Skeleton para Wave 1 (testes unit funcionam com mock):
    const promptComBrand = this.injetarBrandNoPrompt(input);

    // Placeholder para validação de estrutura
    void promptComBrand;  // será usado em Wave 2

    throw new Error(
      'ImagenAdapter.generate ainda não implementado (Wave 2 / TDD red phase).'
    );

    // Quando implementado, retornar:
    // const latencyMs = Date.now() - start;
    // return {
    //   imageUrl: 'data:image/png;base64,...',
    //   imageBase64: '...',
    //   costBrl: PRICE_PER_IMAGE_USD * USD_TO_BRL,
    //   latencyMs,
    //   providerName: 'imagen_4',
    //   modelVersion: 'imagen-4.0-generate-001'
    // };
  }

  providerName(): 'imagen_4' {
    return 'imagen_4';
  }

  /**
   * Injeta cores e tipografia do brand no prompt antes de enviar a Imagen 4.
   */
  private injetarBrandNoPrompt(input: ImageGenInput): string {
    let prompt = input.prompt;

    if (input.brandColors && input.brandColors.length > 0) {
      const cores = input.brandColors.join(', ');
      prompt += `\n\nUse exclusively these brand colors: ${cores}.`;
    }
    if (input.brandFont) {
      prompt += `\n\nTypography: ${input.brandFont} (use only this font).`;
    }
    if (input.hasTextOverlay && input.textOverlayContent) {
      prompt += `\n\nText overlay: "${input.textOverlayContent}" (render exactly as shown, centered, bold).`;
    }

    return prompt;
  }
}
