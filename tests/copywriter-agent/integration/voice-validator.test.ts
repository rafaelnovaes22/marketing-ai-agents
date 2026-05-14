// Integration tests — ClaudeVoiceValidator (LLM-as-judge / T2.13).

import { describe, expect, it } from 'vitest';
import { ClaudeVoiceValidator } from '../../../src/infrastructure/adapters/voice/ClaudeVoiceValidator.js';
import { ProgrammableLLM } from '../unit/fakes.js';

const judgePrompt = new Map([['brand_voice_ceo', 'PROMPT_JUIZ']]);

const judgeOutput = (score: number, issues?: object[]) =>
  '```json\n' +
  JSON.stringify({
    score,
    issues: issues ?? []
  }) +
  '\n```';

describe('ClaudeVoiceValidator', () => {
  it('decisão accept para score ≥ 0,75', async () => {
    const llm = new ProgrammableLLM([
      { kind: 'success', output: { text: judgeOutput(0.82) } }
    ]);
    const validator = new ClaudeVoiceValidator({ llm, judgePromptByTom: judgePrompt });

    const out = await validator.validate({
      tomSlug: 'brand_voice_ceo',
      unitKind: 'landing_block',
      text: 'Texto teste em tom direto.'
    });

    expect(out.decision).toBe('accept');
    expect(out.score).toBe(0.82);
    expect(out.issues).toHaveLength(0);
  });

  it('decisão accept_with_warning para 0,6 ≤ score < 0,75', async () => {
    const llm = new ProgrammableLLM([
      {
        kind: 'success',
        output: {
          text: judgeOutput(0.68, [
            { dimension: 'lexico', severity: 'warning', description: 'jargão' }
          ])
        }
      }
    ]);
    const validator = new ClaudeVoiceValidator({ llm, judgePromptByTom: judgePrompt });

    const out = await validator.validate({
      tomSlug: 'brand_voice_ceo',
      unitKind: 'email',
      text: 'corpo de email'
    });

    expect(out.decision).toBe('accept_with_warning');
    expect(out.issues).toHaveLength(1);
  });

  it('decisão reroll para score < 0,6', async () => {
    const llm = new ProgrammableLLM([
      { kind: 'success', output: { text: judgeOutput(0.45) } }
    ]);
    const validator = new ClaudeVoiceValidator({ llm, judgePromptByTom: judgePrompt });

    const out = await validator.validate({
      tomSlug: 'brand_voice_ceo',
      unitKind: 'ad_variation',
      text: 'ad copy'
    });

    expect(out.decision).toBe('reroll');
  });

  it('normaliza dimension/severity inválidos para outro/warning', async () => {
    const llm = new ProgrammableLLM([
      {
        kind: 'success',
        output: {
          text: judgeOutput(0.7, [
            { dimension: 'tom_estranho', severity: 'fatal', description: 'x' }
          ])
        }
      }
    ]);
    const validator = new ClaudeVoiceValidator({ llm, judgePromptByTom: judgePrompt });

    const out = await validator.validate({
      tomSlug: 'brand_voice_ceo',
      unitKind: 'full_landing',
      text: 't'
    });

    expect(out.issues[0].dimension).toBe('outro');
    expect(out.issues[0].severity).toBe('warning');
  });

  it('lança erro se tomSlug não tiver judge prompt registrado', async () => {
    const llm = new ProgrammableLLM([{ kind: 'success', output: { text: '' } }]);
    const validator = new ClaudeVoiceValidator({
      llm,
      judgePromptByTom: new Map()
    });

    await expect(
      validator.validate({
        tomSlug: 'desconhecido',
        unitKind: 'email',
        text: 't'
      })
    ).rejects.toThrow(/Judge prompt não encontrado/);
  });

  it('clampa score acima de 1.0 e NaN', async () => {
    const llm = new ProgrammableLLM([
      { kind: 'success', output: { text: judgeOutput(1.7) } }
    ]);
    const validator = new ClaudeVoiceValidator({ llm, judgePromptByTom: judgePrompt });
    const out = await validator.validate({
      tomSlug: 'brand_voice_ceo',
      unitKind: 'email',
      text: 't'
    });
    expect(out.score).toBe(1.0);
    expect(out.decision).toBe('accept');
  });
});
