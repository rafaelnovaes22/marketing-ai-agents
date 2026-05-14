// Compara output do LLM com gabarito por critério.
// llm_as_judge: invoca um LLMProvider "juiz" com judge_prompt + gabarito + output.
// exact_match: comparação literal (case-sensitive); útil para outputs estruturados curtos.
// semantic_match: similaridade ≥ threshold via EmbeddingsProvider (opcional).

import type { LLMProvider } from '../domain/ports/LLMProvider.js';
import type { EmbeddingsProvider } from '../domain/ports/EmbeddingsProvider.js';
import {
  cosineSimilarity
} from '../application/copywriter-agent/DiversityCheckUseCase.js';
import type { CaseFrontmatter } from './types.js';

export interface JudgeVerdict {
  status: 'pass' | 'fail';
  score: number; // 0..10 normalized
  verdict: string;
  reasoning?: string;
  costBrl: number;
  latencyMs: number;
}

export interface JudgeRunnerDeps {
  /** LLM usado para llm_as_judge. Deve ser modelo ≠ target_model (anti auto-juiz). */
  judgeLLM: LLMProvider;
  /** Opcional — necessário só se algum case usar semantic_match. */
  embeddings?: EmbeddingsProvider;
}

interface JudgeJsonResponse {
  score: number;
  status?: 'pass' | 'fail';
  verdict?: string;
  reasoning?: string;
}

export class JudgeRunner {
  constructor(private readonly deps: JudgeRunnerDeps) {}

  async judge(
    frontmatter: CaseFrontmatter,
    rawOutput: string
  ): Promise<JudgeVerdict> {
    switch (frontmatter.criterio_pass) {
      case 'exact_match':
        return this.judgeExactMatch(frontmatter, rawOutput);
      case 'semantic_match':
        return this.judgeSemanticMatch(frontmatter, rawOutput);
      case 'llm_as_judge':
        return this.judgeLLMAsJudge(frontmatter, rawOutput);
    }
  }

  private judgeExactMatch(
    frontmatter: CaseFrontmatter,
    rawOutput: string
  ): JudgeVerdict {
    const expected = frontmatter.gabarito.expected;
    if (typeof expected !== 'string') {
      return {
        status: 'fail',
        score: 0,
        verdict: 'gabarito.expected ausente ou não-string',
        costBrl: 0,
        latencyMs: 0
      };
    }
    const matched = rawOutput.trim() === expected.trim();
    return {
      status: matched ? 'pass' : 'fail',
      score: matched ? 10 : 0,
      verdict: matched
        ? 'exact_match: output igual ao gabarito'
        : `exact_match: output difere (recebido "${rawOutput.slice(0, 80)}…")`,
      costBrl: 0,
      latencyMs: 0
    };
  }

  private async judgeSemanticMatch(
    frontmatter: CaseFrontmatter,
    rawOutput: string
  ): Promise<JudgeVerdict> {
    if (!this.deps.embeddings) {
      throw new Error(
        'JudgeRunner: semantic_match requer EmbeddingsProvider em deps'
      );
    }
    const reference = frontmatter.gabarito.reference;
    const threshold =
      typeof frontmatter.gabarito.similarity_threshold === 'number'
        ? frontmatter.gabarito.similarity_threshold
        : 0.85;
    if (typeof reference !== 'string') {
      return {
        status: 'fail',
        score: 0,
        verdict: 'gabarito.reference ausente para semantic_match',
        costBrl: 0,
        latencyMs: 0
      };
    }
    const start = Date.now();
    const out = await this.deps.embeddings.embed({
      texts: [reference, rawOutput]
    });
    const similarity = cosineSimilarity(out.vectors[0], out.vectors[1]);
    const passed = similarity >= threshold;
    return {
      status: passed ? 'pass' : 'fail',
      score: similarity * 10,
      verdict: `semantic_match: similarity=${similarity.toFixed(3)} vs threshold=${threshold}`,
      costBrl: out.costBrl,
      latencyMs: Date.now() - start
    };
  }

  private async judgeLLMAsJudge(
    frontmatter: CaseFrontmatter,
    rawOutput: string
  ): Promise<JudgeVerdict> {
    const judgePrompt = frontmatter.judge_prompt;
    if (!judgePrompt) {
      throw new Error(
        `JudgeRunner: judge_prompt ausente para case ${frontmatter.case_id}`
      );
    }
    const gabaritoStr = JSON.stringify(frontmatter.gabarito, null, 2);
    const userPrompt = [
      '# Output do agente (a ser avaliado)',
      '',
      '```',
      rawOutput,
      '```',
      '',
      '# Gabarito / critérios de aceite',
      '',
      '```json',
      gabaritoStr,
      '```',
      '',
      '# Formato de resposta',
      '',
      'Retorne SOMENTE um bloco JSON dentro de ```json ... ``` com:',
      '{ "score": <0..10>, "status": "pass"|"fail", "verdict": "<1 frase>", "reasoning": "<até 3 frases>" }',
      '',
      'Regra: status="pass" se output atende TODOS os critérios do gabarito. ' +
        'Em dúvida, prefira status="fail" e explique no reasoning.'
    ].join('\n');

    const start = Date.now();
    const response = await this.deps.judgeLLM.generate({
      messages: [
        { role: 'system', content: judgePrompt },
        { role: 'user', content: userPrompt }
      ],
      maxTokens: 512,
      temperature: 0.0, // determinístico para reprodutibilidade
      cacheControl: true,
      metadata: {
        component: 'eval_judge',
        case_id: frontmatter.case_id,
        outcome_category: frontmatter.outcome_category
      }
    });

    const parsed = this.parseJudgeJson(response.text);
    const score = clamp(parsed.score, 0, 10);
    const status: 'pass' | 'fail' =
      parsed.status === 'pass' || parsed.status === 'fail'
        ? parsed.status
        : score >= 7
          ? 'pass'
          : 'fail';

    return {
      status,
      score,
      verdict: parsed.verdict ?? `score=${score.toFixed(1)}`,
      reasoning: parsed.reasoning,
      costBrl: response.costBrl,
      latencyMs: Date.now() - start
    };
  }

  private parseJudgeJson(raw: string): JudgeJsonResponse {
    const match = raw.match(/```json\n([\s\S]*?)\n```/);
    const json = match ? match[1] : raw;
    try {
      return JSON.parse(json) as JudgeJsonResponse;
    } catch (err) {
      throw new Error(
        `JudgeRunner: resposta do juiz não é JSON válido: ${raw.slice(0, 200)}`
      );
    }
  }
}

function clamp(x: number, min: number, max: number): number {
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}
