---
sku_id: copywriter-agent
tasks_date: 2026-05-13
total_tasks: 36
estimated_days: 5-7
tier: B
waves: 6
priority: P0
---

# Tasks — Copywriter Agent

> Decomposição do plano em tasks executáveis. Cada task tem ID, descrição, estimativa, dependências, dono sugerido.
>
> Sintaxe: **[ID] Nome — esforço — dono — deps**

## Wave 1 — Foundation (1 dia, ~10h)

- [ ] **T1.1** Setup TS 5.x + Vitest 1.x + Zod 3.22 + tsconfig com `strict: true` — 1h — dev — sem deps
- [ ] **T1.2** Schema Prisma 6 (`Execution`, `CopyArtifact`, `LangfuseTrace`) — 1h — dev — T1.1
- [ ] **T1.3** Migrations + seed mínimo (1 voice fake + 1 framework template) — 30min — dev — T1.2
- [ ] **T1.4** Voice loader (YAML → Voice entity) + reuso `tom-brand-voice-ceo.md` — 1h — dev — T1.1
- [ ] **T1.5** Framework templates loader (PAS, AIDA, 4Ps, StoryBrand, Soap Opera) — Markdown estruturado → tipos — 1.5h — dev — T1.1
- [ ] **T1.6** LLM adapter interface (`LLMProvider`) + ClaudeAdapter (Opus 4.6) — 1.5h — dev — T1.1
- [ ] **T1.7** Mistral adapter (fallback declarado, ADR-002-CW) — 1h — dev — T1.6
- [ ] **T1.8** Embeddings adapter interface + OpenAIAdapter (text-embedding-3-small) — 1h — dev — T1.1
- [ ] **T1.9** Zod schemas versionados (`LandingSchema v1.0.0`, `EmailSeqSchema v1.0.0`, `AdSetSchema v1.0.0`) — 1.5h — dev — T1.1
- [ ] **T1.10** Briefing parser + Zod intake (5 campos mínimos: output_type, product, audience, framework, tone) — 1h — dev — T1.9
- [ ] **T1.11** Langfuse adapter — 1h — dev — T1.1
- [ ] **T1.12** System prompts iniciais (3 — landing.v1, email-sequence.v1, ads-meta.v1) com cache breakpoints — 2h — dev/@prompt-engineer — T1.6
- [ ] **T1.13** Validação smoke (gerar texto Opus + embedding OpenAI) — 30min — dev — T1.6, T1.8

**Total Wave 1:** ~13h (1-1.5 dia útil com buffer)

## Wave 2 — Domain + Application (2 dias, ~16h)

### Dia 2a — Domain + Landing

- [x] **T2.1** Domain: entidades `LandingPage`, `Block`, `Framework`, `Voice`, `Briefing` — 1.5h — dev — T1.1 — ✅ 2026-05-14
- [x] **T2.2** Domain: regras de validação (blocos obrigatórios, range 1.500-2.000 palavras default, upsell 2.500-3.500) — 1h — dev — T2.1 — ✅ 2026-05-14
- [x] **T2.3** Domain: testes unit puros (sem mock externo) — 1h — dev — T2.1, T2.2 — ✅ 32 testes (`domain-smoke.test.ts`)
- [x] **T2.4** `BriefingIntake` + reject if invalid (NÃO consome tokens Opus em briefing inválido) — 1h — dev — T1.10 — ✅ via `CopywriterBriefing.create` (rejeita context<40, framework incompatível, upsell em ad_set)
- [x] **T2.5** `CopyRouter` (output_type → use case correto) — 30min — dev — T2.4 — ✅ via `materializePayload()` no use case unificado
- [x] **T2.6** `GenerateLandingUseCase` (orquestra Claude + voice validator + schema validator) — 2.5h — dev — Wave 1 — ✅ embarcado em `GenerateCopywriterOutputUseCase` (caminho `landing`); voice validator separado em T2.13
- [ ] **T2.7** UseCase: re-roll por bloco (se schema valida falha em 1 bloco, refaz só esse bloco) — 1h — dev — T2.6 — ⏸️ DEFERIDO para Wave 4 (build refinement); requer schema versioning maduro + `VoiceValidator` plugado no orquestrador.

### Dia 2b — Email + Ads + Validators

- [x] **T2.8** Domain: `EmailSequence`, `Email`, `NarrativeThread` — 1h — dev — T2.1 — ✅ 2026-05-14 (NarrativeThread implícito via flag `referencesPrevious`)
- [x] **T2.9** Domain: `AdSet`, `Ad`, `Angle` (5 categorias canônicas: pain, aspiração, FOMO, autoridade, prova social) — 1h — dev — T2.1 — ✅ 2026-05-14
- [x] **T2.10** `GenerateEmailSequenceUseCase` (3-5 emails, 3 frameworks suportados) — 2h — dev — T1.12 — ✅ embarcado em `GenerateCopywriterOutputUseCase` (caminho `email_sequence`)
- [x] **T2.11** `GenerateAdSetUseCase` — Tree-of-Thought de 5 ângulos — 1.5h — dev — T1.12 — ✅ embarcado em `GenerateCopywriterOutputUseCase` (caminho `ad_set`); Tree-of-Thought será reforçado no system prompt em Wave 4
- [x] **T2.12** `DiversityCheckUseCase` (cosine similarity entre primary_text de 5 ads, threshold ≤0,55) — 1h — dev — T1.8, T2.11 — ✅ 2026-05-14 (`src/application/copywriter-agent/DiversityCheckUseCase.ts` + `EmbeddingsProvider` port + `OpenAIEmbeddingsAdapter` skeleton + 9 testes)
- [x] **T2.13** `VoiceValidator` (LLM-as-judge Claude Sonnet 4.6 por bloco/email/ad) — 1.5h — dev — T1.6 — ✅ 2026-05-14 (port `VoiceValidator` + `ClaudeVoiceValidator` adapter + 6 testes)
- [x] **T2.14** Retry + backoff exponencial para 429/529 Anthropic + circuit breaker para fallback Mistral — 1h — dev — T1.6, T1.7 — ✅ 2026-05-14 (`ResilientLLMProvider` + 8 testes; breaker abre após 3× 529 consecutivos / ADR-002-CW)
- [x] **T2.15** Testes integration com fakes de adapters (cobertura dos 3 use cases) — 2h — dev — T2.6, T2.10, T2.11 — ✅ 2026-05-14 (5 use-case + 9 diversity + 8 resilient + 6 voice = 28 integration tests; total Wave 2 copywriter = 60 testes verdes)

**Total Wave 2:** ~18h (~2-2.5 dias)

## Wave 3 — Test RED (TDD-first, Forge-10)

> ⚠️ **Forge-10 obriga:** test_agent em mode=red gera testes ANTES de Wave 4 (build refinado).
> Operador roda `npm test` e CONFIRMA QUE FALHA antes de prosseguir.

- [x] **T3.1** `/acme:aios-run copywriter-agent --step=test --mode=red` (gera tests/copywriter-agent/{unit,integration,e2e}/) — 30min — dev/agent — Wave 2 estruturas prontas — ✅ 2026-05-19 (3 arquivos RED: handoff-contract + re-roll-by-block + voice-drift-cancel)
- [x] **T3.2** Operador valida que testes falham (RED phase confirmada) — 15min — dev — T3.1 — ✅ 2026-05-19 (14 FAIL / 61 PASS confirmado)
- [x] **T3.3** Commit do plano de testes + RED evidence — 15min — dev — T3.2 — ✅ 2026-05-19

**Total Wave 3:** ~1h

## Wave 4 — Build refinement + ajustes

(itens iniciados em Wave 2 mas formalizados/refinados aqui — passar tests de RED → GREEN)

- [ ] **T4.1** Implementar/ajustar use cases para passar RED → GREEN — itens das W1/W2 — 3h — dev
- [ ] **T4.2** Edge cases de briefing (output_type ausente, framework inválido, voice id inexistente) — 1.5h — dev — T2.4
- [ ] **T4.3** Streaming + cancellation (se voice score drift detectado no 1º terço, cancela e re-roll com correção — Tipo A) — 1.5h — dev — T2.6, T2.13
- [ ] **T4.4** Handoff contract (output JSON) para Designer Agent / Webflow publisher — 1h — dev/@artifact-architect — T1.9

**Total Wave 4:** ~7h

## Wave 5 — Test VERIFY + Eval-suite (1 dia, ~7h)

- [ ] **T5.1** `/acme:aios-run copywriter-agent --step=test --mode=verify` (cobertura + gaps) — 30min — agent — Wave 4
- [ ] **T5.2** Eval-suite: 22 cases curados em `eval-cases.md` (já existe — apenas refinar) — 1h — dev/@eval-engineer
- [ ] **T5.3** LLM-as-judge runner (Claude Opus para landing; Sonnet para email/ads — prompt por framework) — 2h — dev — T5.2
- [ ] **T5.4** CLI `npm run eval copywriter-agent` — 30min — dev — T5.3
- [ ] **T5.5** Diversity benchmark com fixtures (validar threshold 0,55) — 1h — dev — T2.12
- [ ] **T5.6** CI: workflow `forge-test` + `forge-eval` ativos para este SKU — 1h — dev — T5.4
- [ ] **T5.7** Rodar eval-suite completa e validar pass rate ≥85% — 30min — dev — T5.4

**Total Wave 5:** ~6.5h

## Wave 6 — Ship (1 dia, ~7h)

- [ ] **T6.1** `/acme:sla-threshold copywriter-agent` (define SLA contratual ≤900s por tipo) — 30min — dev/@po-guardian
- [ ] **T6.2** Telemetria Langfuse completa (spans: briefing_parse, framework_planning, copy_generation×N, voice_validation, diversity_check, schema_validation) — 1.5h — dev — T1.11
- [ ] **T6.3** Dashboard básico (Mixpanel: entregáveis/dia por tipo, custo médio, tom score, re-roll rate, SLA achievement) — 1.5h — dev — T6.2
- [ ] **T6.4** Alertas Slack (SLA violation #ops, custo Landing > R$ 15 #finance, tom score < 6 #brand, diversidade < 0,40 #brand) — 1h — dev — T6.2
- [ ] **T6.5** Documentação README + runbook ops (incluir matriz de compatibilidade schema_version) — 1h — dev
- [ ] **T6.6** Validação handoff Designer Agent (mock — Designer ainda em dev) — 30min — dev — T4.4
- [ ] **T6.7** `/acme:promote copywriter-agent --to=shadow` (promotion-officer assina) — 30min — agent/@promotion-officer — todos anteriores

**Total Wave 6:** ~6.5h

## Resumo

| Wave | Esforço | Cobertura |
|------|--------:|-----------|
| 1 — Foundation | 13h | Adapters LLM/embeddings + voice/framework loaders + Zod schemas |
| 2 — Domain + Application | 18h | 3 use cases (landing, email-seq, ads) + validators |
| 3 — Test RED (TDD) | 1h | Gate G6 evidence |
| 4 — Build refinement | 7h | RED → GREEN + edge cases + streaming |
| 5 — Test VERIFY + Eval | 6.5h | Eval-suite + CI |
| 6 — Ship | 6.5h | Telemetria + SLA + promoção SHADOW |
| **TOTAL** | **~52h** | **5-7 dias úteis com buffer** |

## Dependências cross-wave

```
W1 (Foundation)
  ↓
W2 (Domain + Application)
  ↓
W3 (Test RED) — BLOQUEIA Build refinado via Gate G6
  ↓
W4 (Build refinement RED→GREEN)
  ↓
W5 (Test VERIFY + Eval)
  ↓
W6 (Ship + promote)
```

**Dependências externas:**
- Reuso de `tom-brand-voice-ceo.md` do social-media-agent (deve estar finalizado antes de W1)
- Reuso de Langfuse setup e ClaudeAdapter base do social-media-agent (já feitos)
- Designer Agent precisa concordar com handoff-contract.md (W4.T4.4) — mock em fase 1

## Gates antes de cada Wave

| Wave | Gate de entrada |
|------|-----------------|
| W2 | Wave 1 completa + smoke test passa (Opus + embeddings) |
| W3 | Spec aprovada por po-guardian + plan aprovado por artifact-architect (ambos ✅) |
| W4 | Testes RED commitados + falham localmente |
| W5 | Build completo + npm typecheck OK + 3 use cases end-to-end com fakes funcionam |
| W6 | Eval-suite pass rate ≥85% + critical_path 5/5 + coverage Tier B atingido (≥85% line / ≥80% branch) |

## ClickUp blueprint

> Cada task acima vira 1 card no ClickUp. ID do card = `CW-T1.1`, `CW-T1.2`, etc.

Veja `templates/clickup-blueprint.template.md` para estrutura de lists/folders.

## Próximo passo

→ Criar testes RED **antes** do build final (Gate G6 Forge-10)
→ Confirmar com `@prompt-engineer` os 3 system prompts antes de Fase 2.
→ Promoção `draft → SHADOW` após Wave 6 (data alvo: 2026-05-20 — paralelo a copy review do social-media-agent em ASSISTED)
