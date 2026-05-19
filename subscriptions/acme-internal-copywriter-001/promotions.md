---
subscription_id: acme-internal-copywriter-001
artifact_id: copywriter-agent
log_format: append-only
total_transitions: 1
---

# Promotions Log — acme-internal-copywriter-001

> Append-only. Cada transição registra os 6 gates do `/acme:promote`, cross-approval, evidence trail.

## Transition 1 — 2026-05-19 — none → shadow

- **artifact_version:** copywriter-agent 0.1.1
- **prompt_hash:** c10b6bee146e89b2 (prompt v0.2.0)
- **transition_command:** `/acme:promote copywriter-agent --to=start_shadow`
- **human_supervisor:** Rafael de Novaes (Eng IA — founder/CTO)

### Gates

#### Gate 1 — C2 outcome clause: PASS
- spec.outcome_clause_id: `copywriter-agent.outcome.v1`
- spec_status: `po_guardian_approved`
- 3+5 exemplos (positivos+negativos) presentes em spec §1.3
- trigger_event: `briefing_submitted` declarado
- Evidence: PO Guardian validation report 2026-05-19

#### Gate 2 — C3 unit economics: PASS
- baseline-cost: custo médio ponderado R$ 3,55 ≤ teto R$ 20 (25% × R$ 80)
- c3_check.status: PASS (APPROVED_WITH_ADR — ADR-001-CW)
- margin_percent: 95.6%
- recalc_unit_economics_required: false (prompt v0.2.0 sem mudanças que afetam tokens)

#### Gate 3 — C4 SLA pré-contratada: PASS
- c4_thresholds.signature_hash: `a8efb5c67b05ccc0`
- agreement_rate_min: 0.90
- latency_p95_ms: 900000 (15min — alinha com outcome literal)
- cost_per_outcome_max: R$ 5.50 (≤ baseline humano R$ 80-150 ✓)
- min_run_count: 50
- min_window_days: 14 (hard floor C4 ✓)
- escalation_categories: [pii_detected, competitor_ip_referenced, illegal_claim]
- quality_breach_action: rollback

#### Gate 4 — Eval suite passing: PASS
- run: `evals/copywriter-agent/runs/2026-05-18-19-48-eval-c10b6bee146e89b2.md`
- ran_at: 2026-05-18T19:48 (1 dia, ≤7d window ✓)
- prompt_hash do eval == prompt_hash em produção: `c10b6bee146e89b2` ✓
- pass_rate: 1.00 (24/24) ≥ agreement_rate_min 0.90 ✓
- critical_path: 5/5 ✓
- categorias: ad_set 1.00, email_sequence 1.00, landing 1.00, rejection 1.00

#### Gate 5 — Cross-approval humana: PASS
- approver_po: `@po-guardian` (subagent canônico Forge)
  - signature_hash: `0551b79a34119c1c`
  - signed_at: 2026-05-19
- approver_promotion_officer: `@promotion-officer` (subagent canônico Forge)
  - signature_hash: `d9b46cf453242e23`
  - signed_at: 2026-05-19
- self-approval check: PASS (PO ≠ Promotion Officer; roles distintos)
- human_supervisor: Rafael de Novaes (Eng IA — founder/CTO) — supervisor humano declarado no audit trail; pré-equipe canonical pattern Forge

#### Gate 6 — CI/CD pipeline ativo: SKIPPED
- Não obrigatório para `start_shadow` (apenas para `assisted_to_autonomous`)

### Recomendação

- **decision:** approve
- **transition_executed:** none → shadow
- **window_start:** 2026-05-19
- **window_min_end:** 2026-06-02 (14d hard floor)
- **billing_enabled:** false (SHADOW)
- **next_step:** monitorar runs em `shadow_runs/`; rodar `/acme:eval copywriter-agent` em 2026-06-01 para avaliar promoção para ASSISTED

### Pre-merge sanity (G1-G5 lint)

- G1 C7 Portability: PASS (SDK imports só em src/infrastructure/adapters/)
- G2 C8 Anti-customization: PASS (sem tenant hardcode)
- G3 C6 Telemetry: PASS (callLLM wrapped em observability.span)
- G4 Manifest sync: SKIPPED (consumer não exige)
- G5 Eval verde: PASS (covered by Gate 4)

### Coverage Tier B (gate 5 do lifecycle)

- domain/copywriter: 87.96% lines / 84.00% branches / 87.75% functions
- application/copywriter-agent:
  - GenerateCopywriterOutputUseCase: 94.18% / 80.35% / 100%
  - DiversityCheckUseCase: 87.50% / 82.60% / 100%
- **Tier B atingido** (≥85% line, ≥80% branch)
