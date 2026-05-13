// Domain entity: Sequência de e-mail (Tipo B do copywriter-agent).
// Spec.md seção 1.1 Tipo B — 3-5 e-mails (default 4).

export interface Email {
  position: number;             // 1..N (1 = primeiro)
  subject: string;
  previewText: string;
  body: string;
  cta: string;
  sendOffsetHours: number;      // hs após mail anterior (ou 0 para o primeiro)
  referencesPrevious: boolean;  // gancho narrativo com email N-1
}

export interface EmailSequenceInput {
  schemaVersion: string;        // ADR-003-CW
  emails: Email[];
  totalWordCount: number;
}

const TOTAL_MIN_WORDS = 1200;
const TOTAL_MAX_WORDS = 2000;
const MIN_EMAILS = 3;
const MAX_EMAILS = 5;

export class EmailSequence {
  readonly schemaVersion: string;
  readonly emails: ReadonlyArray<Email>;
  readonly totalWordCount: number;

  private constructor(input: EmailSequenceInput) {
    this.schemaVersion = input.schemaVersion;
    this.emails = input.emails;
    this.totalWordCount = input.totalWordCount;
  }

  static create(input: EmailSequenceInput): EmailSequence {
    if (!input.schemaVersion || !/^\d+\.\d+\.\d+$/.test(input.schemaVersion)) {
      throw new Error(
        `schemaVersion inválido: ${input.schemaVersion} (ADR-003-CW)`
      );
    }
    if (
      input.emails.length < MIN_EMAILS ||
      input.emails.length > MAX_EMAILS
    ) {
      throw new Error(
        `EmailSequence aceita ${MIN_EMAILS}-${MAX_EMAILS} emails, recebido: ${input.emails.length}`
      );
    }

    // Posições contínuas 1..N
    const positions = input.emails.map((e) => e.position).sort((a, b) => a - b);
    for (let i = 0; i < positions.length; i++) {
      if (positions[i] !== i + 1) {
        throw new Error(
          `Posições devem ser contínuas 1..${positions.length}. Recebido: ${positions.join(',')}`
        );
      }
    }

    // Validação básica de campos
    for (const e of input.emails) {
      if (!e.subject || e.subject.trim().length === 0) {
        throw new Error(`Email ${e.position} sem subject`);
      }
      if (!e.body || e.body.trim().length === 0) {
        throw new Error(`Email ${e.position} sem body`);
      }
      if (!e.cta || e.cta.trim().length === 0) {
        throw new Error(`Email ${e.position} sem cta`);
      }
    }

    return new EmailSequence(input);
  }

  /**
   * Total de palavras dentro do range (spec.md seção 1.1 Tipo B).
   */
  volumeOk(): boolean {
    return (
      this.totalWordCount >= TOTAL_MIN_WORDS &&
      this.totalWordCount <= TOTAL_MAX_WORDS
    );
  }

  /**
   * Conectividade narrativa: pelo menos 1 email N>1 deve referenciar N-1.
   */
  temConectividadeNarrativa(): boolean {
    if (this.emails.length < 2) return true;
    return this.emails.slice(1).some((e) => e.referencesPrevious);
  }

  precoFinal(): number {
    return 80.0;
  }
}
