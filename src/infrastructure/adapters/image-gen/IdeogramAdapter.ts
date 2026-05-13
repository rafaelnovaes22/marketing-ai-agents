// Adapter: Ideogram v2
// Fallback para slides com texto destacado (ADR-002-DS)
// IMPLEMENTAÇÃO INICIAL: skeleton com TODO para Wave 2.

import type {
  ImageGenProvider,
  ImageGenInput,
  ImageGenOutput
} from '../../../domain/ports/ImageGenProvider.js';

const PRICE_PER_IMAGE_USD = 0.02;
const USD_TO_BRL = 5.3;

export interface IdeogramAdapterConfig {
  apiKey: string;
  baseUrl?: string;  // default: 'https://api.ideogram.ai/generate'
}

export class IdeogramAdapter implements ImageGenProvider {
  // @ts-expect-error — utilizado em Wave 2 (fetch real)
  private readonly apiKey: string;
  // @ts-expect-error — utilizado em Wave 2 (fetch real)
  private readonly baseUrl: string;

  constructor(config: IdeogramAdapterConfig) {
    if (!config.apiKey) {
      throw new Error('IdeogramAdapter requer IDEOGRAM_API_KEY');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.ideogram.ai/generate';
  }

  async generate(input: ImageGenInput): Promise<ImageGenOutput> {
    // TODO Wave 2: implementar fetch real
    // const response = await fetch(this.baseUrl, {
    //   method: 'POST',
    //   headers: { 'Api-Key': this.apiKey, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ image_request: { prompt: input.prompt, ... } })
    // });

    void input;  // será usado em Wave 2

    throw new Error(
      'IdeogramAdapter.generate ainda não implementado (Wave 2 / TDD red phase).'
    );
  }

  providerName(): 'ideogram_v2' {
    return 'ideogram_v2';
  }

  /**
   * Calcula custo esperado da geração (BRL).
   * Usado pelo unit-economist para previsão antes da chamada.
   */
  estimaCustoBrl(): number {
    return Number((PRICE_PER_IMAGE_USD * USD_TO_BRL).toFixed(4));
  }
}
