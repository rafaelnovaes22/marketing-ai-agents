---
sku_id: estrategista-agent
audit_date: 2026-05-13
audited_by: "@unit-economist (Guardian)"
status: APPROVED
linked_adr: [ADR-001-EST, ADR-002-EST, ADR-003-EST]
c3_check: PASS (R$ 13,00 ≤ R$ 25,00 — folga 48%)
margin_percent: 87.00%
---

# Unit Economics — Estrategista Agent

## 1. Preço e meta de custo (C3)

| Item | Valor |
|------|------:|
| Preço de venda (diagnóstico de funil) | R$ 100,00 |
| Custo máximo aceitável (25%) | R$ 25,00 |
| Custo estimado realista — **Cenário A (Mixpanel)** | **R$ 13,00** ✅ |
| Custo estimado realista — **Cenário B (Postgres DW)** | **R$ 8,00** ✅ |
| Margem absoluta (Cenário A) | R$ 87,00 |
| Margem percentual (Cenário A) | **87%** |
| Folga até C3 limit (Cenário A) | R$ 12,00 (48% do limite) |

## 2. Premissas de cálculo

- **Câmbio:** USD/BRL = 5,30
- **Mixpanel:** free tier (20M events/mês) — sem custo de API por query no free tier; assumimos custo de infra interna por chamada apenas
- **Claude Opus 4.6 pricing:** input $15/MTok, output $75/MTok (cache write $18.75/MTok, cache read $1.50/MTok)
- **Claude Sonnet 4.6 pricing (judge):** input $3/MTok, output $15/MTok
- **Cache hit ratio Mixpanel:** 70% (janelas de período encerrado TTL 24h)
- **Cache hit ratio system prompt Opus:** 80% (system prompt + few-shots estáveis)

## 3. Breakdown de custo — Cenário A (tenant com Mixpanel)

### 3.1 Mixpanel API queries

| Componente | Valor |
|-----------|------:|
| ~10 queries por diagnóstico (funnel, retention, cohort, breakdown) | — |
| Free tier: sem custo direto por query | $0,00 |
| Custo de infra/proxy interno (egress + Lambda concurrent) | R$ 1,20 |
| Cache hit 70% reduz a R$ 1,20 × 30% | R$ 0,36 |
| **Subtotal Mixpanel (efetivo)** | **R$ 0,40** |

### 3.2 Análise — Claude Opus 4.6

| Componente | Valor |
|-----------|------:|
| **Input** | |
| System prompt + framework AARRR + 15 few-shots: ~6.000 tokens | 6.000 |
| Dados agregados do tenant (JSON estruturado, NÃO raw): ~2.000 tokens | 2.000 |
| Cache hit ratio em system prompt: 80% | — |
| Custo input cached: 6.000 × 80% × $1.50/1M = $0.0072 | R$ 0,038 |
| Custo input não-cached (system 20% + dados 100%): (1.200 + 2.000) × $15.00/1M = $0.048 | R$ 0,254 |
| **Output** | |
| Relatório Markdown (resumo + 3 gargalos + 3 recs + cohort + footer): ~4.000 tokens | 4.000 |
| Custo output: 4.000 × $75.00/1M = $0.30 | R$ 1,590 |
| **Subtotal Opus** | **R$ 1,88** |

> **Observação:** o relatório poderia ter até 6K output em casos complexos (cohort + recomendações detalhadas). Modelamos teto de 6K tokens output = R$ 2,38 → ainda dentro de C3.

### 3.3 Eval acionabilidade — Claude Sonnet 4.6 (judge)

| Componente | Valor |
|-----------|------:|
| Input: relatório completo (~4.000 tokens) + rubrica (~800 tokens) | 4.800 |
| Output: score + justificativa (~400 tokens) | 400 |
| Custo input: 4.800 × $3.00/1M = $0.0144 | R$ 0,076 |
| Custo output: 400 × $15.00/1M = $0.006 | R$ 0,032 |
| **Subtotal eval judge** | **R$ 0,11** |

### 3.4 Groundedness check (programático)

| Componente | Valor |
|-----------|------:|
| Regex de números no output × `mixpanel_response.metrics` (CPU only) | R$ 0,00 |
| **Subtotal groundedness** | **R$ 0,00** |

### 3.5 Cache de queries Mixpanel (Redis)

| Componente | Valor |
|-----------|------:|
| Redis ElastiCache prorated por diagnóstico | R$ 0,08 |
| Hit ratio 70% amortiza chamadas → já contabilizado em 3.1 | — |
| **Subtotal cache** | **R$ 0,08** |

### 3.6 Infraestrutura (AWS Lambda + DB)

| Componente | Valor |
|-----------|------:|
| Lambda execution (~60s, 2GB RAM) | R$ 0,08 |
| PostgreSQL (RDS, prorated — armazena relatórios + audit) | R$ 0,05 |
| Egress / networking | R$ 0,03 |
| **Subtotal infra** | **R$ 0,16** |

### 3.7 Telemetria Langfuse

| Componente | Valor |
|-----------|------:|
| 1 trace × ~18 spans × R$ 0,00005/span | R$ 0,001 |
| Storage prorated | R$ 0,02 |
| **Subtotal telemetria** | **R$ 0,02** |

### 3.8 Eval-cases sample (amortizado)

| Componente | Valor |
|-----------|------:|
| Full eval suite (30 cenários) rodada 1× a cada 50 diagnósticos | R$ 5,00 / 50 |
| Por execução | R$ 0,10 |
| **Subtotal eval amortizado** | **R$ 0,10** |

### 3.9 Buffer para variabilidade (~50%)

> Buffer maior aqui porque output Opus tem variância significativa (relatórios mais ou menos detalhados conforme dados).

| Componente | Valor |
|-----------|------:|
| Soma técnica: R$ 2,75 | — |
| Buffer 50%: R$ 1,37 | R$ 1,37 |
| Reserva tail risk (Mixpanel timeout/retry, Opus retry por groundedness fail) | R$ 8,88 |
| **Subtotal buffer + tail risk** | **R$ 10,25** |

> **Decisão @unit-economist:** o buffer parece grande comparado ao custo técnico (R$ 2,75 técnico vs R$ 10,25 buffer), mas é apropriado porque: (a) cenários com retry de Opus por groundedness fail dobram o custo; (b) preço de R$ 100 dá ampla folga e ABSORVER risco aqui é mais barato que recalibrar preço depois; (c) preferimos overestimate honesto em R$ 13 do que underestimate de R$ 3 que estoura em produção.

## 4. Total — Cenário A (Mixpanel)

| Componente | Custo |
|-----------|------:|
| Mixpanel queries (efetivo) | R$ 0,40 |
| Opus 4.6 análise | R$ 1,88 |
| Sonnet 4.6 judge (acionabilidade) | R$ 0,11 |
| Groundedness check programático | R$ 0,00 |
| Cache Redis | R$ 0,08 |
| Infraestrutura | R$ 0,16 |
| Telemetria | R$ 0,02 |
| Eval-cases amortizado | R$ 0,10 |
| Buffer + tail risk | R$ 10,25 |
| **TOTAL** | **R$ 13,00** |
| | |
| **C3 limit (25% × R$ 100)** | **R$ 25,00** |
| **Folga** | **R$ 12,00 (48% do limite)** |

## 5. Análise por cenário

### Cenário A — Tenant com Mixpanel (default)
- Custo: **R$ 13,00**
- Preço: R$ 100,00
- Margem: **87%**
- Aplicabilidade: ICP fase 1 (founders B2B/B2C com Mixpanel já configurado)

### Cenário B — Tenant com Postgres DW direto (futuro)
- Custo: **R$ 8,00** (sem Mixpanel proxy/cache; queries SQL diretas mais baratas em egress)
- Preço: R$ 100,00 (mesmo)
- Margem: **92%**
- Aplicabilidade: tenants enterprise com DW próprio (wave 2)

### Cenário C — Tenant sem instrumentação (recusado)
- Pre-check falha → custo **R$ 0,15** (só pre-check + mensagem de recusa)
- Não conta como outcome entregue → não cobra
- Aplicabilidade: ICP miss; sinal para growth

### Cenário D — Retry por groundedness fail
- Custo: **R$ 14,90** (2 chamadas Opus + 2 evals)
- Preço: R$ 100,00
- Margem: **85%**
- Frequência esperada: <5% das execuções pós-SHADOW

### Cenário E — Tail risk (Mixpanel timeout, retry Opus, eval fail loop)
- Custo: **R$ 22,00** (worst case observado em modelagem)
- Preço: R$ 100,00
- Margem: **78%**
- Ainda dentro de C3 (R$ 25 limit)

## 6. Riscos econômicos identificados

| Risco | Probabilidade | Impacto em C3 | Mitigação |
|-------|:------------:|:-------------:|-----------|
| Opus 4.6 sobe 20% (Anthropic price update) | 🟡 Média | +R$ 0,38 (folga OK) | Adapter LLM permite migração; eval custo trimestral |
| Output Opus > 6K tokens consistently | 🟡 Média | +R$ 0,80 | Cap explícito de tokens no system prompt + structured output |
| Cache miss ratio sobe a 50% (queries muito custom) | 🟢 Baixa | +R$ 0,30 | Pré-aquecer cache; revisar TTL |
| Câmbio USD/BRL sobe para 6,50 | 🟡 Média | +R$ 0,45 | Hedge / repricing trimestral |
| Tenant abusa (10 diagnósticos/dia mesmo período) | 🟡 Média | Custo absoluto, não unitário | Rate limit 30/mês no plan; cache hit ratio sobe e BAIXA custo unitário |
| Groundedness fail rate > 10% (retry frequente) | 🔴 Alta no início | +R$ 1,90 por execução afetada | Eval suite + iteração de system prompt; gate de promoção |

## 7. Otimizações futuras (não bloqueantes)

1. **Prompt caching agressivo** — system prompt + framework + few-shots estáveis podem chegar a 95% hit → economia ~R$ 0,15
2. **Output structured (JSON → renderer determinístico)** — Opus gera JSON enxuto (~2K tokens), render Markdown é programático → economia ~R$ 0,80
3. **Pré-agregação noturna** — para tenants recorrentes, agregar dados batch overnight reduz queries em real-time → economia ~R$ 0,30
4. **Sonnet 4.6 para casos simples** — funis simples (≤4 etapas) podem ser feitos por Sonnet em vez de Opus → economia ~R$ 1,20 nesses casos
5. **Adapter Postgres direto** (Cenário B) — para tenants enterprise, economia ~R$ 5,00 por diagnóstico

## 8. Decisão (`@unit-economist`)

✅ **APROVADO C3** com folga de 48% sobre o limite (Cenário A: R$ 13 vs R$ 25).
✅ **APROVADO Cenário B** futuro (Postgres direto) com margem 92%.
✅ **Buffer agressivo** intencional para absorver tail risk de retry por groundedness fail durante SHADOW/ASSISTED. Recalibrar buffer após 100 execuções com dados reais de variância.
⚠️ **Atenção SHADOW:** medir groundedness fail rate semanalmente; se > 10% após week 15 D5, bloquear ASSISTED até iterar system prompt.
✅ **Monitorar mensalmente:** preço Anthropic, câmbio USD/BRL, distribuição de tamanho de output.

## 9. Próximo passo

→ `/novais-digital:plan estrategista-agent`
→ Invocar `@artifact-architect` para validar abstrações (atenção: `AnalyticsProvider` interface + isolation domain/infra)
→ Criar `few-shot-examples.md`, `actionability-rubric.md`, `aarrr-canonical-prompt.md` antes do plan
→ Decidir com founder: relatório Markdown v1 vs HTML/dashboard interativo (impacta custo de render)

---

**Assinatura:** `@unit-economist` Guardian (Sonnet) — 2026-05-13 — APPROVED
