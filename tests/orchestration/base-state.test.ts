// Smoke ESM + BaseGraphState validation.
//
// Objetivos:
//   1. Confirmar que `@langchain/langgraph` importa e compila em modo ESM
//   2. Confirmar que `BaseGraphState` herda corretamente em Annotation.Root
//   3. Confirmar que `validateBaseInput` rejeita inputs sem tenantId (C8)
//   4. Confirmar que um grafo trivial herdando BaseGraphState compila + executa
//
// Sem dependência de LangSmith — apenas verifica fundação.

import { describe, expect, it } from 'vitest';
import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import {
  BaseGraphState,
  BaseGraphStateSchema,
  validateBaseInput,
  hasBaseState
} from '../../src/orchestration/state/BaseGraphState.js';
import type { TraceContext } from '../../src/domain/ports/Observability.js';

const validTraceContext: TraceContext = {
  traceId: 'trace_test_1',
  tenantId: 'acme-internal',
  sku: 'social-media-agent',
  mode: 'shadow'
};

const validBaseInput = {
  tenantId: 'acme-internal',
  traceContext: validTraceContext,
  mode: 'shadow' as const
};

describe('BaseGraphState — smoke ESM + C8 enforcement', () => {
  it('importa Annotation/StateGraph/START/END do @langchain/langgraph (ESM ok)', () => {
    expect(Annotation).toBeDefined();
    expect(StateGraph).toBeDefined();
    expect(START).toBe('__start__');
    expect(END).toBe('__end__');
  });

  it('BaseGraphState.spec é spreadable em Annotation.Root filho', () => {
    const TestState = Annotation.Root({
      ...BaseGraphState.spec,
      payload: Annotation<string>()
    });
    expect(TestState).toBeDefined();
    // Schema interno deve cobrir as 3 chaves base + payload.
    const keys = Object.keys(TestState.spec ?? {});
    expect(keys).toContain('tenantId');
    expect(keys).toContain('traceContext');
    expect(keys).toContain('mode');
    expect(keys).toContain('payload');
  });

  it('validateBaseInput aceita input válido', () => {
    expect(() => validateBaseInput(validBaseInput)).not.toThrow();
    const out = validateBaseInput(validBaseInput);
    expect(out.tenantId).toBe('acme-internal');
    expect(out.mode).toBe('shadow');
  });

  it('validateBaseInput rejeita tenantId vazio (C8)', () => {
    expect(() =>
      validateBaseInput({ ...validBaseInput, tenantId: '' })
    ).toThrow(/tenantId obrigatório/);
  });

  it('validateBaseInput rejeita traceContext.tenantId vazio (C8)', () => {
    expect(() =>
      validateBaseInput({
        ...validBaseInput,
        traceContext: { ...validTraceContext, tenantId: '' }
      })
    ).toThrow();
  });

  it('validateBaseInput rejeita mode inválido', () => {
    expect(() =>
      validateBaseInput({ ...validBaseInput, mode: 'production' })
    ).toThrow();
  });

  it('hasBaseState narrow funciona para state válido', () => {
    expect(hasBaseState(validBaseInput)).toBe(true);
  });

  it('hasBaseState narrow rejeita objeto sem tenantId', () => {
    expect(hasBaseState({ mode: 'shadow' } as never)).toBe(false);
  });

  it('grafo trivial herdando BaseGraphState compila e executa', async () => {
    const TrivialState = Annotation.Root({
      ...BaseGraphState.spec,
      counter: Annotation<number>()
    });

    const graph = new StateGraph(TrivialState)
      .addNode('increment', async (state) => ({
        counter: (state.counter ?? 0) + 1
      }))
      .addEdge(START, 'increment')
      .addEdge('increment', END)
      .compile();

    const result = await graph.invoke({
      ...validBaseInput,
      counter: 41
    });

    expect(result.counter).toBe(42);
    // Estado base propagado automaticamente pelo reducer default do Annotation
    expect(result.tenantId).toBe('acme-internal');
    expect(result.mode).toBe('shadow');
    expect(result.traceContext.traceId).toBe('trace_test_1');
  });

  it('schema Zod via export direto', () => {
    const parsed = BaseGraphStateSchema.parse(validBaseInput);
    expect(parsed).toEqual(validBaseInput);
  });
});
