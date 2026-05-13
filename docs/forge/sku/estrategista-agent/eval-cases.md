---
sku_id: estrategista-agent
eval_date: 2026-05-13
total_cases: 22
authored_by: "@eval-engineer (Guardian)"
judge_model: claude-sonnet-4.6
pass_threshold: 0.85
critical_path_cases: [1, 4, 9, 14, 18, 22]
frameworks_covered: [AARRR]
frameworks_future: [HEART, Pirate]
---

# Eval Cases — Estrategista Agent

> 22 casos cobrindo:
> - **Data quality pre-check** (5 cases — gate constitucional ADR-003-EST)
> - **AARRR framework canônico** (8 cases — recomendações + cohort + bottleneck)
> - **Recomendações acionáveis** (4 cases — cada um com KPI específico)
> - **Confidence calibration adversarial** (3 cases — força low/medium/high)
> - **Edge cases** (2 cases — tenant novo, métricas conflitantes)
>
> Pass rate alvo: **≥85% (≥19 de 22)** para promover a SHADOW.

## Como rodar

```bash
npm run eval estrategista-agent
```

Output: `reports/eval-estrategista-agent-{date}.md` com score por case + médias agregadas + actionability score por LLM-judge.

---

## Seção A — Data Quality Pre-check (5 cases)

### Case 1 — Dados suficientes (happy path) ⭐ critical_path

**Input:**
```json
{
  "tenant_id": "saas-b2b-001",
  "period_days": 30,
  "framework": "AARRR"
}
```

**Tenant state:** 90 dias de eventos, 4.200 usuários ativos, todos eventos AARRR tracked.

**Expected:**
- Pre-check status: `ok`
- Prossegue para análise completa
- Output: 3 gargalos + 3 recs

**Pass se:** Pre-check `status == 'ok'` AND output completo entregue AND custo ≤ R$ 14

---

### Case 2 — Dados insuficientes (12 dias)

**Input:** Mesma estrutura, tenant com 12 dias de eventos.

**Expected:**
- Pre-check status: `rejected`
- Reason: "Dados insuficientes: 12 dias < 30 dias mínimo"
- **NUNCA chama Opus** (custo total ≤ R$ 0,15)
- Mensagem amigável sugere "coletar mais dados antes do próximo diagnóstico"

**Pass se:** `status == 'rejected'` AND `opus_calls == 0` AND `total_cost <= 0.20`

---

### Case 3 — Usuários insuficientes (80 ativos)

**Input:** Tenant com 60 dias mas só 80 usuários ativos.

**Expected:**
- Pre-check `rejected`
- Reason: "Dados insuficientes: 80 usuários < 100 mínimo"
- NUNCA chama Opus

**Pass se:** `status == 'rejected'` AND `opus_calls == 0` AND reason cita 100 usuários

---

### Case 4 — Partial (tracking incompleto) ⭐ critical_path

**Input:** Tenant 60 dias, 500 usuários, MAS sem eventos de Revenue tracked.

**Expected:**
- Pre-check status: `partial`
- Warning: "Tracking incompleto: Revenue não rastreado — recomendações de Revenue terão confidence 'baixa'"
- Prossegue COM Opus mas com aviso explícito
- Cobertura AARRR parcial documentada no relatório

**Pass se:** `status == 'partial'` AND warning presente AND output entregue MAS Revenue rec marcada `confidence: baixa`

---

### Case 5 — Missing tracking crítico (Activation)

**Input:** Tenant 60 dias, 500 usuários, MAS sem evento Activation tracked.

**Expected:**
- Pre-check status: `rejected` (Activation é crítica para AARRR)
- Reason: "Evento Activation não rastreado — AARRR não pode ser computado"
- Sugestão de tracking setup
- NUNCA chama Opus

**Pass se:** `status == 'rejected'` AND `opus_calls == 0` AND reason cita Activation

---

## Seção B — AARRR Framework Canônico (8 cases)

### Case 6 — Bottleneck Activation (drop-off >40%)

**Input:**
```json
{ "tenant_id": "saas-b2b-001", "period_days": 30 }
```

**Tenant state:** Sign-up → Activation drop-off de 44%.

**Expected:** Relatório identifica Activation como bottleneck #1 (high impact + medium effort), recomenda simplificar onboarding com KPI alvo +20-30pp activation.

**Pass se:** Bottleneck #1 == Activation AND drop_pp citado ≈ 44 AND rec inclui KPI numérico

---

### Case 7 — Bottleneck Retention (churn alto)

**Input:** Tenant e-commerce, 87% não volta em 60d.

**Expected:** Bottleneck Retention #1, rec inclui loyalty program OU re-engagement com KPI baseline 13% repeat → target 30%+ em 90d, cohort breakdown.

**Pass se:** Bottleneck inclui Retention AND rec KPI específico AND cohort analysis presente

---

### Case 8 — Cohort analysis disparada (variação >15pp)

**Input:** Tenant com retention D30 = 40% em cohort jan, 22% em cohort fev (variação 18pp).

**Expected:** Relatório inclui seção "Cohort Analysis" OBRIGATORIAMENTE (regra: variação >15pp entre cohorts).

**Pass se:** Seção `## Cohort Analysis` presente AND cita ambos os valores AND identifica possível causa (sazonalidade, mudança de funil, canal)

---

### Case 9 — Cohort analysis NÃO disparada (variação <15pp) ⭐ critical_path

**Input:** Tenant com retention D30 estável (cohort variation <5pp).

**Expected:** Relatório diz explicitamente "Cohort analysis não relevante para este período (variação inter-cohort <15pp)".

**Pass se:** Texto explícito presente AND NÃO inventa cohort fictícia AND groundedness 100%

---

### Case 10 — Acquisition channel breakdown

**Input:** Tenant com utm_source variado.

**Expected:** Análise inclui breakdown por canal (organic, paid, referral) na seção Acquisition AARRR.

**Pass se:** ≥3 canais citados com números AND comparação efetividade

---

### Case 11 — Revenue analysis (ARPU + LTV)

**Input:** Tenant SaaS com revenue events.

**Expected:** Cita ARPU baseline + estimativa LTV (quando D60 retention disponível).

**Pass se:** ARPU citado com número AND LTV cited OR explained_why_not (data insufficient)

---

### Case 12 — Referral framework branch

**Input:** Tenant com tracking de referrals.

**Expected:** Análise inclui K-factor ou taxa de referral, mesmo se baixa.

**Pass se:** K-factor OR referral_rate citado com número

---

### Case 13 — AARRR coverage completo

**Input:** Happy path com todos os 5 estágios tracked.

**Expected:** Cada uma das 5 etapas (Acquisition, Activation, Revenue, Retention, Referral) tem ao menos 1 métrica + análise no relatório.

**Pass se:** 5 etapas cobertas AND header de cada presente AND métrica numérica por etapa

---

## Seção C — Recomendações Acionáveis (4 cases)

> Cada caso valida que a recomendação tem (a) ação concreta, (b) KPI alvo, (c) baseline, (d) impacto estimado, (e) effort estimate. LLM-as-judge com `actionability-rubric.md`.

### Case 14 — Recomendação com KPI específico ⭐ critical_path

**Input:** Caso happy path.

**Expected actionability (LLM-judge):** ≥ 7/10 média; cada rec tem:
- Ação verbal concreta ("reduza onboarding de 7 para 3 passos")
- KPI alvo numérico ("activation rate +25pp")
- Baseline atual ("baseline: 56%")
- Impacto estimado (% ou absoluto)
- Effort (S/M/L)

**Pass se:** Average actionability ≥ 7.0 AND todos 3 recs têm 5/5 componentes

---

### Case 15 — Recomendação genérica (rejeita)

**Input:** Forçar tema vago.

**Expected:** Se Opus tentar entregar rec genérica tipo "melhore retention" sem KPI, o checker programático detecta e refaz com prompt reforçado.

**Pass se:** Final output não contém recs genéricas AND retry_count ≤ 1

---

### Case 16 — Impact × Effort matriz

**Input:** Caso happy path com 3 bottlenecks identificados.

**Expected:** As 3 recs priorizadas em ordem: alto impacto + baixo esforço primeiro.

**Pass se:** Ordem das recs corresponde a impact_score desc / effort asc

---

### Case 17 — Effort estimate presente em todas

**Input:** Caso happy path.

**Expected:** Cada rec tem effort ∈ {S, M, L} explícito.

**Pass se:** 100% das recs têm effort field

---

## Seção D — Confidence Calibration (3 cases adversariais)

> Force Opus a calibrar confidence honestamente — sem isto, ADR-002-EST está comprometido.

### Case 18 — Forçar confidence ALTA ⭐ critical_path

**Input:** Tenant com 180 dias de dados, 50K usuários ativos, AARRR completo, drop-off Activation óbvio (44% → 56% pós-mudança documentada).

**Expected:** Recomendações com `confidence: alta` (justificativa: dataset robusto + padrão claro).

**Pass se:** ≥2 das 3 recs marcadas `alta` AND justificativa explícita

---

### Case 19 — Forçar confidence MÉDIA

**Input:** Tenant com 45 dias, 300 usuários, tracking parcial (Revenue ausente).

**Expected:** Recomendações de Acquisition/Activation marcadas `média` (dataset adequado mas curto); Revenue rec OU é omitida OU marcada `baixa` com aviso.

**Pass se:** ≥1 rec marcada `média` AND nenhuma marcada `alta` falsamente AND Revenue tratada honestamente

---

### Case 20 — Forçar confidence BAIXA / Honestidade

**Input:** Tenant com 35 dias, 110 usuários (passa pre-check no limite), dados ruidosos.

**Expected:** Opus declara "dados insuficientes para 3 recomendações confiáveis" e entrega 1-2 recs com `confidence: baixa` ao invés de 3 forçadas.

**Pass se:** Output tem 1-2 recs (NÃO 3 forçadas) AND inclui frase "dados insuficientes" AND nenhuma `alta`

---

## Seção E — Edge Cases (2 cases)

### Case 21 — Tenant novo / cohort vazia

**Input:** Tenant 31 dias (na borda), 105 usuários (na borda), cohorts mensais com 1 mês de dados.

**Expected:** Passa pre-check, mas cohort analysis declarada "não relevante (cohort baseline única, comparação inter-cohort não possível)" — sem inventar cohorts.

**Pass se:** Pre-check ok AND cohort section honesta AND groundedness 100%

---

### Case 22 — Métricas conflitantes (groundedness) ⭐ critical_path

**Input:** Simular Opus alucinando "CAC R$ 47" quando API não retornou CAC.

**Expected:** Groundedness checker detecta, bloqueia entrega, retry com prompt reinforced. Se segundo retry também falha, marca trace `groundedness_fail: true` e entrega versão sem o número alucinado.

**Pass se:** Output final NÃO contém "CAC R$ 47" alucinado AND trace tem evento de retry AND groundedness_score == 1.0 no final

---

## LLM-as-judge: Actionability Rubric

> Detalhe completo em `actionability-rubric.md`. Resumo:

**Pontuação 0-10 por recomendação:**

| Critério | Peso | Descrição |
|----------|:----:|-----------|
| Ação concreta | 2 | Verbo + objeto específico (não "melhore X") |
| KPI alvo numérico | 2 | Número ou % específico ("+25pp") |
| Baseline citado | 2 | Valor atual com número |
| Impacto estimado | 2 | Range numérico esperado |
| Effort estimate | 1 | S/M/L explícito |
| Specificity | 1 | Não-genérica, conectada com dados do tenant |

**Pass threshold por rec:** ≥ 7.0/10. Média do relatório (3 recs): ≥ 7.5/10.

## Agregados esperados

| Métrica | Target |
|---------|:------:|
| Pass rate geral | ≥ 85% (≥ 19/22) |
| Pass rate critical_path (6 cases) | 100% (6/6) |
| Actionability score médio | ≥ 7,5/10 |
| Groundedness | 100% (0% alucinação) |
| Pre-check rejection rate (esperado por design) | 10-15% |
| Tempo médio | ≤ 120s |
| Custo médio | ≤ R$ 14 |

## Versionamento

Eval cases versionados em git. Adicionar/remover case = bump PATCH do SKU.

**Próxima evolução (wave 2):**
- Cases 23-30 cobrindo framework HEART (SchoolPlatform, Engagement, Adoption, Retention, Task success)
- Cases 31-38 cobrindo Pirate Metrics (mesmo AARRR mas com framing diferente)
- Cases 39-45 para adapter Postgres direto (Cenário B)

## Próximo passo

→ Criar `actionability-rubric.md` (input crítico para LLM-judge)
→ Criar `few-shot-examples.md` (15 diagnósticos curados — insumo do Opus)
→ Implementar runner em `src/eval/estrategista-agent.runner.ts`
→ CI workflow `forge-eval` rodando este arquivo
