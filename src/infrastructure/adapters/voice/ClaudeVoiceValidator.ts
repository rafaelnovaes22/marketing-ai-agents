// Adapter: VoiceValidator implementado via LLM-as-judge (Claude Sonnet 4.6).
// Recebe um LLMProvider (composability — pode ser ClaudeAdapter ou ResilientLLMProvider).
// Domain layer permanece sem deps SDK (C7).

import type {
  VoiceValidator,
  VoiceValidationInput,
  VoiceValidationOutput,
  VoiceValidationIssue
} from '../../../domain/ports/VoiceValidator.js';
import type { LLMProvider } from '../../../domain/ports/LLMProvider.js';

const REROLL_THRESHOLD = 0.6;
const WARNING_THRESHOLD = 0.75;

export interface ClaudeVoiceValidatorDeps {
  llm: LLMProvider;
  /**
   * Map (tomSlug → prompt do juiz). Cada arquivo descreve dimensões léxicas,
   * exemplos on-tom, e instrução para retornar JSON canônico.
   */
  judgePromptByTom: Map<string, string>;
}

interface JudgeJsonResponse {
  score: number;
  issues?: Array<{
    dimension?: string;
    severity?: string;
    description: string;
  }>;
}

export class ClaudeVoiceValidator implements VoiceValidator {
  constructor(private readonly deps: ClaudeVoiceValidatorDeps) {}

  async validate(input: VoiceValidationInput): Promise<VoiceValidationOutput> {
    const judgePrompt = this.deps.judgePromptByTom.get(input.tomSlug);
    if (!judgePrompt) {
      throw new Error(
        `Judge prompt não encontrado para tomSlug=${input.tomSlug} (registre em prompts/copywriter-agent/judges/)`
      );
    }

    const userPrompt = [
      `# Unidade avaliada (${input.unitKind})`,
      input.context ? `Contexto: ${input.context}` : '',
      '',
      '```',
      input.text,
      '```',
      '',
      '# Output esperado',
      'Retorne SOMENTE um bloco JSON dentro de ```json ... ``` com o schema:',
      '{ "score": <0..1>, "issues": [{ "dimension": "lexico|cadencia|imperativo|autoridade|jargao|outro", "severity": "critical|warning|info", "description": "..." }] }'
    ]
      .filter((l) => l !== '')
      .join('\n');

    const response = await this.deps.llm.generate({
      messages: [
        { role: 'system', content: judgePrompt },
        { role: 'user', content: userPrompt }
      ],
      maxTokens: 512,
      temperature: 0.2,
      cacheControl: true,
      metadata: {
        sku: 'copywriter-agent',
        component: 'voice_validator',
        unit_kind: input.unitKind,
        tom_slug: input.tomSlug
      }
    });

    const parsed = this.parseJudgeJson(response.text);
    const score = this.clamp01(parsed.score);
    const issues = this.normalizeIssues(parsed.issues ?? []);

    return {
      score,
      decision: this.decide(score),
      issues,
      costBrl: response.costBrl,
      latencyMs: response.latencyMs
    };
  }

  private decide(score: number): VoiceValidationOutput['decision'] {
    if (score < REROLL_THRESHOLD) return 'reroll';
    if (score < WARNING_THRESHOLD) return 'accept_with_warning';
    return 'accept';
  }

  private parseJudgeJson(raw: string): JudgeJsonResponse {
    const match = raw.match(/```json\n([\s\S]*?)\n```/);
    const json = match ? match[1] : raw;
    const parsed = JSON.parse(json) as JudgeJsonResponse;
    if (typeof parsed.score !== 'number') {
      throw new Error(`VoiceValidator: score ausente ou não-numérico no output do juiz`);
    }
    return parsed;
  }

  private normalizeIssues(
    raw: NonNullable<JudgeJsonResponse['issues']>
  ): VoiceValidationIssue[] {
    const dimensions: VoiceValidationIssue['dimension'][] = [
      'lexico',
      'cadencia',
      'imperativo',
      'autoridade',
      'jargao',
      'outro'
    ];
    const severities: VoiceValidationIssue['severity'][] = [
      'critical',
      'warning',
      'info'
    ];

    return raw.map((it) => {
      const dim = dimensions.includes(it.dimension as VoiceValidationIssue['dimension'])
        ? (it.dimension as VoiceValidationIssue['dimension'])
        : 'outro';
      const sev = severities.includes(it.severity as VoiceValidationIssue['severity'])
        ? (it.severity as VoiceValidationIssue['severity'])
        : 'warning';
      return {
        dimension: dim,
        severity: sev,
        description: it.description
      };
    });
  }

  private clamp01(x: number): number {
    if (Number.isNaN(x)) return 0;
    return Math.max(0, Math.min(1, x));
  }
}
