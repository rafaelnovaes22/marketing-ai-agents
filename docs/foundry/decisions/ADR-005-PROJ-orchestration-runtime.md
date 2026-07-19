# ADR-005-PROJ — Orchestration Runtime: LangGraph

**Status:** ✅ Aceito 2026-05-14 — aprovado pelo founder
**Princípios relacionados:** C5 (ADR) + **C7 (Portability — exceção declarada)** + C8 (Tenant context)
**Substitui:** decisão informal documentada em `documentacao/PLANO_AGENTES_DANTUIA_SOCIAL.md:777` que posicionava LangGraph como "fallback opcional"

---

## Contexto

Os 7 SKUs do Novais Digital Social têm perfis de orquestração heterogêneos:

| SKU | Perfil de orquestração | Necessidade |
|---|---|---|
| `social-media-agent` | Lineares (caption → design → publish) | Composição cross-agent |
| `copywriter-agent` | Single-shot (briefing → output) | Schema validation |
| `designer-agent` | Paralelo (N slides em paralelo + retry/fallback) | Already implemented |
| `trafego-agent` | Lineares (criativo → audience → bid → publish) | Composição |
| `video-editor-agent` | Pipeline com retry | TS puro basta |
| `estrategista-agent` | **Loop dinâmico** (research → analyse → decide → re-fetch) | State + branching |
| `atendimento-dm-agent` | **Multi-turn stateful** (history + lead score) | Persistent state + human-in-loop |

Três fatores levaram à decisão de adotar LangGraph como runtime de 1ª classe **agora** (não adiar para D13):

1. **Runtime único para consistência operacional** — manter dois runtimes (TS puro + LangGraph para SKUs stateful) gera bifurcação de testes, observability, padrões de erro. Custo cumulativo > overhead de adotar LangGraph cedo.
2. **LangSmith para debug visual em produção** — grafos visualizáveis dão diagnóstico ~5× mais rápido que vasculhar traces lineares. Crucial em SHADOW/ASSISTED quando feedback humano é o sinal primário.
3. **Antecipar complexidade dos SKUs stateful** — `atendimento-dm-agent` (criticality A, 24/7) e `estrategista-agent` (research loops) vão dominar a complexidade do projeto. Estabelecer padrão agora evita refator hostil quando esses SKUs entrarem em D6 e D11.

## Decisão

**Adotar `@langchain/langgraph` como orchestration runtime canônico do projeto.**

- Aplicação: TODOS os 7 SKUs orquestrarão via grafo a partir do `SocialMediaOrchestrator` (1º grafo, ADR-001-PROJ Fase A).
- Camada de aplicação atual (`src/application/{sku}/`) **NÃO** é descontinuada — use cases continuam como **tier inferior**: grafos coordenam, use cases executam.
- Pasta nova: `src/orchestration/` contém grafos, BaseGraphState, helpers de tracing.

## Padrões obrigatórios

### P1 — Nodes invocam LLM **somente** via `LLMProvider` port

**Proibido** importar `@langchain/anthropic` ou outros wrappers de provider. Toda chamada LLM passa por [src/domain/ports/LLMProvider.ts](../../../src/domain/ports/LLMProvider.ts).

Motivos:
- Mantém [ResilientLLMProvider](../../../src/infrastructure/adapters/llm/ResilientLLMProvider.ts) (retry + circuit breaker ADR-002-CW) no caminho de toda chamada.
- Preserva [VoiceValidator](../../../src/infrastructure/adapters/voice/ClaudeVoiceValidator.ts) e demais consumidores do port.
- Mantém pre-merge-check G1 funcional (imports SDK só em `src/infrastructure/adapters/`).

Convenção de teste: nodes recebem `LLMProvider` via state ou closure de fábrica de grafo — nunca via singleton.

### P2 — `BaseGraphState` obrigatório (C8)

Todo grafo herda de `BaseGraphState`:

```ts
const BaseGraphState = Annotation.Root({
  tenantId: Annotation<string>(),
  traceContext: Annotation<TraceContext>(),
  // ... estados específicos do grafo herdam dessas duas keys
});
```

Validação no boundary: `BaseGraphStateSchema` Zod parse na entrada do grafo. Sem `tenantId` válido → erro imediato (C8 enforced antes de qualquer side effect).

### P3 — Spans: LangGraph emite, use cases internos **não duplicam**

Quando um node chama um use case que tem `obs.span(...)` interno, **o use case detecta `parentTrace` no input e suprime seu próprio span** (já passamos como `parentTrace: TraceContext`). LangGraph emite o span do node via callback handler do `LangSmithAdapter`.

Convenção: use cases continuam emitindo spans **apenas** quando rodados standalone (chamada direta, sem grafo). Para detectar: se `parentTrace !== undefined`, opera em "modo composição" (sem spans extras).

### P4 — Composição via DI manual (sem service locator)

Grafos compõem-se via factory function que recebe deps explícitas:

```ts
export function createSocialMediaOrchestrator(deps: SocialMediaDeps) {
  return new StateGraph(SocialMediaState)
    .addNode('generate_caption', generateCaptionNode(deps))
    .addNode('design_carrossel', designCarrosselNode(deps))
    .addNode('publish', publishNode(deps))
    .addEdge('generate_caption', 'design_carrossel')
    .addEdge('design_carrossel', 'publish')
    .compile();
}
```

Sem `import` direto de adapters em código de grafo — tudo via `deps`.

## Consequências

### ✅ Positivas

- Padrão de orquestração unificado para os 7 SKUs.
- State management + checkpointing nativo para `atendimento-dm` e `estrategista`.
- LangSmith debug visual em produção (ADR-006-PROJ).
- Human-in-the-loop declarativo (`interrupt_before` em node) — modo ASSISTED do Foundry ganha implementação direta.
- Streaming nativo quando ClaudeAdapter expor `generateStream()` (B4 do handoff técnico).
- Test surface mantida: 152 testes existentes sobrevivem porque use cases continuam testáveis isoladamente.

### ⚠️ Negativas

- **Bundle size**: `@langchain/langgraph` + `@langchain/core` ≈ 40-60MB de deps transitivas.
- **C7 (Portability) violado conscientemente** na orchestration layer: trocar LangGraph = reescrever `src/orchestration/`. Não há adapter swap. Isso é **exceção declarada**, não esquecimento.
- **Curva de aprendizado**: Annotation API + StateGraph + checkpointers. Dev novo no projeto leva ~2-3 dias para fluência.
- **TS types parcialmente `any`**: alguns helpers da Annotation API em modo strict requerem `as` casts. Isolar em `src/orchestration/state/` para conter contaminação.
- **Eval runner atual fica desalinhado com produção**: o text-only runner (`src/eval/runner.ts`) invoca prompt cru; produção roda grafo. Mitigação: criar `EvalRunnerGraph` em Wave 5 que invoca `graph.invoke(state)`.

### 📋 Tarefas decorrentes

- [ ] [ADR-006-PROJ](./ADR-006-PROJ-tracing-substitution.md) — Tracing substitution (LangSmith no lugar de Langfuse).
- [ ] Atualizar `.claude/commands/novais-digital/pre-merge-check.md` G1: permitir `@langchain/langgraph` em `src/orchestration/` (não em `src/application/` nem `src/domain/`).
- [ ] Atualizar CLAUDE.md seção stack.
- [ ] Wave 5: implementar `EvalRunnerGraph` separado do `EvalRunner` text-only.
- [ ] Quando `atendimento-dm` (Fase B) entrar: decidir tabelas de checkpoint (Prisma vs schema Postgres separado).

## Re-examinar

90 dias após a 1ª promoção SHADOW de um grafo, OU em qualquer das condições:

- LangGraph TS lança breaking change major (≥ v1.0 → v2.0)
- Bundle size impacta CI build time > 2 minutos
- 5+ casos em que tivemos que cast `any` ou contornar APIs do framework
- Equipe se queixa formalmente de produtividade reduzida vs TS puro

## Foundry upstream

Esta decisão usa o conceito `pipeline_runtime` que **ainda não existe** no schema canônico do `project.json` v1. PR upstream a ser aberto em `agent-governance-framework` propondo:

```json
"orchestration_runtime": "langgraph" | "typescript-usecase" | "langgraph-with-fallback"
```

Enquanto PR não merja, este ADR serve como **waiver local** justificando divergência consciente do schema canônico.
