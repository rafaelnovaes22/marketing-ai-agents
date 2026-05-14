// Orquestra cases × prompt × LLM × judge → CaseResult[] + AggregateMetrics.
// Respeita max_concurrency para não estourar rate limit.

import type { LLMProvider } from '../domain/ports/LLMProvider.js';
import type { JudgeRunner } from './JudgeRunner.js';
import type {
  LoadedCase,
  CaseResult,
  AggregateMetrics,
  PromptArtifact,
  SourceMode
} from './types.js';

export interface EvalRunnerDeps {
  /** LLM-alvo (modelo sendo avaliado). */
  targetLLM: LLMProvider;
  judge: JudgeRunner;
}

export interface EvalRunnerOptions {
  maxConcurrency?: number; // default 5
  dryRun?: boolean;        // se true, não invoca LLM nem judge; marca tudo como pass score=0
  timeoutMs?: number;      // default 60_000 por case
}

const DEFAULT_MAX_CONCURRENCY = 5;
const DEFAULT_TIMEOUT_MS = 60_000;

export class EvalRunner {
  constructor(private readonly deps: EvalRunnerDeps) {}

  async run(
    prompt: PromptArtifact,
    cases: LoadedCase[],
    options: EvalRunnerOptions = {}
  ): Promise<{ results: CaseResult[]; metrics: AggregateMetrics }> {
    const maxConcurrency = options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;
    const dryRun = options.dryRun ?? false;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const results: CaseResult[] = [];
    for (let i = 0; i < cases.length; i += maxConcurrency) {
      const chunk = cases.slice(i, i + maxConcurrency);
      const chunkResults = await Promise.all(
        chunk.map((c) => this.runOne(prompt, c, { dryRun, timeoutMs }))
      );
      results.push(...chunkResults);
    }

    const metrics = this.aggregate(results);
    return { results, metrics };
  }

  private async runOne(
    prompt: PromptArtifact,
    loaded: LoadedCase,
    options: { dryRun: boolean; timeoutMs: number }
  ): Promise<CaseResult> {
    const { frontmatter } = loaded;
    const start = Date.now();

    if (options.dryRun) {
      return {
        caseId: frontmatter.case_id,
        outcomeCategory: frontmatter.outcome_category,
        sourceMode: frontmatter.source_mode,
        criticalPath: frontmatter.critical_path,
        status: 'pass',
        passCriterion: frontmatter.criterio_pass,
        score: 0,
        verdict: 'dry_run',
        rawOutput: '',
        costBrl: 0,
        latencyMs: 0
      };
    }

    try {
      const userPrompt = this.buildUserPrompt(frontmatter.input);
      const llmOut = await this.withTimeout(
        this.deps.targetLLM.generate({
          messages: [
            { role: 'system', content: prompt.systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          maxTokens: 4096,
          temperature: 0.7,
          cacheControl: true,
          metadata: {
            sku: frontmatter.sku_id,
            case_id: frontmatter.case_id,
            prompt_hash: prompt.promptHash,
            component: 'eval_target'
          }
        }),
        options.timeoutMs,
        `target LLM timeout (case ${frontmatter.case_id})`
      );

      const verdict = await this.withTimeout(
        this.deps.judge.judge(frontmatter, llmOut.text),
        options.timeoutMs,
        `judge timeout (case ${frontmatter.case_id})`
      );

      return {
        caseId: frontmatter.case_id,
        outcomeCategory: frontmatter.outcome_category,
        sourceMode: frontmatter.source_mode,
        criticalPath: frontmatter.critical_path,
        status: verdict.status,
        passCriterion: frontmatter.criterio_pass,
        score: verdict.score,
        verdict: verdict.verdict,
        reasoning: verdict.reasoning,
        rawOutput: llmOut.text,
        costBrl: llmOut.costBrl + verdict.costBrl,
        latencyMs: Date.now() - start
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        caseId: frontmatter.case_id,
        outcomeCategory: frontmatter.outcome_category,
        sourceMode: frontmatter.source_mode,
        criticalPath: frontmatter.critical_path,
        status: msg.includes('timeout') ? 'timeout' : 'error',
        passCriterion: frontmatter.criterio_pass,
        score: null,
        verdict: 'error',
        rawOutput: '',
        costBrl: 0,
        latencyMs: Date.now() - start,
        errorMessage: msg
      };
    }
  }

  private buildUserPrompt(input: Record<string, unknown>): string {
    return [
      '# Input',
      '',
      '```json',
      JSON.stringify(input, null, 2),
      '```',
      '',
      'Gere o output canônico para este input seguindo o system prompt.'
    ].join('\n');
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    label: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(label)), timeoutMs)
      )
    ]);
  }

  private aggregate(results: CaseResult[]): AggregateMetrics {
    const totalCases = results.length;
    const totalPass = results.filter((r) => r.status === 'pass').length;
    const totalFail = results.filter((r) => r.status === 'fail').length;
    const totalError = results.filter(
      (r) => r.status === 'error' || r.status === 'timeout'
    ).length;
    const passRate = totalCases === 0 ? 0 : totalPass / totalCases;

    const byCategory: AggregateMetrics['byCategory'] = {};
    for (const r of results) {
      const cat = (byCategory[r.outcomeCategory] ??= {
        total: 0,
        pass: 0,
        fail: 0,
        rate: 0
      });
      cat.total += 1;
      if (r.status === 'pass') cat.pass += 1;
      else cat.fail += 1;
    }
    for (const cat of Object.values(byCategory)) {
      cat.rate = cat.total === 0 ? 0 : cat.pass / cat.total;
    }

    const sourceModes: SourceMode[] = [
      'real',
      'synthetic',
      'edge',
      'adversarial'
    ];
    const bySourceMode = {} as AggregateMetrics['bySourceMode'];
    for (const mode of sourceModes) {
      const subset = results.filter((r) => r.sourceMode === mode);
      const passes = subset.filter((r) => r.status === 'pass').length;
      bySourceMode[mode] = {
        total: subset.length,
        passRate: subset.length === 0 ? 0 : passes / subset.length
      };
    }

    const cp = results.filter((r) => r.criticalPath);
    const cpPass = cp.filter((r) => r.status === 'pass').length;
    const byCriticalPath = {
      total: cp.length,
      pass: cpPass,
      rate: cp.length === 0 ? 0 : cpPass / cp.length
    };

    const costBrlTotal = results.reduce((acc, r) => acc + r.costBrl, 0);
    const latencies = results
      .map((r) => r.latencyMs)
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    const pct = (p: number) =>
      latencies.length === 0
        ? 0
        : latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))];

    return {
      totalCases,
      totalPass,
      totalFail,
      totalError,
      passRate,
      byCategory,
      bySourceMode,
      byCriticalPath,
      costBrlTotal,
      latencyP50Ms: pct(0.5),
      latencyP95Ms: pct(0.95),
      latencyP99Ms: pct(0.99)
    };
  }
}
