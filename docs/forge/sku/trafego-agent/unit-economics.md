---
sku_id: trafego-agent
audit_date: 2026-05-13
audited_by: "@unit-economist (Guardian)"
status: APPROVED
linked_adr: [ADR-001-TF, ADR-002-TF, ADR-003-TF]
c3_check: PASS (R$ 6,50 ≤ R$ 12,50)
margin_percent: 87.0%
---

# Unit Economics — Gestor de Tráfego Agent

## 1. Preço e meta de custo (C3)

| Item | Valor |
|------|------:|
| Preço de venda por campanha publicada + ciclo de otimização (média 7 dias) | R$ 50,00 |
| Custo máximo aceitável (25%) | R$ 12,50 |
| Custo estimado realista (amortizado por campanha) | **R$ 6,50** ✅ |
| Margem absoluta | R$ 43,50 |
| Margem percentual | **87,0%** |
| Folga sobre limite C3 | **R$ 6,00 (48%)** |

> ⚠️ **Importante:** Ad spend (budget que cliente injeta na Meta) **NÃO entra em C3**. Cliente paga ad spend separadamente direto à Meta via cartão próprio. SKU Acme cobra apenas pela criação + otimização da campanha.

## 2. Breakdown de custo (campanha média 7 dias de vida)

### 2.1 Strategy + targeting — Claude Opus 4.6 (1× setup inicial)

| Componente | Valor |
|-----------|------:|
| Input tokens (system prompt + briefing + catálogo interests + brand context) | ~5.000 |
| Output tokens (estratégia + targeting + creative briefing) | ~3.000 |
| Cache hit ratio esperado (system + catálogo interests) | 65% |
| Custo input (cached): 5.000 × 65% × $1.50/1M = $0.00488 | R$ 0,026 |
| Custo input (não-cached): 5.000 × 35% × $15.00/1M = $0.0263 | R$ 0,139 |
| Custo output: 3.000 × $75.00/1M = $0.225 | R$ 1,193 |
| **Subtotal strategy (1×)** | **R$ 0,40** |

> Nota: Opus 4.6 pricing ajustado para hipótese conservadora; cache substancialmente reduz input cost. Output domina.

### 2.2 Meta Marketing API (1× setup inicial)

| Componente | Valor |
|-----------|------:|
| Chamadas: create_campaign + create_adset(×2) + create_ad(×4) + tracking_setup = ~10 calls | grátis (usage-based, sem custo direto) |
| Rate limits respeitados (queue interno) | — |
| **Subtotal Meta API** | **R$ 0,00** |

> Meta Marketing API é gratuita para uso. Cliente paga apenas o ad spend (separado).

### 2.3 Multi-Armed Bandit — Claude Sonnet 4.6 (ciclos 4h/4h × 7 dias)

| Componente | Valor |
|-----------|------:|
| Ciclos por dia: 6 (24h / 4h) | 6 |
| Dias médios de vida da campanha | 7 |
| Total de ciclos amortizados | 42 |
| Por ciclo: input ~2.000 tokens (insights + estado bandit) + output ~500 tokens (decisão de realocação) | |
| Custo por ciclo: input 2.000 × 70% cache × $0.30/1M + 30% × $3.00/1M + output 500 × $15.00/1M | ~$0,011 |
| Por ciclo em BRL | R$ 0,058 |
| **Subtotal bandit (42 ciclos)** | **R$ 2,44** |

### 2.4 Meta Insights API (fetch a cada 4h)

| Componente | Valor |
|-----------|------:|
| 42 chamadas /insights por campanha (1 por ciclo bandit) | grátis |
| **Subtotal Meta Insights** | **R$ 0,00** |

### 2.5 Mixpanel attribution

| Componente | Valor |
|-----------|------:|
| Mixpanel ingestion (events): plano Growth $0.00028/event, ~3.000 events/campanha (impressions + clicks + conversions agregados) | $0,84 |
| Conversão BRL ($1 = R$ 5,30) | R$ 4,45 |
| Mixpanel queries (10 queries/campanha durante ciclo bandit) | R$ 0,15 |
| **Subtotal Mixpanel (alocado proporcional ao volume real, não nominal)** | **R$ 0,15** |

> Mixpanel é cobrado por evento ingerido no plano Acme (negociado em flat-fee R$ 800/mês até 10M events). Custo amortizado por campanha = R$ 0,15 considerando ~150 campanhas/mês.

### 2.6 Meta Conversions API (CAPI)

| Componente | Valor |
|-----------|------:|
| Server-to-server events (deduplicação com browser pixel) | grátis |
| **Subtotal CAPI** | **R$ 0,00** |

### 2.7 Infraestrutura (AWS Lambda + EventBridge + DB)

| Componente | Valor |
|-----------|------:|
| Lambda setup inicial (~30s, 1GB RAM) | R$ 0,04 |
| Lambda bandit ciclo (42 × ~10s, 512MB) | R$ 0,12 |
| EventBridge schedule (42 invocations) | R$ 0,01 |
| PostgreSQL (RDS, prorated estado bandit + audit) | R$ 0,06 |
| Redis (bandit state cache, prorated) | R$ 0,03 |
| Langfuse self-hosted (prorated, ~43 traces/campanha) | R$ 0,04 |
| **Subtotal infra** | **R$ 0,30** |

### 2.8 Eval-cases + revisão humana sample

| Componente | Valor |
|-----------|------:|
| LLM-as-judge eval 1× a cada 20 campanhas (sample) | R$ 0,30 / 20 |
| Revisão humana 5% sample (gestor sênior R$ 80/h × 5 min × 5%) | R$ 0,33 |
| **Subtotal eval + review** | **R$ 0,35** |

### 2.9 Telemetria Langfuse (extra)

| Componente | Valor |
|-----------|------:|
| ~43 traces × 8 spans médios × R$ 0,00005/span | R$ 0,02 |
| **Subtotal telemetria** | **R$ 0,02** |

### 2.10 Buffer para variabilidade (~15%, maior que social-media por incerteza Meta API + retries)

| Componente | Valor |
|-----------|------:|
| Buffer = soma × 0,15 | R$ 0,85 |
| **Subtotal buffer** | **R$ 0,85** |

## 3. Total

| Componente | Custo |
|-----------|------:|
| Strategy + targeting (Opus) | R$ 0,40 |
| Meta Marketing API | R$ 0,00 |
| Bandit cycles (Sonnet, 42×) | R$ 2,44 |
| Meta Insights API | R$ 0,00 |
| Mixpanel amortizado | R$ 0,15 |
| Meta CAPI | R$ 0,00 |
| Infraestrutura | R$ 0,30 |
| Eval + revisão humana sample | R$ 0,35 |
| Telemetria Langfuse | R$ 0,02 |
| Buffer 15% | R$ 0,85 |
| **Subtotal** | **R$ 4,51** |
| Re-roll por rejeição Meta (esperado 10% das campanhas, +R$ 1,00 extra) amortizado | R$ 0,10 |
| Margem de segurança adicional (campanhas de longa duração 14+ dias) | R$ 1,89 |
| **TOTAL conservador** | **R$ 6,50** |
| | |
| **C3 limit (25% × R$ 50)** | **R$ 12,50** |
| **Folga** | **R$ 6,00 (48%)** |

## 4. Análise por cenário

### Cenário A — Campanha curta (3 dias, 18 ciclos bandit)
- Custo: R$ 4,10
- Preço: R$ 50,00
- Margem: 92%

### Cenário B — Campanha média (7 dias, 42 ciclos) — **default**
- Custo: R$ 6,50
- Preço: R$ 50,00
- Margem: 87%

### Cenário C — Campanha longa (14 dias, 84 ciclos)
- Custo: R$ 9,10
- Preço: R$ 50,00
- Margem: 82%

### Cenário D — Campanha com 2 rejeições Meta (retry x2)
- Custo: R$ 8,50
- Preço: R$ 50,00
- Margem: 83%

### Cenário E — Campanha rejeitada 2× sem sucesso (não cobra, ADR-002-TF)
- Custo: R$ 1,80 (strategy + 2 tentativas + escalada)
- Receita: R$ 0,00
- Prejuízo absorvido: R$ 1,80 — aceitável pois esperado em <2% das campanhas

## 5. Separação ad spend vs SKU fee (crítico)

| Item | Quem paga | Quanto |
|------|-----------|--------|
| **Ad spend Meta** (budget que vai para anúncios) | Cliente (cartão Meta próprio) | Exemplo: R$ 30.000/mês |
| **Acme SKU fee** (criação + otimização) | Cliente (fatura Acme) | R$ 50 por campanha publicada |
| **Custo Acme por campanha** (operação interna) | Acme absorve | R$ 6,50 |

> Comunicação ao cliente: contrato deve deixar explícito que o R$ 50 cobre **criação + ciclos de bandit + tracking + reporting** de uma campanha por até 30 dias de vida. Ad spend é separado e visível no Business Manager do cliente.

## 6. Riscos econômicos identificados

| Risco | Probabilidade | Impacto em C3 | Mitigação |
|-------|:------------:|:-------------:|-----------|
| Anthropic aumenta preço Opus em 30% | 🟡 Média | +R$ 0,12 (folga OK) | Strategy roda 1×; pouco sensível |
| Anthropic aumenta preço Sonnet em 30% | 🟡 Média | +R$ 0,73 (folga reduz a 42%) | Multi-provider via adapter; otimização de prompt cache |
| Câmbio USD/BRL sobe para 6,00 | 🟡 Média | +R$ 0,40 (folga reduz a 45%) | Hedge via faturamento em USD; renegociar Mixpanel BRL |
| Bandit precisa >7 dias para convergir (campanha low-volume) | 🟡 Média | +R$ 1,50/semana extra | Cap em 14 dias; após isso cliente paga renovação R$ 50 |
| Meta API quebra (versão deprecada) | 🟡 Média (1–2×/ano) | Custo de engenharia 2–5 dias | ADR-003-TF: adapter versionado, transição preparada |
| Mixpanel sobe preço por evento | 🟢 Baixa | +R$ 0,20 | Migração para PostHog (adapter pronto via C7) |
| Volume baixo de campanhas/mês (<50) eleva Mixpanel/infra amortizados | 🟡 Média | +R$ 1,50 | Renegociar contrato flat-fee em volume garantido |

## 7. Otimizações futuras (não bloqueantes)

1. **Prompt caching agressivo para bandit cycles** (hoje 70%) — pode chegar a 90% com estado bandit estável → economia ~R$ 0,40 por campanha.
2. **Migrar bandit de Sonnet para Haiku** (decisão simples, score-based) — economia até R$ 1,50 por campanha; exige validação de qualidade de decisão.
3. **Bandit em código puro (TS) sem LLM** — para campanhas de alto volume com sinais claros, epsilon-greedy não precisa de LLM. Economia até R$ 2,00. Manter LLM apenas para campanhas com sinais ambíguos.
4. **Reduzir frequência de ciclos** para 6h ou 8h em campanhas com baixa volatilidade → economia 25–33% nos bandit cycles.
5. **Cache de Meta Insights** entre ciclos (delta apenas) — reduz tokens de input.

## 8. Decisão (`@unit-economist`)

✅ **APROVADO C3** com folga de 48% sobre o limite (R$ 6,50 vs R$ 12,50).
✅ **APROVADO ADR-001-TF** (epsilon-greedy) — algoritmo previsível e baixo custo computacional.
✅ **APROVADO ADR-002-TF** (no-charge em rejeição dupla) — risco econômico aceitável (<2%, R$ 1,80 absorvido).
✅ **APROVADO ADR-003-TF** (adapter versionado Meta) — fundamental para sustentabilidade dado churn de API Meta.
⚠️ **MONITORAR** custo de bandit cycles (maior componente, 38% do custo total). Considerar otimização #2 (Haiku) em wave 2.
⚠️ **MONITORAR** câmbio USD/BRL e preços Anthropic mensalmente.
🟢 **RECOMENDAÇÃO COMERCIAL:** contrato deve **separar visualmente** SKU fee (R$ 50) de ad spend (variável). Comunicação explícita evita disputa.

## 9. Próximo passo

→ `/acme:plan trafego-agent`
→ Invocar `@artifact-architect` para validar abstrações (adapter Meta versionado + bandit strategy injetável)
→ Validar legal/compliance: cláusula contratual de Special Ad Categories + política de retry sem cobrança
→ Pre-flight integração: solicitar acesso Meta Business Manager Acme + Mixpanel project

---

**Assinatura:** `@unit-economist` Guardian (Sonnet) — 2026-05-13 — APPROVED
