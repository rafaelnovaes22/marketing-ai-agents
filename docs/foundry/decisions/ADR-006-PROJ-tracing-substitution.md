# ADR-006-PROJ — Tracing Substitution: LangSmith substitui Langfuse

**Status:** ✅ Aceito 2026-05-14 — aprovado pelo founder
**Princípios relacionados:** C6 (Observability) — **divergência consciente do schema canônico**
**Depende de:** [ADR-005-PROJ](./ADR-005-PROJ-orchestration-runtime.md) (adoção de LangGraph)

---

## Contexto

[ADR-005-PROJ](./ADR-005-PROJ-orchestration-runtime.md) adota LangGraph como orchestration runtime. LangGraph TS emite traces **nativamente** em LangSmith via env vars `LANGSMITH_*` — não há flag oficial para emitir em outro provider sem implementar callback handler custom.

`docs/foundry/project.json` declara `llm_trace_provider: langfuse` (C6 do Foundry canônico). Três caminhos foram avaliados:

| Caminho | Custo | Risco |
|---|---|---|
| **A — Substituir Langfuse por LangSmith** | Refatorar `LangfuseAdapter` + atualizar `project.json` + PR upstream | Divergência temporária com Foundry canônico |
| **B — Dual tracing (LangSmith + Langfuse)** | Adapter custom emitindo em ambos | 2× latência de instrumentação; custo dobrado |
| **C — Manter Langfuse, ignorar LangSmith nativo** | Configurar LangGraph com `tracing_v2: false` + callback handler custom | Perde debug visual nativo de grafos (motivação principal da adoção) |

**Caminho A escolhido** porque:
- Debug visual nativo de LangGraph foi uma das 3 motivações para adotar o framework (perdê-lo = perder ~30% do benefício).
- Dual tracing dobra custo operacional sem benefício correspondente (não há fluxo onde Langfuse traz informação que LangSmith não traga).
- Manter Langfuse + ignorar LangSmith é a pior das opções: paga overhead de dois sistemas mentais sem ganho.

## Decisão

**Substituir LangfuseAdapter por LangSmithAdapter como implementação do port `Observability`.**

### Mudanças concretas

1. **Novo adapter:** `src/infrastructure/adapters/observability/LangSmithAdapter.ts` implementa `Observability` port (mesmo contrato — `startTrace`, `span`, `endTrace`).
2. **Adapter antigo:** `LangfuseAdapter.ts` **deletado** após `LangSmithAdapter` estabilizar (validação no 1º grafo). Sem dead-code residual.
3. **project.json:** atualizar `telemetry.llm_trace_provider` de `"langfuse"` para `"langsmith"`.
4. **package.json:** remover `langfuse` das deps; adicionar `@langchain/core` (já vem com `@langchain/langgraph`).
5. **.env.example:** substituir `LANGFUSE_*` por `LANGSMITH_API_KEY` + `LANGSMITH_PROJECT` + `LANGSMITH_ENDPOINT` (opcional, para self-hosted).
6. **Pre-merge-check G3** (observe wrapping): regra continua a mesma — toda chamada LLM passa por `obs.span(...)`. Apenas o backend do span muda.

### Configuração de env

```bash
# .env (produção/dev)
LANGSMITH_API_KEY=lsv2_pt_...
LANGSMITH_PROJECT=marketing-ai-agents-prod   # ou marketing-ai-agents-dev
LANGSMITH_TRACING=true
# Opcional — self-hosted:
# LANGSMITH_ENDPOINT=https://langsmith.novais-digital.com.br/api
```

LangGraph detecta essas vars e emite traces automaticamente para os spans gerados pelos nodes. Adicionalmente, `LangSmithAdapter` chama `Client.traceableTree` para spans manuais em camadas inferiores (use cases standalone).

### Convenção de projeto LangSmith

- Cada SKU = **1 projeto LangSmith** (`marketing-ai-agents-{sku}`). Permite filtrar visualizações por SKU sem cross-contamination.
- Trace tags obrigatórias: `tenant_id`, `sku`, `mode`, `prompt_hash` (quando aplicável), `case_id` (em eval runs).
- Retenção: 30 dias (free tier) ou 90 dias (plan plus). Definir no console após criar org.

## Consequências

### ✅ Positivas

- Debug visual nativo de grafos LangGraph (visualização de state flow + branches + retries).
- 1 runtime de tracing alinhado ao orchestrator — sem ritual de "instrumentar duas vezes".
- LangSmith expõe replay de execuções — útil em audit mensal DeepAgent (Foundry-3).
- Custo similar ao Langfuse free tier (5k traces/mês), upgrade para Plus em $39/mês quando volume justificar.

### ⚠️ Negativas

- **Divergência temporária com Foundry canônico** até PR upstream merja. Auditoria mensal vai flagar `llm_trace_provider: langsmith` como não-conforme ao schema v1 do `project.json`. Mitigação: ADR-005/006 referenciados na auditoria.
- **Vendor lock-in moderado**: LangSmith é proprietária da LangChain Inc. Auto-hospedável (`LANGSMITH_ENDPOINT=...`) mas operação self-hosted exige time DevOps. Para projeto pre-AUTONOMOUS, cloud é aceitável.
- **Migração de traces históricos**: como ainda não promovemos SHADOW, **não há traces históricos a migrar**. Decisão pré-Shadow é momento ideal.
- **`LangfuseAdapter` deletado**: founder confirmou (resposta "sim" à pergunta 3 do plano C1+C2). Se quisermos voltar a Langfuse no futuro, reimplementamos como novo adapter — mesmo port, sem refactor de domain/application.

### 📋 Tarefas decorrentes

- [ ] **C3 do plano LangGraph**: implementar `LangSmithAdapter`, deletar `LangfuseAdapter`, atualizar `project.json`/`.env.example`/CLAUDE.md.
- [ ] **PR upstream em `agent-governance-framework`** propondo schema flexível: `llm_trace_provider: langsmith | langfuse | dual` no `project.json` v1.1.
- [ ] Smoke test após C3: rodar `SocialMediaOrchestrator` (C4) e confirmar trace aparece no LangSmith project `marketing-ai-agents-dev`.
- [ ] Validar que `pre-merge-check G3` (observe-wrapper) ainda passa com novo adapter.

## Re-examinar

90 dias após primeira promoção SHADOW:

- LangSmith free tier (5k traces/mês) suficiente?
- Audit mensal DeepAgent ainda flagging divergência? (PR upstream merjou?)
- Custo total de LangSmith vs Langfuse equivalente no volume real?
- LangSmith UX (debug visual) está sendo usado pela equipe ou continua todo mundo lendo trace texto?

Se LangSmith não estiver agregando valor proporcional ao vendor lock-in, considerar:
- Voltar para Langfuse (caminho C revisitado com handler custom maduro)
- Migrar para LangSmith self-hosted
- Avaliar Phoenix (Arize, OSS) ou Helicone como alternativas neutras

## Foundry upstream — Conteúdo do PR

Proposta de schema atualizado no `agent-governance-framework`:

```diff
- "llm_trace_provider": "langfuse"
+ "llm_trace_provider": "langsmith" | "langfuse" | "dual"
+ "_llm_trace_provider_doc": "Provider de tracing LLM. 'langsmith' integra nativamente com LangGraph; 'langfuse' é o padrão histórico; 'dual' emite em ambos (custo/latência maior)."
```

Documentação a atualizar no Foundry upstream:
- `CONSTITUTION.md` — C6 atualiza para reconhecer múltiplos providers
- `templates/project.template.json` — schema v1.1 com enum flexível
- `.claude/commands/novais-digital/pre-merge-check.md` G3 — independente de provider, valida `obs.span()` presente
