---
sku_id: copywriter-agent
plan_date: 2026-05-13
audited_by: "@artifact-architect (Guardian)"
status: APPROVED
plan_template: aios-tdd-first (Forge-10)
implementation_window_days: 5
tier: B
priority: P0
---

# Plan Técnico — Copywriter Agent

## 1. Resumo executivo

**5 dias de implementação** seguindo pipeline AIOS TDD-first (Forge-10):

1. **Foundation** (1 dia) — adapters LLM/embeddings + voice loader + framework templates + schema JSON versionado
2. **Core** (2 dias) — 3 use cases (landing, email-seq, ads) + voice validator + diversity check + briefing parser
3. **Eval** (1 dia) — eval-suite 22+ casos + LLM-as-judge por framework + SHADOW runner
4. **Ship** (1 dia) — SLA threshold + telemetria Langfuse + dashboard + promoção SHADOW

**Pipeline:** `spec → schema → test(red) → build(back) → test(verify) → review`

**Diferenças vs social-media-agent:**
- Sem image-gen (copy puro), porém maior complexidade de output structures (3 schemas distintos)
- Embeddings (OpenAI text-embedding-3-small) substituem image providers como segundo adapter
- Mais frameworks suportados (5) → maior superfície de prompt engineering
- Output JSON estável e versionado (ADR-003-CW) — handoff para Designer Agent e Webflow publisher

## 2. Arquitetura (3 camadas — C7)

```
┌─────────────────────────────────────────────────────────────┐
│  src/domain/copy/                                            │
│  Entidades puras, sem deps externas                          │
│  • LandingPage (hero, problem, agitation, solution, ...)     │
│  • EmailSequence (Email[], narrative_thread)                 │
│  • AdSet (Ad[5], angles[5])                                  │
│  • Framework (PAS, AIDA, 4Ps, StoryBrand, SoapOpera)         │
│  • Voice (FounderVoice, ExecutivoB2B, ...)                   │
│  • Briefing (output_type, product, audience, tone, ...)      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  src/application/copywriter/                                 │
│  Use cases, orquestra domain                                 │
│  • GenerateLandingUseCase                                    │
│  • GenerateEmailSequenceUseCase                              │
│  • GenerateAdSetUseCase                                      │
│  • BriefingIntake (Zod validation + reject if invalid)       │
│  • CopyRouter (output_type → use case correto)               │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  src/infrastructure/adapters/                                │
│  Adapters para SDKs externos                                 │
│  • llm/claude-adapter.ts (Anthropic SDK — Opus 4.6)          │
│  • llm/mistral-adapter.ts (fallback C7, ADR-002-CW)          │
│  • llm/sonnet-judge-adapter.ts (LLM-as-judge tom)            │
│  • embeddings/openai-adapter.ts (text-embedding-3-small)     │
│  • embeddings/voyage-adapter.ts (fallback)                   │
│  • schema/zod-validators.ts (Zod + schema_version)           │
│  • observability/langfuse-adapter.ts                         │
└─────────────────────────────────────────────────────────────┘
```

**Princípio C7:** trocar Anthropic Opus → Mistral Large = trocar 1 arquivo de adapter. Domain e application **nunca** importam SDK específico. Output schema versionado (`schema_version: "1.0.0"` em cada artefato) garante handoff seguro mesmo com evoluções.

## 3. Fase 1 — Foundation (1 dia)

### Entregáveis

| Item | Stack | Tier |
|------|-------|:----:|
| Setup TS 5.x + Vitest 1.x + Zod 3.x | TS 5.x + Vitest 1.x + Zod 3.22 | A |
| Schema Prisma (`Execution`, `CopyArtifact`, `LangfuseTrace`) | PostgreSQL 16 + Prisma 6 | B |
| Voice loader (YAML → Voice entity) — reuso de `tom-brand-voice-ceo.md` | `js-yaml` | A |
| Framework templates loader (5 frameworks) | Markdown → estrutura tipada | B |
| LLM adapter interface + ClaudeAdapter (Opus 4.6) | Anthropic SDK | B |
| LLM adapter Mistral (fallback declarado) | Mistral SDK | B |
| Embeddings adapter interface + OpenAI impl | OpenAI SDK | B |
| Zod schemas versionados (`LandingSchema`, `EmailSeqSchema`, `AdSetSchema`) | Zod 3.22 | A |
| Briefing parser + intake validator | Zod + custom rules | B |
| Langfuse adapter | Langfuse SDK | A |
| System prompts iniciais (3 — um por output_type) com cache breakpoints | Curated examples | B |

### Subagentes Guardian invocados

- `@artifact-architect` — valida camadas e interfaces antes de implementação
- `@prompt-engineer` (Guardian) — revisa system prompts iniciais e marca cache breakpoints
- `@unit-economist` — confirma cache hit ratio esperado em prompts estruturados

### Output esperado fim Fase 1

- `npm run typecheck` passa sem erros
- Voice loader carrega `tom-brand-voice-ceo.md` e valida 8 dimensões
- ClaudeAdapter gera texto de teste em modo Opus 4.6
- Embeddings adapter produz vetor de 1.536 dims (OpenAI)
- Zod schemas validam fixtures `*.fixture.json` dos 3 outputs
- Langfuse recebe trace de teste com spans

## 4. Fase 2 — Core (2 dias)

### Dia 1 — Domain + Briefing + Landing

| Item | Camada | Tier |
|------|--------|:----:|
| Domain: `LandingPage`, `Block`, `Framework`, `Voice`, `Briefing` | domain | B |
| Domain: regras de validação (blocos obrigatórios, range de palavras) | domain | B |
| Domain: testes unit puros (sem mock externo) | domain | B |
| `BriefingIntake` + 5 campos mínimos obrigatórios | application | B |
| `CopyRouter` (output_type → use case) | application | A |
| `GenerateLandingUseCase` — orquestra Claude + voice validator | application | B |
| Estratégia opcional de geração em 2 sub-calls (header+meio vs CTA+social proof) | application | C |

### Dia 2 — Email Sequence + Ad Set + Voice Validator

| Item | Camada | Tier |
|------|--------|:----:|
| Domain: `EmailSequence`, `Email`, `NarrativeThread` | domain | B |
| Domain: `AdSet`, `Ad`, `Angle` (5 categorias canônicas) | domain | B |
| `GenerateEmailSequenceUseCase` — Soap Opera + Welcome + Re-engagement | application | B |
| `GenerateAdSetUseCase` — Tree-of-Thought de 5 ângulos | application | B |
| `DiversityCheckUseCase` (cosine similarity entre 5 ads) | application | B |
| `VoiceValidator` (LLM-as-judge Claude Sonnet 4.6 por bloco/email/ad) | application | B |
| Retry + backoff exponencial para 429/529 Anthropic | infrastructure | A |
| Schema validator (Zod) com mensagens estruturadas para re-roll de bloco | application | B |

### Subagentes Guardian invocados

- `@artifact-architect` — review da arquitetura 3-camadas após domain pronto
- `@prompt-engineer` — pareamento na escrita dos 3 system prompts (`landing.v1`, `email-sequence.v1`, `ads-meta.v1`)
- `@unit-economist` — sanity check de tokens reais vs estimados após primeiras execuções

### Output esperado fim Fase 2

- `npm test:unit` passa (coverage ≥85% Tier B)
- 3 use cases funcionam end-to-end com fakes de adapters
- Briefing inválido retorna erro estruturado SEM consumir tokens Opus
- Schema validator rejeita JSON faltando bloco e dispara re-roll só do bloco faltante

## 5. Fase 3 — Eval (1 dia)

### Entregáveis

| Item | Detalhe |
|------|---------|
| `eval-cases.md` com 22 cenários | Ver arquivo dedicado |
| LLM-as-judge runner com 1 prompt de juiz por framework | Claude Opus 4.6 (caso landing) + Sonnet (email/ad) |
| Eval CLI (`npm run eval copywriter-agent`) | Roda todos cases, salva resultado |
| SHADOW mode runner (interno, sem cobrança) | Executa em produção sem cobrar |
| Diversity benchmark (cosine sim em fixtures de ads históricos) | Numpy-style em TS via simple-statistics |

### Subagentes Guardian invocados

- `@eval-engineer` (autor canônico de eval-cases.md)
- `@po-guardian` — homologa critical-path cases (≥5 marcados)
- `@prompt-engineer` — revisa prompts de juiz por framework

### Critérios de pass

- 22 eval-cases (folga sobre o mínimo de 20)
- Tom score médio ≥ 7,5/10
- Framework adherence média ≥ 80% (LLM-as-judge)
- (Tipo C) diversity média ≥ 0,45 (1 − similarity)
- Pass rate geral ≥ 85% (≥ 19 de 22 casos)
- Critical path: 100% (5/5)

## 6. Fase 4 — Ship (1 dia)

### Entregáveis

| Item | Stack |
|------|-------|
| `/acme:sla-threshold copywriter-agent` (define SLA contratual ≤900s) | Documento + workflow |
| Telemetria Langfuse completa (traces + spans + metadata + cost breakdown) | Langfuse SDK |
| Dashboard básico (Mixpanel/Grafana): entregáveis/dia por tipo, custo médio, tom score, re-roll rate | Mixpanel |
| Alertas Slack (SLA violation `#ops`, custo Landing > R$ 15 `#finance`, tom score < 6 `#brand`, diversidade < 0,40 `#brand`) | Slack webhook |
| Handoff contract (output JSON) documentado para Designer Agent + Webflow publisher | `docs/forge/sku/copywriter-agent/handoff-contract.md` |
| Promoção draft → SHADOW (`/acme:promote copywriter-agent --to=shadow`) | promotion-officer assina |

### Subagentes Guardian invocados

- `@promotion-officer` — assina transição draft → SHADOW
- `@observability-guardian` — valida cobertura Langfuse (spans obrigatórios)
- `@artifact-architect` — homologa handoff-contract.md (contrato JSON estável)

### Output esperado fim Fase 4

- `bash scripts/forge doctor` no projeto (consumer mode) sem fails não-esperados
- Eval-suite roda em CI (workflow `forge-eval`)
- Primeira landing/email-seq/ad-set gerada em SHADOW (sem cobrar)
- Langfuse mostra trace com todos os spans previstos
- promotion-officer assina transição para SHADOW

## 7. Workflow AIOS TDD-first (Forge-10)

```bash
# 1. Spec validada (já feito)
@po-guardian valida spec.md
@unit-economist valida unit-economics.md (APPROVED com ADR-001-CW)

# 2. Schema (Prisma + Zod)
/acme:aios-run copywriter-agent --step=schema

# 3. Test RED (testes ANTES do código)
/acme:aios-run copywriter-agent --step=test --mode=red
# Operador roda `npm test` e CONFIRMA QUE FALHA

# 4. Build (apenas backend — copywriter-agent não tem frontend dedicado em fase 1)
/acme:aios-run copywriter-agent --step=build

# 5. Test VERIFY (após build)
/acme:aios-run copywriter-agent --step=test --mode=verify

# 6. Review final
/acme:aios-run copywriter-agent --step=review
```

## 8. Gates de qualidade (Tier B)

| Gate | Onde valida | Target |
|------|-------------|:------:|
| Coverage line (unit) | CI workflow `forge-test` | ≥ 85% |
| Coverage branch (unit) | CI workflow `forge-test` | ≥ 80% |
| Integration tests presentes | Gate G6 (Forge-10) | ≥ 6 testes (2 por output_type) |
| Schema validation tests | Gate G6 | 100% dos 3 schemas com fixtures válidas + inválidas |
| TDD red phase evidence | Gate G6 mecânico | `tests/copywriter-agent/unit/` ≥ 1 arquivo antes do build |
| Eval-suite pass rate | `/acme:eval` | ≥ 85% |
| Critical path eval | `/acme:eval` | 100% (5/5) |
| Tom score médio | LLM-as-judge | ≥ 7,5/10 |
| Diversity (Tipo C) | Cosine sim check | ≥ 0,45 (1 − sim) |
| Domain layer sem imports SDK | Hook + lint custom | 0 violações |

## 9. Riscos do plano

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| Prompt engineering dos 3 output_types exige mais iterações que esperado | 🟡 Média | +1 dia | Pareamento com `@prompt-engineer` desde Fase 1; reservar buffer na Fase 3 para tuning |
| Cache hit ratio < 75% em produção (mais variabilidade de briefings que o esperado) | 🟡 Média | C3 mais apertado (R$ 0,80 a mais por landing) | Estruturar system prompt com cache breakpoints explícitos; manter voice exemplars + frameworks em prefix estável |
| Tree-of-Thought de 5 ads produz 2+ ângulos similares (similarity > 0,55) | 🟡 Média | Re-roll caro de 2 ads | Prompt explícito de 5 categorias canônicas + early-exit se 1ª tentativa passa; cap em 2 re-rolls antes de aceitar com warning |
| Voice score baixo (< 7) em fase inicial — voice exemplars insuficientes | 🟡 Média | +0,5 dia ajustando | Reuso de exemplars já calibrados do social-media-agent (`tom-brand-voice-ceo.md`); adicionar 10 exemplares específicos de long-form copy |
| Schema versionado quebra handoff Designer Agent quando evoluir | 🟢 Baixa | Acoplamento futuro | `schema_version` em todo artefato + matriz de compatibilidade documentada (ADR-003-CW) |
| Anthropic Opus 4.6 retorna 529 (overloaded) com frequência em horários de pico | 🟡 Média | SLA violation em landings longas | Backoff exponencial + circuit breaker → fallback para Mistral Large após 3 tentativas (ADR-002-CW) |
| Frontend (admin SHADOW review) demoraria 4h adicionais | 🟢 Baixa | Não bloqueia SHADOW | Adiar admin UI para após SHADOW; revisão humana via Langfuse direto em fase inicial |
| **Total buffer recomendado** | | **+1,5 dia** | Plano comporta 5-7 dias realistas |

## 10. Decisão (`@artifact-architect`)

✅ **APROVADO** — adapter pattern garantido (C7), camadas isoladas (domain sem deps externas), TDD-first respeitado, contratos JSON versionados habilitam handoff multi-agente sem refactor.
✅ **Arquitetura suporta** evolução para multi-tenant (fase 2) sem refactor profundo — `tenant_id` propagado em briefing e voice loader já parametrizado.
✅ **Reuso significativo** de assets do social-media-agent (`tom-brand-voice-ceo.md`, langfuse-adapter, claude-adapter base) — reduz risco e tempo.
⚠️ **Atenção crítica:**
- Garantir que `src/domain/copy/` NUNCA importe SDK externo durante implementação — hook `any-type-guard` + revisão manual em PR.
- Cache breakpoints explícitos no system prompt — sem isso, C3 fica apertado em landing longa.
- Schema versionado (`schema_version` em cada artefato) é não-negociável (ADR-003-CW) — necessário para handoff Designer Agent.

## 11. Próximo passo

→ `/acme:tasks copywriter-agent` (decomposição em waves executáveis)
→ Criar `eval-cases.md` antecipadamente (Wave 5 puxado para Wave 3 para guiar build)
→ Criar `decisions.md` local com ADR-001-CW, ADR-002-CW, ADR-003-CW, ADR-004-CW
→ Iniciar Fase 1 em D2 do roadmap de 14 dias (paralelizado com social-media-agent Wave 4-5)

---

**Assinatura:** `@artifact-architect` Guardian (Sonnet) — 2026-05-13 — APPROVED com 3 caveats observados.
