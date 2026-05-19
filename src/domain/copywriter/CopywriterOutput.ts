// Domain aggregate root: CopywriterOutput
// Wrapper sobre 1 dos 3 outputs concretos (Landing | EmailSequence | AdSet).

import { AdSet } from './AdSet.js';
import { CopywriterBriefing } from './CopywriterBriefing.js';
import { EmailSequence } from './EmailSequence.js';
import { Framework } from './Framework.js';
import type { HandoffPayload, HandoffPayloadBody } from './HandoffContract.js';
import { Landing } from './Landing.js';
import { OutputType } from './OutputType.js';

export type CopywriterStatus =
  | 'pending'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type CopywriterPayload = Landing | EmailSequence | AdSet;

export interface CopywriterOutputInit {
  id: string;
  briefing: CopywriterBriefing;
  status: CopywriterStatus;
  payload: CopywriterPayload | null;
  createdAt: Date;
}

export class CopywriterOutput {
  readonly id: string;
  readonly briefing: CopywriterBriefing;
  readonly status: CopywriterStatus;
  readonly payload: CopywriterPayload | null;
  readonly createdAt: Date;

  private constructor(input: CopywriterOutputInit) {
    this.id = input.id;
    this.briefing = input.briefing;
    this.status = input.status;
    this.payload = input.payload;
    this.createdAt = input.createdAt;
  }

  /**
   * Cria um output em status 'pending' (antes da geração).
   */
  static novo(id: string, briefing: CopywriterBriefing): CopywriterOutput {
    if (!id || id.trim().length === 0) {
      throw new Error('CopywriterOutput exige id');
    }
    return new CopywriterOutput({
      id,
      briefing,
      status: 'pending',
      payload: null,
      createdAt: new Date()
    });
  }

  /**
   * Anexa o payload concreto e marca status como 'completed'.
   * Valida que o tipo do payload bate com o output_type do briefing.
   */
  comPayload(payload: CopywriterPayload): CopywriterOutput {
    const ot = this.briefing.outputType.value;
    if (ot === 'landing' && !(payload instanceof Landing)) {
      throw new Error('Payload esperado: Landing (output_type=landing)');
    }
    if (ot === 'email_sequence' && !(payload instanceof EmailSequence)) {
      throw new Error(
        'Payload esperado: EmailSequence (output_type=email_sequence)'
      );
    }
    if (ot === 'ad_set' && !(payload instanceof AdSet)) {
      throw new Error('Payload esperado: AdSet (output_type=ad_set)');
    }

    return new CopywriterOutput({
      id: this.id,
      briefing: this.briefing,
      status: 'completed',
      payload,
      createdAt: this.createdAt
    });
  }

  comStatus(status: CopywriterStatus): CopywriterOutput {
    return new CopywriterOutput({
      id: this.id,
      briefing: this.briefing,
      status,
      payload: this.payload,
      createdAt: this.createdAt
    });
  }

  /**
   * Outcome contratual atingido (spec.md seção 1.2)?
   * - status=completed
   * - payload condizente com output_type
   * - volume/diversidade conforme regra do tipo
   */
  outcomeAlcancado(): boolean {
    if (this.status !== 'completed' || !this.payload) return false;

    if (this.payload instanceof Landing) {
      return this.payload.volumeOk();
    }
    if (this.payload instanceof EmailSequence) {
      return this.payload.volumeOk() && this.payload.temConectividadeNarrativa();
    }
    if (this.payload instanceof AdSet) {
      return this.payload.diversidadeOk();
    }
    return false;
  }

  precoFinal(): number {
    if (!this.payload) return this.briefing.isUpsell ? 110.0 : 80.0;
    if (this.payload instanceof Landing) return this.payload.precoFinal();
    if (this.payload instanceof EmailSequence) return this.payload.precoFinal();
    if (this.payload instanceof AdSet) return this.payload.precoFinal();
    return 80.0;
  }

  /**
   * Conveniência para serialização — devolve objeto JSON-safe.
   */
  outputType(): OutputType {
    return this.briefing.outputType;
  }

  framework(): Framework {
    return this.briefing.framework;
  }

  /**
   * Serializa o output em formato consumível por Designer Agent / Webflow (T4.4).
   * Exige status='completed' + payload presente — lança se o output ainda está
   * em pending/generating/failed.
   */
  toHandoffPayload(): HandoffPayload {
    if (this.status !== 'completed' || !this.payload) {
      throw new Error(
        `toHandoffPayload exige status=completed. Status atual: ${this.status} (output ${this.id})`
      );
    }

    const ot = this.briefing.outputType.value;
    let payload: HandoffPayloadBody;

    if (this.payload instanceof Landing) {
      payload = {
        hero: this.payload.hero,
        sections: this.payload.sections,
        ctas: this.payload.ctas,
        word_count: this.payload.wordCount,
        is_upsell: this.payload.isUpsell
      };
    } else if (this.payload instanceof EmailSequence) {
      payload = {
        emails: this.payload.emails,
        total_word_count: this.payload.totalWordCount
      };
    } else if (this.payload instanceof AdSet) {
      payload = {
        variations: this.payload.variations,
        diversity_score: this.payload.diversityScore
      };
    } else {
      throw new Error(`Payload de tipo desconhecido em ${this.id}`);
    }

    return {
      output_id: this.id,
      output_type: ot as HandoffPayload['output_type'],
      schema_version: this.payload.schemaVersion,
      tenant_id: this.briefing.tenantId,
      briefing_hash: this.briefing.briefingHash(),
      created_at_iso: this.createdAt.toISOString(),
      price_brl: this.precoFinal(),
      outcome_achieved: this.outcomeAlcancado(),
      payload
    };
  }
}
