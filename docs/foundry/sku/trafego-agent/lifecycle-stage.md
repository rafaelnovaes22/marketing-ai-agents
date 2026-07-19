---
sku_id: trafego-agent
lifecycle_type: agentic
current_stage: draft
created_at: 2026-05-13
last_transition: 2026-05-13
priority: P1
---

# Lifecycle Stage — Gestor de Tráfego Agent

> Append-only log de transições de estado. Versão agentic_saas: SHADOW → ASSISTED → AUTONOMOUS.
>
> **Nota específica deste SKU:** campanha Meta tem ciclo de vida típico de **14 dias** (com renovação opcional). Métricas de saúde devem considerar janelas múltiplas desse ciclo (mínimo 30 dias para AUTONOMOUS).

## Estado atual

**`draft`** — diagnostic + spec + unit-economics + plan + tasks + eval-cases criados. Ainda não implementado.

## Histórico de transições

| Stage | Data | Aprovador | Gates aprovados | Notas |
|-------|------|-----------|-----------------|-------|
| `(new)` → `draft` | 2026-05-13 | @po-guardian (pending review) | Diagnose + spec + unit-economics + plan | SKU P1 do Novais Digital Social. Implementação prevista para D7 do roadmap 14d. |

## Próximas transições previstas

### `draft → SHADOW` (alvo: D11-D12 do roadmap)

**Gates necessários (6):**

1. [ ] `@po-guardian` revisou e aprovou `spec.md` outcome contratual + separação ad spend (1.4)
2. [x] `@unit-economist` aprovou `unit-economics.md` (C3 ≤ 25%) — APROVADO 2026-05-13 (folga 48%)
3. [x] `@artifact-architect` aprovou `plan.md` (C5/C7 — adapter versionado Meta) — APROVADO 2026-05-13
4. [ ] Eval-suite com ≥ 85% pass rate (`/novais-digital:eval trafego-agent`) — incluindo bandit convergência ≥70%
5. [ ] Coverage Tier B atingido (≥ 85% line, ≥ 80% branch)
6. [ ] Integration tests sandbox Meta passam (5 campanhas criadas+deletadas sem erro)

**Comando para transição:** `/novais-digital:promote trafego-agent --to=shadow`

**Quem assina:** `@promotion-officer`

### `SHADOW → ASSISTED` (alvo: D11-D12 + 7 dias após SHADOW)

**Gates necessários:**

- 50+ campanhas criadas em SHADOW na conta Novais Digital própria
- Bandit observado em ≥ 3 ciclos completos (12h × 3 = ~36h) por campanha
- ≥ 7 dias contínuos em SHADOW
- Score eval médio ≥ 8/10
- SLA setup achievement rate ≥ 95% (≤5% das execuções violam 300s)
- Meta rejection rate ≤ 10% (campanhas com ≥1 ad rejeitado em 1ª submissão)
- Bandit convergência observada em ≥ 70% das campanhas em ≤24h
- 0 incidentes de C3 violation (custo > R$ 12,50)
- 0 incidentes de Special Ad Category aceito por erro (ADR-005-TF)
- Human review de 10% sample (≥5 campanhas aprovadas manualmente por gestor de tráfego sênior)
- Mixpanel attribution loss ≤ 10%

**Comando:** `/novais-digital:promote trafego-agent --to=assisted`

**Pré-requisito adicional:** `/novais-digital:sla-threshold trafego-agent` define SLA contratual (300s setup, **não** tempo Meta aprovar).

### `ASSISTED → AUTONOMOUS` (alvo: ~14 dias após ASSISTED, ou seja, D40+ do roadmap)

**Gates necessários:**

- 14 dias consecutivos com humano aprovando ≥95% das execuções (gestor de tráfego sênior revisa estratégia+targeting antes de publicar)
- 0 rejeições humanas nos últimos 7 dias
- SLA setup achievement ≥ 95% sustentado
- ROAS médio das campanhas em ASSISTED ≥ baseline humano (comparativo direto)
- Cliente piloto (Novais Digital própria) endossa qualidade subjetivamente
- DeepAgent mensal `@reviewer` audit pass (C1-C8)
- Contrato com cláusula explícita de separação ad spend / SKU fee assinado (ADR-004-TF)

**A partir deste ponto:** sistema cobra R$ 50 por campanha publicada automaticamente + ciclos de bandit. Cliente paga ad spend separadamente direto à Meta.

## Rollback

Cada transição pode ser revertida:
- `/novais-digital:promote trafego-agent --to=shadow` (de ASSISTED ou AUTONOMOUS)
- `/novais-digital:promote trafego-agent --to=draft` (de SHADOW)

**Quando reverter:**
- Pass rate cai abaixo de 70% por 24h
- Custo médio ultrapassa R$ 12,50 (C3) por 7 dias
- Meta rejection rate > 20% em 7 dias
- 3+ incidentes de Special Ad Category passou (ADR-005-TF) em 30 dias
- Conta Meta entra em status `disabled_for_policy` ou `under_review`
- Mixpanel attribution loss > 25%
- Bandit convergência <50% em 30 dias (algorithm não está aprendendo)
- DeepAgent mensal reprova auditoria

## Métricas de saúde por stage

### draft
- Spec aprovada pelo po-guardian (pending)
- Unit economics dentro do limite C3 ✅
- Plan aprovado pelo artifact-architect ✅
- Eval-cases definidos ✅
- ADRs 001-005-TF documentados ✅

### SHADOW
- ≥ 50 campanhas criadas/semana em conta Novais Digital
- Bandit cycle rodando a cada 4h por ≥3 campanhas simultaneamente
- Custo médio rastreado e dentro de R$ 12,50 (C3)
- Score eval ≥ 8 médio
- Bugs críticos = 0
- Meta API errors < 5% das chamadas

### ASSISTED
- Human approval rate ≥ 95%
- Tempo de revisão humana < 5min/campanha
- ROAS médio comparável a baseline humano
- Bandit convergência observada ≥ 70% das campanhas
- Custo médio estável

### AUTONOMOUS
- Receita gerada (R$ 50 × campanhas) > custo total
- NPS de quem usa ≥ 8
- Audit mensal DeepAgent pass
- Contrato com separação ad spend / SKU fee universal

## Considerações específicas do ciclo de campanha (14 dias)

> Campanhas Meta têm ciclo natural de 7-30 dias. Métricas de saúde devem usar **janela móvel de 30 dias** (não 7) para AUTONOMOUS, garantindo que:
> 1. Bandit convergência é observada em ≥3 ciclos completos.
> 2. ROAS é estável (sem viés de novidade).
> 3. Renovações automáticas (após 14 dias) são contabilizadas como SKU charges separados (ADR a documentar se padrão emergir).

## Próximo passo

→ Submeter `spec.md` para revisão final de `@po-guardian` (focar 1.4 separação contratual)
→ Iniciar Wave 1 do plan.md (T1.1 lead time Meta BM IMEDIATAMENTE)
→ Solicitar revisão legal/compliance da cláusula Special Ad Categories
