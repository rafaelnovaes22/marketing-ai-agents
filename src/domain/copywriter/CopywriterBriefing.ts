// Domain value object: Briefing de entrada do copywriter-agent.
// Tipo composto (output_type + framework + tom + payload livre).
// Validação estrutural sem deps externas (Zod entra em application layer).

import { Framework } from './Framework.js';
import { OutputType } from './OutputType.js';

export interface CopywriterBriefingInput {
  tenantId: string;
  outputType: OutputType;
  framework: Framework;
  tomSlug: string;               // Reuso de Tom já existente (brand_voice_ceo, etc.)
  product: string;               // Produto / oferta
  audience: string;              // Público alvo descrito em texto livre
  goal: string;                  // O que se quer que o leitor faça
  context: string;               // Texto livre extra (≥40 chars)
  isUpsell: boolean;             // Apenas afeta landing (volume estendido)
}

export class CopywriterBriefing {
  readonly tenantId: string;
  readonly outputType: OutputType;
  readonly framework: Framework;
  readonly tomSlug: string;
  readonly product: string;
  readonly audience: string;
  readonly goal: string;
  readonly context: string;
  readonly isUpsell: boolean;

  private constructor(input: CopywriterBriefingInput) {
    this.tenantId = input.tenantId;
    this.outputType = input.outputType;
    this.framework = input.framework;
    this.tomSlug = input.tomSlug;
    this.product = input.product;
    this.audience = input.audience;
    this.goal = input.goal;
    this.context = input.context;
    this.isUpsell = input.isUpsell;
  }

  static create(input: CopywriterBriefingInput): CopywriterBriefing {
    if (!input.tenantId || input.tenantId.trim().length === 0) {
      throw new Error('Briefing exige tenantId');
    }
    if (!input.product || input.product.trim().length === 0) {
      throw new Error('Briefing exige product (produto/oferta)');
    }
    if (!input.audience || input.audience.trim().length === 0) {
      throw new Error('Briefing exige audience (público alvo)');
    }
    if (!input.goal || input.goal.trim().length === 0) {
      throw new Error('Briefing exige goal (objetivo)');
    }
    if (!input.context || input.context.trim().length < 40) {
      throw new Error(
        'Briefing exige context com ≥ 40 chars (descrição livre do tema)'
      );
    }
    if (!input.framework.compativelCom(input.outputType.value)) {
      throw new Error(
        `Framework ${input.framework.value} incompatível com outputType ${input.outputType.value}`
      );
    }
    if (input.isUpsell && input.outputType.value !== 'landing') {
      throw new Error(
        'Upsell é aplicável apenas a output_type=landing (ADR-001-CW)'
      );
    }
    return new CopywriterBriefing(input);
  }

  /**
   * Hash determinístico do briefing — usado em metadata LangSmith (C6).
   * Implementação simples sem dep externa.
   */
  briefingHash(): string {
    const stringified =
      this.tenantId +
      '|' +
      this.outputType.value +
      '|' +
      this.framework.value +
      '|' +
      this.tomSlug +
      '|' +
      this.product +
      '|' +
      this.audience +
      '|' +
      this.goal +
      '|' +
      this.context +
      '|' +
      String(this.isUpsell);
    let hash = 5381;
    for (let i = 0; i < stringified.length; i++) {
      hash = ((hash << 5) + hash + stringified.charCodeAt(i)) | 0;
    }
    return 'brf_' + (hash >>> 0).toString(16);
  }
}
