// Port: Social Publisher
// Publica em redes sociais. Zernio adapter cobre 3 redes; Twitter usa adapter próprio (ADR-003-DS).

import type { RedeValue } from '../carrossel/RedeSocial.js';

export interface PublishInput {
  rede: RedeValue;
  imageUrls: string[];           // 4-7 imagens
  caption: string | string[];    // string para LinkedIn/IG/FB; string[] para Twitter thread
  metadata?: Record<string, string>;
}

export interface PublishOutput {
  status: 'published' | 'failed' | 'manual_required';
  externalPostId?: string;
  externalUrl?: string;
  errorMessage?: string;
  costBrl: number;
  latencyMs: number;
  attemptsCount: number;
}

export interface SocialPublisher {
  publish(input: PublishInput): Promise<PublishOutput>;
  supportsRede(rede: RedeValue): boolean;
}
