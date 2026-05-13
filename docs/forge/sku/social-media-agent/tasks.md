---
sku_id: social-media-agent
tasks_date: 2026-05-13
total_tasks: 32
estimated_days: 4-6
tier: B
waves: 6
---

# Tasks — Social Media Agent

> Decomposição do plano em tasks executáveis. Cada task tem ID, descrição, estimativa, dependências, dono sugerido.
>
> Sintaxe: **[ID] Nome — esforço — dono — deps**

## Wave 1 — Foundation (1 dia)

- [ ] **T1.1** Setup TS 5.x + Vitest 1.x + Playwright 1.x — 1h — dev — sem deps
- [ ] **T1.2** Schema Prisma 6 (`Carrossel`, `Execution`, `LangfuseTrace`) — 1h — dev — T1.1
- [ ] **T1.3** Migrations + seed mínimo (1 brand_guide fake) — 30min — dev — T1.2
- [ ] **T1.4** Brand guide loader (YAML → BrandGuide entity) + testes unit — 1h — dev — T1.1
- [ ] **T1.5** LLM adapter interface (`LLMProvider`) + Claude implementation — 1.5h — dev — T1.1
- [ ] **T1.6** Image gen adapter interface + Imagen 4 impl — 1.5h — dev — T1.1
- [ ] **T1.7** Image gen Ideogram v2 impl — 1h — dev — T1.6
- [ ] **T1.8** Langfuse adapter + setup local Langfuse — 1h — dev — T1.1
- [ ] **T1.9** Prompt engineering: system prompt the CEO (com 30 exemplos few-shot) — 1.5h — dev — T1.5
- [ ] **T1.10** Validação smoke (gerar texto + imagem de teste) — 30min — dev — T1.5, T1.6

**Total Wave 1:** ~10h (1 dia útil com buffer)

## Wave 2 — Domain + Application (1 dia)

- [ ] **T2.1** Domain: entidades `Carrossel`, `Slide`, `Caption`, `BrandGuide`, `Tom` — 1.5h — dev — T1.1
- [ ] **T2.2** Domain: regras de validação outcome (4-5 slides padrão, ≤2200 chars caption) — 1h — dev — T2.1
- [ ] **T2.3** Domain: testes unit puros (sem mock externo) — 1h — dev — T2.1, T2.2
- [ ] **T2.4** UseCase `GenerateCarrossel` (orquestra LLM + image gen + brand validator) — 2h — dev — Wave 1
- [ ] **T2.5** UseCase: lógica `decideImageProvider` (Imagen vs Ideogram) — 30min — dev — T2.4
- [ ] **T2.6** UseCase: retry + backoff exponencial — 30min — dev — T2.4
- [ ] **T2.7** Testes integration com fakes de adapters — 1.5h — dev — T2.4
- [ ] **T2.8** Brand validator (vision Claude Sonnet 4.6) — 1.5h — dev — Wave 1

**Total Wave 2:** ~10h

## Wave 3 — Test RED (TDD-first, Forge-10) — INSERIR ANTES DO BUILD COMPLETO

> ⚠️ **Forge-10 obriga:** test_agent em mode=red gera testes ANTES de Wave 4 (build).
> Operador roda `npm test` e CONFIRMA QUE FALHA antes de prosseguir.

- [ ] **T3.1** `/acme:aios-run --step=test --mode=red` (gera tests/social-media-agent/{unit,integration,e2e}/) — 30min — dev/agent
- [ ] **T3.2** Operador valida que testes falham (RED phase confirmada) — 15min — dev
- [ ] **T3.3** Commit do plano de testes + RED evidence — 15min — dev

**Total Wave 3:** ~1h

## Wave 4 — Build completo (já com testes RED)

(itens iniciados em Wave 2 mas formalizados/refinados aqui)

- [ ] **T4.1** Implementar testes para passar RED → GREEN — itens das W1/W2
- [ ] **T4.2** CarrosselAssembler completo (junta tudo) — 1h — dev
- [ ] **T4.3** Frontend (se houver — admin panel para SHADOW review) — 4h — dev — opcional

**Total Wave 4:** ~5h (parcialmente coberto em W1/W2)

## Wave 5 — Test VERIFY + Eval-suite (0.5 dia)

- [ ] **T5.1** `/acme:aios-run --step=test --mode=verify` (cobertura + gaps) — 30min — agent
- [ ] **T5.2** Eval-suite: 20+ cases curados em `eval-cases.md` — 2h — dev
- [ ] **T5.3** LLM-as-judge runner (Claude Sonnet 4.6 com prompt de juiz) — 1h — dev
- [ ] **T5.4** CLI `npm run eval social-media-agent` — 30min — dev
- [ ] **T5.5** CI: workflow `forge-test` ativo para este SKU — 1h — dev

**Total Wave 5:** ~5h

## Wave 6 — Ship (1 dia)

- [ ] **T6.1** Zernio adapter (4 redes) + testes integration sandbox — 2h — dev
- [ ] **T6.2** Twitter thread mode (ADR-003-DS) — 1h — dev
- [ ] **T6.3** `/acme:sla-threshold social-media-agent` (define SLA contratual) — 30min — dev
- [ ] **T6.4** Dashboard básico Mixpanel (carrosséis/dia, custo, SLA) — 1.5h — dev
- [ ] **T6.5** Alertas Slack (SLA violation, brand <95%, custo > R$ 3) — 1h — dev
- [ ] **T6.6** Documentação README + runbook ops — 1h — dev
- [ ] **T6.7** `/acme:promote social-media-agent --to=shadow` (promotion-officer assina) — 30min — agent

**Total Wave 6:** ~7h

## Resumo

| Wave | Esforço | Cobertura |
|------|--------:|-----------|
| 1 — Foundation | 10h | Adapters + brand loader + LLM setup |
| 2 — Domain + Application | 10h | Use cases + testes unit/integration |
| 3 — Test RED (TDD) | 1h | Gate G6 evidence |
| 4 — Build (refinement) | 5h | Cobertura ≥85% Tier B |
| 5 — Test VERIFY + Eval | 5h | Eval-suite + CI |
| 6 — Ship | 7h | Publicação + SLA + promoção SHADOW |
| **TOTAL** | **~38h** | **4-5 dias úteis com buffer** |

## Dependências cross-wave

```
W1 (Foundation)
  ↓
W2 (Domain + Application)
  ↓
W3 (Test RED) — BLOQUEIA Build via Gate G6
  ↓
W4 (Build completa)
  ↓
W5 (Test VERIFY + Eval)
  ↓
W6 (Ship + promote)
```

## Gates antes de cada Wave

| Wave | Gate de entrada |
|------|-----------------|
| W2 | Wave 1 completa + smoke test passa |
| W3 | Spec aprovada por po-guardian (✅) + plan aprovado por artifact-architect (✅) |
| W4 | Testes RED commitados + falham localmente |
| W5 | Build completo + npm typecheck OK |
| W6 | Eval-suite pass rate ≥85% + coverage Tier B atingido |

## ClickUp blueprint

> Cada task acima vira 1 card no ClickUp. ID do card = `SMA-T1.1`, `SMA-T1.2`, etc.

Veja `templates/clickup-blueprint.template.md` para estrutura de lists/folders.

## Próximo passo

→ Criar `eval-cases.md` (W5.T5.2 antecipado para podermos discutir critérios antes do build)
→ Criar `decisions.md` local com ADR-001-DS, ADR-002-DS, ADR-003-DS
→ Promoção `draft → SHADOW` após Wave 6
