// Value Object: FeedbackEvent (ADR-007-PROJ)
//
// Captura o sinal de aprendizado vindo do humano supervisor em ASSISTED:
// aprovou, editou ou rejeitou o output do agente. A EDIÇÃO/REJEIÇÃO é a lição.
//
// Privacidade (LGPD): NÃO carregamos o conteúdo bruto do output (pode conter PII).
// Apenas o `editSummary` humano (conciso, acionável) e deltas de tamanho. A
// sanitização final ainda passa pelo learning-curator antes de virar fato.

export type FeedbackVerdict = 'approved' | 'edited' | 'rejected';
export type RunMode = 'shadow' | 'assisted' | 'autonomous';

export interface FeedbackEventInput {
  tenantId: string;
  sku: string;
  traceId: string;
  outputType: string;
  mode: RunMode;
  verdict: FeedbackVerdict;
  /** Nota humana concisa do que mudou/por quê. Obrigatória se editou/rejeitou. */
  editSummary?: string;
  /** Tamanho (chars) do output original — só métrica, sem conteúdo. */
  originalLength?: number;
  /** Tamanho (chars) do output final após edição humana — só métrica. */
  finalLength?: number;
}

export class FeedbackEvent {
  readonly tenantId: string;
  readonly sku: string;
  readonly traceId: string;
  readonly outputType: string;
  readonly mode: RunMode;
  readonly verdict: FeedbackVerdict;
  readonly editSummary: string | null;
  readonly originalLength: number | null;
  readonly finalLength: number | null;

  private constructor(input: FeedbackEventInput) {
    this.tenantId = input.tenantId;
    this.sku = input.sku;
    this.traceId = input.traceId;
    this.outputType = input.outputType;
    this.mode = input.mode;
    this.verdict = input.verdict;
    this.editSummary = input.editSummary?.trim() || null;
    this.originalLength = input.originalLength ?? null;
    this.finalLength = input.finalLength ?? null;
  }

  static create(input: FeedbackEventInput): FeedbackEvent {
    if (!input.tenantId?.trim()) throw new Error('FeedbackEvent exige tenantId');
    if (!input.sku?.trim()) throw new Error('FeedbackEvent exige sku');
    if (!input.traceId?.trim()) {
      throw new Error('FeedbackEvent exige traceId (rastreabilidade C6)');
    }
    if (
      (input.verdict === 'edited' || input.verdict === 'rejected') &&
      !input.editSummary?.trim()
    ) {
      throw new Error(
        `FeedbackEvent verdict=${input.verdict} exige editSummary (a lição acionável)`
      );
    }
    return new FeedbackEvent(input);
  }

  /** Mapeia o modo de execução para o nível de confiança do fato (C4). */
  confidence(): 'shadow' | 'assisted' | 'autonomous' {
    return this.mode;
  }

  /** Seção do agent-memory mais adequada ao verdict. */
  section(): 'confirmed_patterns' | 'pitfalls' {
    return this.verdict === 'approved' ? 'confirmed_patterns' : 'pitfalls';
  }

  /** Texto acionável do fato candidato (sem conteúdo bruto — só a lição humana). */
  candidateFactText(): string {
    const tag = `[${this.outputType}]`;
    if (this.verdict === 'approved') {
      return `${tag} Output aprovado sem edição pelo supervisor humano`;
    }
    return `${tag} ${this.editSummary}`;
  }
}
