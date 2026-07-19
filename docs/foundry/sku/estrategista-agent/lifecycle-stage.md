---
sku_id: estrategista-agent
lifecycle_type: agentic
current_stage: draft
created_at: 2026-05-13
last_transition: 2026-05-13
priority: P2
---

# Lifecycle Stage — Estrategista Agent

> Append-only log de transições de estado. Versão agentic_saas: SHADOW → ASSISTED → AUTONOMOUS.

## Estado atual

**`draft`** — spec/plan/tasks/eval criados, ainda não implementado.

## Histórico de transições

| Stage | Data | Aprovador | Gates aprovados | Notas |
|-------|------|-----------|-----------------|-------|
| `(new)` → `draft` | 2026-05-13 | @po-guardian (pending review) | Diagnose + spec + unit-economics + plan + tasks + eval-cases | SKU P2, target implementação semana 15 (D11-D12 do roadmap 14 dias). Read-only — risco operacional mais baixo que SKUs com efeito colateral. |

## Próximas transições previstas

### `draft → SHADOW` (alvo: 2026-06-02, fim Wave 5 da semana 15)

**Gates necessários (5):**

1. [ ] `@po-guardian` revisou e aprovou `spec.md` outcome contratual + constraint de honestidade
2. [x] `@unit-economist` aprovou `unit-economics.md` (C3 ≤ 25%, folga 48%) — APROVADO 2026-05-13
3. [x] `@artifact-architect` aprovou `plan.md` (C5/C7) — APROVADO 2026-05-13
4. [ ] Eval-suite com ≥ 85% pass rate (`/novais-digital:eval estrategista-agent`)
5. [ ] Coverage Tier B atingido (≥ 85% line, ≥ 80% branch)

**Gates ADICIONAIS específicos deste SKU:**

6. [ ] **Groundedness 100%** em todos os critical_path eval cases (Case 22 obrigatório)
7. [ ] **Pre-check rejection rate** observada em 10-15% no sandbox (sinal de ICP fit correto)
8. [ ] **few-shot-examples.md, actionability-rubric.md, aarrr-canonical-prompt.md** criados e versionados

**Comando para transição:** `/novais-digital:promote estrategista-agent --to=shadow`

**Quem assina:** `@promotion-officer`

### `SHADOW → ASSISTED` (alvo: 2026-06-09, após 7 dias em SHADOW)

**Gates necessários:**

- 30+ diagnósticos rodados em tenants piloto (incluindo Novais Digital própria como tenant)
- Actionability score médio ≥ 7,5/10 sustentado
- Groundedness fail rate = 0% nos últimos 14 dias
- Pre-check rejection rate estável em 10-15% (não disparou >25%)
- Cache hit ratio Mixpanel ≥ 70% após 30 execuções
- 0 incidentes de C3 violation
- Human review de 20% sample (≥6 diagnósticos aprovados manualmente como "úteis e acionáveis")
- SLA achievement ≥ 95% (≤5% violam 120s)

**Comando:** `/novais-digital:promote estrategista-agent --to=assisted`

**Pré-requisito adicional:** `/novais-digital:sla-threshold estrategista-agent` define SLA contratual de 120s P95.

### `ASSISTED → AUTONOMOUS` (alvo: 2026-06-23, após 14 dias em ASSISTED)

**Gates necessários:**

- 14 dias consecutivos com founder/analista validando cada relatório antes de envio
- 0 rejeições por "não-acionável" nos últimos 7 dias
- Acurácia das recomendações ≥ 80% (validação: founder marca cada rec como "implementaria" ou "não")
- SLA achievement ≥ 95% sustentado
- NPS interno do uso ≥ 8/10 (coletado de quem consome o relatório)
- DeepAgent mensal `@reviewer` audit pass (C1-C8) — especial atenção a C4 (eval) e C1 (honestidade do pre-check)

**A partir deste ponto:** sistema cobra R$ 100 por diagnóstico entregue (apenas quando pre-check passa E groundedness 100% E acionabilidade ≥ 7/10).

**Vantagem deste SKU para autonomia:** read-only — sem efeito colateral em sistemas do tenant. Risco operacional baixo facilita promoção responsável.

## Rollback

Cada transição pode ser revertida:
- `/novais-digital:promote estrategista-agent --to=shadow` (de ASSISTED ou AUTONOMOUS)
- `/novais-digital:promote estrategista-agent --to=draft` (de SHADOW)

**Quando reverter:**
- Actionability score médio cai abaixo de 6,5/10 por 24h
- Groundedness fail rate > 0% por 3 execuções consecutivas (BLOQUEADOR ABSOLUTO)
- Custo médio ultrapassa R$ 22 por 7 dias (próximo do limite C3 de R$ 25)
- 3+ incidentes de pre-check rejection >30% em uma semana (sinal de ICP miss ou bug)
- DeepAgent mensal reprova auditoria
- Founder/cliente piloto reporta "recomendações não úteis" 3× consecutivos

## Métricas de saúde por stage

### draft
- Spec aprovada pelo po-guardian ✅
- Unit economics dentro do limite C3 ✅ (R$ 13 vs R$ 25)
- Plan aprovado pelo artifact-architect ✅
- Eval-cases definidos ✅ (22 cases)
- 3 insumos críticos a criar: few-shot-examples, actionability-rubric, aarrr-canonical-prompt

### SHADOW
- ≥ 20 diagnósticos/semana coletados
- Custo médio rastreado e dentro do esperado (~R$ 13)
- Actionability ≥ 7/10
- Groundedness 100%
- Pre-check rejection rate 10-15%
- Cache hit ratio Mixpanel ≥ 70%
- Bugs críticos = 0

### ASSISTED
- Human approval rate ≥ 90%
- Tempo de revisão humana < 5min/diagnóstico
- Custo médio estável
- 0 falhas de groundedness

### AUTONOMOUS
- Receita gerada > custo total
- NPS interno ≥ 8
- Acurácia recs (implementadas com sucesso) ≥ 70%
- Audit mensal DeepAgent pass

## Constraint especial — Honestidade (C1)

Este SKU tem uma constraint constitucional única: **se dados <30 dias OU <100 usuários ativos, o agente DEVE recusar com mensagem clara, nunca tentar análise parcial.**

Em qualquer estágio do lifecycle, violação dessa constraint = **rebaixamento imediato** para `draft` + investigação.

## Próximo passo

→ Submeter `spec.md` para revisão final de `@po-guardian`
→ Criar `few-shot-examples.md`, `actionability-rubric.md`, `aarrr-canonical-prompt.md`
→ Iniciar Wave 1 do plan.md (Setup + MixpanelAdapter) em D11 do roadmap
