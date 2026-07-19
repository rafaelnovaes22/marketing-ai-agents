---
sku_id: trafego-agent
eval_date: 2026-05-13
total_cases: 24
authored_by: "@eval-engineer (Guardian)"
judge_model: claude-sonnet-4.6
pass_threshold: 0.85
critical_path_cases: [1, 6, 11, 14, 19]
---

# Eval Cases — Gestor de Tráfego Agent

> 24 casos cobrindo setup de campanha, otimização bandit, rejeição Meta, targeting e edge cases.
> Pass rate alvo: ≥85% (≥21 de 24) para promover a SHADOW.

## Como rodar

```bash
npm run eval trafego-agent
```

Output: `reports/eval-trafego-agent-{date}.md` com score por case + médias agregadas + métricas de convergência.

## Categorias

| Categoria | # Cases | Cases |
|-----------|:------:|-------|
| Setup de campanha (5 objetivos Meta) | 5 | 1-5 |
| Otimização bandit (convergência) | 5 | 6-10 |
| Rejeição Meta + retry policy | 3 | 11-13 |
| Targeting quality (LLM-as-judge) | 3 | 14-16 |
| Edge cases | 4 | 17-20 |
| Telemetria + tracking | 4 | 21-24 |

---

## Setup de campanha

### Case 1 — Objetivo CONVERSIONS ⭐ critical_path

**Input:**
```json
{
  "objective": "CONVERSIONS",
  "daily_budget_brl": 200,
  "audience": "founders BR 28-45",
  "creative_source": "designer_agent",
  "copy_source": "copywriter_agent",
  "variants_count": 4,
  "pixel_event": "Lead"
}
```

**Expected outcome:**
- 1 Campaign `objective=OUTCOME_LEADS` (v19) com `status=ACTIVE`
- 2 AdSets: 1 Lookalike 1% + 1 Interesses Empreendedorismo
- 4 Ads com `effective_status` ∈ {ACTIVE, PENDING_REVIEW}
- Mixpanel `Lead` event configurado
- Bandit ativo (cron 4h registrado)
- Tempo total ≤ 300s

**Pass se:** Campaign criada + ≥3 ads ACTIVE/PENDING + tracking ativo + tempo ≤300s

---

### Case 2 — Objetivo TRAFFIC (LINK_CLICKS)

**Input:**
```json
{
  "objective": "TRAFFIC",
  "daily_budget_brl": 100,
  "audience": "amplo SP-RJ 25-55",
  "destination": "landing_webinar_url",
  "variants_count": 3
}
```

**Expected:** Campaign `OUTCOME_TRAFFIC` + 1 AdSet broad + 3 Ads + tracking link clicks.

**Pass se:** Campaign ativa + 3 ads + UTM params injetados corretamente

---

### Case 3 — Objetivo ENGAGEMENT

**Input:** Campanha para boost de engajamento de post existente, R$ 50/dia, público similar a engajadores recentes.

**Expected:** Campaign `OUTCOME_ENGAGEMENT` + AdSet com custom audience "engagers_last_30d" + 1 Ad reutilizando post_id.

**Pass se:** Campaign ativa + post_id corretamente referenciado + sem criar criativo novo (reusa post)

---

### Case 4 — Objetivo LEAD_GENERATION (Lead Ads nativo)

**Input:** Campanha lead gen com formulário Meta nativo (não landing externa), 5 campos (nome/email/telefone/empresa/cargo), R$ 150/dia.

**Expected:** Campaign `OUTCOME_LEADS` + LeadGen form criado + 3 Ads + Mixpanel ingest via Meta webhook.

**Pass se:** Form Meta criado com 5 campos + ads com `form_id` correto + webhook lead ingest funcional

---

### Case 5 — Objetivo APP_INSTALLS

**Input:** Promoção app iOS+Android, R$ 300/dia, evento Mobile Measurement Partner (AppsFlyer).

**Expected:** Campaign `OUTCOME_APP_PROMOTION` + AdSets segregados por OS + integração MMP setup.

**Pass se:** 2 AdSets (iOS+Android) + MMP `partner_id` corretamente integrado

> Nota: Case 5 pode ser marcado `skip_in_phase_1` se não houver MMP test account; documentado.

---

## Otimização bandit

### Case 6 — Bandit converge em 4h (high volume) ⭐ critical_path

**Input:** Dataset sintético: campanha CONVERSIONS, 4 variantes, conversões reais distribuídas 60/20/10/10. Simular 24h em ticks de 4h (6 ciclos).

**Expected:** Após ciclo 2 (8h simulados), variante 1 recebe ≥60% do budget alocado.

**Pass se:** `variant_1.budget_share >= 0.55` após 2 ciclos AND total cost dos 6 ciclos ≤ R$ 0,40

---

### Case 7 — Bandit converge em 12h (medium volume)

**Input:** Mesmo case 6 mas distribuição 35/30/20/15 (winner menos óbvio).

**Expected:** Após ciclo 3 (12h simulados), variante 1 recebe ≥40% do budget.

**Pass se:** `variant_1.budget_share >= 0.35` após 3 ciclos

---

### Case 8 — Bandit converge em 24h (low volume edge case)

**Input:** 8 conversões/dia distribuídas 3/2/2/1 — volume baixo.

**Expected:** Após 24h, bandit não converge (winner não identificado com confiança). Sistema mantém alocação balanceada e flag `low_volume_warning`.

**Pass se:** `low_volume_warning == true` AND `variant.*.budget_share` todos entre 0.15-0.35

---

### Case 9 — Exploration vs Exploitation (epsilon=0.1)

**Input:** Variantes 1 dominante (80% das conversões) durante 12h.

**Expected:** Bandit explora variantes 2-4 em ~10% dos casos (epsilon=0.1) mesmo após convergência.

**Pass se:** Soma de budget_share variantes 2-4 ∈ [0.05, 0.20] após convergência

---

### Case 10 — Edge case: 0 conversões em 24h

**Input:** Nenhuma das 4 variantes converte em 24h.

**Expected:** Bandit mantém budget igualitário + flag `zero_conversion_alert` + dispara Slack #ops.

**Pass se:** Budget mantém-se em ~25% cada AND alerta Slack disparado

---

## Rejeição Meta + retry policy (ADR-002-TF)

### Case 11 — Violação de política Meta + retry com creative alternativo ⭐ critical_path

**Input:** Forçar mock Meta a retornar `effective_status=DISAPPROVED` com `reason=ad_policy_violation` em 1 de 4 ads.

**Expected:** Sistema detecta rejeição → solicita criativo alternativo do Designer Agent → resubmete → ad é aprovado.

**Pass se:** `retry_count == 1` AND ad final está `ACTIVE` AND SKU cobra normalmente

---

### Case 12 — Rejeição dupla → SKU NÃO COBRA

**Input:** Forçar mock Meta a rejeitar ambas tentativas (creative original + alternativo).

**Expected:** Após 2ª rejeição, sistema escalona Slack #ops + marca `skip_billing=true` + entrega o que tem.

**Pass se:** `retry_count == 2` AND `skip_billing == true` AND alerta Slack disparado AND audit trail completo

---

### Case 13 — Recurso (appeal) aceito após escalonamento

**Input:** Após escalonamento, humano submete appeal manual via Meta interface; mock retorna `appeal_accepted`.

**Expected:** Sistema reativa ad + recalcula bandit + bill é cobrado retroativamente (ou flag para revisão manual).

**Pass se:** Ad reativado + bandit incorpora nova variante AND `manual_billing_review=true`

---

## Targeting quality (LLM-as-judge)

### Case 14 — B2B Custom Audience ⭐ critical_path

**Input:** "Campanha SaaS B2B para CTOs de empresas 50-500 funcionários, ticket R$ 5k-20k/mês."

**Expected targeting (esperado pelo LLM-judge):**
- Custom audience: lookalike de clientes pagantes
- Job titles: ["CTO", "Chief Technology Officer", "VP Engineering", "Diretor de Tecnologia"]
- Company size: 51-500
- Geo: BR (com priorização SP/RJ/MG)
- Exclusões: estudantes, freelancers solo

**LLM-judge rubric:**
> "Avalie em escala 1-10 se o targeting (1) cobre cargos relevantes; (2) define company size apropriado; (3) usa lookalike quando faz sentido; (4) inclui exclusões inteligentes."

**Pass se:** LLM-judge score ≥ 7/10

---

### Case 15 — Lookalike de base de clientes

**Input:** "Campanha conversão usando base 2.000 clientes pagantes como semente."

**Expected:** AdSet com `lookalike_audience` source = custom_audience_id existente, percentage 1% (ou 2-3% se base <1k).

**LLM-judge:** Avalia se percentage e geo são apropriados.

**Pass se:** Score ≥ 7/10 AND lookalike `country=BR` AND percentage ∈ [1, 5]

---

### Case 16 — Retargeting de website visitors

**Input:** "Campanha retargeting visitantes do /pricing nos últimos 30 dias, lance maior."

**Expected:** AdSet com `website_custom_audience` filtrado por URL `/pricing` + `retention_days=30` + bid strategy `LOWEST_COST_WITH_BID_CAP` ou `COST_CAP` maior que campanhas frias.

**Pass se:** LLM-judge score ≥ 7/10 AND audience type correto AND bid strategy explicitamente diferenciada

---

## Edge cases

### Case 17 — Briefing vago (rejeita amigavelmente)

**Input:**
```json
{
  "request": "roda anuncio aí pra mim"
}
```

**Expected:** Sistema rejeita pedindo briefing mínimo: objetivo + budget + público + criativo+copy disponíveis.

**Pass se:** Sistema NÃO consumiu tokens de targeting AND mensagem amigável inclui as 4 perguntas

---

### Case 18 — Budget abaixo do mínimo Meta

**Input:** `daily_budget_brl=2` (Meta mínimo ~R$ 5/dia para conversões em BR).

**Expected:** Sistema rejeita com mensagem: "Budget mínimo Meta para CONVERSIONS em BR é R$ 5/dia. Aumentar?".

**Pass se:** Sistema rejeita ANTES de chamar Meta API AND não consome tokens de targeting Opus

---

### Case 19 — Special Ad Category (ADR-005-TF) ⭐ critical_path

**Input:** "Campanha para curso de financiamento imobiliário, público B2C, R$ 100/dia."

**Expected:** Pre-flight compliance check detecta `housing/credit/employment/política` keywords → bloqueia com mensagem explícita: "Special Ad Categories estão FORA do escopo fase 1. Requer humano no loop."

**Pass se:** Sistema retorna `out_of_scope=true` ANTES de qualquer chamada Meta AND mensagem explícita ao cliente

---

### Case 20 — Conta Meta com warning de policy ativo

**Input:** Mock Meta retorna `ad_account.has_active_warning=true` no pre-flight check.

**Expected:** Sistema pausa criação + dispara Slack #compliance (P0) + retorna erro estruturado ao cliente.

**Pass se:** Sistema NÃO cria campanha AND Slack #compliance P0 disparado

---

## Telemetria + tracking

### Case 21 — Mixpanel smoke event chega em ≤60s

**Input:** Setup AttributionTracking + emit smoke event sintético.

**Expected:** Mixpanel API confirma ingestão em ≤60s + dedup `event_id` funcional.

**Pass se:** `mixpanel.ingest_latency_seconds <= 60` AND query subsequente retorna 1 event (não duplicado)

---

### Case 22 — Meta CAPI deduplicação com browser pixel

**Input:** Emit mesmo `Purchase` event via browser pixel + Meta CAPI com mesmo `event_id`.

**Expected:** Meta dedup considera apenas 1 evento (não duplicar atribuição).

**Pass se:** Meta Events Manager mostra 1 event (não 2) para o mesmo `event_id`

---

### Case 23 — Langfuse trace completo (cost breakdown)

**Input:** Executar `CreateCampaignUseCase` completo.

**Expected:** 1 trace Langfuse com spans: strategy, targeting, creative_intake, copy_intake, meta_api_campaign_create, meta_api_adset_create, meta_api_ads_create (×N), mixpanel_setup, bandit_init. Cost breakdown por span.

**Pass se:** Trace tem ≥9 spans AND cost_breakdown total ≤ R$ 12,50 (C3) AND cost por span > 0

---

### Case 24 — SLA p95 setup ≤300s sob carga (10 campanhas paralelas)

**Input:** Disparar 10 `CreateCampaignUseCase` em paralelo (sandbox Meta).

**Expected:** p95 latência ≤ 300s; p99 ≤ 360s (margem 20%).

**Pass se:** p95 ≤ 300s AND nenhuma execução excede 360s

---

## Agregados esperados

| Métrica | Target |
|---------|:------:|
| Pass rate geral | ≥ 85% (≥ 21/24) |
| Pass rate critical_path (5 cases) | 100% (5/5) |
| Bandit convergência ≥70% cenários | em ≤24h |
| Targeting quality LLM-judge médio | ≥ 7/10 |
| Tempo médio setup | ≤ 240s |
| Custo médio por campanha (eval cycle) | ≤ R$ 1,50 (eval, não 7d real) |
| Meta rejection rate (eval) | ≤ 5% |

## Honestidade sobre eval

> **Bandit eval usa dataset sintético determinístico**, não tráfego real Meta. Convergência em produção pode variar com sazonalidade, qualidade do criativo e volume real. SHADOW (7 dias com 50+ campanhas reais) é a validação definitiva — eval apenas reduz risco de regressão.

> **Setup time eval inclui mocks de Designer/Copywriter Agent.** Em produção, depende do SLA cross-SKU desses agentes.

## Versionamento

Eval cases versionados em git. Adicionar/remover case = bump PATCH do SKU.

**Próxima evolução:** cases 25-30 cobrindo Advantage+ Shopping campaigns + dynamic creative + manual placements quando Meta API v20 estabilizar.

## Próximo passo

→ Criar runner de eval em `src/eval/trafego-agent.runner.ts`
→ Bandit synthetic simulator em `src/eval/bandit-simulator.ts`
→ CI workflow `foundry-eval` rodando este arquivo (excluir cases sandbox-Meta de PR, rodar nightly)
→ Tracker de pass rate no Mixpanel
