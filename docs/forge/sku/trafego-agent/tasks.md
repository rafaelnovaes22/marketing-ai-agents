---
sku_id: trafego-agent
tasks_date: 2026-05-13
total_tasks: 38
estimated_days: 4-6
tier: B
waves: 6
priority: P1
---

# Tasks — Gestor de Tráfego Agent

> Decomposição do plan em waves executáveis. Sintaxe: **[ID] Nome — esforço — dono — deps**

## Wave 1 — Foundation (1 dia)

- [ ] **T1.1** Solicitar acesso Meta Business Manager Acme + criar test ad account sandbox — 1h — founder/dev — sem deps
- [ ] **T1.2** Provisionar Mixpanel project + token de ingestão — 30min — dev — T1.1
- [ ] **T1.3** Schema Prisma extensão (`Campaign`, `AdSet`, `Ad`, `BanditState`, `AdRejection`) — 1.5h — dev — sem deps
- [ ] **T1.4** Migrations + seed mínimo (1 ad_account fake, 1 brand) — 30min — dev — T1.3
- [ ] **T1.5** `MetaAdsAdapter` interface (`AdsPlatformProvider`) + v19 impl (`createCampaign/AdSet/Ad/insights`) — 3h — dev — T1.1
- [ ] **T1.6** `MetaAdsAdapter` v20 stub + feature flag `META_API_VERSION` + alias resolver — 1h — dev — T1.5
- [ ] **T1.7** `BanditStrategy` port + `EpsilonGreedyStrategy` (TS puro, sem LLM) + testes unit — 2h — dev — T1.3
- [ ] **T1.8** `EventBridgeAdapter` (schedule por campaign_id, payload com cron 4h) — 2h — dev — T1.1
- [ ] **T1.9** `MixpanelAdapter` (ingest + query) — 1.5h — dev — T1.2
- [ ] **T1.10** `MetaCAPIAdapter` (S2S events com deduplicação por event_id) — 1.5h — dev — T1.1
- [ ] **T1.11** Smoke test: cria campanha em sandbox Meta e deleta — 30min — dev — T1.5
- [ ] **T1.12** Smoke test: EventBridge dispara Lambda mock a cada 4h em dev — 30min — dev — T1.8

**Total Wave 1:** ~15h (1.5 dia útil com buffer; lead time Meta BM pode atrasar)

## Wave 2 — Domain + Application (1.5 dia)

- [ ] **T2.1** Domain: entidades `Campaign`, `AdSet`, `Ad`, `Targeting`, `Budget`, `BanditState` — 2h — dev — T1.3
- [ ] **T2.2** Domain: invariantes (`Budget.daily_budget >= MIN_META`, `Ad.creative != null`, etc.) — 1h — dev — T2.1
- [ ] **T2.3** Domain: testes unit puros (sem mock externo) — 1.5h — dev — T2.1, T2.2
- [ ] **T2.4** `CreateCampaignUseCase` (orquestra strategy Opus → adsets → ads + composição Designer/Copywriter) — 3h — dev — Wave 1
- [ ] **T2.5** `OptimizeBanditUseCase` (cron 4h: fetch insights → decision Sonnet → realloc budget) — 2.5h — dev — T1.7, T1.9
- [ ] **T2.6** `AttributionTrackingUseCase` (Mixpanel setup + Meta CAPI smoke event + dedup) — 1.5h — dev — T1.9, T1.10
- [ ] **T2.7** `HandleAdRejectionUseCase` (ADR-002-TF: 2 retries com creative alt + escalonamento Slack) — 1.5h — dev — T2.4
- [ ] **T2.8** Pre-flight compliance check Special Ad Categories (ADR-005-TF: bloqueia housing/credit/employment/política) — 1h — dev — T2.4
- [ ] **T2.9** Retry + exponential backoff em chamadas Meta API — 1h — dev — T1.5
- [ ] **T2.10** Testes integration com fakes de Meta + Mixpanel adapters — 2h — dev — T2.4, T2.5

**Total Wave 2:** ~17h (~2 dias)

## Wave 3 — Test RED (TDD-first, Forge-10)

> ⚠️ Forge-10 obriga: test_agent em mode=red gera testes ANTES de Wave 4. Operador roda `npm test` e CONFIRMA QUE FALHA.

- [ ] **T3.1** `/acme:aios-run trafego-agent --step=test --mode=red` (gera tests/trafego-agent/{unit,integration,e2e}/) — 30min — dev/agent
- [ ] **T3.2** Operador valida que testes falham (RED phase confirmada) — 15min — dev
- [ ] **T3.3** Commit do plano de testes + RED evidence — 15min — dev

**Total Wave 3:** ~1h

## Wave 4 — Build completo + Integration Tests Sandbox Meta

- [ ] **T4.1** Implementar testes RED → GREEN (itens W1/W2) — coberto em W1/W2
- [ ] **T4.2** Integration tests reais sandbox Meta: criar/deletar 5 campanhas completas — 2h — dev — Wave 2
- [ ] **T4.3** Integration test bandit cycle: dataset sintético 7 dias converge em ≤24h simulados — 1.5h — dev — T1.7
- [ ] **T4.4** Integration test Mixpanel: ingest 1k events + query agregada — 1h — dev — T1.9
- [ ] **T4.5** Integration test rejeição Meta: forçar policy violation + verificar 2 retries — 1h — dev — T2.7
- [ ] **T4.6** Lint custom: domain/campaign/ não importa `meta-adapter` (gate C7) — 30min — dev

**Total Wave 4:** ~6h

## Wave 5 — Test VERIFY + Eval-suite (0.5 dia)

- [ ] **T5.1** `/acme:aios-run trafego-agent --step=test --mode=verify` (cobertura + gaps) — 30min — agent
- [ ] **T5.2** Eval-suite: 22+ cases curados em `eval-cases.md` (já criado) — runtime — dev — eval-cases.md
- [ ] **T5.3** LLM-as-judge runner para `targeting_quality` (Claude Sonnet 4.6 + rubrica) — 1.5h — dev
- [ ] **T5.4** Bandit convergence simulator (dataset sintético determinístico) — 1.5h — dev
- [ ] **T5.5** CLI `npm run eval trafego-agent` — 30min — dev
- [ ] **T5.6** CI: workflow `forge-test` ativo para este SKU (excluir sandbox Meta em PR; rodar nightly) — 1h — dev

**Total Wave 5:** ~5h

## Wave 6 — Ship + Promoção SHADOW (1 dia)

- [ ] **T6.1** `/acme:sla-threshold trafego-agent` — definir SLA contratual 300s SETUP (não tempo Meta aprovar) — 30min — dev
- [ ] **T6.2** Telemetria Langfuse: 1 trace por setup + 1 trace por ciclo bandit + cost breakdown — 1.5h — dev
- [ ] **T6.3** Dashboard básico Mixpanel: campanhas/dia, SLA, ROAS médio, rejection rate, bandit convergence time — 2h — dev
- [ ] **T6.4** Alertas Slack: SLA violation, Meta rejection > 15%/24h, custo > R$ 12,50, Meta policy warning P0 — 1h — dev
- [ ] **T6.5** Documentação README + runbook ops + cláusula contratual ad spend separado (ADR-004-TF) — 1.5h — dev
- [ ] **T6.6** Pre-flight legal/compliance: validar cláusula Special Ad Categories OUT-OF-SCOPE (ADR-005-TF) — 30min — founder
- [ ] **T6.7** `/acme:promote trafego-agent --to=shadow` (promotion-officer assina) — 30min — agent

**Total Wave 6:** ~7.5h

## Resumo

| Wave | Esforço | Cobertura |
|------|--------:|-----------|
| 1 — Foundation | 15h | Adapters Meta v19/v20 + Bandit port + EventBridge + Mixpanel/CAPI |
| 2 — Domain + Application | 17h | 3 use cases principais + retry rejeição + pre-flight compliance |
| 3 — Test RED (TDD) | 1h | Gate G6 evidence |
| 4 — Build + Integration | 6h | Sandbox Meta + bandit convergence + Mixpanel ingest |
| 5 — Test VERIFY + Eval | 5h | Eval-suite 22+ casos + CI |
| 6 — Ship + Promoção | 7.5h | SLA + telemetria + alertas + SHADOW |
| **TOTAL** | **~51h** | **4-6 dias úteis com buffer** |

## Dependências cross-wave

```
W1 (Foundation) — Lead time Meta BM crítico
  ↓
W2 (Domain + Application)
  ↓
W3 (Test RED) — BLOQUEIA Build via Gate G6
  ↓
W4 (Build + Integration Sandbox Meta)
  ↓
W5 (Test VERIFY + Eval — bandit convergência + LLM judge targeting)
  ↓
W6 (Ship + promote SHADOW)
```

## Gates antes de cada Wave

| Wave | Gate de entrada |
|------|-----------------|
| W1 | Spec + unit-economics aprovados (✅) |
| W2 | Wave 1 completa + smoke sandbox Meta passa |
| W3 | Plan aprovado por `@artifact-architect` (✅) |
| W4 | Testes RED commitados + falham localmente |
| W5 | Build completo + integration tests sandbox passam |
| W6 | Eval pass rate ≥85% + coverage Tier B + LLM-judge targeting ≥7/10 |

## ClickUp blueprint

> Cada task acima vira 1 card no ClickUp. ID do card = `TF-T1.1`, `TF-T1.2`, etc.

## Riscos das tasks

- **T1.1 (lead time Meta BM):** pode levar 2-5 dias úteis para Meta aprovar BM e criar test ad account. **Mitigação:** executar T1.1 hoje mesmo (D7), em paralelo com outros SKUs.
- **T4.2 (sandbox Meta rate limit):** 5 campanhas reais consomem rate. **Mitigação:** rodar em nightly, não em todo PR.
- **T2.4 (composição Designer/Copywriter):** dependência cross-SKU. **Mitigação:** aceitar criativo+copy do cliente como fallback se SKUs não estão prontos.

## Próximo passo

→ Iniciar T1.1 + T1.2 imediatamente (lead time)
→ Em paralelo, criar `eval-cases.md` e `decisions.md` (W5/governança)
→ Promoção `draft → SHADOW` após Wave 6
