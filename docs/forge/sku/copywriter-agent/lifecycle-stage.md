---
sku_id: copywriter-agent
lifecycle_type: agentic
current_stage: draft
created_at: 2026-05-13
last_transition: 2026-05-13
priority: P0
---

# Lifecycle Stage — Copywriter Agent

> Append-only log de transições de estado. Versão agentic_saas: SHADOW → ASSISTED → AUTONOMOUS.

## Estado atual

**`draft`** — spec, plan, tasks, eval-cases e decisions criados. Implementação ainda não iniciada.

## Histórico de transições

| Stage | Data | Aprovador | Gates aprovados | Notas |
|-------|------|-----------|-----------------|-------|
| `(new)` → `draft` | 2026-05-13 | @po-guardian (pending review) | Diagnose preliminar + spec + unit-economics (APPROVED) + plan (APPROVED) | Segundo SKU do Acme Social. Reusa stack do social-media-agent (langfuse, claude-adapter base, voice loader). |

## Próximas transições previstas

### `draft → SHADOW` (alvo: 2026-05-20, fim Wave 6)

**Gates necessários (5):**

1. [ ] `@po-guardian` revisa e aprova `spec.md` outcome contratual + os 3 schemas JSON
2. [x] `@unit-economist` aprovou `unit-economics.md` (C3 ≤ 25% nos 3 tipos) — APPROVED com ADR-001-CW 2026-05-13
3. [x] `@artifact-architect` aprovou `plan.md` (C5/C7 — adapter pattern + schema versionado) — APPROVED 2026-05-13
4. [ ] Eval-suite com ≥ 85% pass rate (`/acme:eval copywriter-agent`) + critical_path 5/5
5. [ ] Coverage Tier B atingido (≥ 85% line, ≥ 80% branch) + domain layer sem imports SDK (lint pass)

**Gates auxiliares (não bloqueantes mas recomendados):**

- [ ] `@prompt-engineer` revisou os 3 system prompts (landing.v1, email-sequence.v1, ads-meta.v1) com cache breakpoints
- [ ] `@observability-guardian` validou cobertura Langfuse (spans obrigatórios)
- [ ] Handoff contract (output JSON) revisado por `@artifact-architect`

**Comando para transição:** `/acme:promote copywriter-agent --to=shadow`

**Quem assina:** `@promotion-officer`

### `SHADOW → ASSISTED` (alvo: 2026-05-28, após 8 dias em SHADOW)

**Gates necessários:**

- 60+ execuções coletadas em SHADOW (20 landings, 20 email-sequences, 20 ad-sets — mix balanceado)
- Score eval médio ≥ 7,8/10
- Tom score médio ≥ 7,5/10
- Framework adherence médio ≥ 7,8/10
- Diversity médio Tipo C ≥ 0,45 (1 − sim)
- SLA achievement rate ≥ 95% (≤5% das execuções violam 900s)
- 0 incidentes de C3 violation (custo Landing nunca > R$ 12 P95)
- Human review de 15% sample (≥9 execuções) aprovadas manualmente
- Cache hit ratio efetivo ≥ 65% (margem sobre os 75% esperados)

**Comando:** `/acme:promote copywriter-agent --to=assisted`

**Pré-requisito adicional:** `/acme:sla-threshold copywriter-agent` define SLA contratual.

### `ASSISTED → AUTONOMOUS` (alvo: 2026-06-11, após 14 dias em ASSISTED)

**Gates necessários:**

- 14 dias consecutivos com humano aprovando ≥ 95% das execuções
- 0 rejeições nos últimos 7 dias por motivo de tom/framework
- SLA achievement ≥ 95% sustentado
- Cliente piloto (Acme própria) endossa qualidade nos 3 tipos
- DeepAgent mensal `@reviewer` audit pass (C1-C8)
- ADR-001-CW funcionando (upsell de landing extendida usado em ≥ 5% das landings — valida demanda real)
- Re-roll rate médio ≤ 25% (não estoura buffer de unit economics)

**A partir deste ponto:** sistema cobra R$ 80 por entregável aprovado (R$ 110 para landing extendida upsell).

## Rollback

Cada transição pode ser revertida:
- `/acme:promote copywriter-agent --to=shadow` (de ASSISTED ou AUTONOMOUS)
- `/acme:promote copywriter-agent --to=draft` (de SHADOW)

**Quando reverter:**
- Pass rate cai abaixo de 70% por 24h
- Custo médio Tipo A ultrapassa R$ 12 P95 por 7 dias (zona de alerta)
- 3+ incidentes de diversity < 0,40 em uma semana (Tipo C)
- DeepAgent mensal reprova auditoria
- Cliente piloto rejeita > 15% das execuções por motivo de tom

## Métricas de saúde por stage

### draft
- Spec aprovada pelo po-guardian ⏳
- Unit economics dentro do limite C3 ✅ (R$ 3,55 médio ≤ R$ 20)
- Plan aprovado pelo artifact-architect ✅
- Eval-cases definidos ✅ (24 cases, 5 critical_path)
- ADRs locais formalizados ✅ (4 ADRs)

### SHADOW
- ≥ 60 execuções/semana coletadas (mix dos 3 tipos)
- Custo médio rastreado e dentro do esperado (≤ R$ 5 médio ponderado)
- Score eval ≥ 7,8 médio
- Bugs críticos = 0
- Cache hit ratio efetivo monitorado

### ASSISTED
- Human approval rate ≥ 95%
- Tempo de revisão humana < 5min/entregável
- Custo médio estável
- Re-roll rate ≤ 25%
- Upsell adoption ≥ 5% (para validar ADR-001-CW)

### AUTONOMOUS
- Receita gerada > custo total
- NPS de quem usa ≥ 8
- Audit mensal DeepAgent pass
- Custo Opus monitorado (alarme em #finance se P95 Tipo A > R$ 12)
- Handoff Designer Agent operacional (≥ 30% das landings consumidas downstream)

## Sinais de alerta antecipado

| Sinal | Threshold | Ação |
|-------|-----------|------|
| Cache hit ratio cai | < 60% por 3 dias | Investigar mudanças em system prompt / framework template |
| Diversity Tipo C cai | < 0,42 por 5 ad-sets seguidos | Ajustar Tree-of-Thought prompt |
| Tom drift detectado | > 10% das landings com flag | Revisar voice exemplars |
| Anthropic 529 rate | > 5% das chamadas | Acionar fallback Mistral (ADR-002-CW) |
| Schema_version migration | ≥ 1 mês sem rebase de Designer Agent | Comunicar mudança downstream |

## Próximo passo

→ Submeter `spec.md` para revisão final de `@po-guardian` (gate bloqueante de SHADOW)
→ Iniciar Wave 1 do plan.md em D2 do roadmap de 14 dias (paralelizado com social-media-agent Wave 4-5)
→ Confirmar com `@prompt-engineer` os 3 system prompts antes de Fase 2
→ Monitorar 4 fatores em SHADOW: preço Opus, cache hit ratio, re-roll rate, câmbio USD/BRL
