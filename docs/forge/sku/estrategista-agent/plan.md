---
sku_id: estrategista-agent
plan_date: 2026-05-13
audited_by: "@artifact-architect (Guardian)"
status: APPROVED
plan_template: aios-tdd-first (Forge-10)
implementation_window_days: 3-4
tier: B
priority: P2
target_implementation_week: 15
---

# Plan Técnico — Estrategista Agent

## 1. Resumo executivo

**3-4 dias úteis** de implementação (semana 15, dias D11-D12 do roadmap de 14 dias + buffer):

1. **Foundation** (1 dia) — MixpanelAdapter (read-only) + abstrações + cache Redis + setup Opus 4.6
2. **Core** (1.5 dias) — AnalyzeFunnelUseCase + GenerateRecommendationsUseCase + GenerateReportUseCase + Pre-check gate
3. **Test RED + Eval** (0.5 dia) — eval-cases 22+ cenários (incluindo data quality + adversariais de confidence)
4. **Ship** (1 dia) — actionability rubric + few-shots + groundedness checker + SLA threshold + telemetria

**Pipeline:** `spec → schema → test(red) → build → test(verify) → review`

**Característica única deste SKU vs social-media-agent:**
- **Read-only** (sem efeito colateral em sistemas do tenant) → autonomia mais simples de promover
- **Pre-check de qualidade de dados é gate constitucional** — bloqueia ANTES de gastar tokens Opus
- **Adapter analítico NOVO no projeto:** `MixpanelAdapter` (read-only). Postgres como Cenário B futuro.

## 2. Arquitetura (3 camadas — C7)

```
┌─────────────────────────────────────────────────────────────┐
│  src/domain/funnel/                                          │
│  Entidades puras AARRR (zero deps externas)                  │
│  • Funnel (Acquisition→Activation→Revenue→Retention→Referral)│
│  • Cohort (period, segment, metrics)                         │
│  • Bottleneck (etapa, drop_pp, causa_provavel, impact_score) │
│  • Recommendation (acao, kpi_alvo, baseline, impacto, effort)│
│  • Confidence (alta / média / baixa) — ADR-002-EST           │
│  • DataQualityCheck (≥30d, ≥100 users) — ADR-003-EST         │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  src/application/diagnose-funnel/                            │
│  Use cases, orquestra adapters                               │
│  • PreCheckDataQualityUseCase   (GATE — antes de Opus)       │
│  • AnalyzeFunnelUseCase          (orquestra Mixpanel queries)│
│  • GenerateRecommendationsUseCase(Opus 4.6 + few-shots)      │
│  • GenerateReportUseCase         (Markdown renderer + footer)│
│  • CheckGroundednessUseCase      (regex números × API)       │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  src/infrastructure/adapters/                                │
│  • analytics/mixpanel-adapter.ts        (NOVO — JQL API)     │
│  • analytics/postgres-adapter.ts        (Cenário B — stub W2)│
│  • llm/claude-adapter.ts                (Opus 4.6 reuso)     │
│  • eval/actionability-judge.ts          (Sonnet 4.6)         │
│  • cache/mixpanel-cache.ts              (Redis TTL 24h)      │
│  • observability/langfuse-adapter.ts    (reuso de social-md) │
└─────────────────────────────────────────────────────────────┘
```

**Princípio C7:** trocar Mixpanel → Amplitude/GA4 = trocar `mixpanel-adapter.ts`. Domain `src/domain/funnel/` NUNCA importa `mixpanel-node`.

## 3. Adapters NOVOS (foco do plano)

### 3.1 MixpanelAdapter (read-only) — `lib/analytics/mixpanel-adapter.ts`

**Interface canônica (port em `src/domain/funnel/ports/AnalyticsProvider.ts`):**

```typescript
interface AnalyticsProvider {
  // Pre-check de qualidade
  countActiveUsers(tenantId: string, periodDays: number): Promise<number>;
  countEventDays(tenantId: string): Promise<number>;

  // Queries AARRR
  queryFunnel(tenantId: string, steps: string[], periodDays: number): Promise<FunnelResult>;
  queryRetention(tenantId: string, cohortBy: 'day' | 'week' | 'month', periodDays: number): Promise<RetentionMatrix>;
  queryCohorts(tenantId: string, segmentBy: string, periodDays: number): Promise<CohortBreakdown>;
  queryEventCounts(tenantId: string, events: string[], periodDays: number): Promise<Record<string, number>>;
  queryRevenue(tenantId: string, periodDays: number): Promise<RevenueMetrics>;
}
```

**Queries comuns (10 chamadas típicas por diagnóstico):**

| Query | Mixpanel endpoint | Cache TTL |
|-------|-------------------|:---------:|
| `countActiveUsers` | `/api/2.0/engage` (count) | 1h |
| `countEventDays` | `/api/2.0/events` (min/max date) | 24h |
| `queryFunnel` AARRR 5 etapas | JQL custom (funnel) | 24h se período encerrado / 1h se inclui hoje |
| `queryRetention` D7/D30 | `/api/2.0/retention` | 24h |
| `queryCohorts` por canal | JQL (group by utm_source) | 24h |
| `queryEventCounts` (Activation events) | `/api/2.0/events` | 24h |
| `queryRevenue` (sum revenue prop) | JQL custom | 24h |

**SDK:** `mixpanel-node` oficial (npm) + wrapper para JQL custom (fetch direto). Token de service account por tenant (fase 2 multi-tenant).

**Read-only enforcement:** o adapter NUNCA chama `track`/`import`/`update`. Apenas leitura. Auditável por lint custom (não exportar funções de escrita do SDK).

### 3.2 PostgresAnalyticsAdapter (fallback futuro — wave 2)

**Status no plan atual:** apenas o port `AnalyticsProvider` é implementado; arquivo `lib/analytics/postgres-adapter.ts` fica como STUB (lança `NotImplementedError`). Implementação real em wave 2 após primeiro tenant enterprise pedir.

**Por que o stub agora:** garantir mecanicamente que o domain está abstraído e o swap é possível (C7 verificável).

### 3.3 Cache Mixpanel — `lib/cache/mixpanel-cache.ts`

- Redis (ElastiCache)
- TTL **24h** para janelas de período encerrado (ex: "últimos 30 dias terminando ontem")
- TTL **1h** para janelas que incluem hoje (dados em movimento)
- Hit ratio alvo: **≥70%** (premissa do unit-economics)
- Key: `mxp:{tenant_id}:{query_hash}:{period_start}:{period_end}`

## 4. Use cases (foco do plano)

### 4.1 PreCheckDataQualityUseCase — **GATE CONSTITUCIONAL (ADR-003-EST)**

> ⚠️ **Roda ANTES de qualquer chamada Opus.** Bloqueio early — economiza tokens em tenants sem dados.

**Lógica:**
```
1. AnalyticsProvider.countEventDays(tenantId) → days
2. AnalyticsProvider.countActiveUsers(tenantId, periodDays) → users
3. IF days < 30 OR users < 100:
     return { status: 'rejected', reason: '...mensagem amigável...' }
4. IF tenant tem >5 eventos críticos sem tracking (Activation, Revenue, Retention):
     return { status: 'partial', warning: 'tracking incompleto: ...' }
5. ELSE: { status: 'ok', metadata: { days, users, completeness_score } }
```

**Custo:** 2 queries Mixpanel (ambas cacheáveis) = ~R$ 0,15. Se rejeita aqui, **NUNCA gasta Opus** (Cenário C do unit-economics: R$ 0,15 total).

### 4.2 AnalyzeFunnelUseCase

- Roda ~8 queries Mixpanel em paralelo (Promise.all com semaphore=4)
- Agrega resultados em JSON estruturado (NUNCA raw events) → ~2K tokens input para Opus
- Cache hit reduz custo a R$ 0,40 efetivo (premissa)

### 4.3 GenerateRecommendationsUseCase

- Chama Claude Opus 4.6 com:
  - System prompt + framework AARRR + 15 few-shots (~6K tokens, 80% cache hit)
  - Dados agregados JSON (~2K tokens, sem cache)
- Output structured: 3 gargalos + 3 recomendações (cada com confidence alta/média/baixa)
- **Honestidade C1:** se Opus não consegue 3 recs com confidence ≥ "média", entrega só 1-2 + declara "dados insuficientes para 3 recomendações confiáveis"

### 4.4 GenerateReportUseCase

- Renderer Markdown determinístico (sem LLM) a partir do JSON do Opus
- Header (tenant_id, período, framework, timestamp)
- Seções: Resumo Métricas → 3 Gargalos → 3 Recomendações → Cohort Analysis (condicional) → Footer (confidence summary + disclaimer)
- Custo: R$ 0,00 (CPU only)

### 4.5 CheckGroundednessUseCase

- Regex extrai todos os números do output Markdown
- Cross-reference com `mixpanel_response.metrics` daquele trace
- Se número não encontrado → **bloqueia entrega**, marca trace `groundedness_fail: true`
- Retry 1× com prompt reforçado ("não invente métricas; cite apenas valores do JSON de entrada")

## 5. Fase 1 — Foundation (1 dia)

| Item | Stack | Tier |
|------|-------|:----:|
| Setup TS + Vitest + reuso config do social-media-agent | TS 5.x + Vitest 1.x | A |
| Schema Prisma (`Diagnostic`, `Execution`, `MixpanelCache`, `LangfuseTrace`) | PostgreSQL 16 + Prisma 6 | B |
| Port `AnalyticsProvider` + `MixpanelAdapter` implementation | `mixpanel-node` | B |
| Mixpanel JQL helper (10 queries comuns) | fetch + Zod schemas | B |
| Cache Redis wrapper (TTL 24h/1h) | `ioredis` | A |
| Reuso `ClaudeAdapter` (Opus 4.6 mode) | Anthropic SDK | A |
| Reuso `LangfuseAdapter` | Langfuse SDK | A |
| Mixpanel SANDBOX setup (tenant fake Acme) | Mixpanel project token dev | B |

### Output esperado fim Fase 1

- ✅ `npm run typecheck` passa
- ✅ `MixpanelAdapter.countActiveUsers` retorna número real do sandbox
- ✅ Cache Redis funciona (hit/miss observável em log)
- ✅ Opus 4.6 responde teste smoke

## 6. Fase 2 — Core (1.5 dias)

### Entregáveis

| Item | Camada | Tier |
|------|--------|:----:|
| Domain: `Funnel`, `Bottleneck`, `Recommendation`, `Confidence`, `DataQualityCheck` | domain | B |
| Domain: AARRR canonical structure (5 etapas + métricas-chave por etapa) | domain | B |
| `PreCheckDataQualityUseCase` (GATE antes de Opus) | application | A |
| `AnalyzeFunnelUseCase` (~8 queries paralelas + agregação) | application | B |
| `GenerateRecommendationsUseCase` (Opus 4.6 + few-shots + structured output) | application | B |
| `GenerateReportUseCase` (renderer Markdown determinístico) | application | A |
| `CheckGroundednessUseCase` (regex + cross-ref) | application | A |
| Confidence calibration logic (alta/média/baixa por recomendação) | domain | B |

### Output esperado fim Fase 2

- ✅ `npm test:unit` ≥85% coverage (Tier B)
- ✅ End-to-end com tenant fake passa em <120s (mock Mixpanel)
- ✅ Pre-check rejeita corretamente cenários <30d/<100u

## 7. Fase 3 — Test RED + Eval (0.5 dia)

| Item | Detalhe |
|------|---------|
| `eval-cases.md` com 22+ cenários | Ver arquivo dedicado |
| Test RED via `/acme:aios-run --step=test --mode=red` | Forge-10 mandatory |
| LLM-as-judge actionability runner | Claude Sonnet 4.6 + actionability-rubric.md |
| Eval CLI `npm run eval estrategista-agent` | Roda 22 cases, salva report |

### Critérios de pass

- 22+ eval-cases (5 data quality + 12 framework + 5 confidence calibration + outros edge)
- Actionability score médio ≥ 7,5/10
- Groundedness 100% (zero alucinação)
- Pass rate ≥ 85% (≥ 19 de 22 casos)

## 8. Fase 4 — Ship (1 dia)

| Item | Stack |
|------|-------|
| `few-shot-examples.md` (15 diagnósticos curados) | YAML + Markdown |
| `actionability-rubric.md` (rubrica explícita 0-10) | Markdown |
| `aarrr-canonical-prompt.md` (system prompt completo) | Markdown + variáveis |
| Mixpanel integration test (sandbox real, não mock) | Mixpanel project DEV |
| SLA threshold (`/acme:sla-threshold estrategista-agent`) | 120s P95 |
| Telemetria Langfuse (18 spans típicos) | Langfuse SDK |
| Dashboard Mixpanel (diagnósticos/dia, custo, acionabilidade, pre-check rejection rate) | Mixpanel próprio |
| Alertas Slack (SLA, groundedness fail, custo, pre-check rejection >25%) | Slack webhook |
| Promoção draft → SHADOW (`/acme:promote`) | promotion-officer assina |

### Output esperado fim Fase 4

- ✅ Primeiro diagnóstico real publicado em SHADOW (Acme própria como tenant piloto)
- ✅ Langfuse trace completo com cost breakdown
- ✅ Cache hit ratio observável (alvo ≥70% após 10 execuções)
- ✅ Pre-check rejection rate observável (esperado 10-15%)

## 9. Workflow AIOS TDD-first (Forge-10)

```bash
# 1. Spec validada ✅
@po-guardian valida spec.md
@unit-economist valida unit-economics.md ✅

# 2. Schema
/acme:aios-run estrategista-agent --step=schema

# 3. Test RED
/acme:aios-run estrategista-agent --step=test --mode=red
# Operador roda `npm test` → CONFIRMA QUE FALHA

# 4. Build
/acme:aios-run estrategista-agent --step=build

# 5. Test VERIFY
/acme:aios-run estrategista-agent --step=test --mode=verify

# 6. Review final
/acme:aios-run estrategista-agent --step=review
```

## 10. Gates de qualidade (Tier B)

| Gate | Onde valida | Target |
|------|-------------|:------:|
| Coverage line (unit) | CI `forge-test` | ≥ 85% |
| Coverage branch (unit) | CI `forge-test` | ≥ 80% |
| Integration tests presentes | Gate G6 (Forge-10) | ≥ 5 testes (incluindo Mixpanel sandbox real) |
| TDD red phase evidence | Gate G6 mecânico | `tests/estrategista-agent/unit/` ≥ 1 arquivo antes do build |
| Eval-suite pass rate | `/acme:eval` | ≥ 85% |
| Groundedness fail rate | Métrica Langfuse | 0% (gate constitucional) |
| Actionability score médio | LLM-as-judge | ≥ 7,5/10 |
| Pre-check rejection rate | Métrica Mixpanel | 10-15% (ICP fit) |
| Cache hit ratio Mixpanel | Métrica Redis | ≥ 70% após 50 exec |

## 11. Riscos do plano

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| **Cada tenant tem schema Mixpanel diferente** (event names, properties) — calibração | 🔴 Alta | +1-2 dias por tenant novo | Mapeamento por tenant em `config/tenants/{id}/event-mapping.yaml`; Wave 5 inclui template + guideline |
| Mixpanel JQL custom timeout em queries pesadas | 🟡 Média | SLA violado | Limit `where` clauses + paginação + cache agressivo |
| Opus 4.6 retorna recs sem confidence calibrada (sempre "alta") | 🟡 Média | Honestidade comprometida | Few-shots adversariais que FORÇAM low/medium em data sparse |
| Groundedness fail rate > 10% no início | 🔴 Alta no SHADOW | Custo retry sobe | Prompt reinforcement loop; eval gate antes de ASSISTED |
| Tenant abusa rate limit Mixpanel free tier | 🟢 Baixa | Custo absoluto | Rate limit 30 diagnósticos/mês por tenant |
| Domain importa SDK Mixpanel por engano | 🟡 Média | Quebra C7 | Hook `any-sdk-in-domain` + revisão manual PR |
| **Total buffer recomendado** | | **+1.5 dias** | Plano comporta 4-5 dias realistas |

## 12. Decisão (`@artifact-architect`)

✅ **APROVADO** — adapter pattern garantido (C7), camadas isoladas, TDD-first respeitado, port `AnalyticsProvider` permite swap Mixpanel↔Postgres↔Amplitude.
✅ **Pre-check gate** corretamente posicionado ANTES de Opus — economia significativa (Cenário C R$ 0,15 vs Cenário A R$ 13).
✅ **Read-only enforcement** auditável mecanicamente (lint custom em adapter).
⚠️ **Atenção:** few-shots adversariais para calibração de confidence são CRÍTICOS — falha em fazê-los compromete ADR-002-EST.
⚠️ **Risco de tenant-specific schema mapping** — não subestimar Wave 1 (sandbox setup + event mapping leva tempo).

## 13. Próximo passo

→ `/acme:tasks estrategista-agent` (decomposição em 5 Waves)
→ Iniciar Wave 1 em D11 do roadmap de 14 dias
→ Criar few-shot-examples.md, actionability-rubric.md, aarrr-canonical-prompt.md ANTES do build (insumos críticos)

---

**Assinatura:** `@artifact-architect` Guardian (Sonnet) — 2026-05-13 — APPROVED
