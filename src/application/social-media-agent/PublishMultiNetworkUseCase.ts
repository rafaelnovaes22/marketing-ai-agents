// Use Case: Publica carrossel já gerado em 4 redes simultâneas
// LinkedIn/IG/FB via Zernio; Twitter via TwitterAdapter (ADR-003-DS).

import { RedeSocial } from '../../domain/carrossel/RedeSocial.js';
import type { Carrossel } from '../../domain/carrossel/Carrossel.js';
import type {
  SocialPublisher,
  PublishOutput
} from '../../domain/ports/SocialPublisher.js';
import type {
  Observability,
  TraceContext
} from '../../domain/ports/Observability.js';

export interface PublishMultiNetworkDeps {
  publisherZernio: SocialPublisher;   // suporta linkedin, instagram, facebook
  publisherTwitter: SocialPublisher;  // suporta twitter
  observability: Observability;
}

export interface PublishResult {
  rede: string;
  output: PublishOutput;
}

export class PublishMultiNetworkUseCase {
  constructor(private readonly deps: PublishMultiNetworkDeps) {}

  async execute(
    carrossel: Carrossel,
    redes: RedeSocial[] = RedeSocial.todas(),
    traceContext?: TraceContext
  ): Promise<PublishResult[]> {
    if (!carrossel.outcomeAlcancado()) {
      throw new Error(
        'Carrossel ainda não cumpre outcome contratual — não publicar.'
      );
    }
    if (!carrossel.caption) {
      throw new Error('Carrossel sem captions');
    }

    const imageUrls = carrossel.slides.map((s) => s.imageUrl!).filter(Boolean);

    const publishOps = redes.map(async (rede) => {
      const caption = carrossel.caption!.paraRede(rede);
      if (!caption) {
        return {
          rede: rede.value,
          output: {
            status: 'failed' as const,
            errorMessage: `Caption não disponível para ${rede.value}`,
            costBrl: 0,
            latencyMs: 0,
            attemptsCount: 0
          }
        };
      }

      const publisher = this.escolherPublisher(rede);

      const runner = async (): Promise<PublishOutput> =>
        publisher.publish({
          rede: rede.value,
          imageUrls,
          caption,
          metadata: {
            tenantId: carrossel.tenantId,
            carrosselId: carrossel.id,
            isUpsell: String(carrossel.isUpsell)
          }
        });

      if (traceContext) {
        const output = await this.deps.observability.span(
          traceContext,
          { name: `publish_${rede.value}`, startTime: new Date() },
          runner
        );
        return { rede: rede.value, output };
      }

      const output = await runner();
      return { rede: rede.value, output };
    });

    return Promise.all(publishOps);
  }

  private escolherPublisher(rede: RedeSocial): SocialPublisher {
    if (rede.usaModoThread()) return this.deps.publisherTwitter;
    return this.deps.publisherZernio;
  }
}
