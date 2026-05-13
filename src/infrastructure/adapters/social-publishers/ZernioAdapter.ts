// Adapter: Zernio API — publicação em LinkedIn, Instagram, Facebook
// Twitter NÃO usa Zernio (modo thread, ADR-003-DS) — adapter próprio.

import type {
  SocialPublisher,
  PublishInput,
  PublishOutput
} from '../../../domain/ports/SocialPublisher.js';
import type { RedeValue } from '../../../domain/carrossel/RedeSocial.js';

const PRICE_PER_POST_USD = 0.01;
const USD_TO_BRL = 5.3;
const SUPPORTED_NETWORKS: RedeValue[] = ['linkedin', 'instagram', 'facebook'];

export interface ZernioAdapterConfig {
  apiKey: string;
  baseUrl?: string;  // default: https://api.zernio.io/v1
}

export class ZernioAdapter implements SocialPublisher {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ZernioAdapterConfig) {
    if (!config.apiKey) {
      throw new Error('ZernioAdapter requer ZERNIO_API_KEY');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.zernio.io/v1';
  }

  supportsRede(rede: RedeValue): boolean {
    return SUPPORTED_NETWORKS.includes(rede);
  }

  async publish(input: PublishInput): Promise<PublishOutput> {
    if (!this.supportsRede(input.rede)) {
      return {
        status: 'failed',
        errorMessage: `ZernioAdapter não suporta ${input.rede}. Use TwitterAdapter.`,
        costBrl: 0,
        latencyMs: 0,
        attemptsCount: 0
      };
    }

    if (Array.isArray(input.caption)) {
      return {
        status: 'failed',
        errorMessage: 'Zernio espera caption string. Threads vão para TwitterAdapter.',
        costBrl: 0,
        latencyMs: 0,
        attemptsCount: 0
      };
    }

    const start = Date.now();
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: string | undefined;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await fetch(`${this.baseUrl}/posts`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            network: input.rede,
            caption: input.caption,
            media_urls: input.imageUrls,
            metadata: input.metadata
          })
        });

        if (!response.ok) {
          lastError = `HTTP ${response.status}: ${await response.text()}`;
          // 4xx = client error, não retry
          if (response.status >= 400 && response.status < 500) {
            return {
              status: 'failed',
              errorMessage: lastError,
              costBrl: 0,
              latencyMs: Date.now() - start,
              attemptsCount: attempts
            };
          }
          // 5xx = retry com backoff exponencial
          await this.sleep(Math.pow(2, attempts) * 500);
          continue;
        }

        const data = (await response.json()) as {
          post_id: string;
          url: string;
        };

        return {
          status: 'published',
          externalPostId: data.post_id,
          externalUrl: data.url,
          costBrl: PRICE_PER_POST_USD * USD_TO_BRL,
          latencyMs: Date.now() - start,
          attemptsCount: attempts
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempts >= maxAttempts) break;
        await this.sleep(Math.pow(2, attempts) * 500);
      }
    }

    return {
      status: 'manual_required',
      errorMessage: `Falhou após ${maxAttempts} tentativas: ${lastError}`,
      costBrl: 0,
      latencyMs: Date.now() - start,
      attemptsCount: attempts
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
