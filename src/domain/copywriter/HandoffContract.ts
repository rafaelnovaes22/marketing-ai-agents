// Handoff Contract — payload JSON-safe consumido por Designer Agent / Webflow publisher.
// T4.4. Imutável e serializável (JSON.stringify nunca lança).

import type { LandingHero, LandingSection } from './Landing.js';
import type { Email } from './EmailSequence.js';
import type { AdVariation } from './AdSet.js';

export interface LandingHandoffPayload {
  hero: LandingHero;
  sections: ReadonlyArray<LandingSection>;
  ctas: ReadonlyArray<string>;
  word_count: number;
  is_upsell: boolean;
}

export interface EmailSequenceHandoffPayload {
  emails: ReadonlyArray<Email>;
  total_word_count: number;
}

export interface AdSetHandoffPayload {
  variations: ReadonlyArray<AdVariation>;
  diversity_score: number | null;
}

export type HandoffPayloadBody =
  | LandingHandoffPayload
  | EmailSequenceHandoffPayload
  | AdSetHandoffPayload;

export interface HandoffPayload {
  output_id: string;
  output_type: 'landing' | 'email_sequence' | 'ad_set';
  schema_version: string;
  tenant_id: string;
  briefing_hash: string;
  created_at_iso: string;
  price_brl: number;
  outcome_achieved: boolean;
  payload: HandoffPayloadBody;
}
