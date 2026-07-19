---
sku_id: estrategista-agent
sku_version: 0.1.0
project_type: agentic_saas
ai_enabled: true
criticality: B
current_stage: draft
spec_status: po_guardian_pending
spec_template_used: platform-sku-spec.template.md
created_at: 2026-05-13
last_updated: 2026-05-13
adrs_linked: [ADR-001-EST, ADR-002-EST, ADR-003-EST]
priority: P2
---

# Spec: Estrategista Agent

## 1. Outcome contratual (C2)

### 1.1 Promessa

Entregar 1 **relatório executivo de diagnóstico de funil** em ≤2 min contendo:
- **Resumo de métricas-chave** AARRR para o período: CAC, LTV (quando disponível), Conversion Rate por etapa, Retention D7/D30, Churn mensal.
- **3 gargalos identificados**, priorizados por matriz **impacto × esforço** (alto impacto + baixo esforço primeiro).
- **3 recomendações acionáveis**, cada uma contendo: (a) ação concreta, (b) baseline atual com número, (c) KPI alvo após implementação, (d) estimativa de impacto (% ou absoluto), (e) effort estimate (S/M/L).
- **Cohort analysis** auto-gerada quando o framework detecta relevância (ex: variação retention entre cohorts mensais > 15 p.p.).
- **Confidence interval** explícito por recomendação (alta / média / baixa) — ver ADR-002-EST.

### 1.2 Critério de aceite verificável

**Input contratual:**
```json
{
  "tenant_id": "uuid",
  "period_days": 30,                    // default 30; range [30, 180]
  "framework": "AARRR",                 // default AARRR; futuro: HEART, Pirate
  "output_format": "markdown"           // v1: markdown; v2: html
}
```

**Output contratual (Markdown):**
- [x] Header com tenant_id, período analisado, framework usado, timestamp
- [x] Seção "Resumo de Métricas" (≥5 métricas-chave com baseline numérico)
- [x] Seção "3 Gargalos Priorizados" (cada um com etapa do funil, magnitude do drop-off, causa provável)
- [x] Seção "3 Recomendações Acionáveis" (cada uma com ação + baseline + KPI alvo + impacto estimado + effort)
- [x] Seção "Cohort Analysis" (presente OBRIGATORIAMENTE se variação inter-cohort > 15 p.p.; senão "não relevante para este período")
- [x] Footer com confidence summary + disclaimer

**Gates de qualidade:**
- [x] **Groundedness 100%**: toda métrica citada está em `mixpanel_response.metrics` daquele trace (validado por checker programático que faz regex de números no output × valores da API)
- [x] **Acionabilidade ≥ 7/10** (LLM-as-judge com rubrica explícita)
- [x] **Tempo total** request → arquivo entregue ≤ 120s
- [x] **Pre-check passa**: ≥30 dias de dados, ≥100 usuários ativos no período
- [x] **Trace Langfuse** com cost breakdown, latência por span, scores eval

### 1.3 Exemplos

**Positivos (✅ contam como sucesso):**

1. Input: `{tenant_id: "saas-b2b-001", period_days: 30}`
   Output: Relatório identifica drop-off Sign-up→Activation (44%), recomenda redução de 7 passos do onboarding para 3 com KPI alvo +25pp activation rate (baseline 56%), inclui cohort breakdown por canal de aquisição (paid vs organic). 1m48s. Groundedness 100%, acionabilidade 8.3/10.

2. Input: `{tenant_id: "ecom-002", period_days: 90}`
   Output: Aponta churn em repeat purchase (87% não volta em 60d), recomenda loyalty program com 3x repeat rate em 90d, cita cohort jan-mar 2026 como baseline (28% repeat). 1m52s. Groundedness 100%, acionabilidade 7.8/10.

**Negativos (❌ não contam):**

1. Tenant 12 dias / 80 usuários → REJEITA com mensagem explícita; não tenta análise parcial.
2. Relatório com 3 recomendações genéricas ("melhore retention") sem KPI alvo → falha gate de acionabilidade, agente refaz com prompt reforçado OU declara "dados insuficientes para 3 recomendações confiáveis" e entrega 1-2.
3. 3m20s total → falha SLA; trace marcado `sla_violated=true`.
4. Opus cita "CAC R$ 47" mas API não retornou CAC → falha groundedness; gate bloqueia entrega.

## 2. Stack técnico (C7 — portability)

| Camada | Provedor | Adapter local |
|--------|----------|---------------|
| **Analytics source (primário)** | Mixpanel JQL API | `lib/analytics/mixpanel-adapter.ts` |
| **Analytics source (futuro)** | Amplitude / GA4 / Postgres DW | `lib/analytics/*-adapter.ts` (wave 2) |
| **Análise + raciocínio** | Claude Opus 4.6 (Anthropic) | `lib/llm/claude-adapter.ts` |
| **Framework de análise** | AARRR canônico | `src/domain/funnel/aarrr.ts` |
| **Eval acionabilidade** | Claude Sonnet 4.6 (LLM-as-judge) | `lib/eval/actionability-judge.ts` |
| **Cache de queries** | Redis (TTL 24h em janelas encerradas) | `lib/cache/mixpanel-cache.ts` |
| **Telemetria** | Langfuse | `lib/observability/langfuse.ts` |
| **Domain layer** | TypeScript puro | `src/domain/funnel/` (sem deps externas) |

> **ADR-002-EST:** Adapter pattern com `AnalyticsProvider` interface. Trocar Mixpanel por Amplitude = trocar `mixpanel-adapter.ts` sem tocar domain.

## 3. Lifecycle (C4)

```
draft (atual, 2026-05-13)
  ↓ [@po-guardian approves outcome + @unit-economist approves C3]
SHADOW (semana 15, ~D1-D5)
  • 30+ diagnósticos rodados em tenants piloto (incluindo Novais Digital própria)
  • Eval groundedness 100%, acionabilidade ≥ 7/10
  • Sem cobrança
  ↓ [eval pass rate ≥90% + revisão humana 20% sample]
ASSISTED (semana 15-16, ~D6-D14)
  • Founder/analista valida cada relatório antes de enviar ao tenant
  • Coleta feedback de utilidade (NPS interno ≥ 8/10)
  ↓ [acurácia recomendações ≥ 80% em 14 dias consecutivos]
AUTONOMOUS (semana 16+)
  • Cobra R$ 100 por diagnóstico entregue
  • Audit mensal DeepAgent
  • Read-only: risco operacional baixo facilita autonomia
```

## 4. Unit Economics (C3 — preview, detalhe em unit-economics.md)

```
Preço de venda:                R$ 100,00
Custo máximo aceitável (25%):  R$  25,00
Custo estimado realista:       R$  13,00  (Cenário A — Mixpanel)
Custo estimado realista:       R$   8,00  (Cenário B — Postgres direto)
Margem A:                      R$  87,00  (87%)
Margem B:                      R$  92,00  (92%)
```

**Ver `unit-economics.md` para breakdown completo de tokens, queries, cache.**

## 5. Telemetry (C6)

- **Langfuse traces:**
  - 1 trace por execução com spans: `pre_check` → `mixpanel_queries` (×~10) → `aggregation` → `opus_analysis` → `actionability_eval` → `groundedness_check` → `output_render`
  - Metadata: `tenant_id`, `sku=estrategista-agent`, `mode (shadow/assisted/autonomous)`, `period_days`, `framework`, `dataset_size`
  - Cost breakdown por span (Mixpanel queries + Opus tokens + cache hit ratio)
  - Latência por span (target P95: Mixpanel <60s, Opus <40s, total <120s)

- **Métricas de negócio:**
  - Diagnósticos/dia, /semana, /mês
  - Custo médio, custo P99
  - Acionabilidade média (LLM-as-judge)
  - Groundedness fail rate (target: 0%)
  - Pre-check rejection rate (esperado 10-15%; alto = ICP miss)
  - Tenant NPS pós-diagnóstico (coletado assíncrono)

- **Alertas:**
  - SLA > 120s → Slack #ops
  - Groundedness fail → Slack #ai-quality (bloqueador)
  - Custo > R$ 25 → Slack #finance
  - Pre-check rejection > 25% → Slack #growth (sinal de ICP miss)

## 6. Portability (C7)

**Camadas isoladas:**
1. **Domain** (`src/domain/funnel/`) — entidades (Funnel, Cohort, Recommendation, Bottleneck), regras AARRR, zero deps externas
2. **Application** (`src/application/diagnose-funnel/`) — use case, orquestra adapters
3. **Infrastructure** (`src/infrastructure/adapters/`) — `analytics/`, `llm/`, `cache/`, `eval/`

**Princípio:** trocar Mixpanel por Amplitude = trocar adapter; trocar Opus por outro modelo de reasoning = trocar adapter; nada no domain muda.

**Testes:**
- Domain testado isoladamente (Vitest unit, sem mock de API real)
- Application testado com fakes de adapters (cenários: dados suficientes, dados insuficientes, Mixpanel timeout, Opus alucina)
- Infrastructure testado com integração real (Mixpanel sandbox + tenant fake Novais Digital)
- **Eval suite** com 30 cenários curados (15 funis reais anonimizados + 15 sintéticos) — gate de promoção SHADOW → ASSISTED

## 7. Tenant context (C8)

**Fase 1 (este SKU):** single-tenant — Novais Digital própria como piloto.

**Fase 2 (multi-tenant):**
- `tenant_id` propagado em toda chamada Mixpanel (via project token por tenant)
- Cache particionado por tenant
- Rate limit por tenant (default: 30 diagnósticos/mês)
- Audit trail particionado

## 8. Dependências externas

| Serviço | Criticidade | SLA conhecido | Fallback |
|---------|:----------:|---------------|----------|
| Mixpanel JQL API | 🔴 Crítica | 99.5% | Cache 24h + degraded mode (cenário B Postgres futuro) |
| Anthropic API (Opus 4.6) | 🔴 Crítica | 99.5% | Sonnet 4.6 como degraded (qualidade menor, alerta tenant) |
| Anthropic API (Sonnet 4.6 judge) | 🟡 Importante | 99.5% | Skip eval com aviso no trace |
| Redis (cache) | 🟢 Não crítica | 99% | Bypass cache (custo sobe, SLA aperta) |
| Langfuse | 🟢 Não crítica | 98% | Logs estruturados Pino |

## 9. ADRs vinculados

- **ADR-001-EST:** **AARRR como framework canônico v1** (motivo: cobre 90% dos casos B2B/B2C SaaS e e-commerce; HEART e Pirate Metrics ficam para v2 via flag `framework` no input).
- **ADR-002-EST:** **Confidence interval explícito por recomendação** (motivo: honestidade — Opus deve declarar alta/média/baixa confiança em cada recomendação; recomendações com confiança "baixa" são marcadas com aviso, e se nenhuma das 3 atinge ≥ "média" o agente declara "dados insuficientes para 3 recomendações confiáveis").
- **ADR-003-EST:** **Pre-check de qualidade de dados como gate constitucional** (motivo: ≥30 dias E ≥100 usuários ativos no período; abaixo disso, agente recusa com mensagem em vez de tentar análise frágil — alinha com honestidade C1).

## 9.1 Insumos de calibração

- **`few-shot-examples.md`** (a criar): 15 diagnósticos curados com input (dados agregados) → output (relatório) → score esperado. Insumo CRÍTICO para system prompt do Opus.
- **`actionability-rubric.md`** (a criar): rubrica explícita 0-10 do judge para "acionabilidade" (presença de KPI alvo, baseline, effort estimate, especificidade).
- **`aarrr-canonical-prompt.md`** (a criar): system prompt completo com framework AARRR + instruções de groundedness + formato de output.

## 10. Aprovações necessárias

- [ ] `@po-guardian` valida outcome (Seção 1) + constraint de honestidade
- [ ] `@unit-economist` valida C3 (após unit-economics.md)
- [ ] `@artifact-architect` valida abstrações (após plan.md) — atenção especial ao adapter `AnalyticsProvider`
- [ ] Founder aprova preço R$ 100 e definição AARRR como framework v1
- [ ] Founder aprova trade-off "relatório Markdown v1 → HTML/dashboard v2"
