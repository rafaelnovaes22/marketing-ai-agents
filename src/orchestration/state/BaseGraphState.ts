// BaseGraphState — fundação para TODOS os grafos do projeto (ADR-005-PROJ P2).
//
// Impõe duas chaves obrigatórias em todo state:
//   - tenantId (C8)      — TenantContext propagado nó-a-nó automaticamente
//   - traceContext       — span pai para use cases internos suprimirem spans próprios (P3)
//
// Validação Zod no boundary garante que grafo recebe state válido antes de
// executar qualquer node (fail-fast em vez de descobrir tenantId ausente em
// produção).

import { Annotation } from '@langchain/langgraph';
import { z } from 'zod';
import type { TraceContext } from '../../domain/ports/Observability.js';

/**
 * Estado base que TODOS os grafos do projeto herdam.
 *
 * Uso típico — herdar via spread em outro Annotation.Root:
 *
 *   const SocialMediaState = Annotation.Root({
 *     ...BaseGraphState.spec,
 *     briefing: Annotation<Briefing>(),
 *     slides: Annotation<Slide[]>(),
 *   });
 */
export const BaseGraphState = Annotation.Root({
  /** TenantContext obrigatório (C8). Validado no boundary do grafo. */
  tenantId: Annotation<string>(),
  /**
   * Trace pai para o grafo. Passado adiante para use cases internos via
   * `parentTrace` — quando presente, eles suprimem spans próprios (P3).
   */
  traceContext: Annotation<TraceContext>(),
  /**
   * Modo de execução. Influencia se grafo pausa em `interrupt_before`
   * (modo ASSISTED) ou roda autônomo (modo AUTONOMOUS).
   */
  mode: Annotation<'shadow' | 'assisted' | 'autonomous'>()
});

/**
 * Schema Zod para validar BaseGraphState no boundary do grafo.
 * Use em `parseAndInvoke()` (helper abaixo) para rejeitar input mal-formado
 * ANTES de chamar `graph.invoke()`.
 */
export const BaseGraphStateSchema = z.object({
  tenantId: z
    .string()
    .min(1, 'C8 violation: tenantId obrigatório em todo grafo'),
  traceContext: z
    .object({
      traceId: z.string().min(1),
      tenantId: z.string().min(1),
      sku: z.string().min(1),
      mode: z.enum(['shadow', 'assisted', 'autonomous']),
      metadata: z.record(z.string(), z.unknown()).optional()
    })
    .strict()
    .refine(
      (tc) => tc.tenantId !== '',
      'C8 violation: traceContext.tenantId não pode ser vazio'
    ),
  mode: z.enum(['shadow', 'assisted', 'autonomous'])
});

export type BaseGraphStateInput = z.infer<typeof BaseGraphStateSchema>;

/**
 * Type guard: garante que um state mínimo tem as chaves do BaseGraphState.
 * Útil em nodes para narrowing seguro.
 */
export function hasBaseState<T extends Partial<BaseGraphStateInput>>(
  state: T
): state is T & BaseGraphStateInput {
  return (
    typeof state.tenantId === 'string' &&
    state.tenantId.length > 0 &&
    state.traceContext !== undefined &&
    typeof state.mode === 'string'
  );
}

/**
 * Valida input no boundary e devolve state pronto para `graph.invoke()`.
 * Lança erro estruturado se input violar Zod schema — não permite
 * grafo iniciar com tenantId ausente/inválido.
 */
export function validateBaseInput(input: unknown): BaseGraphStateInput {
  return BaseGraphStateSchema.parse(input);
}
