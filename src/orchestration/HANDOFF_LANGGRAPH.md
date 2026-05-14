# LangGraph Adoption — Handoff C1+C2 → C3+C4

> **Status:** ✅ C1 (ADRs) + C2 (instalação + BaseGraphState + smoke) entregues
> **Data:** 2026-05-14
> **Próxima sessão:** C3 (LangSmithAdapter + delete Langfuse) + C4 (SocialMediaOrchestrator 1º grafo) — requer `LANGSMITH_API_KEY`

---

## ✅ C1 — ADRs e governança (entregues)

| Arquivo | Conteúdo |
|---------|----------|
| [docs/forge/decisions/ADR-005-PROJ-orchestration-runtime.md](../../docs/forge/decisions/ADR-005-PROJ-orchestration-runtime.md) | Adoção de `@langchain/langgraph` como orchestration runtime canônico. 4 padrões obrigatórios (P1-P4). C7 violado conscientemente. |
| [docs/forge/decisions/ADR-006-PROJ-tracing-substitution.md](../../docs/forge/decisions/ADR-006-PROJ-tracing-substitution.md) | Substituir Langfuse por LangSmith (caminho A). Divergência consciente do schema canônico do Forge. PR upstream pendente. |
| [docs/forge/decisions.md](../../docs/forge/decisions.md) | Atualizado com entries resumidas ADR-005-PROJ e ADR-006-PROJ |
| [CLAUDE.md](../../CLAUDE.md) | Stack consolidado atualizado; tabela C5-C8 reflete LangSmith e exceção C7 |

## ✅ C2 — Instalação + fundação (entregues)

| Item | Detalhe |
|---|---|
| **Deps instaladas** | `@langchain/langgraph@1.3.0` + `@langchain/core@1.1.46` |
| **BaseGraphState** | [src/orchestration/state/BaseGraphState.ts](state/BaseGraphState.ts) — `Annotation.Root` com `tenantId` (C8) + `traceContext` (P3) + `mode`; `BaseGraphStateSchema` Zod para validação no boundary |
| **Smoke ESM** | [tests/orchestration/base-state.test.ts](../../tests/orchestration/base-state.test.ts) — 10 testes verdes: importa `StateGraph/Annotation/START/END`, BaseGraphState spreadable, validação Zod C8, grafo trivial compila + executa |
| **Typecheck** | 0 erros |
| **Suite total** | 137 testes verdes (127 anteriores + 10 orchestration) |

### Padrões já fixados nesta sessão

- **P2 (C8):** `Annotation.Root({...BaseGraphState.spec, ...})` é a única forma de criar state. `validateBaseInput()` roda no boundary do grafo.
- **Type safety:** `hasBaseState(state)` é o type guard para narrowing dentro de nodes.

---

## ⏳ C3 — LangSmith adapter + delete Langfuse (próxima sessão)

### Pré-requisitos (você executa antes)

- [ ] Criar conta LangSmith (https://smith.langchain.com) — org sugerida: `acme`
- [ ] Criar 2 projetos: `marketing-ai-agents-dev` e `marketing-ai-agents-prod`
- [ ] Gerar `LANGSMITH_API_KEY` (formato `lsv2_pt_...`)
- [ ] Atualizar `.env` local com:
  ```
  LANGSMITH_API_KEY=lsv2_pt_...
  LANGSMITH_PROJECT=marketing-ai-agents-dev
  LANGSMITH_TRACING=true
  ```

### Trabalho da próxima sessão

1. **Criar `LangSmithAdapter`** implementando port `Observability` (mesmo contrato — `startTrace`, `span`, `endTrace`). Usa `Client` do `langsmith` package (vem junto com `@langchain/core`).
2. **Deletar `LangfuseAdapter.ts`** (founder confirmou).
3. **Remover dep `langfuse`** do `package.json`.
4. **Atualizar `.env.example`**: substituir bloco `LANGFUSE_*` por `LANGSMITH_*`.
5. **Atualizar `docs/forge/project.json`**: `telemetry.llm_trace_provider` de `"langfuse"` para `"langsmith"`.
6. **Refatorar use cases que importam `LangfuseAdapter` diretamente**: trocar por `LangSmithAdapter` (porta é a mesma — só muda a fábrica em `composition root`).
7. **Atualizar pre-merge-check G1**: permitir `@langchain/langgraph` em `src/orchestration/` (não em `src/application/` nem `src/domain/`).
8. **Testes:** validar que 137 testes existentes continuam verdes (porta `Observability` inalterada).

**Estimativa:** ~4h. Bloqueante: `LANGSMITH_API_KEY` configurada.

## ⏳ C4 — SocialMediaOrchestrator 1º grafo (após C3)

### Trabalho

1. Criar `src/orchestration/social-media/SocialMediaOrchestrator.ts` com 3 nodes:
   - `generate_caption` — invoca `GenerateCarrosselUseCase` para captions (sem imagens)
   - `design_carrossel` — invoca `DesignCarrosselUseCase` para slides
   - `publish_multi_network` — invoca `PublishMultiNetworkUseCase`
2. State herda `BaseGraphState` + chaves específicas (`briefing`, `slides`, `publications`)
3. Factory `createSocialMediaOrchestrator(deps)` — DI manual (P4)
4. Use cases internos recebem `parentTrace` → suprimem spans próprios (P3)
5. Test integration: `runner-e2e.test.ts` com fakes existentes + assertion de trace aninhado

**Estimativa:** ~2h.

### Saídas esperadas

- Composição cross-agent funcional (social-media usa designer-agent)
- Trace visualizável em LangSmith
- Eliminação de duplicação de lógica de design entre social-media e designer
- 1º caso de uso real de `BaseGraphState` em produção

---

## Tarefas adiadas (não bloqueiam Fase B)

| Tarefa | Quando |
|---|---|
| PR upstream em `agent-governance-framework` propondo `llm_trace_provider: langsmith \| langfuse \| dual` | Após C3 estável (founder autorizou main) |
| `EvalRunnerGraph` (versão integration-style do eval runner para grafos) | Wave 5 do social-media-agent |
| Checkpointer Postgres para `atendimento-dm` multi-turn | Fase B (D6) |
| Streaming via `LLMProvider.generateStream()` | Fase B (B4 do plano técnico) |

---

## Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|-------|:-------------:|-----------|
| LangSmith free tier (5k traces/mês) saturado em SHADOW | 🟡 Média | Plus $39/mês quando volume cruzar 4k. Monitor em audit mensal. |
| Annotation API em strict mode forçar `any` casts | 🟢 Baixa | Isolar em `src/orchestration/state/` apenas. Já validado em C2 — funcionou sem casts. |
| Bundle CI lento (40-60MB extras) | 🟢 Baixa | npm install ~30s a mais; aceitável. Monitorar se `forge-test` CI passar do orçamento. |
| Audit mensal flagar `llm_trace_provider: langsmith` como não-conforme | 🟡 Média | ADR-006-PROJ documenta divergência. PR upstream em paralelo. |
