---
sku_id: trafego-agent
plan_date: 2026-05-13
audited_by: "@artifact-architect (Guardian)"
status: APPROVED
plan_template: aios-tdd-first (Forge-10)
implementation_window_days: 4
tier: B
priority: P1
adrs_linked: [ADR-001-TF, ADR-002-TF, ADR-003-TF, ADR-004-TF, ADR-005-TF]
---

# Plan Técnico — Gestor de Tráfego Agent

## 1. Resumo executivo

**~4 dias úteis** seguindo pipeline AIOS TDD-first (Forge-10):

1. **Foundation** (1 dia) — MetaAdsAdapter versionado (v19/v20) + BanditStrategy port + CRON EventBridge + adapters Mixpanel/CAPI
2. **Core** (1.5 dias) — 3 use cases (CreateCampaign / OptimizeBandit 4h / AttributionTracking) + composição com Designer/Copywriter
3. **Eval + Sandbox Meta** (0.5 dia) — eval-suite 22+ casos + testes integration sandbox Meta
4. **Ship** (1 dia) — SLA threshold + telemetria Langfuse completa + alertas + promoção `draft → SHADOW`

**Pipeline:** `spec → schema → test(red) → build(back+jobs) → test(verify) → review`

**Risco crítico identificado pelo `@artifact-architect`:**
> Meta Marketing API muda 1–2× por ano (versão deprecada). Adapter precisa ser **versionado por arquivo** com feature flag de seleção runtime (ADR-003-TF). Não é overengineering — é mitigação contratual.

## 2. Arquitetura (3 camadas — C7)

```
┌─────────────────────────────────────────────────────────────────┐
│  src/domain/campaign/                                            │
│  Entidades puras, sem deps externas                              │
│  • Campaign (objective, status, budget, dates)                   │
│  • AdSet (targeting, daily_budget, optimization_goal)            │
│  • Ad (creative, copy, status, effective_status)                 │
│  • Targeting (audience, geo, age, gender, interests, lookalike)  │
│  • Budget (daily | lifetime, cap, currency)                      │
│  • BanditState (variants, allocations, conversions, last_cycle)  │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│  src/application/trafego-agent/                                  │
│  Use cases, orquestra domain                                     │
│  • CreateCampaignUseCase    (composição Designer+Copywriter)     │
│  • OptimizeBanditUseCase    (cron 4h, realoca budget)            │
│  • AttributionTrackingUseCase (Mixpanel + Meta CAPI)             │
│  • HandleAdRejectionUseCase (retry 2x + escalonamento)           │
│  + BanditStrategy port (epsilon-greedy é uma implementação)      │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│  src/infrastructure/adapters/                                    │
│  Adapters para SDKs externos (com versionamento)                 │
│  • llm/claude-adapter.ts (Opus strategy + Sonnet bandit)         │
│  • ads-platforms/meta-adapter-v19.ts                             │
│  • ads-platforms/meta-adapter-v20.ts                             │
│  • ads-platforms/meta-adapter.ts (alias por feature flag)        │
│  • tracking/mixpanel-adapter.ts                                  │
│  • tracking/meta-capi-adapter.ts                                 │
│  • scheduler/eventbridge-adapter.ts                              │
│  • bandit/epsilon-greedy-strategy.ts (implementa port)           │
│  • observability/langfuse-adapter.ts                             │
└─────────────────────────────────────────────────────────────────┘
```

**Princípio C7:**
- Trocar Meta por TikTok Ads = criar `ads-platforms/tiktok-adapter.ts`.
- Trocar epsilon-greedy por Thompson Sampling = criar `bandit/thompson-strategy.ts` (mesma `BanditStrategy` interface).
- Domain `src/domain/campaign/` **NUNCA** importa SDK externo nem Meta API.

## 3. Adapters NOVOS necessários (não existem ainda no monorepo)

| Adapter | Por quê NOVO | Tier | Estimativa |
|---------|--------------|:----:|-----------:|
| `meta-adapter-v19.ts` + `v20.ts` | Primeiro SKU que usa Meta Marketing API | B | 6h |
| `BanditStrategy` port + `epsilon-greedy` impl | Primeira instância de bandit no projeto | B | 4h |
| `eventbridge-adapter.ts` | Primeiro SKU com CRON contínuo (4h/4h) | B | 2h |
| `mixpanel-adapter.ts` | Primeiro SKU com attribution tracking | B | 3h |
| `meta-capi-adapter.ts` | Conversions API server-to-server | B | 2h |

**Reuso:** `claude-adapter.ts` e `langfuse-adapter.ts` já existem (foram criados no `social-media-agent`).

## 4. Fase 1 — Foundation (1 dia)

### Entregáveis

| Item | Stack | Tier |
|------|-------|:----:|
| Schema Prisma extensão (`Campaign`, `AdSet`, `Ad`, `BanditState`, `AdRejection`) | PostgreSQL 16 + Prisma 6 | B |
| `MetaAdsAdapter` interface + v19 impl (create_campaign / adset / ad / insights) | Meta Marketing API v19 | B |
| `MetaAdsAdapter` v20 stub (placeholder para upgrade futuro) | Meta Marketing API v20 | B |
| Feature flag `META_API_VERSION` em config + alias resolver | TS config | A |
| `BanditStrategy` port + `EpsilonGreedyStrategy` (TS puro, sem LLM) | TS puro | A |
| `EventBridgeAdapter` (schedule 4h/4h por campaign_id) | AWS EventBridge SDK | B |
| `MixpanelAdapter` (ingest events + query insights) | Mixpanel SDK | B |
| `MetaCAPIAdapter` (server-to-server events com deduplicação) | Meta CAPI REST | B |
| Sandbox Meta test ad account configurado | Meta Business Manager | A |

### Output esperado fim Fase 1

- `npm run typecheck` passa
- Smoke test: cria campanha em sandbox Meta e a deleta (sem custo)
- EventBridge dispara Lambda mock a cada 4h em ambiente dev
- `EpsilonGreedyStrategy.choose()` retorna variante esperada em dataset sintético

## 5. Fase 2 — Core (1.5 dias)

### Entregáveis

| Item | Camada | Tier |
|------|--------|:----:|
| Domain: entidades + invariantes (ex: `Budget.daily_budget >= MIN_META`) | domain | B |
| `CreateCampaignUseCase` (strategy Opus → targeting → adsets → 3–5 ads) | application | B |
| Composição: recebe `creative` do Designer Agent + `copy` do Copywriter Agent OU input direto cliente | application | B |
| `OptimizeBanditUseCase` (cron 4h: fetch insights → decision → realloc budget) | application | B |
| `AttributionTrackingUseCase` (Mixpanel setup + Meta CAPI smoke event) | application | B |
| `HandleAdRejectionUseCase` (ADR-002-TF: 2 retries com creative alt + escalonamento) | application | B |
| Pre-flight compliance check (Special Ad Categories block — ADR-005-TF) | application | A |
| Retry + exponential backoff em chamadas Meta API | infrastructure | A |

### Composição com Designer/Copywriter (workflow)

```
Cliente: "Campanha CONVERSIONS R$ 200/dia público founders BR 28-45"
    ↓
CreateCampaignUseCase.execute(briefing)
    ├─→ Strategy (Claude Opus): define objetivo, 2 adsets, 4 variantes
    ├─→ Designer Agent (cross-SKU call): gera 4 criativos brand-aligned
    ├─→ Copywriter Agent (cross-SKU call): gera 4 copies + headlines
    ├─→ MetaAdsAdapter.createCampaign(...)
    ├─→ MetaAdsAdapter.createAdSet(...) × 2
    ├─→ MetaAdsAdapter.createAd(creative_id, copy_id) × 4
    ├─→ AttributionTrackingUseCase.setup(campaign_id)
    └─→ EventBridge schedule (4h/4h por 7 dias)
```

**Importante:** se Designer/Copywriter falharem, aceitar criativo+copy pré-existente do cliente como input alternativo (sem violar SLA).

### Output esperado fim Fase 2

- `npm test:unit` passa (coverage ≥85% Tier B)
- Geração end-to-end em sandbox Meta com 1 campanha completa em ≤5min (com mock LLM para previsibilidade)
- Bandit converge em dataset sintético com 100 conversões em ≤4 ciclos

## 6. Fase 3 — Eval + Sandbox (0.5 dia)

### Entregáveis

| Item | Detalhe |
|------|---------|
| `eval-cases.md` com 22+ cenários | Setup, otimização bandit, rejeição Meta, targeting, edge cases |
| LLM-as-judge runner para `targeting_quality` | Claude Sonnet 4.6 com rubrica |
| Convergência bandit eval (dataset sintético 7 dias) | Simulação determinística |
| Eval CLI (`npm run eval trafego-agent`) | Roda todos cases, salva resultado |
| Integration tests sandbox Meta (criar/deletar 5 campanhas reais) | Meta test ad account |

### Critérios de pass

- 22+ eval-cases
- Pass rate ≥ 85%
- Critical path cases (5): 100% pass
- Bandit converge ≥ 70% dos cenários em ≤24h
- Targeting quality LLM-judge ≥ 7/10 médio

## 7. Fase 4 — Ship (1 dia)

### Entregáveis

| Item | Stack |
|------|-------|
| SLA threshold definido (`/acme:sla-threshold` — 300s SETUP, não tempo Meta aprovar) | Documento + workflow |
| Telemetria Langfuse completa (1 trace setup + 1 trace por ciclo bandit) | Langfuse SDK |
| Dashboard básico Mixpanel (campanhas/dia, SLA, ROAS médio, rejection rate) | Mixpanel |
| Alertas Slack (SLA, rejection > 15%, custo > R$ 12,50, Meta warning de policy) | Slack webhook |
| Documentação runbook ops + cláusula contratual ad spend separado | Markdown |
| Promoção `draft → SHADOW` (`/acme:promote`) | promotion-officer assina |

### Output esperado fim Fase 4

- Eval-suite roda em CI
- Primeira campanha publicada em SHADOW (conta Acme própria, sem cobrar)
- Langfuse mostra trace completo + custo breakdown
- Bandit cycle 1 dispara automaticamente em t=4h

## 8. Workflow AIOS TDD-first (Forge-10)

```bash
# 1. Spec + unit-economics aprovados (✅)
# 2. Schema Prisma (extensão)
/acme:aios-run trafego-agent --step=schema

# 3. Test RED (testes antes do código)
/acme:aios-run trafego-agent --step=test --mode=red

# 4. Build
/acme:aios-run trafego-agent --step=build

# 5. Test VERIFY
/acme:aios-run trafego-agent --step=test --mode=verify

# 6. Review final
/acme:aios-run trafego-agent --step=review
```

## 9. Gates de qualidade (Tier B)

| Gate | Onde valida | Target |
|------|-------------|:------:|
| Coverage line (unit) | CI `forge-test` | ≥ 85% |
| Coverage branch (unit) | CI `forge-test` | ≥ 80% |
| Integration tests presentes | Gate G6 | ≥ 5 testes (incl. sandbox Meta) |
| TDD red phase evidence | Gate G6 mecânico | `tests/trafego-agent/unit/` ≥ 1 arquivo antes do build |
| Eval-suite pass rate | `/acme:eval` | ≥ 85% |
| Bandit convergência (synthetic) | Eval | ≥ 70% cenários em ≤24h |
| Targeting quality (LLM-judge) | Métrica Langfuse | ≥ 7/10 médio |
| SLA setup time | Métrica Langfuse | ≤ 300s p95 |
| Meta API isolation (C7) | Mecânico (lint custom) | `domain/` zero imports `meta-adapter` |

## 10. Riscos do plano

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **Meta API quebra durante implementação (v19 → v20 breaking)** | +1-2 dias | ADR-003-TF: ambos adapters lado a lado + feature flag |
| Sandbox Meta ad account demora a ser provisionada (Business Manager) | +0.5 dia | Solicitar acesso no D1 (paralelo) |
| Designer/Copywriter Agent ainda em SHADOW → atrasos na composição | +0.5 dia | Aceitar criativo+copy hardcoded do cliente como fallback |
| Bandit dataset sintético não representa volume real (campanha low-volume) | Eval falsa-positiva | Documentar limitação; complementar com 7 dias SHADOW real |
| EventBridge → Lambda IAM permissions incorretas | +0.5 dia | Terraform/CDK pronto antes; rodar smoke no D1 |
| Custo Meta CAPI dedup quebra (eventos duplicados em Mixpanel) | Eval invalid | Eval-case dedicado (Case 19); deduplicação por `event_id` |
| Cliente confunde fee SKU R$ 50 com ad spend Meta | Disputa | ADR-004-TF: separação contratual explícita |
| **Total buffer recomendado** | **+1.5 dias** | Plano comporta 4–6 dias úteis realistas |

## 11. Honestidade sobre SLA (importante)

> O SLA contratual de **5 minutos** mede **tempo de SETUP** (request → campanha publicada com `status=ACTIVE` no Meta).
> **NÃO mede** quanto Meta demora para fazer `policy_review` (pode ser 0s a 24h, fora do controle Acme).
> Ads que entram em `PENDING_REVIEW` são contabilizados como entregues; rejeições disparam ADR-002-TF.

## 12. Decisão (`@artifact-architect`)

✅ **APROVADO** — adapter pattern com versionamento Meta é mecanismo correto de mitigação contratual (C7).
✅ **BanditStrategy port** é abstração correta; epsilon-greedy é implementação substituível (Thompson em fase 2 se métricas justificarem).
✅ **Camadas isoladas** — domain `src/domain/campaign/` zero imports de SDK externo.
⚠️ **Atenção:** garantir que `meta-adapter.ts` (alias) NÃO seja importado por domain; apenas application via DI.
⚠️ **Atenção:** integration tests em sandbox Meta consomem rate limit — não rodar em todo PR (apenas main/nightly).

## 13. Próximo passo

→ `/acme:tasks trafego-agent` (decomposição em waves)
→ Iniciar Fase 1 no D7 do roadmap (paralelo a vídeo/estrategista nas waves posteriores)
→ Solicitar acesso Meta Business Manager + Mixpanel project **HOJE** (lead time)

---

**Assinatura:** `@artifact-architect` Guardian (Sonnet) — 2026-05-13 — APPROVED
