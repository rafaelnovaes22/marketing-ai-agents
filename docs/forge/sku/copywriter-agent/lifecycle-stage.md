---
sku_id: copywriter-agent
lifecycle_type: agentic
current_stage: shadow
created_at: 2026-05-13
last_transition: 2026-05-19
priority: P0
---

# Lifecycle Stage — Copywriter Agent

> Append-only log de transições de estado. Versão agentic_saas: SHADOW → ASSISTED → AUTONOMOUS.

## Estado atual

**`shadow`** (desde 2026-05-19) — **primeiro SHADOW do projeto Acme Social.** Subscription `acme-internal-copywriter-001` em produção interna (Acme própria como cliente piloto). Billing desativado. Janela mínima: 14 dias hard floor C4 → SHADOW→ASSISTED elegível em 2026-06-02.

## Histórico de transições

| Stage | Data | Aprovador | Gates aprovados | Notas |
|-------|------|-----------|-----------------|-------|
| `(new)` → `draft` | 2026-05-13 | @po-guardian (pending review) | Diagnose preliminar + spec + unit-economics (APPROVED) + plan (APPROVED) | Segundo SKU do Acme Social. Reusa stack do social-media-agent (langfuse, claude-adapter base, voice loader). |
| `draft (W1)` → `draft (W2 complete)` | 2026-05-14 | dev | T2.1–T2.6, T2.8–T2.15 ✅ (T2.7 deferido para Wave 4) | Wave 2 entregou: `GenerateCopywriterOutputUseCase` unificado (3 caminhos), `DiversityCheckUseCase` + `EmbeddingsProvider` port + OpenAI adapter (T2.12), `VoiceValidator` port + `ClaudeVoiceValidator` adapter (T2.13), `ResilientLLMProvider` wrapper com circuit breaker 3×529 (T2.14), 28 integration tests + 32 domain unit = 60 testes verdes. |
| `draft (W2)` → `draft (W3 RED)` | 2026-05-19 | dev | T3.1–T3.3 ✅ | Wave 3 entregou: 14 testes RED documentando Wave 4 — `handoff-contract` (6), `re-roll-by-block` (4), `voice-drift-cancel` (4). Commit `be082d8`. |
| `draft (W3)` → `draft (W4 GREEN)` | 2026-05-19 | dev | T4.1, T4.3, T4.4 ✅ (T4.2 deferido para W5) | Wave 4 entregou: `CopywriterOutput.toHandoffPayload()` (T4.4), re-roll por bloco com MAX_RE_ROLLS=2 (T2.7), `voiceValidator` em deps com MAX_VOICE_RE_ROLLS=1 (T4.3). 75/75 testes verdes. Commit `6ebe8b0`. |
| `draft` → **`shadow`** | **2026-05-19** | **@po-guardian + @promotion-officer (cross-approval) + Rafael de Novaes (Eng IA, supervisor humano)** | 6/6 gates do `/acme:promote`: C2 ✓, C3 ✓, C4 SLA ✓, Eval ✓, Cross-approval ✓, CI/CD (skipped) | Subscription `acme-internal-copywriter-001`. PO sig `0551b79a34119c1c`, PromoOfficer sig `d9b46cf453242e23`. Window mínima 14d → ASSISTED elegível 2026-06-02. **Primeiro SHADOW do projeto.** |

## Próximas transições previstas

### `draft → SHADOW` (alvo: 2026-05-20, fim Wave 6)

**Gates necessários (5):**

1. [x] `@po-guardian` revisou e aprovou `spec.md` outcome contratual + os 3 schemas JSON — APPROVED 2026-05-18 (commit `a2bde6f`); `spec_status: po_guardian_approved`
2. [x] `@unit-economist` aprovou `unit-economics.md` (C3 ≤ 25% nos 3 tipos) — APPROVED com ADR-001-CW 2026-05-13
3. [x] `@artifact-architect` aprovou `plan.md` (C5/C7 — adapter pattern + schema versionado) — APPROVED 2026-05-13
4. [x] Eval-suite com ≥ 85% pass rate + critical_path 5/5 — APPROVED 2026-05-18 (24/24 PASS, hash `c10b6bee146e89b2`, prompt v0.2.0)
5. [x] Coverage Tier B atingido (≥ 85% line, ≥ 80% branch) + domain layer sem imports SDK — APPROVED 2026-05-19 (`GenerateCopywriterOutputUseCase` 94.18% lines/80.35% branches; domain layer 87.96/84%; G1/G2/G3 pre-merge ✅)

**Gates auxiliares (não bloqueantes mas recomendados):**

- [ ] `@prompt-engineer` revisou os 3 system prompts (landing.v1, email-sequence.v1, ads-meta.v1) com cache breakpoints
- [ ] `@observability-guardian` validou cobertura Langfuse (spans obrigatórios)
- [ ] Handoff contract (output JSON) revisado por `@artifact-architect`

**Comando para transição:** `/acme:promote copywriter-agent --to=shadow`

**Quem assina:** `@promotion-officer`

### `SHADOW → ASSISTED` (alvo: 2026-06-02, após 14 dias em SHADOW — hard floor C4)

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
