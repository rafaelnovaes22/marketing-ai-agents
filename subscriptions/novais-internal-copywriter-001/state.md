---
subscription_id: novais-digital-internal-copywriter-001
client_id: novais-digital-internal
artifact_id: copywriter-agent
artifact_version: 0.1.1
mode: shadow
started_at: 2026-05-19
shadow_window_started_at: 2026-05-19
shadow_window_eligible_promotion_at: 2026-06-02
last_transition_at: 2026-05-19
project_type: agentic_saas
ai_enabled: true
billing_enabled: false
---

# Subscription State — novais-digital-internal-copywriter-001

**Cliente:** Novais Digital própria (uso interno)
**Artifact:** copywriter-agent v0.1.1
**Mode atual:** `shadow`

## Mode semântica em SHADOW

- Agente RODA em produção (briefings reais geram outputs reais)
- **NÃO cobra** — `billing_enabled: false`
- Toda execução fica em `shadow_runs/` para revisão humana posterior
- LangSmith captura traces 100% (C6 audit)
- Pode rebaixar para `draft` (rollback) ou promover para `assisted` após janela mínima

## Próximas transições elegíveis

| Transição | Elegível a partir de | Gates adicionais |
|-----------|---------------------|------------------|
| `shadow_to_assisted` | 2026-06-02 (14d hard floor) | ≥50 runs + agreement ≥0.90 + eval recente |
| `rollback (→ draft)` | imediato | exige `rollback_reason` enum |

## Observações operacionais

- **Primeiro ship real do projeto Novais Digital Social.**
- Cliente piloto = Novais Digital própria (single-tenant fase 1, sem cliente externo).
- Decisor humano supervisor: Rafael de Novaes (Eng IA — founder/CTO).
- Após 14 dias em SHADOW, rodar `/novais-digital:eval copywriter-agent` recente e avaliar promoção.
