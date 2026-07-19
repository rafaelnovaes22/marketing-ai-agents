---
sku_id: atendimento-dm-agent
plan_date: 2026-05-13
audited_by: "@artifact-architect (Guardian)"
status: APPROVED_WITH_LGPD_BLOCK
plan_template: aios-tdd-first (Foundry-10)
implementation_window_days: 5
tier: A
criticality: A
lgpd_block_active: true
external_clients_blocked_until: "DPO designado + DPA LGPD assinado"
---

# Plan Técnico — Atendimento DM Agent

> ⚠️ **CRITICALITY A + BLOQUEIO LGPD ATIVO** — único SKU em tempo real do portfólio. 5 dias úteis de implementação (vs 4 dos demais) porque rigor adversarial + LGPD exigem mais.
>
> **SHADOW interno apenas.** Promoção para ASSISTED/AUTONOMOUS está bloqueada até founder contratar DPO ou DPO-as-a-service. Detalhes em `lgpd-mitigation.md`.

## 1. Resumo executivo

**5 dias de implementação** seguindo pipeline AIOS TDD-first adaptado para criticality A:

1. **Foundation** (1 dia) — adapters de canal (IG/FB/WhatsApp) + state Redis/Postgres + Langfuse
2. **Core conversacional** (1.5 dias) — BANT classifier + use cases + honestidade gate
3. **Test RED + Eval seed** (0.5 dia) — testes RED + 25+ eval cases (adversarial-heavy)
4. **Build + adversarial harness** (1 dia) — implementação + jailbreak/abuse tests
5. **Eval VERIFY + simulação** (0.5 dia) — eval-suite + conversas simuladas multi-turno
6. **SHADOW interno + LGPD opt-in** (0.5 dia) — apenas Novais Digital staff, sem dados reais de cliente

**Pipeline:** `spec → schema → test(red) → build(back) → test(verify) → adversarial → review → shadow_interno`

## 2. Arquitetura (3 camadas — C7)

```
┌─────────────────────────────────────────────────────────────┐
│  src/domain/conversation/                                    │
│  Entidades puras, sem deps externas                          │
│  • Conversation (turns, channel, tenant, lgpd_opt_in)        │
│  • Turn (user_message, agent_response, latency, bant_after)  │
│  • BantScore (B, A, N, T: 0-2; confidence: 0-1)              │
│  • EscalationReason (low_conf | hard_trigger | adversarial)  │
│  • HardTriggerCatalog (preço, Procon, jurídico, ...)         │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  src/application/atendimento-dm-agent/                       │
│  Use cases, orquestra domain                                 │
│  • RespondDMUseCase (turno completo: webhook → resposta)     │
│  • QualifyLeadBANTUseCase (classifier após cada turno)       │
│  • HandoffToCRMUseCase (se qualified + conf ≥ 0.7)           │
│  • EscalateToHumanUseCase (Slack + contexto preservado)      │
│  • HonestidadeGateUseCase (bloqueia alucinação preço/prazo)  │
│  • RetainOrFoundrytUseCase (LGPD 90d + direito esquecimento)   │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  src/infrastructure/adapters/                                │
│  Adapters para SDKs externos                                 │
│  • channels/meta-messaging-adapter.ts (IG DM + FB Messenger) │
│  • channels/whatsapp-cloud-adapter.ts (WhatsApp Cloud API)   │
│  • llm/claude-haiku-adapter.ts (Anthropic Haiku 4.5 stream)  │
│  • classifier/bant-classifier-adapter.ts (Haiku dedicated)   │
│  • crm/hubspot-adapter.ts (default free tier)                │
│  • crm/crm-factory.ts (per-tenant: rd-station, salesforce)   │
│  • state/redis-session-adapter.ts (TTL 30min sessão ativa)   │
│  • state/postgres-conversation-adapter.ts (persistência 90d) │
│  • safety/hard-triggers-adapter.ts (regex + LLM classifier)  │
│  • safety/adversarial-filter-adapter.ts (jailbreak detector) │
│  • escalation/slack-adapter.ts (webhook tenant-specific)     │
│  • observability/langfuse-adapter.ts                         │
│  • lgpd/audit-log-adapter.ts (quem viu transcrição quando)   │
└─────────────────────────────────────────────────────────────┘
```

**Princípio C7:** trocar Haiku 4.5 → outro LLM = 1 arquivo. Adicionar Telegram = 1 arquivo. Trocar HubSpot por RD Station per-tenant = factory resolve em runtime.

## 3. Fase 1 — Foundation (1 dia)

### Entregáveis

| Item | Stack | Tier |
|------|-------|:----:|
| Setup TS 5.x + Vitest 1.x + Playwright 1.x | TS + Vitest + Playwright | A |
| Schema Prisma (`Conversation`, `Turn`, `BantScore`, `EscalationLog`, `LgpdAuditLog`) | PostgreSQL 16 + Prisma 6 | A |
| Migrations + seed (Novais Digital staff users opt-in) | Prisma | A |
| Redis client + session adapter (TTL 30min) | Redis 7 + ioredis | A |
| **MetaMessagingAdapter NOVO** — IG DM + FB Messenger via Graph API v18 | Meta Graph SDK | A |
| **WhatsAppCloudAdapter NOVO** — WhatsApp Cloud API v18 | Meta WhatsApp SDK | A |
| Webhook ingress (API Gateway → Lambda) + assinatura X-Hub | AWS Lambda + APIGW | A |
| Claude Haiku 4.5 adapter (streaming) | Anthropic SDK | A |
| Langfuse adapter (trace por conversa, span por turno) | Langfuse SDK | A |
| LGPD opt-in form + audit log scaffold | Custom | A |
| Disclaimer LGPD ("este atendimento usa IA, retenção X dias") | Custom | A |

### Output esperado fim Fase 1

- ✅ `npm run typecheck` passa
- ✅ Webhook ingress recebe POST do Meta Graph (assinatura validada)
- ✅ Haiku 4.5 responde "ping" em < 5s
- ✅ Redis persiste sessão e expira em 30min
- ✅ Postgres registra `Conversation` + `Turn` com `lgpd_opt_in_at` carimbado
- ✅ Langfuse mostra trace de teste

## 4. Fase 2 — Core conversacional (1.5 dias)

### Entregáveis

| Item | Camada | Tier |
|------|--------|:----:|
| Domain entities + invariants (regra: turno >25 = hard cap) | domain | A |
| `RespondDMUseCase` (webhook → resposta enviada) | application | A |
| `QualifyLeadBANTUseCase` (classifier dedicado Haiku) | application | A |
| `HonestidadeGateUseCase` (regex+LLM bloqueia preço/prazo) | application | A |
| `EscalateToHumanUseCase` (Slack + contexto preservado) | application | A |
| `HandoffToCRMUseCase` (HubSpot factory) | application | A |
| `RetainOrFoundrytUseCase` (LGPD 90d + delete via "esqueça meus dados") | application | A |
| **CRMAdapter NOVO** — HubSpot default + factory para RD Station/Salesforce | infrastructure | A |
| Hard triggers catalog (YAML: preço, Procon, jurídico, cancelar, advogado, boleto) | infrastructure | A |
| Adversarial filter (jailbreak/prompt injection) | infrastructure | A |
| Prompt caching: system + tenant context + brand voice (~3.5K tokens estáveis) | infrastructure | A |

### Decisão de roteamento (por turno)

```typescript
async function handleTurn(webhook: MetaWebhookPayload): Promise<TurnResult> {
  // 1. Adversarial / hard-trigger filter (regex + LLM classifier)
  if (await hardTriggers.matches(webhook.message)) {
    return escalateToHuman({ reason: 'hard_trigger', context });
  }
  if (await adversarialFilter.isJailbreakAttempt(webhook.message)) {
    return escalateToHuman({ reason: 'adversarial', context });
  }

  // 2. LGPD opt-in check (1ª resposta = disclaimer obrigatório)
  if (!conversation.lgpdOptInAt) {
    return sendDisclaimerAndWaitConsent();
  }

  // 3. LLM resposta + BANT (paralelo)
  const [response, bant] = await Promise.all([
    haiku.streamResponse(prompt),       // p95 ≤ 5s
    bantClassifier.classify(history),   // p95 ≤ 2s
  ]);

  // 4. Honestidade gate (bloqueia alucinação)
  if (await honestidadeGate.violates(response, tenant.product_catalog)) {
    return escalateToHuman({ reason: 'honestidade_block', context });
  }

  // 5. Decisão final
  if (bant.qualified && bant.confidence >= 0.7) {
    await crm.handoff(conversation, bant);
    return { type: 'qualified', bill: 5 };  // R$ 5
  }
  if (bant.confidence < 0.7 && bant.qualified) {
    return escalateToHuman({ reason: 'low_confidence', context });
  }
  return { type: 'continue', bill: 0 };
}
```

### Output esperado fim Fase 2

- ✅ `npm test:unit` passa (coverage ≥90% Tier A — criticality A exige mais que B)
- ✅ Conversa 5-turnos end-to-end com mocks
- ✅ Honestidade gate bloqueia "R$ 1.997/mês" inventado
- ✅ Hard trigger escala em "preço final fechado"

## 5. Fase 3 — Test RED + Eval seed (0.5 dia)

### Entregáveis

| Item | Detalhe |
|------|---------|
| Test RED via `/novais-digital:aios-run --step=test --mode=red` | tests/atendimento-dm-agent/{unit,integration,e2e,adversarial}/ |
| Operador valida RED phase | `npm test` falha conforme esperado |
| `eval-cases.md` com 25+ cenários (adversarial-heavy) | Ver arquivo dedicado |
| LLM-as-judge runner (Sonnet 4.6) | Avalia naturalidade + BANT accuracy |

## 6. Fase 4 — Build + adversarial harness (1 dia)

### Entregáveis

| Item | Detalhe |
|------|---------|
| Implementar tests RED → GREEN | Cobertura ≥90% line, ≥85% branch (Tier A) |
| **Adversarial test harness** | 20+ payloads de jailbreak/abuse/sarcasm |
| Conversação multi-turno simulada | 3, 5, 10, 15, 20 turnos |
| Honestidade gate stress test | 50+ tentativas de extrair preço inventado |
| LGPD smoke: "esqueça meus dados" deleta tudo | E2E |

## 7. Fase 5 — Eval VERIFY + simulação (0.5 dia)

### Entregáveis

| Item | Detalhe |
|------|---------|
| `/novais-digital:aios-run --step=test --mode=verify` | Cobertura + gaps |
| Eval-suite pass rate ≥ 85% (≥22/25) | LLM-as-judge + assertions automáticas |
| Latência p95 ≤ 10s em load test (100 RPS pico) | k6 load test |
| Audit log LGPD funcional | Queries de "quem viu, quando" |
| CI workflow `foundry-eval-dm` ativo | Roda a cada PR |

## 8. Fase 6 — SHADOW INTERNO + LGPD opt-in (0.5 dia)

> ⚠️ **NOTA CRÍTICA:** SHADOW interno significa **APENAS Novais Digital staff** respondendo DMs simulados/internos com opt-in assinado. **ZERO dados de cliente real externo.**

### Entregáveis

| Item | Detalhe |
|------|---------|
| Opt-in form criado + assinado por staff Novais Digital | Custom + audit log |
| Disclaimer LGPD ativo: "Atendimento usa IA, retenção 30 dias em SHADOW" | Custom |
| Webhook conectado apenas em conta IG/FB/WhatsApp **interna** Novais Digital | Meta Business |
| Cobrança DESLIGADA (R$ 0 em SHADOW interno) | Feature flag |
| `/novais-digital:promote atendimento-dm-agent --to=shadow_internal` | promotion-officer assina |
| **BLOQUEIO automático:** tentativa de `--to=assisted` retorna erro até ADR-004-DM resolvido | Hook pre-promote |

### Output esperado fim Fase 6

- ✅ Novais Digital staff envia DMs de teste, recebe respostas em <10s
- ✅ BANT registrado, mas CRM em modo dry-run (não cria deal real)
- ✅ Langfuse mostra 100% das conversas com `tenant=novais_internal` e `mode=shadow_internal`
- ✅ Audit log mostra quem opt-in, quando, quem acessou transcrições
- ✅ **Promoção para ASSISTED bloqueada mecanicamente** até LGPD resolvido (ver `lgpd-mitigation.md`)

## 9. Workflow AIOS TDD-first (Foundry-10) adaptado para criticality A

```bash
# 1. Spec validada
@po-guardian valida spec.md (PENDENTE)
@unit-economist valida unit-economics.md (✅ APROVADO)

# 2. Schema Prisma
/novais-digital:aios-run atendimento-dm-agent --step=schema

# 3. Test RED
/novais-digital:aios-run atendimento-dm-agent --step=test --mode=red
# Operador roda `npm test` e CONFIRMA QUE FALHA

# 4. Build
/novais-digital:aios-run atendimento-dm-agent --step=build

# 5. Test VERIFY (Tier A: ≥90% line)
/novais-digital:aios-run atendimento-dm-agent --step=test --mode=verify

# 6. Adversarial harness (NOVO para criticality A)
npm run test:adversarial atendimento-dm-agent
# Critério: 0 jailbreaks bem-sucedidos em 20+ payloads

# 7. Eval
/novais-digital:eval atendimento-dm-agent
# Critério: ≥85% pass rate (≥22/25)

# 8. Review
/novais-digital:aios-run atendimento-dm-agent --step=review

# 9. Promote (BLOQUEADO PARA EXTERNO)
/novais-digital:promote atendimento-dm-agent --to=shadow_internal
# /novais-digital:promote --to=assisted RETORNA ERRO até ADR-004-DM resolvido
```

## 10. Gates de qualidade (Tier A — criticality A)

| Gate | Onde valida | Target |
|------|-------------|:------:|
| Coverage line (unit) | CI workflow | ≥ **90%** (Tier A, não 85%) |
| Coverage branch (unit) | CI workflow | ≥ **85%** |
| Integration tests presentes | Gate G6 | ≥ 8 testes |
| E2E Playwright (webhook → resposta) | CI | 3 happy + 2 escalation paths |
| TDD red phase evidence | Gate G6 mecânico | `tests/atendimento-dm-agent/unit/` ≥ 1 arquivo antes do build |
| Adversarial harness pass rate | Gate manual | **100% (0 jailbreaks bem-sucedidos)** |
| Eval-suite pass rate | `/novais-digital:eval` | ≥ 85% (≥22/25) |
| BANT accuracy vs ground truth | Eval | ≥ 90% em casos claros |
| Honestidade gate falsos negativos | Adversarial | **0** |
| Latência p95 em load test | k6 | ≤ 10s |
| LGPD audit log funcional | Manual | "esqueça meus dados" deleta em <5min |

## 11. Riscos do plano

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Meta Graph API webhook signature complexa | +0.5 dia | Reuso de libs validadas (`facebook-nodejs-business-sdk`) |
| WhatsApp Cloud API onboarding (template approval) | +1 dia | Pular templates em SHADOW interno (só session messages) |
| Adversarial harness exige criatividade em payloads | +0.5 dia | Reusar lista pública OWASP LLM Top-10 |
| BANT classifier difícil de calibrar | +1 dia | 50 conversas anotadas manualmente como ground truth |
| **LGPD bloqueia promoção** mas plano segue | (não é risco — é decisão) | Documentado em `lgpd-mitigation.md` + ADR-004-DM |
| Latência Meta API > 3s reduz budget LLM | -1s budget | Streaming Haiku + lambda warm reservada |
| **Total buffer recomendado** | **+2 dias** | Plano comporta 5-7 dias realistas |

## 12. Decisão (`@artifact-architect`)

✅ **APROVADO arquitetura** — 3 camadas + adapter pattern + factory CRM per-tenant garantem C7.
✅ **APROVADO criticality A handling** — Tier A coverage 90%, adversarial harness, honestidade gate.
⚠️ **APROVADO COM BLOQUEIO LGPD** — implementação prossegue até SHADOW interno; **ASSISTED/AUTONOMOUS bloqueado** até `lgpd-mitigation.md` Fase 2 concluída.
⚠️ **ATENÇÃO crítica:** domain/conversation/ NUNCA importa SDK externo. Hook `any-type-guard` + revisão manual obrigatória em PR.

## 13. Próximo passo

→ `/novais-digital:tasks atendimento-dm-agent` (decomposição em 6 ondas — ver `tasks.md`)
→ Iniciar Fase 1 (D6 do roadmap de 14 dias)
→ Em paralelo: founder lê `lgpd-mitigation.md` e decide caminho DPO até 2026-06-01

---

**Assinatura:** `@artifact-architect` Guardian (Sonnet) — 2026-05-13 — APPROVED_WITH_LGPD_BLOCK
