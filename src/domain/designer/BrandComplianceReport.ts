// Domain entity: BrandComplianceReport
// Relatório agregado de validação de brand dos N slides do carrossel.
// Gate hard ADR-001-DES: individual ≥99% por slide (NÃO média).

import type { BrandValidationIssue } from '../ports/BrandValidator.js';

export interface SlideComplianceEntry {
  slideOrder: number;
  brandScore: number; // 0.0 – 1.0
  decision: 'accept' | 'accept_with_warning' | 'retry';
  retryCount: number;
  providerUsed: 'imagen_4' | 'ideogram_v2';
  fallbackTriggered: boolean;
  issues: BrandValidationIssue[];
}

export class BrandComplianceReport {
  readonly entries: SlideComplianceEntry[];
  readonly gateThreshold: number; // 0.0 – 1.0

  constructor(entries: SlideComplianceEntry[], gateThreshold: number) {
    if (entries.length === 0) {
      throw new Error('BrandComplianceReport precisa de ≥1 entrada');
    }
    if (gateThreshold < 0.9 || gateThreshold > 1.0) {
      throw new Error(`gateThreshold fora de range: ${gateThreshold}`);
    }
    this.entries = [...entries].sort((a, b) => a.slideOrder - b.slideOrder);
    this.gateThreshold = gateThreshold;
  }

  /** Gate hard individual por slide (ADR-001-DES). */
  todosPassaram(): boolean {
    return this.entries.every((e) => e.brandScore >= this.gateThreshold);
  }

  /** Score médio agregado (informacional, não é gate). */
  scoreMedio(): number {
    const soma = this.entries.reduce((s, e) => s + e.brandScore, 0);
    return soma / this.entries.length;
  }

  slidesReprovados(): SlideComplianceEntry[] {
    return this.entries.filter((e) => e.brandScore < this.gateThreshold);
  }

  /** Sinaliza output degraded=true se algum slide falhou após retries. */
  isDegraded(): boolean {
    return this.entries.some(
      (e) => e.retryCount >= 1 && e.brandScore < this.gateThreshold
    );
  }

  totalRetries(): number {
    return this.entries.reduce((s, e) => s + e.retryCount, 0);
  }

  providerSplit(): { imagen: number; ideogram: number } {
    return {
      imagen: this.entries.filter((e) => e.providerUsed === 'imagen_4').length,
      ideogram: this.entries.filter((e) => e.providerUsed === 'ideogram_v2')
        .length
    };
  }
}
