---
sku_id: trafego-agent
sku_version: 0.1.0
project_type: agentic_saas
ai_enabled: true
criticality: B
current_stage: draft
spec_status: po_guardian_pending
spec_template_used: platform-sku-spec.template.md
created_at: 2026-05-13
last_updated: 2026-05-13
adrs_linked: [ADR-001-TF, ADR-002-TF, ADR-003-TF]
priority: P1
---

# Spec: Gestor de Tráfego Agent

## 1. Outcome contratual (C2)

### 1.1 Promessa

Entregar 1 campanha Meta publicada em ≤5 minutos:
- **1 Campaign** com objetivo definido (CONVERSIONS, LINK_CLICKS, REACH, ENGAGEMENT)
- **≥1 AdSet** com targeting completo (audience + geo + age + gender + interests OU lookalike OU custom audience)
- **3–5 Ads** variantes (A/B/C/D/E) recebendo criativo (Designer Agent) + copy (Copywriter Agent) OU input direto do cliente
- **Budget** definido (daily_budget ou lifetime_budget) com cap automático
- **Tracking ativo** via Mixpanel + Meta Conversions API (events: ViewContent, AddToCart, Purchase configurados conforme objetivo)
- **Otimização ativa** Multi-Armed Bandit (epsilon-greedy) reavaliando alocação de budget a cada 4h durante o ciclo de vida da campanha

### 1.2 Critério de aceite verificável

- [x] 1 Campaign retornada pelo Meta API com `status=ACTIVE` e `id` válido
- [x] ≥1 AdSet com targeting completo (todos campos não-nulos)
- [x] 3–5 Ads com `effective_status=ACTIVE` (não PENDING_REVIEW ou DISAPPROVED)
- [x] Budget configurado e dentro do range solicitado (±0%)
- [x] Mixpanel project recebendo eventos de teste (smoke event chega em ≤60s)
- [x] Bandit scheduler ativo (cron Lambda 4h/4h, job_id registrado)
- [x] Tempo total request → campanha ativa ≤ 300s (5 min)
- [x] Trace Langfuse com spans: strategy, targeting, creative_intake, copy_intake, meta_api_calls (×N), tracking_setup, bandit_init
- [x] Cost breakdown por span ≤ R$ 12,50 total (C3)

### 1.3 Exemplos

**Positivos (✅ contam como sucesso):**

1. Input: "Campanha CONVERSIONS para curso B2B, R$ 200/dia, público founders BR 28–45, criativo do Designer Agent, copy do Copywriter Agent"
   Output: 1 Campaign + 2 AdSets (Lookalike 1% Compradores + Interesses Empreendedorismo) + 4 Ads aprovados + Mixpanel + bandit ativo, 4m12s, custo R$ 6,80.

2. Input: "Campanha LINK_CLICKS para landing de webinar R$ 100/dia público SP-RJ 25–55, criativo pré-existente do cliente"
   Output: 1 Campaign + 1 AdSet + 3 Ads aprovados + tracking + bandit, 3m48s, custo R$ 5,90.

**Negativos (❌ não contam):**

1. Input: "Roda anúncio aí" → REJEITA pedindo briefing mínimo (objetivo, budget, público, criativo+copy).
2. Meta rejeita 3 de 4 ads por policy → executa retry com criativo alternativo; se segundo retry também falhar, escalada humana e SKU **não cobra**.
3. Setup 6m30s → falha SLA, trace `sla_violated=true`.
4. Mixpanel não recebe smoke event em 60s → falha gate de tracking, NÃO cobra até resolver.

### 1.4 Separação contratual (importante)

> **SKU cobra R$ 50 pela CRIAÇÃO + OTIMIZAÇÃO da campanha.** Ad spend (budget que vai para Meta) é **separado** e debitado direto do cartão Meta do cliente. Exemplo: cliente roda R$ 30.000/mês de spend → Novais Digital cobra R$ 50 por cada nova campanha publicada + ciclo de bandit, não percentual sobre spend.

## 2. Stack técnico (C7 — portability)

| Camada | Provedor | Adapter local |
|--------|----------|---------------|
| **Strategy + targeting** | Claude Opus 4.6 (Anthropic) | `lib/llm/claude-adapter.ts` |
| **Bandit ajustes 4h/4h** | Claude Sonnet 4.6 (mais barato) | `lib/llm/claude-adapter.ts` |
| **Ads platform** | Meta Marketing API (v19.0+) | `lib/ads-platforms/meta-adapter.ts` |
| **Tracking / attribution** | Mixpanel + Meta Conversions API | `lib/tracking/mixpanel-adapter.ts` + `meta-capi-adapter.ts` |
| **Bandit algorithm** | Epsilon-greedy (TS puro) | `src/application/bandit/epsilon-greedy.ts` |
| **Scheduler** | AWS EventBridge + Lambda | `lib/scheduler/eventbridge-adapter.ts` |
| **Telemetria** | Langfuse | `lib/observability/langfuse.ts` |
| **Domain layer** | TypeScript puro | `src/domain/campaign/` (sem deps externas) |

> **ADR-001-TF:** Multi-armed bandit usa **epsilon-greedy** (não Thompson Sampling). Motivo: epsilon-greedy é mais previsível, tem parâmetro único (ε) fácil de auditar e converge bem com baixo volume. Thompson exige conhecimento de priors e tem variância maior em campanhas pequenas. ADR documenta trade-offs.
>
> **ADR-002-TF:** Retry policy quando Meta rejeita ad por policy review: até 2 retries com criativo alternativo (gerado por Designer Agent com variação de prompt); se ambos falharem, escalação humana via Slack #ops + SKU **não cobra** o cliente.
>
> **ADR-003-TF:** Meta Marketing API adapter usa versionamento explícito (`meta-adapter-v19.ts`, `meta-adapter-v20.ts`) e feature flags por endpoint. Motivo: Meta deprecia endpoints com frequência (v17 → v18 → v19 em 18 meses). Adapter "current" é alias controlado por config.

## 3. Lifecycle (C4)

```
draft (atual, hoje 2026-05-13)
  ↓ [@po-guardian approves outcome + @unit-economist approves C3]
SHADOW (interno, ~Week 9 D1-D5)
  • 50+ campanhas criadas em conta Novais Digital própria
  • Bandit observado por 7 dias (≥3 ciclos completos)
  • Score eval médio ≥ 8/10 (gestor humano sample 10%)
  • Sem cobrança (gratuito interno)
  ↓ [convergência bandit ≥70% + zero ads PENDING após 24h]
ASSISTED (~Week 10 D6-D10)
  • Humano aprova estratégia + targeting antes de publicar
  • SLA contratual definido (300s)
  • Cobra R$ 50 com aprovação manual
  ↓ [SLA atingido 14 dias consecutivos + ROAS médio ≥ baseline humano]
AUTONOMOUS (~Week 11+)
  • Cobra R$ 50 por campanha publicada automaticamente
  • Bandit roda sem intervenção
  • Audit mensal DeepAgent + revisão humana 5% sample
```

## 4. Unit Economics (C3 — preview, detalhe em unit-economics.md)

```
Preço de venda:               R$ 50,00
Custo máximo aceitável (25%): R$ 12,50
Custo estimado realista:       R$  6,50 (13% do preço)
Margem:                       R$ 43,50 (87%)
```

> Cliente paga ad spend **separadamente** (não computado em C3 da Novais Digital).

**Ver `unit-economics.md` para breakdown completo.**

## 5. Telemetry (C6)

- **Langfuse traces:**
  - 1 trace por execução com spans: strategy, targeting, creative_intake, copy_intake, meta_api_campaign_create, meta_api_adset_create, meta_api_ads_create (×N), mixpanel_setup, bandit_init
  - 1 trace adicional por ciclo bandit (a cada 4h) com spans: insights_fetch, decision, budget_reallocation
  - Metadata: tenant_id, sku=trafego-agent, mode (shadow/assisted/autonomous), campaign_id, ad_account_id, objective, daily_budget
  - Cost breakdown por span (tokens × preço + Meta API calls + Mixpanel ingestão)

- **Métricas de negócio (Meta Ads Insights + Mixpanel):**
  - Campanhas publicadas/dia, /semana, /mês
  - Custo médio criação + custo médio bandit cycle
  - SLA achievement rate
  - ROAS médio por campanha (rolling 30d)
  - CPA médio, CTR médio
  - Rejection rate Meta (% ads recusados em 1ª submissão)
  - Bandit convergence time (h até winner estável)

- **Alertas:**
  - SLA violation (>300s) → Slack #ops
  - Meta rejection rate > 15% em 24h → Slack #ops + pausa SHADOW gate
  - Custo > R$ 12,50 em qualquer execução → Slack #finance
  - Mixpanel attribution loss > 10% → Slack #data
  - Conta Meta com warning de policy → Slack #compliance (P0)

## 6. Portability (C7)

**Camadas isoladas:**
1. **Domain** (`src/domain/campaign/`) — entidades Campaign / AdSet / Ad / Targeting / Budget, regras de negócio, zero deps externas.
2. **Application** (`src/application/`) — use cases `CreateCampaign`, `RunBanditCycle`, `HandleAdRejection`; bandit algorithm puro.
3. **Infrastructure** (`src/infrastructure/adapters/`) — Meta Marketing API, Mixpanel, Meta CAPI, EventBridge, Langfuse.

**Princípio:**
- Se trocarmos Meta por TikTok Ads, apenas `infrastructure/adapters/ads-platforms/` muda (novo `tiktok-adapter.ts`).
- Se trocarmos epsilon-greedy por Thompson Sampling, apenas `application/bandit/` muda (estratégia injetável via interface `BanditStrategy`).
- Domain e application bandit interface permanecem estáveis.

**Versionamento de adapter Meta (ADR-003-TF):**
- `meta-adapter-v19.ts` (corrente)
- `meta-adapter-v20.ts` (preparado quando Meta lançar)
- Feature flag `META_API_VERSION` em config controla alias `current`
- Testes E2E rodam em ambos durante migração

**Testes:**
- Domain testado isoladamente (Vitest unit).
- Application + bandit testado com fakes de Meta/Mixpanel adapters.
- Infrastructure testado com Meta Ads sandbox (test ad accounts) e Mixpanel test project.

## 7. Tenant context (C8)

**Fase 1 (este SKU):** single-tenant — uma Business Manager Novais Digital, um Mixpanel project.

**Fase 2 (futura):** multi-tenant via:
- `tenant_id` → `meta_ad_account_id` mapping table
- Mixpanel project por tenant (ou super-properties tenant_id)
- Bandit state isolado por tenant (Redis namespace)
- Audit trail particionado por tenant_id
- Limites de spend mensal por tenant (proteção contra erro de input)

## 8. Dependências externas

| Serviço | Criticidade | SLA conhecido | Fallback |
|---------|:----------:|---------------|----------|
| Anthropic API | 🔴 Crítica | 99.5% | — (single provider para LLM) |
| Meta Marketing API | 🔴 Crítica | ~99% (variação por região) | Retry exponencial + queue; sem fallback de plataforma fase 1 |
| Meta Conversions API | 🟡 Importante | 99% | Mixpanel browser pixel como tracking primário |
| Mixpanel | 🟡 Importante | 99.9% | Meta Insights API direto (degraded mode) |
| Designer Agent | 🟢 Não crítica | depende SKU | Aceitar criativo pré-existente do cliente |
| Copywriter Agent | 🟢 Não crítica | depende SKU | Aceitar copy pré-existente do cliente |
| AWS EventBridge | 🟡 Importante | 99.99% | Manual trigger via API |
| Langfuse | 🟢 Não crítica | 98% | Logs estruturados Pino |

## 9. ADRs vinculados

- **ADR-001-TF:** Multi-armed bandit = epsilon-greedy (não Thompson Sampling). Motivo: previsibilidade + baixa variância em campanhas low-volume.
- **ADR-002-TF:** Retry policy em rejeição Meta = 2 tentativas com criativo alternativo + escalada humana + SKU não cobra se ambos falharem.
- **ADR-003-TF:** Meta API adapter versionado por endpoint com feature flags (motivo: Meta deprecia endpoints frequentemente).

## 9.1 Insumos de calibração

- **Catálogo de interesses Meta** (`meta-interests.yaml`) — top 200 interest IDs validados para nicho founder BR.
- **Templates de copy** — vêm do Copywriter Agent (ou input cliente).
- **Templates de criativo** — vêm do Designer Agent (ou input cliente).
- **Policy compliance checklist pre-flight** (`meta-policy-check.md`) — texto sensível, claims proibidos, categorias especiais.

## 10. Aprovações necessárias

- [ ] `@po-guardian` valida outcome (Seção 1) + separação contratual fee/spend (1.4)
- [ ] `@unit-economist` valida C3 (após unit-economics.md)
- [ ] `@artifact-architect` valida abstrações (após plan.md) + adapter versioning
- [ ] Founder aprova preço R$ 50 e política de retry/no-charge em rejeição Meta
- [ ] Legal/compliance valida cláusula contratual de Special Ad Categories
