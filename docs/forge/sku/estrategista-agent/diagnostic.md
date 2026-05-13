---
sku_id: estrategista-agent
sku_version: 0.1.0
project_type: agentic_saas
ai_enabled: true
diagnose_date: 2026-05-13
diagnose_command: "/acme:diagnose estrategista-agent"
po_guardian_status: pending_review
priority: P2
target_implementation_week: 15
---

# Diagnóstico — Estrategista Agent

## 1. Problema do cliente

**Quem:** Founders B2B/B2C com produto ativo, ≥1.000 usuários/mês e ≥30 dias de dados de analytics rodando, que querem saber "onde está vazando meu funil?" sem contratar um analista sênior dedicado.

**Dor concreta:**
- Análise manual de funil leva **4-8 horas** por iteração: puxar dados → consolidar → cruzar cohorts → escrever relatório.
- Exige analista sênior dedicado: **R$ 12-20K/mês** (CLT) ou **R$ 18-30K/mês** (freelancer pleno).
- Insights chegam **tardios** (relatório semanal/mensal) — gargalos passam 2-4 semanas sem ação.
- Founders sem time de dados acabam tomando decisão por **intuição**, não evidência → desperdício de orçamento de growth.
- Mesmo com Mixpanel/Amplitude configurado, **a leitura humana** é o gargalo: dashboards mostram números, não diagnóstico.

**Quanto a dor custa:** R$ 12-30K/mês (salário analista) + custo de oportunidade de gargalos não corrigidos (CAC inflado, churn evitável, conversão sub-ótima).

**Como medimos resolução:** relatório executivo entregue em ≤2 min com **3 gargalos priorizados + 3 recomendações acionáveis** (cada uma com KPI alvo e estimativa de impacto), custo ≤ 25% do preço de R$ 100.

## 2. Outcome contratual (C2)

**Promessa em uma frase:**
> "Entregar 1 relatório executivo de diagnóstico de funil (Markdown) cobrindo AARRR, com 3 gargalos priorizados por impacto × esforço, 3 recomendações acionáveis (cada uma com KPI esperado e baseline), e cohort analysis quando relevante, em ≤2 min via Mixpanel + Claude Opus 4.6."

**Exemplos verificáveis:**

✅ **Positivo 1:** Tenant SaaS B2B, período últimos 30 dias, 4.200 sign-ups → relatório identifica drop-off Sign-up→Activation (44%), recomenda simplificar onboarding (impacto estimado +20-30% activation rate), com cohort breakdown por canal. 1m48s.

✅ **Positivo 2:** Tenant e-commerce, período últimos 90 dias → relatório aponta churn em repeat purchase (87% não volta em 60d), recomenda loyalty program com KPI alvo (3x repeat rate em 90d), citando cohort de jan-mar 2026 como baseline. 1m52s.

❌ **Negativo 1:** Tenant com 12 dias de dados, 80 usuários → REJEITA com mensagem clara: "Dados insuficientes para análise estatística significativa (mínimo: 30 dias, 100 usuários ativos). Sugerimos coletar mais dados antes do próximo diagnóstico."

❌ **Negativo 2:** Relatório genérico tipo "melhorem o onboarding" sem KPI alvo, sem baseline, sem priorização → NÃO conta como sucesso (falha eval de "acionabilidade ≥ 7/10").

❌ **Negativo 3:** Relatório entregue em 3m20s → NÃO conta (SLA violado).

❌ **Negativo 4:** Opus alucina 1 das 3 recomendações (cita métrica que não existe nos dados do Mixpanel) → NÃO conta (falha eval de "groundedness 100%").

## 3. ICP fit

**Cabe no ICP?** ✅ Sim — Founders B2B/B2C que JÁ têm Mixpanel (ou Amplitude/GA4 futuro) configurado, com ≥30 dias e ≥100 usuários ativos, e que tomam decisão executiva mensal sobre growth.

**Não cabe:**
- Tenants sem instrumentação de produto (dados <30 dias OU <100 usuários ativos) → agente recusa com mensagem clara.
- Empresas que precisam de análise estatística inferencial profunda (A/B test significance, regressão multivariada) → encaminhar para analista humano.
- Empresas com Data Warehouse customizado e queries SQL complexas (futuro escopo: Cenário B com adapter Postgres).

## 4. Hipóteses a validar (Week 15 SHADOW)

1. **Mixpanel API responde queries de funil + cohort em <60s para datasets de até 50K usuários ativos?**
   Hipótese: sim para free tier (20M events/mês), com cache agressivo (TTL 24h em queries de período encerrado).

2. **Claude Opus 4.6 consegue identificar 3 gargalos consistently (eval ≥ 8/10) a partir de dados agregados estruturados (não raw events)?**
   Hipótese: sim, com system prompt calibrado em AARRR + 15 few-shot examples curados + structured input (JSON com métricas pré-agregadas).

3. **Custo médio cabe em R$ 25 (25% de R$ 100)?**
   Hipótese: sim com folga grande (~R$ 13 estimado, 13% do preço). Buffer suficiente para cobrir cenários extremos.

4. **Recomendações são acionáveis (eval LLM-as-judge ≥ 7/10 em "acionabilidade")?**
   Hipótese: sim, exigindo no system prompt que cada recomendação tenha: ação concreta + KPI alvo + baseline atual + estimativa de impacto.

5. **Groundedness 100% (sem alucinação de métricas)?**
   Hipótese: sim com pattern "tool-use → consume → cite": Opus só pode citar números retornados pela API Mixpanel naquele trace.

## 5. Riscos identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| Dados insuficientes do tenant para análise | 🔴 Alta | Bloqueia outcome | Pre-check (≥30d, ≥100 usuários ativos); recusa explícita com mensagem |
| Mixpanel API rate limit / query timeout | 🟡 Média | Latência > SLA | Cache 24h queries período encerrado + retry com backoff |
| Opus alucina métricas inexistentes | 🟡 Média | Recomendação errada | Eval groundedness 100%; structured tool-use só consome o que API retornou |
| Recomendação genérica ("melhore X") sem KPI | 🟡 Média | Falha promessa | LLM-as-judge "acionabilidade ≥ 7/10" gate antes de entregar |
| Opus 4.6 fica caro com input grande (cohort tables) | 🟢 Baixa | C3 estreita | Agregação prévia em JSON; nunca enviar raw events |
| Tenant sem Mixpanel quer usar Postgres/DW | 🟡 Média | Não-atendimento | Cenário B: adapter Postgres (escopo wave 2) |

## 6. Restrições conhecidas

- **Read-only:** agente não escreve em Mixpanel nem altera produto — sem efeito colateral. Mais seguro de promover para AUTONOMOUS.
- **Mixpanel free tier:** 20M events/mês — suficiente para tenants do ICP fase 1.
- **Single-tenant fase 1** (C8): apenas Acme própria como cliente piloto.
- **Português brasileiro** (C7): relatório em pt-BR; adapter para outros idiomas wave 3.
- **Framework canônico:** AARRR (Acquisition, Activation, Revenue, Retention, Referral) — ver ADR-001-EST.

## 7. Honestidade do agente (constraint constitucional)

- Se dados <30 dias OU <100 usuários ativos → **recusa explícita**, não "tenta o que dá".
- Se Opus não consegue 3 recomendações com confidence ≥ 7/10 cada → **diz "dados insuficientes para 3 recomendações confiáveis"** e entrega só o que conseguiu fundamentar, sem completar com placeholders.
- Sem mocks. Sem "exemplos genéricos" passados como diagnóstico real.

## 8. Próximo passo

→ `/acme:spec --type=platform-sku estrategista-agent`
→ Invocar `@unit-economist` para auditar C3 (esperado: folga grande, ~13% do preço).
→ Validar com founder se relatório Markdown é suficiente ou se precisa HTML/dashboard interativo na v1.

---

**Aprovação pendente:** `@po-guardian` revisar outcome contratual + ICP fit + constraint de honestidade sobre dados insuficientes.
