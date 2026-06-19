# ADR-007-PROJ — Runtime Self-Harness: agentes aprendem com cada cliente

**Status:** ✅ Aceito 2026-06-19 — aprovado pelo founder (piloto copywriter)
**Princípios relacionados:** C5 (three-tier data), C6 (observability), C7 (portability), C8 (anti-hardcode por tenant), C1 (diagnose-first), C4 (confidence/lifecycle)
**Depende de:** [ADR-006-PROJ](./ADR-006-PROJ-tracing-substitution.md) (LangSmith traces)

---

## Contexto

O projeto já possui um loop **self-harness** (Forge-20), porém ele opera no nível das **sessões de desenvolvimento do Claude Code**, não no runtime dos agentes SKU:

- [`hooks/session-start/forge-context.sh`](../../../hooks/session-start/forge-context.sh) injeta `agent-memory.md` na sessão do **IDE** (ajuda o assistente de código a lembrar entre sessões de dev).
- [`hooks/stop/learning-snapshot.sh`](../../../hooks/stop/learning-snapshot.sh) captura gate reports de **runs de codificação**. Todos os snapshots em `docs/learnings/` eram `is_internal: true`, `client_id: none`.
- O system prompt do copywriter em runtime é montado em [`GenerateCopywriterOutputUseCase.callLLM()`](../../../src/application/copywriter-agent/GenerateCopywriterOutputUseCase.ts) a partir de 3 maps estáticos (tom/framework/output). **Nenhuma memória por cliente era injetada, e nada escrevia aprendizado após um run de produção.**

O pedido do founder — "nossos agentes precisam ser self-harness, para aprender com cada cliente que atender" — exige um **loop em RUNTIME** (em `src/`), distinto do loop de dev.

### Sinais de aprendizado avaliados

| Sinal | Decisão | Motivo |
|---|---|---|
| **Bootstrap do diagnóstico** (C1) | ✅ Adotado | Identidade/restrições do cliente já existem no `diagnostic.md`; semeiam soul + memory |
| **Edições/aprovações humanas em ASSISTED** | ✅ Adotado | Maior qualidade de sinal — a correção humana é a lição |
| Sinais automáticos de qualidade (voice/brand score, re-rolls) | ⏸️ **Deferido** | Disponíveis nos traces, mas o founder priorizou sinal humano nesta fase; reabrir em ADR futuro |

## Decisão

Implementar um **loop runtime de memória por cliente**, reutilizável entre SKUs, **piloto no copywriter-agent**. `docs/clients/{tenantId}/` é Tier 1/2 de **dados** (C5) — `tenantId` é sempre parâmetro/path, nunca ramificação de código (C8).

### Peças concretas

1. **Porta + adapter (C5/C7/C8).** [`src/domain/ports/ClientMemory.ts`](../../../src/domain/ports/ClientMemory.ts) (`ClientMemory` + `ClientMemoryWriter`) e [`src/infrastructure/adapters/memory/FileClientMemory.ts`](../../../src/infrastructure/adapters/memory/FileClientMemory.ts) — lê/parseia `agent-soul.md` + `agent-memory.md` (formato `§`), monta `promptFragment` limitado. Degradação graciosa: cliente sem diretório → fragment vazio.

2. **Injeção no runtime (C6).** `GenerateCopywriterOutputUseCase` carrega a memória uma vez por execução (span `client_memory_load` com metadata `client_facts_injected` / `client_soul_present`) e a injeta como **último bloco** do system prompt — prefixo estático (tom/framework/output) permanece cacheável, só o sufixo varia por cliente.

3. **Captura do feedback humano (C).** [`FeedbackEvent`](../../../src/domain/clientmemory/FeedbackEvent.ts) + [`RecordClientFeedbackUseCase`](../../../src/application/clientmemory/RecordClientFeedbackUseCase.ts) gravam um snapshot **no mesmo formato que o `learning-curator` já consome** (`docs/learnings/{YYYY-MM}/runtime-{tenantId}-*.md`, `is_internal: false`). CLI fina: `npm run feedback:record -- <payload.json>`.

4. **Bootstrap do diagnóstico (C1).** [`src/clientmemory/bootstrap.ts`](../../../src/clientmemory/bootstrap.ts) + `scripts/bootstrap-client-memory.ts` (`npm run clientmemory:bootstrap -- <tenantId>`) semeiam soul + memory a partir do `diagnostic.md`.

5. **Curadoria (reuso).** O `learning-curator` guardian existente lê os snapshots de runtime e persiste fatos em `agent-memory.md` após sua barreira de qualidade (sem PII, sem hardcode, rastreável). Curadoria em **batch revisada**, não auto-persist.

### Gating de confiança (C4)

O fragment injeta apenas fatos com `confidence ≥ shadow` (piso configurável). Fatos `local` (ex.: seeds de bootstrap) são audit trail e **não mudam o comportamento do agente** até confirmação em run formal. O **soul** (identidade durável do diagnóstico) é sempre injetado.

### Privacidade (LGPD)

`FeedbackEvent` **não** carrega o conteúdo bruto do output (pode conter PII) — apenas a nota humana (`editSummary`) e deltas de tamanho. A sanitização final permanece no `learning-curator` / `security-privacy-guardian`.

## Consequências

### ✅ Positivas
- Primeiro caminho de aprendizado **por cliente real** (primeiros snapshots `is_internal: false`).
- Reutiliza formato `§`, critérios do curator, traces LangSmith e níveis de confidence — lacuna era só a fiação runtime.
- Opcional por construção: SKU sem `clientMemory` nas deps tem comportamento idêntico ao anterior (zero impacto).
- Reutilizável: designer/social-media herdam a mesma porta com baixo esforço.

### ⚠️ Negativas / limites
- Copywriter está em **SHADOW**, não ASSISTED — a captura de feedback só terá dados reais após promoção (elegível desde 2026-06-02). Injeção + bootstrap entregam valor imediato; captura fica fiada e pronta.
- Curadoria ainda é semi-manual (`/acme:learn`) até o Hermes Learning Loop ser ativado.
- Wiring de produção do copywriter ainda não existe (use case só é exercido por testes/eval); exposta `createClientMemory()` na composição para quando existir.
- Sinais automáticos de qualidade ficam de fora (decisão consciente) — reabrir se o sinal humano for insuficiente.

### 📋 Tarefas decorrentes
- [ ] Após promover copywriter→ASSISTED, ligar a captura de feedback no fluxo de revisão humana.
- [ ] Rodar `/acme:learn acme-internal-copywriter-001` quando houver snapshots de runtime.
- [ ] Estender injeção a designer-agent e social-media-agent (mesma porta).
- [ ] Avaliar ADR futuro para sinais automáticos (voice/brand score → fatos).

## Re-examinar
30 dias após primeiro feedback ASSISTED capturado:
- Os fatos curados estão melhorando a qualidade percebida (menos edições humanas)?
- O piso de injeção `shadow` é o correto, ou fatos `local` de bootstrap deveriam injetar?
- O orçamento de contexto (maxFacts/maxChars) está adequado ao custo (C3)?
