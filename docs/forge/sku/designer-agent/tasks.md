---
sku_id: designer-agent
tasks_date: 2026-05-13
total_tasks: 28
estimated_days: 3-4.5
tier: B
waves: 5
reuses_from: social-media-agent (Wave 2 adapters)
---

# Tasks — Designer Agent

> Decomposição do `plan.md` em tasks executáveis. ID prefixo: **DES-** (vs **SMA-** do social-media-agent).
>
> Sintaxe: **[ID] Nome — esforço — dono — deps**

## Wave 1 — Foundation com REUSO (0.5 dia)

**Foco:** importar adapters Wave 2 do social-media-agent + definir contratos novos (DesignBriefing, CarrosselManifest).

- [ ] **DES-T1.1** Validar imports `ImagenAdapter`, `IdeogramAdapter`, `BrandValidatorAdapter`, `LangfuseAdapter` (REUSO) — 30min — dev — pré-req: Wave 2 social-media completa
- [ ] **DES-T1.2** Schema Prisma adicional: `DesignerExecution`, `SlideTrace` (não duplicar `LangfuseTrace` que já existe) — 1h — dev — DES-T1.1
- [ ] **DES-T1.3** Migration + seed mínimo (1 briefing fake on-brand) — 30min — dev — DES-T1.2
- [ ] **DES-T1.4** Contrato Zod `DesignBriefing` (tema, num_slides 5–7, dominant_mode, caller, variant?, tenant_id) + testes unit — 45min — dev — DES-T1.1
- [ ] **DES-T1.5** Contrato Zod `CarrosselManifest` (slides[], brand_scores[], retries[], cost_total_brl, sla_violated?) + testes unit — 45min — dev — DES-T1.1
- [ ] **DES-T1.6** Skeleton `DesignCarrosselUseCase.execute()` (stub `NotImplementedError`) — 30min — dev — DES-T1.4, DES-T1.5
- [ ] **DES-T1.7** Adapter `S3Adapter.ts` skeleton (presigned URLs) ou Buffer fallback — 1h — dev — DES-T1.1
- [ ] **DES-T1.8** Smoke validation: rodar `ImagenAdapter.generate()` + `BrandValidatorAdapter.score()` ponta-a-ponta em script `scripts/smoke-designer.ts` — 30min — dev — DES-T1.1

**Total Wave 1:** ~5h

## Wave 2 — Domain + Core Application (1 dia)

**Foco:** entidades puras + orquestrador paralelo + retry orchestrator + manifest assembler.

- [x] **DES-T2.1** Domain: `Carrossel`, `Slide`, `BrandScore`, `RetryPolicy` (zero deps) + testes unit — 1.5h — dev — DES-T1.1 — ✅ 2026-05-14 (`DesignCarrossel`, reuso de `Slide`/`BrandGuide` do carrossel; 15 testes domain-smoke)
- [x] **DES-T2.2** Domain: regras invariantes (gate ≥99 individual, slides 5–7, `requires_literal_text` flag) — 1h — dev — DES-T2.1 — ✅ 2026-05-14 (`BrandComplianceReport.todosPassaram` exige score≥99 individual; `DesignBriefing.create` valida 5–7 slides)
- [x] **DES-T2.3** Application: `SlidePlannerService.decideProvider()` (lógica ADR-002-DES) + testes — 1h — dev — DES-T2.1 — ✅ inline `DesignCarrosselUseCase.decideImageProvider` (cobre `requiresLiteralText`, hero `73%`, textOverlay≥4 palavras); coberto em 4 asserções do teste integration
- [x] **DES-T2.4** Application: `ParallelSlideGeneratorService` (Promise.allSettled de N slides) — 1.5h — dev — DES-T2.1, Wave 1 — ✅ via `generateAllSlides` chunked com `Promise.all`. NOTA: usamos `Promise.all` (não `allSettled`) deliberadamente — falha catastrófica de adapter aborta carrossel inteiro; brand-fail vira `degraded` (sem erro). Migrar para `allSettled` será considerado em Wave 4 se quisermos parcial-recovery.
- [x] **DES-T2.5** Application: `BrandGateService` (gate individual ≥99, não média) — 45min — dev — DES-T2.1 — ✅ embebido em `BrandComplianceReport.todosPassaram` e na decisão de retry do use case (threshold lido de `brandGuide.tolerance.exact_match_required`)
- [x] **DES-T2.6** Application: `RetryOrchestrator` (1 retry mesmo provider + 1 fallback cross-provider — ADR-003-DES) — 1.5h — dev — DES-T2.4, DES-T2.5 — ✅ via `generateOneSlideWithRetry` (3-attempt ladder); coberto pelos testes "retry: slide reprova 1ª vez" e "fallback cross-provider"
- [x] **DES-T2.7** Application: `CarrosselManifestAssembler` (JSON output spec §1.2) + testes — 1h — dev — DES-T2.4, DES-T2.6 — ✅ via `DesignCarrossel.assemble` (status `completed`/`degraded`, `report.providerSplit()`, custo total, SLA flag)
- [x] **DES-T2.8** Integration tests com fakes `FakeImagen`, `FakeIdeogram`, `FakeBrandValidator` — 1.5h — dev — DES-T2.7 — ✅ 2026-05-14 (5 testes: happy path, retry, fallback cross-provider, degraded, decideImageProvider; reusa fakes de social-media)

**Total Wave 2:** ~10h

## Wave 3 — Test RED (TDD-first, Forge-10)

> ⚠️ **Forge-10 obriga:** test_agent em mode=red gera testes ANTES da Wave 4. Operador confirma falha.

- [x] **DES-T3.1** `/acme:aios-run --step=test --mode=red` (gera `tests/designer-agent/{unit,integration,e2e}/`) — 30min — dev/agent — Wave 2 stable — ✅ 2026-05-19 (3 arquivos RED: cost-cap + partial-recovery + handoff-contract)
- [x] **DES-T3.2** Operador valida RED phase (testes falham localmente) — 15min — dev — ✅ 2026-05-19 (12 FAIL / 22 PASS confirmado)
- [x] **DES-T3.3** Commit do plano de testes + RED evidence — 15min — dev — ✅ 2026-05-19

**Total Wave 3:** ~1h

## Wave 4 — Curadoria + Eval Calibração (1 dia — CRÍTICO)

**Foco:** curar 50 imagens humanamente para calibrar o `BrandValidatorAdapter`. Sem isso, o gate 99% é teatro.

- [ ] **DES-T4.1** Curar 50 imagens em `brand/calibration-set/` (mix: 20 on-brand ≥99, 15 borderline 96-98, 15 off-brand <96) — 3h — dev/designer — em paralelo com Wave 1-2
- [ ] **DES-T4.2** Human rating das 50 em 4 dimensões (cores, tipografia, composição, cantos) → CSV `brand/calibration-ratings.csv` — 1.5h — dev/designer — DES-T4.1
- [ ] **DES-T4.3** Rodar `BrandValidatorAdapter` nas 50, comparar com human ratings — 1h — dev — DES-T4.2, Wave 1
- [ ] **DES-T4.4** Se concordância <90%: tunar prompt do validator (iteração 1) — 1.5h — dev — DES-T4.3
- [ ] **DES-T4.5** Se concordância <90% após iter 1: iter 2 + revisão de critérios — 1.5h — dev — DES-T4.4 (condicional)
- [ ] **DES-T4.6** Eval-suite: 25+ cases em `eval-cases.md` (focando brand consistency multi-dim) — 2h — dev
- [ ] **DES-T4.7** LLM-as-judge cross-validation runner (2º juiz independente) — 1h — dev — DES-T4.6
- [ ] **DES-T4.8** CLI `npm run eval designer-agent` — 30min — dev — DES-T4.6

**Total Wave 4:** ~10h (varia conforme calibração; 13h se precisar 2 iters)

## Wave 5 — Test VERIFY + Ship + SHADOW (0.5 dia)

- [ ] **DES-T5.1** `/acme:aios-run --step=test --mode=verify` (cobertura + gaps) — 30min — agent
- [ ] **DES-T5.2** CI workflow `forge-test` + `forge-eval` ativo para designer-agent — 1h — dev
- [ ] **DES-T5.3** `/acme:sla-threshold designer-agent` (SLA 20min, brand ≥99 individual, max retries=1, max cost R$3) — 30min — dev
- [ ] **DES-T5.4** Telemetria Langfuse específica: spans paralelos por `slide_index`, metadata `caller`, `provider_used`, `retry_count` — 1h — dev
- [ ] **DES-T5.5** Alertas Slack `#design`: brand <96 após 2 retries, re-roll rate >25%/24h, SLA violation, cost >R$3 — 45min — dev
- [ ] **DES-T5.6** Dashboard Mixpanel: carrosséis/dia, brand histogram (96–100%), provider split observado vs target 70/30 — 1h — dev
- [ ] **DES-T5.7** README + runbook ops + contrato de input/output documentado (para social-media-agent consumir) — 1h — dev
- [ ] **DES-T5.8** `/acme:promote designer-agent --to=shadow` (promotion-officer assina) — 30min — agent

**Total Wave 5:** ~6h

## Resumo

| Wave | Esforço | Cobertura |
|------|--------:|-----------|
| 1 — Foundation (REUSO) | 5h | Adapters importados + contratos novos |
| 2 — Domain + Application | 10h | Use cases + paralelização + retry |
| 3 — Test RED | 1h | Gate G6 evidence |
| 4 — Curadoria + Eval | 10–13h | 50 imagens calibradas + 25 eval cases |
| 5 — Ship | 6h | SLA + telemetria + promoção SHADOW |
| **TOTAL** | **~32–35h** | **3–4.5 dias úteis com buffer** |

**Comparação vs social-media-agent:** ~32h vs ~38h. **Economia de ~6h via reuso** (adapters de imagem + brand validator + Langfuse já implementados na Wave 2 do social-media).

## Dependências cross-wave

```
[Wave 2 do social-media-agent] (PRÉ-REQUISITO HARD)
  ↓
W1 (Foundation — imports + contratos)
  ↓
W2 (Domain + Application)
  ↓
W3 (Test RED — bloqueia build via Gate G6)
  ↓
W4 (Curadoria — em paralelo desde W1; eval depois de W3)
  ↓
W5 (Ship + promote SHADOW)
```

> **Curadoria das 50 imagens (DES-T4.1, DES-T4.2)** pode rodar **em paralelo desde a Wave 1** — não bloqueia o build, só bloqueia DES-T4.3+ (rodar o validator nas imagens curadas).

## Gates antes de cada Wave

| Wave | Gate de entrada |
|------|-----------------|
| W1 | Wave 2 do social-media-agent completa (adapters publicados) |
| W2 | Wave 1 completa + smoke test passa (DES-T1.8 OK) |
| W3 | Spec aprovada por po-guardian + plan aprovado por artifact-architect (✅) |
| W4 | Testes RED commitados + falham localmente |
| W5 | Eval-suite pass rate ≥88% + brand concordância humano-validator ≥90% + coverage Tier B atingido |

## ClickUp blueprint

> Cada task acima vira 1 card no ClickUp. ID do card = `DES-T1.1`, `DES-T1.2`, etc.

Veja `templates/clickup-blueprint.template.md` para estrutura de lists/folders.

## Gate brand 99% — política inquebrantável

Diferente de outros SKUs, **o gate brand 99% é hard contractual**. Cada slide do carrossel é avaliado individualmente; não há média. Reflete:
- ADR-001-DES (threshold inquebrantável)
- C2 (Outcome contratual literal)
- C4 (Verifiable evaluation)

Se concordância humano-validator <90% após Wave 4, **NÃO promover para SHADOW**. Re-curar mais 25 imagens e iterar.

## Próximo passo

→ Criar `eval-cases.md` (DES-T4.6 antecipado para podermos discutir critérios)
→ Iniciar curadoria das 50 imagens em paralelo (DES-T4.1) — não bloqueante
→ Aguardar Wave 2 do social-media-agent estabilizar (adapters publicados) antes de iniciar DES-T1.1
