// Port: ClientMemory (C5/C7/C8)
//
// Self-harness em RUNTIME: agentes SKU aprendem com cada cliente que atendem.
// Distinto do loop Forge-20 (dev-sessions do Claude Code). Ver ADR-007-PROJ.
//
// MEMORY e SOUL vivem em docs/clients/{tenantId}/ (Tier 1/2 de DADOS, C5) — nunca
// em código. tenantId é parâmetro puro: jamais `if (tenantId === ...)` (C8).
// Fatos são markdown agnóstico de modelo (C7) no formato § do learning-curator.

/** Níveis de confiança herdados do lifecycle (C4). Ordem = força crescente. */
export type FactConfidence = 'local' | 'shadow' | 'assisted' | 'autonomous';

/** Seções canônicas do agent-memory.md (espelham o learning-curator guardian). */
export type MemorySection =
  | 'integration_quirks'
  | 'process_patterns'
  | 'pitfalls'
  | 'confirmed_patterns'
  | 'tech_constraints'
  | 'economics_real'
  | 'telemetry_hints'
  | 'pii_categories';

/**
 * Um fato aprendido sobre um cliente. Rastreável por construção (C6):
 * todo fato carrega `date` + `runId`.
 *
 * Formato textual canônico (parse/serialize):
 *   § [confidence:{confidence}] [{date}] [run:{runId}] {text}
 */
export interface ClientFact {
  section: MemorySection;
  confidence: FactConfidence;
  date: string; // YYYY-MM-DD
  runId: string; // ex: 'gh-1234', 'local', trace_id
  text: string;
  /** Marcado quando um run posterior contradisse o fato — nunca injetado. */
  obsolete?: boolean;
}

/** Resultado de carregar a memória de um cliente para injeção em prompt. */
export interface ClientMemorySnapshot {
  tenantId: string;
  /** Conteúdo de agent-soul.md (identidade durável), ou null se ausente. */
  soul: string | null;
  /** Todos os fatos parseados de agent-memory.md (inclui obsoletos). */
  facts: ClientFact[];
  /**
   * Bloco markdown pronto para concatenar ao system prompt. Já filtrado
   * (sem obsoletos, confidence ≥ piso de injeção) e limitado por orçamento.
   * String vazia quando não há nada elegível a injetar.
   */
  promptFragment: string;
}

/** Leitura da memória por cliente — usado no caminho de runtime (injeção). */
export interface ClientMemory {
  load(tenantId: string): Promise<ClientMemorySnapshot>;
}

/** Escrita de fatos curados — usado pela curadoria (learning-curator / Hermes). */
export interface ClientMemoryWriter {
  appendFact(tenantId: string, fact: ClientFact): Promise<void>;
}
