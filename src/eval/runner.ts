// CLI entrypoint: `npm run eval <sku> [-- --subset=critical_path --dry-run --judge-model=...]`
//
// Lê:
//   prompts/{sku}/v{version}/system.md (autodetect última versão)
//   evals/{sku}/cases/*.md
// Invoca:
//   ClaudeAdapter (ou ProgrammableLLM se ACME_EVAL_FAKE=1)
//   Judge LLM (defaults para o mesmo provider, modelo Sonnet — pode trocar via --judge-model)
// Persiste:
//   evals/{sku}/runs/{YYYY-MM-DD-HHmm}-eval-{prompt_hash}.md
//
// Sem ANTHROPIC_API_KEY → erro claro com instrução.

import { resolve } from 'node:path';
import { ClaudeAdapter } from '../infrastructure/adapters/llm/ClaudeAdapter.js';
import { CaseLoader } from './CaseLoader.js';
import { PromptLoader } from './PromptLoader.js';
import { JudgeRunner } from './JudgeRunner.js';
import { EvalRunner } from './EvalRunner.js';
import { ReportWriter } from './ReportWriter.js';
import type { LLMProvider } from '../domain/ports/LLMProvider.js';

interface CliArgs {
  artifactId: string;
  subset: string;
  dryRun: boolean;
  promptVersion?: string;
  judgeModel?: string;
  targetModel?: string;
  threshold?: number;
  maxConcurrency?: number;
}

function parseArgs(argv: string[]): CliArgs {
  const [, , artifactId, ...rest] = argv;
  if (!artifactId) {
    throw new Error(
      'Uso: npm run eval <artifact_id> [--subset=...] [--dry-run] [--prompt-version=0.1.0] [--judge-model=...] [--target-model=...] [--threshold=0.85]'
    );
  }
  const args: CliArgs = { artifactId, subset: 'all', dryRun: false };
  for (const flag of rest) {
    if (flag === '--dry-run') args.dryRun = true;
    else if (flag.startsWith('--subset=')) args.subset = flag.slice(9);
    else if (flag.startsWith('--prompt-version=')) args.promptVersion = flag.slice(17);
    else if (flag.startsWith('--judge-model=')) args.judgeModel = flag.slice(14);
    else if (flag.startsWith('--target-model=')) args.targetModel = flag.slice(15);
    else if (flag.startsWith('--threshold=')) args.threshold = Number(flag.slice(12));
    else if (flag.startsWith('--max-concurrency='))
      args.maxConcurrency = Number(flag.slice(18));
  }
  return args;
}

function buildLLM(model: string | undefined, role: 'target' | 'judge'): LLMProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      `[eval/runner] ANTHROPIC_API_KEY ausente. Configure em .env ou exporte antes de rodar (role=${role}).`
    );
  }
  return new ClaudeAdapter({
    apiKey,
    model: model ?? (role === 'judge' ? 'claude-sonnet-4-6-20250220' : undefined)
  });
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  const repoRoot = resolve(process.cwd());

  console.log(`[eval] artifact=${args.artifactId} subset=${args.subset} dry_run=${args.dryRun}`);

  const promptLoader = new PromptLoader(repoRoot);
  const prompt = promptLoader.load(args.artifactId, args.promptVersion);
  console.log(`[eval] prompt v${prompt.version} hash=${prompt.promptHash}`);

  const caseLoader = new CaseLoader(repoRoot);
  const cases = caseLoader.loadCases(args.artifactId, { subset: args.subset });
  console.log(`[eval] ${cases.length} case(s) carregados`);

  const targetLLM = args.dryRun
    ? makeDryLLM()
    : buildLLM(args.targetModel, 'target');
  const judgeLLM = args.dryRun
    ? makeDryLLM()
    : buildLLM(args.judgeModel, 'judge');

  const judge = new JudgeRunner({ judgeLLM });
  const runner = new EvalRunner({ targetLLM, judge });
  const { results, metrics } = await runner.run(prompt, cases, {
    dryRun: args.dryRun,
    maxConcurrency: args.maxConcurrency
  });

  const writer = new ReportWriter({ repoRoot });
  const threshold = args.threshold ?? 0.85;
  const report = writer.build(
    {
      artifactId: args.artifactId,
      promptVersion: prompt.version,
      promptHash: prompt.promptHash,
      ranAt: new Date().toISOString().slice(0, 16),
      ranBy: process.env.USER ?? process.env.USERNAME ?? 'cli',
      targetModel: targetLLM.modelName(),
      judgeModel: judgeLLM.modelName(),
      subsetFilter: args.subset,
      dryRun: args.dryRun,
      threshold
    },
    metrics,
    results
  );
  const persistedPath = writer.persist(report);

  console.log('');
  console.log(`[eval] status=${report.status} pass_rate=${metrics.passRate.toFixed(3)}`);
  console.log(`[eval] report=${persistedPath}`);
  console.log(`[eval] total_cost_brl=R$ ${metrics.costBrlTotal.toFixed(4)}`);

  return report.status === 'fail' || report.status === 'error' ? 1 : 0;
}

function makeDryLLM(): LLMProvider {
  return {
    async generate() {
      return {
        text: '[dry_run]',
        inputTokens: 0,
        outputTokens: 0,
        cachedInputTokens: 0,
        costBrl: 0,
        latencyMs: 0,
        modelUsed: 'dry-run'
      };
    },
    async generateWithVision() {
      return {
        text: '[dry_run]',
        inputTokens: 0,
        outputTokens: 0,
        cachedInputTokens: 0,
        costBrl: 0,
        latencyMs: 0,
        modelUsed: 'dry-run'
      };
    },
    modelName() {
      return 'dry-run';
    }
  };
}

// Entry
main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`[eval] ERROR: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  });
