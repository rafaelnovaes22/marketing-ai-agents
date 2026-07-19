# LangGraph Adoption — Handoff (C1 → C4 entregues)

> **Status:** ✅ C1 (ADRs) + C2 (instalação + BaseGraphState) + C3 (LangSmithAdapter) + C4 (SocialMediaOrchestrator) + C5 (P3 full + composition root) entregues
> **Data última atualização:** 2026-05-14

---

## ✅ C1 — ADRs e governança (entregues)

| Arquivo | Conteúdo |
|---------|----------|
| [docs/foundry/decisions/ADR-005-PROJ-orchestration-runtime.md](../../docs/foundry/decisions/ADR-005-PROJ-orchestration-runtime.md) | Adoção de `@langchain/langgraph` como orchestration runtime canônico. 4 padrões obrigatórios (P1-P4). C7 violado conscientemente. |
| [docs/foundry/decisions/ADR-006-PROJ-tracing-substitution.md](../../docs/foundry/decisions/ADR-006-PROJ-tracing-substitution.md) | Substituir Langfuse por LangSmith (caminho A). Divergência consciente do schema canônico do Foundry. PR upstream pendente. |
| [docs/foundry/decisions.md](../../docs/foundry/decisions.md) | Atualizado com entries resumidas ADR-005-PROJ e ADR-006-PROJ |
| [CLAUDE.md](../../CLAUDE.md) | Stack consolidado atualizado; tabela C5-C8 reflete LangSmith e exceção C7 |

## ✅ C2 — Instalação + fundação (entregues)

| Item | Detalhe |
|---|---|
| **Deps instaladas** | `@langchain/langgraph@1.3.0` + `@langchain/core@1.1.46` |
| **BaseGraphState** | [src/orchestration/state/BaseGraphState.ts](state/BaseGraphState.ts) — `Annotation.Root` com `tenantId` (C8) + `traceContext` (P3) + `mode`; `BaseGraphStateSchema` Zod para validação no boundary |
| **Smoke ESM** | [tests/orchestration/base-state.test.ts](../../tests/orchestration/base-state.test.ts) — 10 testes verdes |
| **Typecheck** | 0 erros |

## ✅ C3 — LangSmith adapter + delete Langfuse (entregues)

| Item | Detalhe |
|---|---|
| **Dep instalada** | `langsmith@0.7.0` (já vinha como sub-dep de `@langchain/core`; agora declarada raiz) |
| **Dep removida** | `langfuse@3.x` deletada do `package.json` |
| **Adapter novo** | [src/infrastructure/adapters/observability/LangSmithAdapter.ts](../infrastructure/adapters/observability/LangSmithAdapter.ts) — usa `RunTree` da API LangSmith. Mantém `Map<traceId, RunTree>` interno para permitir spans aninhados e endTrace stateless. Falha de telemetria é fire-and-foundryt — nunca derruba produção. |
| **Adapter deletado** | `LangfuseAdapter.ts` removido |
| **`.env.example`** | Bloco `LANGFUSE_*` substituído por `LANGSMITH_API_KEY/PROJECT/API_URL/TRACING` |
| **`docs/foundry/project.json`** | `telemetry.llm_trace_provider: "langfuse"` → `"langsmith"` + `_llm_trace_provider_doc` referenciando ADR-006-PROJ |
| **`pre-merge-check.md` G1** | Atualizado: permite `@langchain/langgraph` em `src/orchestration/` e `tests/orchestration/`; bloqueia em `src/application/` e `src/domain/` |
| **Comentários** | 4 referências stale a "Langfuse" em comentários atualizadas para "LangSmith" |
| **Typecheck** | 0 erros |
| **Suite** | 137 testes verdes (sem regressão) |

### Padrões fixados em C3

- **Porta `Observability` inalterada** — adapter pluggable mantém contratos `startTrace/span/endTrace`.
- **Telemetria assíncrona não-bloqueante** — `RunTree.postRun()` e `.end()` são fire-and-foundryt com `.catch()` swallow.
- **Span sem trace pai conhecido** — quando `activeRuns.get(traceId)` retorna `undefined`, `span()` apenas executa `fn()` sem instrumentar (graceful degradation).

## ✅ C4 — SocialMediaOrchestrator 1º grafo (entregues)

| Item | Detalhe |
|---|---|
| **Arquivo** | [src/orchestration/social-media/SocialMediaOrchestrator.ts](social-media/SocialMediaOrchestrator.ts) |
| **State** | `SocialMediaState` herda `BaseGraphState` + `briefing`, `carrossel`, `designReport`, `publications`, `error` (todos com reducer `overwrite`) |
| **Nodes** | 3 nodes ativos: `generate_carrossel` → (`design_validation`?) → `publish_multi_network` |
| **Edge condicional** | `briefing.enableDesignValidation === true` roteia para `design_validation`; senão pula para `publish_multi_network` |
| **Factory P4** | `createSocialMediaOrchestrator(deps)` recebe `{ generateCarrossel, designCarrossel, publishMultiNetwork, observability }` via DI manual e devolve `CompiledStateGraph` |
| **Runner helper** | `runSocialMediaOrchestrator(graph, deps, input)` encapsula `startTrace` + `graph.invoke` + `endTrace` com o sku raiz `"social-media-orchestrator"` |
| **Spans no traceContext do grafo (P3)** | Cada node abre 1 span no `state.traceContext`: `node:generate_carrossel`, `node:design_validation`, `node:publish_multi_network` |
| **Composability cross-agent** | Quando `enableDesignValidation: true`, o orchestrator invoca `DesignCarrosselUseCase` reaproveitando o designer-agent — 1º caso real de composição cross-SKU |
| **Test integration** | [tests/orchestration/social-media-orchestrator.test.ts](../../tests/orchestration/social-media-orchestrator.test.ts) — 7 testes verdes cobrindo: compilação, pipeline default, pipeline com design_validation, trace raiz registrado, composição cross-agent (3 SKUs distintos no mesmo run), C8 boundary, propagação de erro |
| **Suite final** | 144 testes verdes (137 + 7 novos) |

## ✅ C5 — P3 full + composition root (entregues)

| Item | Detalhe |
|---|---|
| **parentTrace em GenerateCarrosselUseCase** | `GenerateCarrosselInput.parentTrace?: TraceContext` — quando fornecido, usa como trace pai e suprime `startTrace`/`endTrace` próprios |
| **parentTrace em DesignCarrosselUseCase** | `DesignCarrosselUseCaseInput.parentTrace?: TraceContext` — mesmo padrão |
| **Orchestrator propaga parentTrace** | `runGenerateCarrosselNode` e `runDesignValidationNode` passam `parentTrace: trace` para os use cases |
| **Hierarquia de trace consolidada** | 1 trace raiz (social-media-orchestrator) com todos os spans como filhos diretos. Spans de use cases (copy_generation, image_generation_batch, parallel_slide_generation) aparecem dentro do trace do orchestrator |
| **Composition root** | [src/infrastructure/composition/CompositionRoot.ts](../composition/CompositionRoot.ts) — `createSocialMediaDeps()` instancia todos os adapters reais a partir do `.env`. `createProductionSocialMediaPipeline()` expõe `run()` pronto para uso em SHADOW |
| **`.env.example` completo** | Variáveis Twitter adicionadas (TWITTER_API_KEY/SECRET/ACCESS_TOKEN/ACCESS_TOKEN_SECRET) |
| **Teste cross-agent atualizado** | `cross-agent composition (P3 full)` verifica 1 único trace raiz com spans de todos os use cases como filhos |
| **Typecheck** | 0 erros |
| **Suite** | 144 testes verdes (sem regressão) |

---

## ⏳ Tarefas adiadas (pós C5)

| Tarefa | Quando | Notas |
|---|---|---|
| PR upstream em `agent-governance-framework` propondo `llm_trace_provider: langsmith \| langfuse \| dual` | Pós C5 estável | Founder autorizou; PR em paralelo |
| `EvalRunnerGraph` (versão integration-style do eval runner para grafos) | Wave 5 social-media-agent | |
| Checkpointer Postgres para `atendimento-dm` multi-turn | Fase B (D6) | |
| Streaming via `LLMProvider.generateStream()` | Fase B (B4 do plano técnico) | |

---

## Riscos remanescentes

| Risco | Probabilidade | Mitigação |
|-------|:-------------:|-----------|
| LangSmith free tier (5k traces/mês) saturado em SHADOW | 🟡 Média | Plus $39/mês quando volume cruzar 4k. Monitor em audit mensal. |
| Sibling traces dificultam debug em LangSmith antes do C5 | 🟢 Baixa | Metadata carrega `tenantId` + `sku` + `mode` — query por tags resolve. |
| Bundle CI mais lento com langsmith | 🟢 Baixa | Já era sub-dep de `@langchain/core`; impacto adicional zero. |
| Audit mensal flagar `llm_trace_provider: langsmith` como não-conforme | 🟡 Média | ADR-006-PROJ documenta divergência. PR upstream em paralelo. |

---

## Pré-requisitos para o 1º run E2E em SHADOW

- [ ] Criar conta LangSmith (https://smith.langchain.com) — org sugerida: `novais-digital`
- [ ] Criar 2 projetos: `marketing-ai-agents-dev` e `marketing-ai-agents-prod`
- [ ] Gerar `LANGSMITH_API_KEY` (formato `lsv2_pt_...`) e popular `.env` (não `.env.example`)
- [ ] **Rotacionar** qualquer chave que tenha vazado em `.env.example` (placeholder agora limpo)
- [x] Composition root wire-up — `src/infrastructure/composition/CompositionRoot.ts` (C5 ✅)
- [ ] Popular `.env` com todas as variáveis reais (ver `.env.example` completo)
- [ ] Verificar que `prompts/social-media-agent/system-prompts/brand_voice_ceo.md` está completo
