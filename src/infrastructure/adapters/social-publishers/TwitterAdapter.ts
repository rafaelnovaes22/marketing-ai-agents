// Adapter: Twitter (X) — modo thread (ADR-003-DS)
// Não usa Zernio porque modelo de thread (1 image por tweet) é diferente.
// IMPLEMENTAÇÃO INICIAL: skeleton com lógica de thread definida; integração API real fica para Wave 3+

import type {
  SocialPublisher,
  PublishInput,
  PublishOutput
} from '../../../domain/ports/SocialPublisher.js';
import type { RedeValue } from '../../../domain/carrossel/RedeSocial.js';

const PRICE_PER_THREAD_USD = 0.02;  // Twitter API enterprise pricing aprox.
const USD_TO_BRL = 5.3;

export interface TwitterAdapterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export class TwitterAdapter implements SocialPublisher {
  private readonly config: TwitterAdapterConfig;

  constructor(config: TwitterAdapterConfig) {
    if (!config.apiKey || !config.accessToken) {
      throw new Error(
        'TwitterAdapter requer apiKey, apiSecret, accessToken, accessTokenSecret'
      );
    }
    this.config = config;
  }

  supportsRede(rede: RedeValue): boolean {
    return rede === 'twitter';
  }

  async publish(input: PublishInput): Promise<PublishOutput> {
    if (input.rede !== 'twitter') {
      return {
        status: 'failed',
        errorMessage: 'TwitterAdapter só publica em Twitter (modo thread)',
        costBrl: 0,
        latencyMs: 0,
        attemptsCount: 0
      };
    }

    if (!Array.isArray(input.caption)) {
      return {
        status: 'failed',
        errorMessage:
          'Twitter exige caption como array de tweets (thread). ADR-003-DS.',
        costBrl: 0,
        latencyMs: 0,
        attemptsCount: 0
      };
    }

    const tweets = input.caption;
    if (tweets.length < 2) {
      return {
        status: 'failed',
        errorMessage: 'Thread Twitter exige ≥ 2 tweets',
        costBrl: 0,
        latencyMs: 0,
        attemptsCount: 0
      };
    }

    if (tweets.length !== input.imageUrls.length && tweets.length !== input.imageUrls.length + 1) {
      return {
        status: 'failed',
        errorMessage:
          `Thread tem ${tweets.length} tweets mas ${input.imageUrls.length} imagens. Esperado: tweets == imagens OU tweets == imagens + 1 (1 tweet CTA final sem imagem).`,
        costBrl: 0,
        latencyMs: 0,
        attemptsCount: 0
      };
    }

    // TODO Wave 3: implementar via Twitter API v2
    // 1. POST tweet inicial com primeira imagem → tweet_id_1
    // 2. POST replies em thread (in_reply_to_status_id = tweet_id_anterior)
    // 3. Cada tweet de imagem upload da mídia separada
    // 4. Retornar URL do primeiro tweet

    void this.config;  // será usado em Wave 3

    throw new Error(
      'TwitterAdapter.publish ainda não implementado (Wave 3 / TDD red phase). ' +
        'Lógica de thread validada acima. Falta integração API v2.'
    );
  }

  /**
   * Custo esperado de publicação (para previsão antes da chamada).
   */
  estimaCustoBrl(): number {
    return Number((PRICE_PER_THREAD_USD * USD_TO_BRL).toFixed(4));
  }
}
