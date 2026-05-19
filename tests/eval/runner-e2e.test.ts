// E2E smoke test do EvalRunner sem custo:
//   - Carrega prompts/social-media-agent/v0.1.0/system.md REAL (do disco)
//   - Carrega evals/social-media-agent/cases/*.md REAIS (do disco)
//   - Usa ProgrammableLLM (target e judge) para evitar chamadas a API
//   - Valida agregações e formato do report

import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { existsSync, rmSync } from 'node:fs';
import { CaseLoader } from '../../src/eval/CaseLoader.js';
import { PromptLoader } from '../../src/eval/PromptLoader.js';
import { JudgeRunner } from '../../src/eval/JudgeRunner.js';
import { EvalRunner } from '../../src/eval/EvalRunner.js';
import { ReportWriter } from '../../src/eval/ReportWriter.js';
import { ProgrammableLLM } from '../copywriter-agent/unit/fakes.js';

const REPO_ROOT = resolve(__dirname, '..', '..');

describe('eval runner — e2e smoke (sem custo de API)', () => {
  it('PromptLoader autodetecta versão semver mais recente do social-media-agent', () => {
    const loader = new PromptLoader(REPO_ROOT);
    const artifact = loader.load('social-media-agent');
    expect(artifact.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(artifact.promptHash).toMatch(/^[a-f0-9]{16}$/);
    expect(artifact.systemPrompt.length).toBeGreaterThan(500);
  });

  it('CaseLoader carrega cases válidos (ignora _DEFERRED.md)', () => {
    const loader = new CaseLoader(REPO_ROOT);
    const cases = loader.loadCases('social-media-agent');
    expect(cases.length).toBeGreaterThanOrEqual(8);
    const ids = cases.map((c) => c.frontmatter.case_id).sort();
    expect(ids).toContain('case-001');
    expect(ids).toContain('case-010');
    expect(ids).not.toContain('_DEFERRED');
    const cp = cases.filter((c) => c.frontmatter.critical_path);
    expect(cp.length).toBeGreaterThanOrEqual(2);
  });

  it('CaseLoader filtra subset=critical_path', () => {
    const loader = new CaseLoader(REPO_ROOT);
    const allCases = loader.loadCases('social-media-agent');
    const expectedCp = allCases.filter((c) => c.frontmatter.critical_path).length;

    const cases = loader.loadCases('social-media-agent', {
      subset: 'critical_path'
    });
    expect(cases.length).toBe(expectedCp);
    expect(cases.every((c) => c.frontmatter.critical_path)).toBe(true);
  });

  it('CaseLoader filtra subset=source_mode=adversarial', () => {
    const loader = new CaseLoader(REPO_ROOT);
    const allCases = loader.loadCases('social-media-agent');
    const expectedAdv = allCases.filter(
      (c) => c.frontmatter.source_mode === 'adversarial'
    ).length;

    const cases = loader.loadCases('social-media-agent', {
      subset: 'source_mode=adversarial'
    });
    expect(cases.length).toBe(expectedAdv);
    expect(cases.every((c) => c.frontmatter.source_mode === 'adversarial')).toBe(true);
  });

  it('EvalRunner agrega métricas corretamente (judge alterna pass/fail)', async () => {
    const promptLoader = new PromptLoader(REPO_ROOT);
    const caseLoader = new CaseLoader(REPO_ROOT);
    const prompt = promptLoader.load('social-media-agent');
    const cases = caseLoader.loadCases('social-media-agent');
    const total = cases.length;
    const expectedPass = Math.ceil(total / 2); // índices pares (0, 2, 4, ...)
    const expectedFail = total - expectedPass;
    const expectedAdv = cases.filter(
      (c) => c.frontmatter.source_mode === 'adversarial'
    ).length;
    const expectedCp = cases.filter((c) => c.frontmatter.critical_path).length;

    const targetLLM = new ProgrammableLLM(
      Array(total).fill({
        kind: 'success' as const,
        output: { text: 'Carrossel mock para teste — não avaliado pelo judge real.' }
      })
    );
    const judgeLLM = new ProgrammableLLM(
      cases.map((_, i) => ({
        kind: 'success' as const,
        output: {
          text:
            '```json\n' +
            JSON.stringify({
              score: i % 2 === 0 ? 8 : 5,
              status: i % 2 === 0 ? 'pass' : 'fail',
              verdict: i % 2 === 0 ? 'OK' : 'fail mock'
            }) +
            '\n```'
        }
      }))
    );

    const judge = new JudgeRunner({ judgeLLM });
    const runner = new EvalRunner({ targetLLM, judge });
    const { results, metrics } = await runner.run(prompt, cases, {
      maxConcurrency: total
    });

    expect(results).toHaveLength(total);
    expect(metrics.totalCases).toBe(total);
    expect(metrics.totalPass).toBe(expectedPass);
    expect(metrics.totalFail).toBe(expectedFail);
    expect(metrics.passRate).toBeCloseTo(expectedPass / total, 5);
    expect(Object.keys(metrics.byCategory).length).toBeGreaterThanOrEqual(4);
    expect(metrics.bySourceMode.adversarial.total).toBe(expectedAdv);
    expect(metrics.byCriticalPath.total).toBe(expectedCp);
  });

  it('ReportWriter persiste markdown válido', async () => {
    const promptLoader = new PromptLoader(REPO_ROOT);
    const caseLoader = new CaseLoader(REPO_ROOT);
    const prompt = promptLoader.load('social-media-agent');
    const cases = caseLoader.loadCases('social-media-agent', {
      subset: 'critical_path'
    });

    const targetLLM = new ProgrammableLLM(
      cases.map(() => ({
        kind: 'success' as const,
        output: { text: 'mock output' }
      }))
    );
    const judgeLLM = new ProgrammableLLM(
      cases.map(() => ({
        kind: 'success' as const,
        output: {
          text:
            '```json\n{"score":8,"status":"pass","verdict":"OK"}\n```'
        }
      }))
    );

    const judge = new JudgeRunner({ judgeLLM });
    const runner = new EvalRunner({ targetLLM, judge });
    const { results, metrics } = await runner.run(prompt, cases);

    const writer = new ReportWriter({ repoRoot: REPO_ROOT });
    const report = writer.build(
      {
        artifactId: 'social-media-agent',
        promptVersion: prompt.version,
        promptHash: prompt.promptHash,
        ranAt: '2026-05-14T10:00',
        ranBy: 'test',
        targetModel: 'fake-llm',
        judgeModel: 'fake-llm',
        subsetFilter: 'critical_path',
        dryRun: false,
        threshold: 0.85
      },
      metrics,
      results
    );

    // subsetFilter=critical_path → status=partial mesmo com 100% pass
    expect(report.status).toBe('partial');
    expect(report.reportPath).toMatch(
      /evals\/social-media-agent\/runs\/.+-eval-[a-f0-9]{16}\.md$/
    );

    const persistedPath = writer.persist(report);
    const absolute = resolve(REPO_ROOT, persistedPath);
    expect(existsSync(absolute)).toBe(true);

    // Cleanup do artefato de teste
    rmSync(absolute);
  });

  it('dry-run não invoca LLMs e marca tudo como pass score=0', async () => {
    const promptLoader = new PromptLoader(REPO_ROOT);
    const caseLoader = new CaseLoader(REPO_ROOT);
    const prompt = promptLoader.load('social-media-agent');
    const cases = caseLoader.loadCases('social-media-agent');

    // LLMs que falham se chamados — garantia de que dryRun não os toca
    const targetLLM = new ProgrammableLLM([{ kind: 'error', status: 500 }]);
    const judgeLLM = new ProgrammableLLM([{ kind: 'error', status: 500 }]);

    const judge = new JudgeRunner({ judgeLLM });
    const runner = new EvalRunner({ targetLLM, judge });
    const { results, metrics } = await runner.run(prompt, cases, {
      dryRun: true
    });

    expect(results).toHaveLength(cases.length);
    expect(metrics.passRate).toBe(1);
    expect(targetLLM.calls).toHaveLength(0);
    expect(judgeLLM.calls).toHaveLength(0);
  });
});
