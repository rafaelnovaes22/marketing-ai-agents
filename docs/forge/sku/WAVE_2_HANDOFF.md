# Wave 2 — Domain + Application: Handoff (3 SKUs P0 alinhados)

> **Status:** ✅ Arquivos criados | ✅ Typecheck verde | ✅ 92 + 60 = 120 testes passando
> **Data:** 2026-05-14 (D2 → entrada D3)
> **Próxima Wave:** 3 — Test RED (TDD-first, Forge-10) ou direto para Wave 5 (Eval-suite) por SKU
> **Roadmap relativo:** rota horizontal — 3 SKUs P0 (social-media, copywriter, designer) chegam alinhados em `draft (W2 complete)` antes de avançar para SHADOW em D4-D5.

---

## 📊 Cobertura por SKU

| SKU | Wave 1 | Wave 2 | Testes verdes | Próxima wave |
|-----|:------:|:------:|:-------------:|--------------|
| `social-media-agent` | ✅ | ✅ | 40 (16 unit + 16 adapters-red + 8 use-case) | Wave 5 (eval-suite) ou Wave 3 (TDD RED canônico) |
| `copywriter-agent` | ✅ | ✅ | 60 (32 unit + 28 integration) | Wave 3 (TDD RED) |
| `designer-agent` | ✅ | ✅ | 20 (15 unit + 5 integration) | Wave 4 (curadoria 50 imagens + calibration) |

**Total geral:** 120 testes passando, typecheck `0 erros`.

---

## 🆕 O que foi adicionado nesta sessão (D2 → D3)

### Copywriter Agent — fechamento de Wave 2 (T2.12 → T2.15)

#### T2.13 — VoiceValidator (LLM-as-judge)

- **Port:** [`src/domain/ports/VoiceValidator.ts`](../../../src/domain/ports/VoiceValidator.ts) — interface com `VoiceUnitKind` (landing_block | email | ad_variation | full_landing), dimensões de issue (lexico | cadencia | imperativo | autoridade | jargao | outro), decisão `accept | accept_with_warning | reroll`.
- **Adapter:** [`src/infrastructure/adapters/voice/ClaudeVoiceValidator.ts`](../../../src/infrastructure/adapters/voice/ClaudeVoiceValidator.ts) — usa qualquer `LLMProvider` (composability com `ResilientLLMProvider`), thresholds `<0,60 reroll`, `<0,75 warning`, `≥0,75 accept`, clampa score em [0,1], normaliza dimensions/severity inválidas.
- **Testes:** 6 em [`voice-validator.test.ts`](../../../tests/copywriter-agent/integration/voice-validator.test.ts).

#### T2.12 — DiversityCheckUseCase (cosine similarity)

- **Port:** [`src/domain/ports/EmbeddingsProvider.ts`](../../../src/domain/ports/EmbeddingsProvider.ts) — `embed(texts) → vectors[][] + costBrl`.
- **Use case:** [`src/application/copywriter-agent/DiversityCheckUseCase.ts`](../../../src/application/copywriter-agent/DiversityCheckUseCase.ts) — calcula 10 pares (C(5,2)) de cosine, retorna `diversityScore = 1 − meanSimilarity`, devolve `AdSet.comDiversityScore()` (imutável).
- **Adapter:** [`src/infrastructure/adapters/embeddings/OpenAIEmbeddingsAdapter.ts`](../../../src/infrastructure/adapters/embeddings/OpenAIEmbeddingsAdapter.ts) — `text-embedding-3-small`, usa `fetch` nativo (sem nova dep), preço `$0,02 / 1M tokens × USD_TO_BRL`.
- **Testes:** 9 em [`diversity-check.test.ts`](../../../tests/copywriter-agent/integration/diversity-check.test.ts) (inclui edge case vetor zero → similarity 0, não NaN).

#### T2.14 — ResilientLLMProvider (retry + circuit breaker)

- **Wrapper:** [`src/infrastructure/adapters/llm/ResilientLLMProvider.ts`](../../../src/infrastructure/adapters/llm/ResilientLLMProvider.ts) — implementa `LLMProvider`, recebe `primary` + `fallback` opcional. Política ADR-002-CW:
  - Retry exponential backoff em 429 / 529 / 5xx (até `maxRetries=3`).
  - Breaker abre após **3× 529 consecutivos** em janela de 60s → roteia próximas chamadas direto pro fallback.
  - Cooldown de 60s (half-open) — primeira chamada após cooldown tenta primário novamente.
  - Callback `onFallback(info)` para Langfuse marcar `provider_used: "mistral"` + `fallback_reason`.
  - `sleepFn` e `now()` injetáveis para testes determinísticos.
- **Testes:** 8 em [`resilient-llm.test.ts`](../../../tests/copywriter-agent/integration/resilient-llm.test.ts) — happy path, retry single, breaker abre, breaker permanece aberto, cooldown fecha, erro não-retryable, esgotamento sem fallback, sucesso reseta janela.

#### T2.15 — Integration tests com fakes

- **Fakes:** [`tests/copywriter-agent/unit/fakes.ts`](../../../tests/copywriter-agent/unit/fakes.ts) — `ProgrammableLLM` (steps success/error com `status`), `DeterministicEmbeddings` (Map text → vector), `ProgrammableVoiceValidator` (scores encadeados). Re-exporta `FakeObservability` do social-media.
- **5 testes** do `GenerateCopywriterOutputUseCase` (caminhos landing, email_sequence, ad_set + 2 cenários de erro).

### Designer Agent — auditoria Wave 2

Nenhum arquivo novo. Auditoria confirmou que `DesignCarrosselUseCase` + retry ladder + 5 integration tests já cobrem DES-T2.1 → DES-T2.8 (commit `daffaa0`). Nota arquitetural: `Promise.all` (não `allSettled`) é intencional — falha de adapter aborta carrossel; brand-fail vira `degraded` sem erro.

---

## ✅ Checklist de saúde Wave 2

| Item | Esperado | Estado |
|------|----------|:------:|
| `npm run typecheck` | 0 erros | ✅ |
| `npx vitest run tests/copywriter-agent` | 60 pass | ✅ |
| `npx vitest run tests/designer-agent` | 20 pass | ✅ |
| `npx vitest run tests/social-media-agent` | 40 pass | ✅ |
| Domain layer sem imports SDK | grep `@anthropic\|openai` em `src/domain/` → 0 | ✅ |
| Adapters isolados em `src/infrastructure/adapters/` | C7 enforced | ✅ |
| Adapter `OpenAIEmbeddingsAdapter` usa fetch (sem nova dep) | package.json intocado | ✅ |
| Cache hit ratio LLM testado? | ❌ smoke only | ⏳ Wave 5 |

---

## ⏳ O que ainda precisa ser feito (próximas waves)

### Copywriter Agent

| Item | Wave | Esforço |
|------|:----:|--------|
| T2.7 — Re-roll por bloco (schema valida 1 bloco falha → refaz só esse) | 4 | 1h |
| T3.1-T3.3 — TDD RED phase canônica (`/acme:aios-run --step=test --mode=red`) | 3 | 1h |
| T4.1 — Implementar/ajustar use cases para passar RED→GREEN | 4 | 3h |
| T4.3 — Streaming + cancellation (voice score drift no 1º terço) | 4 | 1.5h |
| T4.4 — Handoff contract (output JSON) para Designer Agent / Webflow publisher | 4 | 1h |
| T5.1-T5.7 — Eval-suite + LLM-as-judge runner + CI workflow | 5 | 7h |
| T6.x — SLA threshold + Langfuse spans completos + alertas + ship | 6 | 7h |

### Designer Agent

| Item | Wave | Esforço |
|------|:----:|--------|
| DES-T4.1-T4.5 — Curadoria 50 imagens calibration-set + human rating + tuning ≥90% | 4 | 8.5h |
| DES-T4.6-T4.8 — Eval-suite 25+ cases + LLM-as-judge cross-validation + CLI | 4 | 3.5h |
| DES-T5.x — VERIFY + CI + SLA + telemetria + alertas + dashboard + ship | 5 | 6.5h |

### Social Media Agent

| Item | Wave | Esforço |
|------|:----:|--------|
| Wave 3 — TDD RED canônica | 3 | 1h |
| Wave 5 — Eval-suite 20+ cases + LLM-as-judge runner | 5 | 4h |
| Wave 6 — Zernio + Twitter thread + SLA + dashboard + alertas | 6 | 6.5h |

---

## 🚦 Gates de promoção SHADOW (status por SKU)

### social-media-agent
1. ⏳ `@po-guardian` revisa spec.md
2. ✅ `@unit-economist` aprovou unit-economics.md
3. ✅ `@artifact-architect` aprovou plan.md
4. ❌ Eval-suite ≥85% pass rate
5. ❌ Coverage Tier B (≥85% line, ≥80% branch) — testes existem, falta medir

### copywriter-agent
1. ⏳ `@po-guardian` revisa spec.md + 3 schemas JSON
2. ✅ `@unit-economist` aprovou unit-economics.md (C3)
3. ✅ `@artifact-architect` aprovou plan.md
4. ❌ Eval-suite ≥85% pass rate + critical_path 5/5
5. ❌ Coverage Tier B + lint domain sem imports SDK

### designer-agent
1. ⏳ `@po-guardian` revisa spec.md + escopo negativo
2. ✅ `@unit-economist` aprovou unit-economics.md (C3 R$ 2,03)
3. ✅ `@artifact-architect` aprovou plan.md
4. ❌ Eval-suite ≥88% pass rate
5. ❌ **Concordância humano × `BrandValidatorAdapter` ≥90%** (calibration-set 50 imagens) — GATE INQUEBRANTÁVEL
6. ❌ Coverage Tier B

---

## ⚠️ Insights honestos para o AUDIT_DANTUIA_FORGE futuro

### Insight 1 — `vitest run tests/**/unit` não expande no Windows

O script `npm run test:unit` usa glob `tests/**/unit` que falha no shell do Windows (bash). Workaround: rodar `npx vitest run tests/<sku>/unit tests/<sku>/integration` explicitamente.

**Sugestão para o Forge:** o template `package.json` consumidor poderia usar `vitest --dir tests` ou globs específicos por SKU.

### Insight 2 — Ports criados em Wave 2 que deveriam ser Wave 1

Cria `EmbeddingsProvider` e `VoiceValidator` ports nesta sessão. Eles aparecem em `plan.md` como Wave 1 (T1.8) mas no commit anterior estavam ausentes. Lacuna de Wave 1 que se revelou em Wave 2.

**Sugestão:** o handoff Wave 1 deveria ter checklist explícita de "todos os ports do plan.md existem?". Hoje a verificação é manual.

### Insight 3 — Use case unificado vs use cases separados (T2.6/T2.10/T2.11)

Plan original previa 3 use cases (`GenerateLandingUseCase`, `GenerateEmailSequenceUseCase`, `GenerateAdSetUseCase`). Implementei como **um único** `GenerateCopywriterOutputUseCase` com `materializePayload()` que faz routing por `outputType`. Trade-off: menos código duplicado, mas viola SRP estrito.

**Justificativa para manter:** 95% do fluxo (briefing → trace → llm.generate → parse JSON → endTrace) é compartilhado. Separar geraria 3 cópias do mesmo orquestrador. Trade-off conscientemente assumido — refatorar se requirements divergirem.

### Insight 4 — `OpenAIEmbeddingsAdapter` usa `fetch` direto

Optei por `fetch` nativo (Node 20+) em vez de instalar `openai` SDK. Reduz blast-radius de dependências, mas perde features (retry built-in, streaming, validação de tipo). Compatível com Wave 2 escopo (smoke/integration test); Wave 4-6 podem reavaliar se quiser features SDK.

### Insight 5 — Designer Wave 2 usou `Promise.all` em vez de `Promise.allSettled`

Plan pediu `allSettled` mas o código já entregue (commit `daffaa0`) usa `Promise.all`. Decidi manter pois falha de adapter (rede/auth) deveria abortar carrossel inteiro; brand-fail vira `degraded` (não erro). Documentei nota em DES-T2.4.

**Re-examinar em Wave 4** se aparecer caso real de slide órfão recuperável.

---

## 🚀 Próximo passo concreto (D3)

**Caminho A — TDD RED canônico (recomendado pelo Forge):**

```bash
/acme:aios-run copywriter-agent --step=test --mode=red
/acme:aios-run designer-agent --step=test --mode=red
/acme:aios-run social-media-agent --step=test --mode=red
```

Gera tests RED nos 3 SKUs, valida que falham deliberadamente, faz commit de evidência. Desbloqueia Wave 4.

**Caminho B — Pular para eval-suite (atalho prático para SHADOW):**

```bash
/acme:eval social-media-agent  # tem mais testes; calibrar runner primeiro
/acme:eval copywriter-agent
/acme:eval designer-agent
```

Usa eval-cases.md já criado em cada SKU, mede pass rate, alimenta gate 4 dos 3 SHADOW promotions.

**Recomendação:** Caminho B (eval-suite) — gera sinal mais cedo sobre qualidade real e desbloqueia SHADOW em D4-D5 conforme roadmap. TDD RED pode rodar em paralelo (Wave 4) sem bloquear promoção.
