// Types canônicos do eval runner (Forge command /acme:eval).
// Schemas alinhados ao output_artifact descrito em .claude/commands/acme/eval.md.

import { z } from 'zod';

export const PassCriterionEnum = z.enum([
  'exact_match',
  'semantic_match',
  'llm_as_judge'
]);
export type PassCriterion = z.infer<typeof PassCriterionEnum>;

export const SourceModeEnum = z.enum(['real', 'synthetic', 'edge', 'adversarial']);
export type SourceMode = z.infer<typeof SourceModeEnum>;

export const CaseFrontmatterSchema = z.object({
  case_id: z.string().regex(/^case-[a-z0-9-]+$/),
  sku_id: z.string(),
  outcome_category: z.string(),
  source_mode: SourceModeEnum.default('real'),
  criterio_pass: PassCriterionEnum,
  critical_path: z.boolean().default(false),
  input: z.record(z.string(), z.unknown()),
  /**
   * Estrutura livre — para llm_as_judge contém thresholds (expected_score_min,
   * brand_consistency_min, sla_max_seconds); para exact_match contém `expected`
   * (string literal); para semantic_match contém `reference` (texto-referência).
   */
  gabarito: z.record(z.string(), z.unknown()),
  /** Para llm_as_judge: prompt do juiz com placeholders {output} e {gabarito}. */
  judge_prompt: z.string().optional()
});
export type CaseFrontmatter = z.infer<typeof CaseFrontmatterSchema>;

export interface LoadedCase {
  frontmatter: CaseFrontmatter;
  /** Corpo livre do .md (descrição humana — não usado pelo runner). */
  body: string;
  /** Caminho absoluto do arquivo origem (para debug/report). */
  sourcePath: string;
}

export interface PromptArtifact {
  artifactId: string;
  version: string;       // ex: '0.1.0'
  systemPrompt: string;  // conteúdo de prompts/{sku}/v{version}/system.md
  promptHash: string;    // SHA-256 do systemPrompt
}

export interface CaseResult {
  caseId: string;
  outcomeCategory: string;
  sourceMode: SourceMode;
  criticalPath: boolean;
  status: 'pass' | 'fail' | 'error' | 'timeout';
  passCriterion: PassCriterion;
  /** Score do juiz (0..10 ou 0..1 dependendo do criterio). Null se status=error. */
  score: number | null;
  /** Mensagem do veredicto (curta). */
  verdict: string;
  /** Reasoning do juiz, truncado. */
  reasoning?: string;
  /** Output bruto do LLM (truncado em 2000 chars no report). */
  rawOutput: string;
  costBrl: number;
  latencyMs: number;
  errorMessage?: string;
}

export interface AggregateMetrics {
  totalCases: number;
  totalPass: number;
  totalFail: number;
  totalError: number;
  passRate: number;
  byCategory: Record<
    string,
    { total: number; pass: number; fail: number; rate: number }
  >;
  bySourceMode: Record<SourceMode, { total: number; passRate: number }>;
  byCriticalPath: { total: number; pass: number; rate: number };
  costBrlTotal: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
}

export interface RunMetadata {
  artifactId: string;
  promptVersion: string;
  promptHash: string;
  ranAt: string;             // ISO 8601
  ranBy: string;             // 'cli' | 'ci' | username
  targetModel: string;
  judgeModel: string;
  subsetFilter: string;      // 'all' | 'category=x' | ...
  dryRun: boolean;
  threshold: number;
  forgeCommandVersion: string;
}

export interface RunReport {
  metadata: RunMetadata;
  metrics: AggregateMetrics;
  results: CaseResult[];
  status: 'pass' | 'fail' | 'partial' | 'error';
  /** Relativo ao repo root. */
  reportPath: string;
}
