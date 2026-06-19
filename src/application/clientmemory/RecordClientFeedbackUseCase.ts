// Use Case: RecordClientFeedbackUseCase (ADR-007-PROJ)
//
// Recebe um FeedbackEvent (humano em ASSISTED) e escreve um learning snapshot
// no MESMO formato que hooks/stop/learning-snapshot.sh produz — para que o
// learning-curator existente faça a curadoria e persista em agent-memory.md.
//
// Estes são os primeiros snapshots `is_internal: false` (cliente real) do projeto.
// Nenhum conteúdo bruto do output é gravado (LGPD) — só a lição humana + métricas.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FeedbackEvent } from '../../domain/clientmemory/FeedbackEvent.js';

export interface RecordClientFeedbackDeps {
  /** Raiz dos learning snapshots. Default: docs/learnings */
  snapshotsRoot?: string;
  /** Relógio injetável (testes determinísticos). Default: () => new Date(). */
  now?: () => Date;
}

export interface RecordClientFeedbackResult {
  snapshotPath: string;
  factLine: string;
}

export class RecordClientFeedbackUseCase {
  private readonly snapshotsRoot: string;
  private readonly now: () => Date;

  constructor(deps: RecordClientFeedbackDeps = {}) {
    this.snapshotsRoot = deps.snapshotsRoot ?? join('docs', 'learnings');
    this.now = deps.now ?? (() => new Date());
  }

  execute(event: FeedbackEvent): RecordClientFeedbackResult {
    const at = this.now();
    const iso = at.toISOString();
    const month = iso.slice(0, 7); // YYYY-MM
    const day = iso.slice(0, 10); // YYYY-MM-DD
    const compact = iso.slice(0, 19).replace(/[-:]/g, '').replace('T', 'T'); // YYYYMMDDTHHmmss

    const factLine = `§ [confidence:${event.confidence()}] [${day}] [run:${event.traceId}] ${event.candidateFactText()}`;

    const dir = join(this.snapshotsRoot, month);
    mkdirSync(dir, { recursive: true });
    const fileName = `runtime-${event.tenantId}-${compact}.md`;
    const path = join(dir, fileName);

    writeFileSync(path, this.render(event, { iso, day, factLine }), 'utf-8');
    return { snapshotPath: path, factLine };
  }

  private render(
    event: FeedbackEvent,
    ctx: { iso: string; day: string; factLine: string }
  ): string {
    const section = event.section();
    const isApproved = event.verdict === 'approved';
    const patternsBlock = isApproved ? ctx.factLine : '_n/a_';
    const pitfallsBlock = isApproved ? '_n/a_' : ctx.factLine;
    const delta =
      event.originalLength !== null && event.finalLength !== null
        ? `${event.originalLength} → ${event.finalLength} chars`
        : 'não informado';

    return [
      '---',
      `session_id: runtime-${event.tenantId}-${ctx.day}`,
      `timestamp: ${ctx.iso}`,
      `run_id: ${event.traceId}`,
      'consumer: marketing-ai-agents',
      'command: runtime-feedback',
      'exit_code: 0',
      `confidence: ${event.confidence()}`,
      `source_trace_id: ${event.traceId}`,
      `client_id: ${event.tenantId}`,
      `source_diagnostic: docs/clients/${event.tenantId}/diagnostic.md`,
      'is_internal: false',
      'tokens_used: "~"',
      'cost_estimate: "~"',
      'proposed_memory_update: true',
      '---',
      '',
      `# Learning Snapshot (runtime) — ${event.tenantId}`,
      '',
      '> Gerado por `RecordClientFeedbackUseCase` a partir de feedback humano em ASSISTED.',
      '> Curadoria pelo `learning-curator` antes de persistir em `agent-memory.md` (C8/PII).',
      '',
      '## Contexto da sessão',
      '',
      `- **SKU**: ${event.sku}`,
      `- **Output type**: ${event.outputType}`,
      `- **Verdict humano**: ${event.verdict}`,
      `- **Modo**: ${event.mode}`,
      `- **Delta de tamanho**: ${delta}`,
      `- **Seção alvo**: § ${section}`,
      '',
      '## Novos padrões detectados',
      '',
      patternsBlock,
      '',
      '## Pitfalls encontrados',
      '',
      pitfallsBlock,
      '',
      '## Sugestão para agent-memory.md',
      '',
      `Adicionar à seção \`§ ${section}\` de \`docs/clients/${event.tenantId}/agent-memory.md\`:`,
      '',
      ctx.factLine,
      '',
      '## Decisão "should persist?"',
      '',
      '- [ ] Sim — propor PR com patch ao agent-memory.md do cliente',
      '- [ ] Sim parcial — adicionar a learned-skills/',
      '- [ ] Não — manter como audit trail sem propagação',
      ''
    ].join('\n');
  }
}
