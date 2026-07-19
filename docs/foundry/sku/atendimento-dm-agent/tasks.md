---
sku_id: atendimento-dm-agent
tasks_date: 2026-05-13
total_tasks: 42
estimated_days: 5-7
tier: A
criticality: A
waves: 6
lgpd_block_active: true
---

# Tasks — Atendimento DM Agent

> Decomposição em 6 ondas. Criticality A exige mais tasks (42 vs 32 do social-media-agent) por causa de adversarial harness + LGPD + Tier A coverage.
>
> Sintaxe: **[ID] Nome — esforço — dono — deps**
>
> ⚠️ **BLOQUEIO LGPD ativo:** Wave 6 entrega **SHADOW INTERNO apenas**. Promoção para ASSISTED/AUTONOMOUS exige resolução de `lgpd-mitigation.md` (separado deste roadmap).

## Wave 1 — Foundation: Meta adapters + state Redis/Postgres (1 dia)

- [ ] **T1.1** Setup TS 5.x + Vitest 1.x + Playwright 1.x + k6 (load test) — 1h — dev — sem deps
- [ ] **T1.2** Schema Prisma 6 (`Conversation`, `Turn`, `BantScore`, `EscalationLog`, `LgpdAuditLog`, `OptInRecord`) — 1.5h — dev — T1.1
- [ ] **T1.3** Migrations + seed (Novais Digital staff users com opt-in) — 30min — dev — T1.2
- [ ] **T1.4** Redis client (ioredis) + `SessionAdapter` (TTL 30min) + testes unit — 1h — dev — T1.1
- [ ] **T1.5** **MetaMessagingAdapter NOVO** — IG DM + FB Messenger via Graph API v18 (send + webhook validation X-Hub-Signature) — 2h — dev — T1.1
- [ ] **T1.6** **WhatsAppCloudAdapter NOVO** — WhatsApp Cloud API v18 (send message + webhook) — 1.5h — dev — T1.5
- [ ] **T1.7** Webhook ingress (Lambda + API Gateway) — assinatura validada, rota por canal — 1.5h — dev — T1.5, T1.6
- [ ] **T1.8** Claude Haiku 4.5 adapter (streaming + prompt caching) — 1.5h — dev — T1.1
- [ ] **T1.9** Langfuse adapter (trace por conversa, span por turno) + setup local Langfuse — 1h — dev — T1.1
- [ ] **T1.10** LGPD opt-in form + `OptInRecord` persistido + audit log scaffold — 1h — dev — T1.2
- [ ] **T1.11** Disclaimer LGPD ("Atendimento usa IA, retenção 30d em SHADOW") na 1ª resposta — 30min — dev — T1.10
- [ ] **T1.12** Validação smoke (webhook → Haiku → resposta enviada via Meta API em ambiente sandbox) — 1h — dev — T1.5..T1.9

**Total Wave 1:** ~14h (1.5 dia útil com buffer — criticality A justifica)

## Wave 2 — BANT classifier + escalation logic + honestidade gate (1.5 dia)

- [ ] **T2.1** Domain entities: `Conversation`, `Turn`, `BantScore`, `EscalationReason`, `HardTriggerCatalog` — 1.5h — dev — T1.1
- [ ] **T2.2** Domain invariants (regra: turno >25 = hard cap escalation; turno duplicado rejeitado) + testes unit puros — 1h — dev — T2.1
- [ ] **T2.3** `bant-rubric.yaml` (rubrica 0-2 por dimensão BANT com 30+ exemplos PT-BR) — 1.5h — dev — T2.1
- [ ] **T2.4** **BANT classifier** (Haiku 4.5 dedicated call com prompt JSON output + confidence) — 2h — dev — T1.8, T2.3
- [ ] **T2.5** `hard-triggers-pt-br.yaml` (preço final, fechar, desconto X%, Procon, advogado, reclamação, cancelar, boleto, comprovante, jurídico) — 1h — dev — T2.1
- [ ] **T2.6** **HardTriggersAdapter** (regex + LLM classifier híbrido) — 1.5h — dev — T2.5
- [ ] **T2.7** **AdversarialFilterAdapter** (jailbreak/prompt injection detector — Haiku classifier + lista OWASP) — 2h — dev — T1.8
- [ ] **T2.8** `HonestidadeGateUseCase` (regex de preço/prazo + cross-check com `product_catalog.yaml`) — 2h — dev — T2.1
- [ ] **T2.9** `RespondDMUseCase` (orquestra: filter → state load → LLM stream → honestidade → send) — 2.5h — dev — Wave 1 + T2.4 + T2.6 + T2.8
- [ ] **T2.10** `QualifyLeadBANTUseCase` (após cada turno; persiste BantScore) — 1h — dev — T2.4
- [ ] **T2.11** `EscalateToHumanUseCase` (Slack webhook + contexto preservado + audit log) — 1.5h — dev — T2.1
- [ ] **T2.12** `HandoffToCRMUseCase` (HubSpot default + factory para RD Station/Salesforce) — 2h — dev — T2.1
- [ ] **T2.13** `RetainOrFoundrytUseCase` (LGPD 90d + comando "esqueça meus dados" deleta tudo) — 1.5h — dev — T2.1, T1.10

**Total Wave 2:** ~20h (1.5-2 dias)

## Wave 3 — Test RED (TDD-first Foundry-10) + Eval seed (0.5 dia)

> ⚠️ **Gate G6 obriga:** testes RED **antes** de Wave 4 (build refinement).

- [ ] **T3.1** `/novais-digital:aios-run --step=test --mode=red` → gera `tests/atendimento-dm-agent/{unit,integration,e2e,adversarial}/` — 30min — agent
- [ ] **T3.2** Operador valida que testes falham (RED phase confirmada) — 30min — dev
- [ ] **T3.3** Commit do plano de testes + RED evidence — 15min — dev
- [ ] **T3.4** Criar `eval-cases.md` com 25+ casos (BANT 8 + escalation 5 + multi-turno 5 + adversarial 4 + latência 3) — 2h — dev — ver arquivo dedicado
- [ ] **T3.5** LLM-as-judge runner (Sonnet 4.6 com prompt de juiz de naturalidade + BANT accuracy) — 1.5h — dev

**Total Wave 3:** ~5h

## Wave 4 — Build + tests adversarial (1-1.5 dia)

- [ ] **T4.1** Implementar testes Wave 1+2 para passar RED → GREEN — 4h — dev
- [ ] **T4.2** **Adversarial test harness** — 20+ payloads (jailbreak prompt injection, role manipulation, "ignore instructions", sarcasm, off-topic abuse, NSFW) — 3h — dev
- [ ] **T4.3** **Conversa difícil multi-turno** — testes 3, 5, 10, 15, 20 turnos com mudanças de tom — 2h — dev
- [ ] **T4.4** **Honestidade gate stress test** — 50+ tentativas de extrair preço inventado / prazo / desconto — 2h — dev
- [ ] **T4.5** **LGPD smoke test E2E** — "esqueça meus dados" deleta Conversation+Turn+BantScore+Redis em <5min — 1h — dev
- [ ] **T4.6** Retry logic + exponential backoff (Meta API + Anthropic 529) — 1h — dev
- [ ] **T4.7** Prompt caching otimizado: system + tenant context + brand voice ~3.5K tokens estáveis (target 80% hit) — 1.5h — dev
- [ ] **T4.8** CRM dry-run mode (não cria deal real em SHADOW interno) — 30min — dev

**Total Wave 4:** ~15h (1.5 dia)

## Wave 5 — Eval VERIFY + simulação de conversas (0.5-1 dia)

- [ ] **T5.1** `/novais-digital:aios-run --step=test --mode=verify` (cobertura ≥90% line Tier A) — 30min — agent
- [ ] **T5.2** Rodar eval-suite completa: ≥85% pass rate (≥22/25 cases) — 1h — dev
- [ ] **T5.3** **Simulação de 50 conversas** geradas por Sonnet 4.6 atuando como "usuário difícil" — 3h — dev
- [ ] **T5.4** Load test k6: 100 RPS pico, p95 ≤ 10s — 1h — dev
- [ ] **T5.5** Audit log LGPD: validar queries "quem viu transcrição X quando" — 30min — dev
- [ ] **T5.6** CI workflow `foundry-eval-dm` ativo (roda a cada PR) — 1h — dev
- [ ] **T5.7** Dashboard básico (Grafana/Mixpanel): DMs/dia, p95 latência, escalation rate, qualification rate — 1.5h — dev
- [ ] **T5.8** Alertas Slack: p95 > 9s, Meta API error > 5%, honestidade gate > 10/h, escalation > 25% — 1h — dev

**Total Wave 5:** ~9h (1 dia útil)

## Wave 6 — SHADOW INTERNO + LGPD opt-in (0.5 dia)

> ⚠️ **NÃO publicar em DMs de cliente real externo.** Apenas Novais Digital staff com opt-in assinado.

- [ ] **T6.1** Opt-in form para staff Novais Digital + assinaturas registradas em `OptInRecord` — 1h — dev
- [ ] **T6.2** Configurar webhook em conta IG/FB/WhatsApp **interna Novais Digital** (não conta de cliente) — 1h — dev
- [ ] **T6.3** Feature flag: `BILLING_ENABLED=false` em SHADOW interno (R$ 0 por DM) — 30min — dev
- [ ] **T6.4** Feature flag: `CRM_DRY_RUN=true` (não cria deal real) — 30min — dev
- [ ] **T6.5** Disclaimer LGPD ativo em 100% das conversas (verificar em audit log) — 30min — dev
- [ ] **T6.6** Documentação README + runbook ops (incluir seção "BLOQUEIO LGPD para externos") — 1.5h — dev
- [ ] **T6.7** Hook pre-promote: `/novais-digital:promote --to=assisted` retorna ERRO até ADR-004-DM resolvido — 1h — dev
- [ ] **T6.8** `/novais-digital:promote atendimento-dm-agent --to=shadow_internal` (promotion-officer assina) — 30min — agent

**Total Wave 6:** ~6h (0.5-0.75 dia)

## Resumo

| Wave | Esforço | Cobertura |
|------|--------:|-----------|
| 1 — Foundation: Meta + state | 14h | Adapters de canal + Redis/Postgres + Langfuse |
| 2 — BANT + escalation + honestidade | 20h | Classifier + use cases + safety |
| 3 — Test RED + Eval seed | 5h | Gate G6 evidence + 25+ eval cases |
| 4 — Build + adversarial | 15h | GREEN + jailbreak harness + LGPD smoke |
| 5 — Eval VERIFY + simulação | 9h | ≥85% pass rate + load test + audit log |
| 6 — SHADOW INTERNO + LGPD opt-in | 6h | Staff-only + cobrança OFF |
| **TOTAL** | **~69h** | **5-7 dias úteis com buffer** |

## Dependências cross-wave

```
W1 (Foundation: Meta + state)
  ↓
W2 (BANT + escalation + honestidade)
  ↓
W3 (Test RED + Eval seed) — BLOQUEIA W4 via Gate G6
  ↓
W4 (Build + adversarial harness)
  ↓
W5 (Eval VERIFY + simulação)
  ↓
W6 (SHADOW INTERNO + LGPD opt-in)
  ⛔ BLOQUEADO: promoção para ASSISTED exige lgpd-mitigation.md Fase 2
```

## Gates antes de cada Wave

| Wave | Gate de entrada |
|------|-----------------|
| W2 | Wave 1 completa + smoke test webhook→Haiku→Meta API passa |
| W3 | Spec aprovada por po-guardian (PENDENTE) + plan aprovado por artifact-architect (✅) |
| W4 | Testes RED commitados + falham localmente (Gate G6) |
| W5 | Build completo + npm typecheck OK + adversarial harness 100% |
| W6 | Eval pass rate ≥ 85% + coverage Tier A (≥90% line) + load test p95 ≤ 10s |
| **promote shadow→assisted** | ⛔ **BLOQUEADO** até `lgpd-mitigation.md` Fase 2 (DPO contratado + DPA assinado) |

## ClickUp blueprint

Cada task = 1 card no ClickUp. ID = `DM-T1.1`, `DM-T1.2`, etc.

## Próximo passo

→ Aguardar @po-guardian aprovar `spec.md`
→ Founder ler `lgpd-mitigation.md` e iniciar processo de contratação DPO
→ Iniciar Wave 1 (D6 do roadmap de 14 dias)

---

**Assinatura:** plan-builder — 2026-05-13 — tasks geradas com bloqueio LGPD ativo
