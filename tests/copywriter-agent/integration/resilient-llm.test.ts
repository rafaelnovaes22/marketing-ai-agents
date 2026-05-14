// Integration tests — ResilientLLMProvider (T2.14 / ADR-002-CW).
// Cobre: retry, circuit breaker open por 529 consecutivos, fallback Mistral,
// cooldown half-open, e propagação de erro não-retryable.

import { describe, expect, it } from 'vitest';
import {
  ResilientLLMProvider,
  type FallbackInfo
} from '../../../src/infrastructure/adapters/llm/ResilientLLMProvider.js';
import { ProgrammableLLM } from '../unit/fakes.js';

const noSleep = async () => {};

const baseInput = {
  messages: [
    { role: 'system' as const, content: 's' },
    { role: 'user' as const, content: 'u' }
  ]
};

describe('ResilientLLMProvider', () => {
  it('happy path: 1 chamada bem-sucedida no primário, sem fallback', async () => {
    const primary = new ProgrammableLLM([
      { kind: 'success', output: { text: 'ok' } }
    ]);
    const fallback = new ProgrammableLLM([
      { kind: 'success', output: { text: 'FALLBACK' } }
    ]);

    const provider = new ResilientLLMProvider({
      primary,
      fallback,
      sleepFn: noSleep
    });

    const out = await provider.generate(baseInput);
    expect(out.text).toBe('ok');
    expect(primary.calls).toHaveLength(1);
    expect(fallback.calls).toHaveLength(0);
  });

  it('retry: 1× 529 e depois sucesso → resultado primary', async () => {
    const primary = new ProgrammableLLM([
      { kind: 'error', status: 529, message: '529 Overloaded' },
      { kind: 'success', output: { text: 'ok-2' } }
    ]);
    const provider = new ResilientLLMProvider({
      primary,
      sleepFn: noSleep
    });

    const out = await provider.generate(baseInput);
    expect(out.text).toBe('ok-2');
    expect(primary.calls).toHaveLength(2);
  });

  it('breaker abre após 3× 529 consecutivos → fallback assume', async () => {
    let virtualNow = 1_000_000;
    const primary = new ProgrammableLLM([
      { kind: 'error', status: 529 },
      { kind: 'error', status: 529 },
      { kind: 'error', status: 529 }
    ]);
    const fallback = new ProgrammableLLM([
      { kind: 'success', output: { text: 'MISTRAL_OK' } }
    ]);
    const fallbackEvents: FallbackInfo[] = [];

    const provider = new ResilientLLMProvider({
      primary,
      fallback,
      maxRetries: 3,
      breakerThreshold: 3,
      sleepFn: noSleep,
      now: () => virtualNow,
      onFallback: (info) => fallbackEvents.push(info)
    });

    const out = await provider.generate(baseInput);
    expect(out.text).toBe('MISTRAL_OK');
    expect(primary.calls).toHaveLength(3);
    expect(fallback.calls).toHaveLength(1);
    expect(fallbackEvents).toHaveLength(1);
    expect(fallbackEvents[0].reason).toBe('anthropic_overloaded');
    expect(provider.breakerState()).toBe('open');
  });

  it('breaker permanece aberto: chamadas subsequentes usam fallback direto', async () => {
    let virtualNow = 1_000_000;
    const primary = new ProgrammableLLM([
      { kind: 'error', status: 529 },
      { kind: 'error', status: 529 },
      { kind: 'error', status: 529 }
    ]);
    const fallback = new ProgrammableLLM([
      { kind: 'success', output: { text: 'fb-1' } },
      { kind: 'success', output: { text: 'fb-2' } }
    ]);

    const provider = new ResilientLLMProvider({
      primary,
      fallback,
      sleepFn: noSleep,
      now: () => virtualNow
    });

    // Primeira chamada abre o breaker e usa fallback
    const r1 = await provider.generate(baseInput);
    expect(r1.text).toBe('fb-1');

    // Segunda chamada: breaker aberto, vai direto pro fallback (sem tocar primary)
    const r2 = await provider.generate(baseInput);
    expect(r2.text).toBe('fb-2');
    expect(primary.calls).toHaveLength(3); // não aumentou
    expect(fallback.calls).toHaveLength(2);
  });

  it('breaker fecha após cooldown: primário é retentado', async () => {
    let virtualNow = 1_000_000;
    const primary = new ProgrammableLLM([
      { kind: 'error', status: 529 },
      { kind: 'error', status: 529 },
      { kind: 'error', status: 529 },
      // Depois do cooldown, primary volta a funcionar
      { kind: 'success', output: { text: 'PRIMARY_BACK' } }
    ]);
    const fallback = new ProgrammableLLM([
      { kind: 'success', output: { text: 'fb' } }
    ]);

    const provider = new ResilientLLMProvider({
      primary,
      fallback,
      breakerCooldownMs: 60_000,
      sleepFn: noSleep,
      now: () => virtualNow
    });

    await provider.generate(baseInput); // abre breaker, usa fallback
    expect(provider.breakerState()).toBe('open');

    // Avança o tempo além do cooldown
    virtualNow += 70_000;
    const out = await provider.generate(baseInput);
    expect(out.text).toBe('PRIMARY_BACK');
    expect(provider.breakerState()).toBe('closed');
  });

  it('erro não-retryable (400) propaga imediato — sem fallback', async () => {
    const primary = new ProgrammableLLM([
      { kind: 'error', status: 400, message: 'Bad Request' }
    ]);
    const fallback = new ProgrammableLLM([
      { kind: 'success', output: { text: 'fb' } }
    ]);

    const provider = new ResilientLLMProvider({
      primary,
      fallback,
      sleepFn: noSleep
    });

    await expect(provider.generate(baseInput)).rejects.toThrow(/Bad Request/);
    expect(primary.calls).toHaveLength(1);
    expect(fallback.calls).toHaveLength(0);
  });

  it('sem fallback configurado: esgotamento de retries propaga erro', async () => {
    const primary = new ProgrammableLLM([
      { kind: 'error', status: 529 },
      { kind: 'error', status: 529 },
      { kind: 'error', status: 529 }
    ]);

    const provider = new ResilientLLMProvider({
      primary,
      breakerThreshold: 999, // não dispara breaker
      sleepFn: noSleep
    });

    await expect(provider.generate(baseInput)).rejects.toThrow(/529/);
    expect(primary.calls).toHaveLength(3);
  });

  it('sucesso reseta janela de 529 (breaker não abre)', async () => {
    let virtualNow = 1_000_000;
    const primary = new ProgrammableLLM([
      { kind: 'error', status: 529 },
      { kind: 'success', output: { text: 'ok-after-1-fail' } },
      { kind: 'error', status: 529 },
      { kind: 'error', status: 529 },
      // Já não consecutivos com o primeiro — não deve abrir breaker
      { kind: 'success', output: { text: 'ok-2' } }
    ]);
    const provider = new ResilientLLMProvider({
      primary,
      breakerThreshold: 3,
      sleepFn: noSleep,
      now: () => virtualNow
    });

    const r1 = await provider.generate(baseInput);
    expect(r1.text).toBe('ok-after-1-fail');
    const r2 = await provider.generate(baseInput);
    expect(r2.text).toBe('ok-2');
    expect(provider.breakerState()).toBe('closed');
  });
});
