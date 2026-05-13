---
sku_id: estrategista-agent
tasks_date: 2026-05-13
total_tasks: 30
estimated_days: 3-4
tier: B
waves: 5
priority: P2
---

# Tasks — Estrategista Agent

> Decomposição do plano em tasks executáveis. Cada task tem ID, descrição, estimativa, dependências, dono.
>
> Sintaxe: **[ID] Nome — esforço — dono — deps**

## Wave 1 — Foundation + MixpanelAdapter (1 dia)

> **Foco:** adapter NOVO `MixpanelAdapter` (read-only) + cache Redis + reuso de infra do social-media-agent.

- [ ] **T1.1** Setup TS + Vitest + reuso eslint/prettier do social-media-agent — 30min — dev — sem deps
- [ ] **T1.2** Schema Prisma (`Diagnostic`, `Execution`, `MixpanelCache`, `LangfuseTrace`) + migration — 1h — dev — T1.1
- [ ] **T1.3** Seed: 1 tenant fake Acme com event mapping YAML — 30min — dev — T1.2
- [ ] **T1.4** Port `AnalyticsProvider` interface (em `src/domain/funnel/ports/`) — 30min — dev — T1.1
- [ ] **T1.5** **`MixpanelAdapter`** — implementação base (auth, error handling, retry) — 1.5h — dev — T1.4
- [ ] **T1.6** **`MixpanelAdapter.countActiveUsers`** + **`.countEventDays`** (queries de pre-check) — 1h — dev — T1.5
- [ ] **T1.7** **`MixpanelAdapter.queryFunnel`** (JQL custom 5 etapas AARRR) — 1.5h — dev — T1.5
- [ ] **T1.8** **`MixpanelAdapter.queryRetention`** (`/api/2.0/retention`) — 1h — dev — T1.5
- [ ] **T1.9** **`MixpanelAdapter.queryCohorts`** (JQL group by) — 1h — dev — T1.5
- [ ] **T1.10** **`MixpanelAdapter.queryEventCounts`** + **`.queryRevenue`** — 1h — dev — T1.5
- [ ] **T1.11** **`MixpanelCache`** (Redis wrapper TTL 24h/1h por janela) — 1h — dev — T1.1
- [ ] **T1.12** Lint custom `no-mixpanel-write` (proíbe `track`/`import`/`update` no adapter) — 30min — dev — T1.5
- [ ] **T1.13** **`PostgresAnalyticsAdapter`** stub (NotImplementedError) — provar C7 swap — 30min — dev — T1.4
- [ ] **T1.14** Reuso `ClaudeAdapter` em modo Opus 4.6 (configurar model + max_tokens) — 30min — dev — T1.1
- [ ] **T1.15** Reuso `LangfuseAdapter` (config namespace `estrategista-agent`) — 30min — dev — T1.1
- [ ] **T1.16** Mixpanel sandbox setup (project DEV + service account token) — 30min — dev — sem deps
- [ ] **T1.17** Smoke: `MixpanelAdapter.countActiveUsers('acme-fake', 30)` retorna número real — 30min — dev — T1.5, T1.16

**Total Wave 1:** ~13h (~1.5 dia útil — mais pesado que SMA por adapters novos)

## Wave 2 — Domain + Application (AARRR analyzer + Recommendation generator) (1.5 dia)

> **Foco:** AARRR analyzer (queries paralelas + agregação) + recommendation generator (Opus 4.6 + few-shots).

- [ ] **T2.1** Domain: `Funnel` entity (5 etapas AARRR + métricas-chave por etapa) — 1h — dev — T1.1
- [ ] **T2.2** Domain: `Bottleneck` (etapa, drop_pp, causa_provavel, impact_score) — 30min — dev — T2.1
- [ ] **T2.3** Domain: `Recommendation` (acao, kpi_alvo, baseline, impacto_estimado, effort) — 30min — dev — T2.1
- [ ] **T2.4** Domain: `Confidence` enum (alta/média/baixa) + regras de calibração — 30min — dev — T2.1
- [ ] **T2.5** Domain: `DataQualityCheck` (status: ok/partial/rejected + reason) — 30min — dev — T2.1
- [ ] **T2.6** Domain: AARRR canonical structure (etapas + KPIs canônicos por etapa) — 1h — dev — T2.1
- [ ] **T2.7** Domain: testes unit puros (zero mock externo) — 1.5h — dev — T2.1-T2.6
- [ ] **T2.8** **`PreCheckDataQualityUseCase`** (GATE constitucional ADR-003-EST) — 1h — dev — Wave 1
- [ ] **T2.9** **`AnalyzeFunnelUseCase`** (8 queries paralelas Promise.all sem stamp=4 + agregação JSON) — 2h — dev — Wave 1
- [ ] **T2.10** **`GenerateRecommendationsUseCase`** (Opus 4.6 + system prompt placeholder + structured output) — 2h — dev — T1.14
- [ ] **T2.11** **`GenerateReportUseCase`** (Markdown renderer determinístico) — 1.5h — dev — T2.10
- [ ] **T2.12** **`CheckGroundednessUseCase`** (regex extrai números × cross-ref API response) — 1h — dev — T2.10
- [ ] **T2.13** Retry logic para Opus (1× refazer se groundedness fail) — 30min — dev — T2.12
- [ ] **T2.14** Testes integration com fakes de adapters (5 cenários: ok, rejected, partial, opus fail, groundedness fail) — 2h — dev — T2.8-T2.13

**Total Wave 2:** ~15h (~1.5 dia)

## Wave 3 — Test RED (TDD-first, Forge-10) — INSERIR ANTES DO BUILD COMPLETO

> ⚠️ **Forge-10 obriga:** test_agent em mode=red gera testes ANTES de Wave 4 finalização.

- [ ] **T3.1** `/acme:aios-run --step=test --mode=red` (gera tests/estrategista-agent/{unit,integration,e2e}/) — 30min — dev/agent
- [ ] **T3.2** Operador valida que testes falham (RED phase confirmada) — 15min — dev
- [ ] **T3.3** Commit do plano de testes + RED evidence — 15min — dev

**Total Wave 3:** ~1h

## Wave 4 — Build refinement + Integration real (1 dia)

> **Foco:** consolidação + integration test com Mixpanel sandbox REAL (não só mock).

- [ ] **T4.1** Implementar testes RED → GREEN (consolidação de W1/W2) — 2h — dev — W3
- [ ] **T4.2** Integration test: mock Mixpanel (5 cenários sintéticos) — 1.5h — dev — W2
- [ ] **T4.3** Integration test: Mixpanel SANDBOX real (tenant fake Acme, 1 cenário end-to-end) — 1.5h — dev — T1.16
- [ ] **T4.4** Verificar coverage Tier B (≥85% line, ≥80% branch) — 30min — dev — T4.1
- [ ] **T4.5** Hook `any-sdk-in-domain` (proíbe import `mixpanel-node` em `src/domain/`) — 30min — dev — T4.1
- [ ] **T4.6** Validação E2E manual: rodar 1 diagnóstico real no sandbox e revisar output — 1h — dev — T4.3
- [ ] **T4.7** Frontend admin (opcional, SHADOW review) — diff lista de pendentes — 2h — dev — opcional

**Total Wave 4:** ~7-9h

## Wave 5 — Few-shot + Actionability rubric + Eval + Ship (1 dia)

> **Foco:** insumos de calibração CRÍTICOS + eval-suite + telemetria + promoção SHADOW.

- [ ] **T5.1** **`few-shot-examples.md`** (15 diagnósticos curados: input dados agregados → output relatório → score esperado) — 3h — dev — Wave 2
- [ ] **T5.2** **`actionability-rubric.md`** (rubrica 0-10 explícita: KPI alvo, baseline, effort, especificidade) — 1h — dev — sem deps
- [ ] **T5.3** **`aarrr-canonical-prompt.md`** (system prompt completo com framework + groundedness instructions) — 2h — dev — T5.1
- [ ] **T5.4** LLM-as-judge runner actionability (Claude Sonnet 4.6 + rubric) — 1h — dev — T5.2
- [ ] **T5.5** `/acme:aios-run --step=test --mode=verify` (gaps + coverage) — 30min — agent — T4.4
- [ ] **T5.6** Eval CLI `npm run eval estrategista-agent` (roda 22 cases) — 30min — dev — T5.4
- [ ] **T5.7** CI workflow `forge-test` ativo para este SKU — 30min — dev — T5.6
- [ ] **T5.8** `/acme:sla-threshold estrategista-agent --p95=120s` — 30min — dev — sem deps
- [ ] **T5.9** Telemetria Langfuse completa (18 spans canônicos + metadata) — 1h — dev — T1.15
- [ ] **T5.10** Dashboard Mixpanel (diagnósticos/dia, custo, acionabilidade, pre-check rejection rate, cache hit ratio) — 1.5h — dev — T5.9
- [ ] **T5.11** Alertas Slack (SLA > 120s, groundedness fail, custo > R$ 25, pre-check rejection > 25%) — 1h — dev — T5.9
- [ ] **T5.12** Runbook ops + README — 1h — dev — sem deps
- [ ] **T5.13** `/acme:promote estrategista-agent --to=shadow` (promotion-officer assina) — 30min — agent — Wave 4 + 5

**Total Wave 5:** ~14h (~1.5 dia)

## Resumo

| Wave | Esforço | Cobertura |
|------|--------:|-----------|
| 1 — Foundation + MixpanelAdapter | 13h | Adapter NOVO + cache + sandbox |
| 2 — Domain + Application (AARRR + Recommendations) | 15h | Use cases + pre-check gate + groundedness |
| 3 — Test RED (TDD) | 1h | Gate G6 evidence |
| 4 — Build refinement + Integration real | 8h | Coverage ≥85% + sandbox Mixpanel real |
| 5 — Few-shot + Rubric + Eval + Ship | 14h | Insumos críticos + eval + telemetria + promoção SHADOW |
| **TOTAL** | **~51h** | **3-4 dias úteis com buffer** |

## Dependências cross-wave

```
W1 (Foundation + MixpanelAdapter — adapter NOVO)
  ↓
W2 (Domain + Application + Pre-check gate)
  ↓
W3 (Test RED) — BLOQUEIA finalização Build via Gate G6
  ↓
W4 (Build refinement + Mixpanel sandbox REAL test)
  ↓
W5 (Few-shot + Rubric + Eval + Ship + promote)
```

## Gates antes de cada Wave

| Wave | Gate de entrada |
|------|-----------------|
| W2 | Wave 1 completa + smoke `countActiveUsers` retorna número real |
| W3 | Spec aprovada (✅) + plan aprovado (✅) |
| W4 | Testes RED commitados + falham localmente |
| W5 | Build completo + integration Mixpanel sandbox passa + coverage Tier B |
| Promote SHADOW | Wave 5 completa + eval pass rate ≥85% + groundedness 0% fail |

## ClickUp blueprint

> Cada task acima vira 1 card no ClickUp. ID do card = `EST-T1.1`, `EST-T1.2`, etc.

Veja `templates/clickup-blueprint.template.md` para estrutura de lists/folders.

## Próximo passo

→ Criar `eval-cases.md` (W5.T5.1 antecipado para discussão de critérios antes do build — sobretudo confidence calibration adversarial cases)
→ Criar `decisions.md` local com ADR-001-EST a ADR-004-EST
→ Iniciar Wave 1 em D11 do roadmap de 14 dias
→ Promoção `draft → SHADOW` após Wave 5
