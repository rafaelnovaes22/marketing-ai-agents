// Formata RunReport em markdown alinhado ao schema de .claude/commands/novais-digital/eval.md
// Persiste em evals/{artifact_id}/runs/{YYYY-MM-DD-HHmm}-eval-{prompt_hash}.md

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import type {
  RunMetadata,
  AggregateMetrics,
  CaseResult,
  RunReport
} from './types.js';

const FOUNDRY_COMMAND_VERSION = 'eval@0.1.0';

export interface ReportWriterDeps {
  repoRoot: string;
}

export class ReportWriter {
  constructor(private readonly deps: ReportWriterDeps) {}

  build(
    metadata: Omit<RunMetadata, 'foundryCommandVersion'>,
    metrics: AggregateMetrics,
    results: CaseResult[]
  ): RunReport {
    const full: RunMetadata = {
      ...metadata,
      foundryCommandVersion: FOUNDRY_COMMAND_VERSION
    };

    const failsCount = metrics.totalFail + metrics.totalError;
    let status: RunReport['status'];
    if (metadata.subsetFilter !== 'all') {
      status = 'partial';
    } else if (metrics.totalError > 0 && metrics.totalPass === 0) {
      status = 'error';
    } else if (metrics.passRate >= metadata.threshold && failsCount === 0) {
      status = 'pass';
    } else if (metrics.passRate >= metadata.threshold) {
      status = 'pass'; // pass rate atinge threshold mesmo com fails minoritários
    } else {
      status = 'fail';
    }

    const reportPath = this.composePath(full);

    return {
      metadata: full,
      metrics,
      results,
      status,
      reportPath
    };
  }

  persist(report: RunReport): string {
    const absolute = resolve(this.deps.repoRoot, report.reportPath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, this.renderMarkdown(report), 'utf-8');
    return relative(this.deps.repoRoot, absolute).replace(/\\/g, '/');
  }

  private composePath(metadata: RunMetadata): string {
    const date = metadata.ranAt.replace(/[:T]/g, '-').slice(0, 16); // YYYY-MM-DD-HH-mm
    return `evals/${metadata.artifactId}/runs/${date}-eval-${metadata.promptHash}.md`;
  }

  private renderMarkdown(report: RunReport): string {
    const { metadata: m, metrics, results } = report;

    const front = [
      '---',
      `artifact_id: ${m.artifactId}`,
      `prompt_version: ${m.promptVersion}`,
      `prompt_hash: ${m.promptHash}`,
      `ran_at: ${m.ranAt}`,
      `ran_by: ${m.ranBy}`,
      `total_cases: ${metrics.totalCases}`,
      `subset_filter: ${m.subsetFilter}`,
      `target_model: ${m.targetModel}`,
      `judge_model: ${m.judgeModel}`,
      `total_cost_brl: ${metrics.costBrlTotal.toFixed(4)}`,
      `dry_run: ${m.dryRun}`,
      `threshold: ${m.threshold}`,
      `status: ${report.status}`,
      `foundry_command_version: ${m.foundryCommandVersion}`,
      'linked_principles: [C2, C4, C6]',
      '---',
      ''
    ];

    const categoryRows = Object.entries(metrics.byCategory)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([cat, v]) =>
          `| ${cat} | ${v.total} | ${v.pass} | ${v.fail} | ${v.rate.toFixed(2)} | ${m.threshold} | ${
            v.rate >= m.threshold ? 'PASS' : 'FAIL'
          } |`
      );

    const sourceRows = Object.entries(metrics.bySourceMode)
      .filter(([, v]) => v.total > 0)
      .map(
        ([mode, v]) =>
          `| ${mode} | ${v.total} | ${v.passRate.toFixed(2)} |`
      );

    const topFails = results
      .filter((r) => r.status === 'fail' || r.status === 'error' || r.status === 'timeout')
      .slice(0, 10);

    const failsSection = topFails.length
      ? [
          '## Top failures',
          '',
          ...topFails.map((r) =>
            `- **${r.caseId}** [${r.outcomeCategory}] (${r.passCriterion}, status=${r.status}, score=${
              r.score === null ? 'null' : r.score.toFixed(1)
            }): ${r.verdict}${r.errorMessage ? ` — ERROR: ${truncate(r.errorMessage, 200)}` : ''}`
          ),
          ''
        ]
      : [];

    const body = [
      `# Eval Run — ${m.artifactId} v${m.promptVersion}`,
      '',
      '## Resultado global',
      `- Pass rate: ${metrics.passRate.toFixed(3)} (${metrics.totalPass} / ${metrics.totalCases})`,
      `- Threshold: ${m.threshold}`,
      `- **Status: ${report.status.toUpperCase()}**`,
      '',
      '## Resultado por categoria',
      '',
      '| categoria | total | pass | fail | rate | threshold | status |',
      '|---|---|---|---|---|---|---|',
      ...categoryRows,
      '',
      '## Resultado por source_mode',
      '',
      '| mode | total | pass rate |',
      '|---|---|---|',
      ...sourceRows,
      '',
      '## Critical path',
      `- ${metrics.byCriticalPath.pass} / ${metrics.byCriticalPath.total} (rate ${metrics.byCriticalPath.rate.toFixed(2)})`,
      '',
      '## Custo e latência',
      `- p50: ${metrics.latencyP50Ms}ms, p95: ${metrics.latencyP95Ms}ms, p99: ${metrics.latencyP99Ms}ms`,
      `- avg cost per case: R$ ${(metrics.totalCases === 0 ? 0 : metrics.costBrlTotal / metrics.totalCases).toFixed(4)}`,
      `- total: R$ ${metrics.costBrlTotal.toFixed(4)}`,
      ''
    ];

    return [...front, ...body, ...failsSection].join('\n');
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}
