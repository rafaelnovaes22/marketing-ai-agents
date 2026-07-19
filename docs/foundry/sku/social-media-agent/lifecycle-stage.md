---
sku_id: social-media-agent
lifecycle_type: agentic
current_stage: draft
created_at: 2026-05-13
last_transition: 2026-05-13
---

# Lifecycle Stage — Social Media Agent

> Append-only log de transições de estado. Versão agentic_saas: SHADOW → ASSISTED → AUTONOMOUS.

## Estado atual

**`draft`** — spec criada, ainda não implementada.

## Histórico de transições

| Stage | Data | Aprovador | Gates aprovados | Notas |
|-------|------|-----------|-----------------|-------|
| `(new)` → `draft` | 2026-05-13 | @po-guardian (pending review) | Diagnose preliminar + spec inicial | Primeiro SKU do Novais Digital Social. Pipeline Foundry-12 Fase 2 aplicado pela primeira vez em projeto real consumidor. |

## Próximas transições previstas

### `draft → SHADOW` (alvo: 2026-05-19, fim Wave 6)

**Gates necessários (5):**

1. [ ] `@po-guardian` revisou e aprovou `spec.md` outcome contratual
2. [x] `@unit-economist` aprovou `unit-economics.md` (C3 ≤ 25%) — APROVADO 2026-05-13
3. [x] `@artifact-architect` aprovou `plan.md` (C5/C7) — APROVADO 2026-05-13
4. [ ] Eval-suite com ≥ 85% pass rate (`/novais-digital:eval social-media-agent`)
5. [ ] Coverage Tier B atingido (≥ 85% line, ≥ 80% branch)

**Comando para transição:** `/novais-digital:promote social-media-agent --to=shadow`

**Quem assina:** `@promotion-officer`

### `SHADOW → ASSISTED` (alvo: 2026-05-26, após 7 dias em SHADOW)

**Gates necessários:**

- 100+ execuções coletadas em SHADOW
- Score eval médio ≥ 8/10
- Brand consistency média ≥ 99%
- SLA achievement rate ≥ 95% (≤5% das execuções violam 8min)
- 0 incidentes de C3 violation
- Human review de 10% sample (≥10 execuções aprovadas manualmente)

**Comando:** `/novais-digital:promote social-media-agent --to=assisted`

**Pré-requisito adicional:** `/novais-digital:sla-threshold social-media-agent` define SLA contratual.

### `ASSISTED → AUTONOMOUS` (alvo: 2026-06-09, após 14 dias em ASSISTED)

**Gates necessários:**

- 14 dias consecutivos com humano aprovando todas as execuções
- 0 rejeições nos últimos 7 dias
- SLA achievement ≥ 95% sustentado
- Cliente piloto (Novais Digital própria) endossa qualidade
- DeepAgent mensal `@reviewer` audit pass (C1-C8)

**A partir deste ponto:** sistema cobra R$ 12 (ou R$ 16 upsell) por carrossel publicado.

## Rollback

Cada transição pode ser revertida:
- `/novais-digital:promote social-media-agent --to=shadow` (de ASSISTED ou AUTONOMOUS)
- `/novais-digital:promote social-media-agent --to=draft` (de SHADOW)

**Quando reverter:**
- Pass rate cai abaixo de 70% por 24h
- Custo médio ultrapassa R$ 3,00 por 7 dias
- 3+ incidentes de brand <90% em uma semana
- DeepAgent mensal reprova auditoria

## Métricas de saúde por stage

### draft
- Spec aprovada pelo po-guardian ✅
- Unit economics dentro do limite C3 ✅
- Plan aprovado pelo artifact-architect ✅
- Eval-cases definidos ✅

### SHADOW
- ≥ 50 execuções/semana coletadas
- Custo médio rastreado e dentro do esperado
- Score eval ≥ 8 médio
- Bugs críticos = 0

### ASSISTED
- Human approval rate ≥ 95%
- Tempo de revisão humana < 2min/carrossel
- Custo médio estável

### AUTONOMOUS
- Receita gerada > custo total
- NPS de quem usa ≥ 8
- Audit mensal DeepAgent pass

## Próximo passo

→ Submeter `spec.md` para revisão final de `@po-guardian`
→ Iniciar Wave 1 do plan.md (Setup TypeScript + adapters)
