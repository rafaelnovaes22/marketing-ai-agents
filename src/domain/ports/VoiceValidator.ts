// Port: Voice Validator (LLM-as-judge)
// Avalia se texto gerado adere ao tom canônico (ex: the CEO).
// Adapter padrão: Claude Sonnet 4.6 (mais barato que Opus para julgamento curto).

export type VoiceUnitKind = 'landing_block' | 'email' | 'ad_variation' | 'full_landing';

export interface VoiceValidationInput {
  tomSlug: string;
  unitKind: VoiceUnitKind;
  text: string;
  // Contexto opcional para o juiz (ex: "esse é o bloco social_proof")
  context?: string;
}

export interface VoiceValidationIssue {
  dimension: 'lexico' | 'cadencia' | 'imperativo' | 'autoridade' | 'jargao' | 'outro';
  severity: 'critical' | 'warning' | 'info';
  description: string;
}

export interface VoiceValidationOutput {
  score: number; // 0.0 - 1.0 (≥0,75 = on-tom; <0,60 = re-roll)
  decision: 'accept' | 'accept_with_warning' | 'reroll';
  issues: VoiceValidationIssue[];
  costBrl: number;
  latencyMs: number;
}

export interface VoiceValidator {
  validate(input: VoiceValidationInput): Promise<VoiceValidationOutput>;
}
