---
sku_id: designer-agent
lifecycle_type: agentic
current_stage: draft
created_at: 2026-05-13
last_transition: 2026-05-13
---

# Lifecycle Stage — Designer Agent

> Append-only log de transições. Versão agentic_saas: SHADOW → ASSISTED → AUTONOMOUS.

## Estado atual

**`draft`** — spec criada, plan + tasks + eval-cases definidos, ainda não implementado.

## Histórico de transições

| Stage | Data | Aprovador | Gates aprovados | Notas |
|-------|------|-----------|-----------------|-------|
| `(new)` → `draft` | 2026-05-13 | @po-guardian (pending review) | Diagnose + spec + unit-economics + plan + tasks + eval-cases criados | 2º SKU do Acme Social (após social-media-agent). Reaproveita Wave 2 do social-media (adapters image-gen + brand validator). |

## Próximas transições previstas

### `draft → SHADOW` (alvo: 2026-05-19, fim Wave 5)

**Gates necessários (6):**

1. [ ] `@po-guardian` revisou e aprovou `spec.md` outcome contratual + escopo negativo
2. [x] `@unit-economist` aprovou `unit-economics.md` (C3 R$ 2,03 ≤ R$ 5,00) — APROVADO 2026-05-13
3. [x] `@artifact-architect` aprovou `plan.md` (C5/C7) + reuso adapters Wave 2 — APROVADO 2026-05-13
4. [ ] Eval-suite com ≥ 88% pass rate (`/acme:eval designer-agent`)
5. [ ] **Concordância humano × `BrandValidatorAdapter` ≥ 90%** (calibration-set 50 imagens) — GATE INQUEBRANTÁVEL
6. [ ] Coverage Tier B atingido (≥ 85% line, ≥ 80% branch)

**Comando para transição:** `/acme:promote designer-agent --to=shadow`

**Quem assina:** `@promotion-officer`

### `SHADOW → ASSISTED` (alvo: 2026-05-26, após ~7 dias em SHADOW)

**Gates necessários:**

- ≥100 carrosséis gerados em SHADOW (≥700 slides)
- Score eval médio ≥ 8/10
- **Brand consistency individual média ≥ 99% (gate hard, não média ponderada)**
- SLA achievement rate ≥ 95% (≤5% violam 20min)
- Re-roll rate observado ≤ 25%
- 0 incidentes de C3 violation
- Human review de 10% sample (≥10 carrosséis aprovados manualmente)
- Concordância humano × validator mantida ≥ 90% no calibration-set

**Comando:** `/acme:promote designer-agent --to=assisted`

**Pré-requisito adicional:** `/acme:sla-threshold designer-agent` define SLA contratual (20min + brand ≥99 + max cost R$3).

### `ASSISTED → AUTONOMOUS` (alvo: 2026-06-09, após 14 dias em ASSISTED)

**Gates necessários:**

- 14 dias consecutivos com humano aprovando todas as execuções
- 0 rejeições humanas nos últimos 7 dias
- SLA achievement ≥ 95% sustentado
- Cross-judge agreement ≥ 85% sustentado
- Acme própria (cliente piloto) endossa qualidade
- DeepAgent mensal `@reviewer` audit pass (C1-C8)
- Calibration drift mensal dentro do limite (≤3pp degradação)

**A partir deste ponto:** sistema cobra **R$ 20** por carrossel padrão (7 slides) ou **R$ 15** variante econômica (5 slides). Cobrança via composição:
- Se `caller == 'social-media-agent'`: cobra cliente final (carrossel + caption + publicação)
- Se `caller == 'client_direct'`: cobra apenas o design (R$ 20 ou R$ 15)

## Rollback

Cada transição pode ser revertida:
- `/acme:promote designer-agent --to=shadow` (de ASSISTED ou AUTONOMOUS)
- `/acme:promote designer-agent --to=draft` (de SHADOW)

**Quando reverter:**
- Brand consistency individual <99% em >5% dos slides por 24h
- Concordância humano × validator cai <85%
- Custo médio ultrapassa R$ 4 por 7 dias
- Re-roll rate >40% por 3 dias
- 3+ incidentes de slide `degraded: true` em 1 semana
- DeepAgent mensal reprova auditoria

## Métricas de saúde por stage

### draft
- Spec aprovada pelo po-guardian ⏳
- Unit economics dentro do limite C3 ✅
- Plan aprovado pelo artifact-architect ✅
- Tasks decompostas em 5 waves ✅
- Eval-cases definidos (26 cases + 6 critical_path) ✅
- Curadoria 50 imagens em progresso (DES-T4.1)

### SHADOW
- ≥ 50 carrosséis/semana coletados
- Custo médio rastreado dentro de R$ 2,03 ± 20%
- Score eval ≥ 8 médio
- Bugs críticos = 0
- Validator calibration drift monitor semanal

### ASSISTED
- Human approval rate ≥ 95%
- Tempo médio de revisão humana < 1min/carrossel
- Custo médio estável
- Composability: chamadas de social-media-agent funcionam sem ajuste

### AUTONOMOUS
- Receita gerada > custo total
- NPS de quem usa ≥ 8
- Audit mensal DeepAgent pass
- Calibration drift mensal ≤3pp

## Composability — sinais de saúde

Como designer-agent pode ser chamado por outros agentes (ADR-004-DES), monitorar:
- Ratio `caller=social-media-agent` vs `caller=client_direct`
- Latência adicional do handoff (~500ms target via in-process call; ~2s via API call)
- Erros de contrato (mismatch de Zod schema) — meta: 0

## Próximo passo

→ Submeter `spec.md` para revisão final de `@po-guardian`
→ Iniciar Wave 1 do `plan.md` (Foundation com REUSO) **após Wave 2 do social-media-agent estabilizar**
→ Iniciar curadoria das 50 imagens (DES-T4.1) **em paralelo** com Wave 1
