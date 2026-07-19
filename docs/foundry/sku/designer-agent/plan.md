---
sku_id: designer-agent
plan_date: 2026-05-13
audited_by: "@artifact-architect (Guardian)"
status: APPROVED
plan_template: aios-tdd-first (Foundry-10)
implementation_window_days: 3
tier: B
upstream_caller: social-media-agent (composable) | client_direct
reuses_from: social-media-agent (Wave 2 — adapters + brand validator)
---

# Plan Técnico — Designer Agent

## 1. Resumo executivo

**3 dias úteis de implementação** (menos que social-media-agent porque ~60% da infra já existe da Wave 2 do `social-media-agent`):

1. **Foundation** (0.5 dia) — REUSO: importar adapters `ImagenAdapter`, `IdeogramAdapter`, `BrandValidatorAdapter` já implementados; adicionar contrato `DesignBriefing` e `CarrosselManifest`.
2. **Core** (1 dia) — `DesignCarrosselUseCase`: orquestrador de 7 slides em **paralelo**, roteamento Imagen/Ideogram por `requires_literal_text`, gate brand 99% individual por slide.
3. **TDD-RED + Eval** (1 dia) — testes red phase + curadoria de **50 imagens validadas manualmente** para calibrar `BrandValidatorAdapter` (concordância humano-validator ≥90%).
4. **Ship** (0.5 dia) — SLA threshold, telemetria Langfuse específica, promoção `draft → SHADOW`.

**Pipeline:** `spec → schema → test(red) → build(back) → test(verify) → eval → review → promote`

**Diferença vs social-media-agent:**
- **Mais convergente:** designer-agent só gera DESIGN (sem copy, sem caption, sem publicação). Escopo menor → menos componentes.
- **Mais paralelizável:** 7 slides Imagen rodam concorrentes (vs social-media que tem dependências sequenciais entre copy → image → caption).
- **Mais reuso:** Wave 1 inteira da social-media (`ImagenAdapter`, `IdeogramAdapter`, `BrandValidatorAdapter`, `LangfuseAdapter`) entra como dependência.
- **Composable:** pode ser chamado pelo `social-media-agent` OU direto pelo cliente (ADR-004-DES).

## 2. Arquitetura (3 camadas — C7)

```
┌────────────────────────────────────────────────────────────────┐
│  src/domain/design/                                             │
│  Entidades puras (zero deps externas)                           │
│  • Carrossel (N slides + manifest)                              │
│  • Slide (index, briefing, requires_literal_text)               │
│  • DesignBriefing (tema, num_slides, dominant_mode, caller)     │
│  • BrandScore (score 0-100, issues[])                           │
│  • RetryPolicy (gate=99, max_retries=1, cross_provider_fallback)│
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  src/application/designer-agent/                                 │
│  Use cases — orquestra domain via ports                          │
│  • DesignCarrosselUseCase (entry point)                          │
│  • SlidePlannerService (decide Imagen vs Ideogram por slide)     │
│  • ParallelSlideGeneratorService (Promise.allSettled de N slides)│
│  • RetryOrchestrator (ADR-003-DES — 1 retry + cross-provider)    │
│  • CarrosselManifestAssembler (JSON output final)                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  src/infrastructure/adapters/  (REUSO de Wave 2 social-media)    │
│  • image-gen/ImagenAdapter.ts ♻️ existe                          │
│  • image-gen/IdeogramAdapter.ts ♻️ existe                        │
│  • brand/BrandValidatorAdapter.ts ♻️ existe (funcional)          │
│  • observability/LangfuseAdapter.ts ♻️ existe                    │
│  • storage/S3Adapter.ts (a criar se ausente)                     │
└─────────────────────────────────────────────────────────────────┘
```

**Princípio C7:** trocar Imagen 4 por FLUX = trocar `ImagenAdapter.ts` por `FluxAdapter.ts`. Domain e application **nunca** importam SDK específico. `BrandValidatorAdapter` é portável entre social-media e designer (mesma interface `BrandValidator`).

**Composability (ADR-004-DES):**

```typescript
// caller A: social-media-agent
const manifest = await designerAgent.execute({
  briefing: { tema, num_slides: 7, dominant_mode: 'dark' },
  caller: 'social-media-agent',
  tenant_id,
});
// social-media recebe N JPGs + manifest → adiciona caption → publica via Zernio

// caller B: client_direct
const manifest = await designerAgent.execute({
  briefing: { tema, num_slides: 5, variant: 'economic' },
  caller: 'client_direct',
  tenant_id,
});
// cliente recebe S3 presigned URLs + manifest → uso livre
```

## 3. Fase 1 — Foundation (0.5 dia, mostly REUSO)

### Entregáveis

| Item | Stack | Origem | Tier |
|------|-------|--------|:----:|
| Validar imports dos adapters Wave 2 | TS imports | ♻️ social-media | A |
| Brand guide loader (já existe — reuso) | `js-yaml` | ♻️ social-media | A |
| Schema Prisma adicional: `DesignerExecution`, `SlideTrace` | PostgreSQL 16 + Prisma 6 | NOVO | B |
| Contrato `DesignBriefing` (input schema Zod) | Zod | NOVO | A |
| Contrato `CarrosselManifest` (output schema Zod) | Zod | NOVO | A |
| Skeleton `DesignCarrosselUseCase` (stubs, sem lógica) | TS application | NOVO | B |

### Output esperado fim Fase 1

- `npm run typecheck` passa
- `import { ImagenAdapter, IdeogramAdapter, BrandValidatorAdapter } from '@adapters'` funciona
- Schema Zod aceita briefing válido / rejeita inválido (3 testes unit)
- `DesignCarrosselUseCase.execute()` retorna `NotImplementedError` (placeholder)

## 4. Fase 2 — Core (1 dia)

### Entregáveis

| Item | Camada | Tier |
|------|--------|:----:|
| `Carrossel`, `Slide`, `BrandScore`, `RetryPolicy` (domain entities) | domain | A |
| `SlidePlannerService` — decide provider por `requires_literal_text` | application | B |
| `ParallelSlideGeneratorService` (Promise.allSettled paralelo N=5–7) | application | B |
| `BrandGateService` (gate individual ≥99 por slide, não média) | application | A |
| `RetryOrchestrator` (1 retry mesmo provider + 1 fallback cross-provider) | application | A |
| `CarrosselManifestAssembler` (JSON output spec §1.2) | application | A |
| Telemetria spans Langfuse (`intake → plan → gen×N → val×N → retry → output`) | application | B |
| Testes integration com fakes de adapters | tests/integration | B |

### Decisão de paralelização

```typescript
// 7 slides geram em paralelo (Promise.allSettled)
const slideResults = await Promise.allSettled(
  briefing.slides.map((slide, idx) =>
    parallelSlideGenerator.generate(slide, brandGuide, idx)
  )
);
// Validação também paralela
const scores = await Promise.allSettled(
  slideResults.map((r) => brandValidator.score(r.value.image))
);
// Retry SOMENTE para slides reprovados (não bloqueia os aprovados)
const retries = await retryOrchestrator.processFailures(scores);
```

**Decisão Imagen vs Ideogram** (ADR-002-DES):

```typescript
function decideProvider(slide: Slide): ImageProvider {
  if (slide.requires_literal_text === true) return 'ideogram';
  if (slide.text_word_count >= 15) return 'ideogram';
  if (slide.has_hero_number) return 'ideogram';   // ex: "73%"
  return 'imagen-4'; // ~70% dos casos
}
```

### Output esperado fim Fase 2

- `npm test:unit` passa (coverage ≥85% Tier B no domain + application)
- Geração end-to-end com fakes retorna 7 slides + manifest válido
- Retry orchestrator testado com slide "ruim" forçado

## 5. Fase 3 — TDD RED + Eval Curadoria (1 dia)

### Entregáveis

| Item | Detalhe |
|------|---------|
| `/novais-digital:aios-run --step=test --mode=red` | Gera `tests/designer-agent/{unit,integration,e2e}/` |
| RED evidence commitada (Gate G6 Foundry-10) | Operador confirma falha local |
| **Curadoria 50 imagens validadas humanamente** | Pares (slide → human_brand_score) para calibrar `BrandValidatorAdapter` |
| Eval-cases (25+) em `eval-cases.md` | Foco em brand consistency multi-dimensional |
| LLM-as-judge cross-validation | 2º juiz (independente do `BrandValidatorAdapter`) para detectar viés |
| CLI `npm run eval designer-agent` | Roda 25 cases, salva relatório |
| CI workflow `foundry-eval` | Roda diariamente no SKU |

### Calibração do BrandValidatorAdapter

A **diferença crítica** vs social-media-agent: aqui o brand validator é o **gate contratual**. Calibração obrigatória:

1. Curar 50 imagens (mix on-brand + off-brand + borderline 96-98%).
2. Humano rateia cada imagem em 4 dimensões: **cores, tipografia, composição, cantos** (cada 0-100).
3. Rodar `BrandValidatorAdapter` nas mesmas 50.
4. Calcular concordância validator × humano. **Target: ≥90% concordância** (delta absoluto ≤3 pp em score agregado).
5. Se <90%: tunar prompt do validator iterativamente.

### Critérios de pass

- ≥25 eval-cases (será 25-28 para folga)
- Brand consistency média ≥ 99% (gate hard, não média)
- Concordância humano × validator ≥ 90%
- Pass rate ≥ 88% (≥ 22 de 25)
- Cross-judge agreement ≥ 85% (2 juízes concordam)

## 6. Fase 4 — Ship (0.5 dia)

### Entregáveis

| Item | Stack |
|------|-------|
| `/novais-digital:sla-threshold designer-agent` (SLA 20min, brand ≥99%) | Documento + workflow |
| Telemetria Langfuse específica (spans paralelos por slide_index) | Langfuse SDK |
| Alertas Slack (`#design`): brand <96% após 2 retries, re-roll rate >25% janela 24h, SLA violation | Slack webhook |
| Dashboard Mixpanel: carrosséis/dia, brand score distribution (96-100%), provider split observado | Mixpanel |
| README + runbook ops | Markdown |
| `/novais-digital:promote designer-agent --to=shadow` (promotion-officer assina) | Comando Foundry |

### Output esperado fim Fase 4

- `bash scripts/foundry doctor` (consumer mode) sem novos erros críticos
- Eval-suite rodando em CI
- Primeiro carrossel gerado em produção SHADOW (sem cobrar)
- Langfuse mostra trace completo com 7 spans paralelos
- promotion-officer assina transição para SHADOW

## 7. Workflow AIOS TDD-first (Foundry-10)

```bash
# 1. Spec + unit-economics validados (✅ feito)
@po-guardian valida spec.md
@unit-economist valida unit-economics.md (✅ APPROVED 2026-05-13)

# 2. Schema (Prisma — DesignerExecution + SlideTrace)
/novais-digital:aios-run designer-agent --step=schema

# 3. Test RED
/novais-digital:aios-run designer-agent --step=test --mode=red
# Operador confirma falha local

# 4. Build (backend only — sem frontend nesta v0.1.0)
/novais-digital:aios-run designer-agent --step=build

# 5. Test VERIFY
/novais-digital:aios-run designer-agent --step=test --mode=verify

# 6. Eval calibração
npm run eval designer-agent

# 7. Review final
/novais-digital:aios-run designer-agent --step=review

# 8. Promoção SHADOW
/novais-digital:promote designer-agent --to=shadow
```

## 8. Gates de qualidade (Tier B + gate brand 99%)

| Gate | Onde valida | Target |
|------|-------------|:------:|
| Coverage line (unit) | CI workflow `foundry-test` | ≥ 85% |
| Coverage branch (unit) | CI workflow `foundry-test` | ≥ 80% |
| Integration tests presentes | Gate G6 (Foundry-10) | ≥ 5 testes |
| E2E Playwright (geração real, sandbox Imagen + Ideogram) | CI workflow `foundry-test` | 2 happy paths + 1 retry path |
| TDD red phase evidence | Gate G6 mecânico | `tests/designer-agent/unit/` ≥ 1 arquivo antes do build |
| Eval-suite pass rate | `/novais-digital:eval` | ≥ 88% |
| **Brand consistency individual** (gate hard) | Métrica Langfuse + validator | **≥ 99% por slide** |
| Concordância validator × humano | Curadoria 50 imagens | ≥ 90% |
| Re-roll rate observado | Métrica Langfuse | ≤ 25% (alarme se >25%) |

## 9. Riscos do plano

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Calibração do validator demora (concordância <90% após 50 imagens) | +1 dia | Curar 50 imagens **antes** da Fase 2; iterar prompt em paralelo com Wave 4 |
| Paralelização 7 slides causa rate-limit Imagen 4 | +0.5 dia | Token bucket + 429 retry exponencial; testar com 10 carrosséis sequenciais |
| Composability com social-media gera contrato instável | +0.5 dia | Congelar `DesignBriefing` Zod schema antes da Wave 4; versionar via `briefing_version` |
| Re-roll cross-provider (Imagen↔Ideogram) gera estilos inconsistentes | +0.5 dia | Eval-case dedicado (Case 18 em eval-cases.md); aceitar degradação leve em ADR-003-DES |
| Adapter S3 não existe | +0.5 dia | Criar skeleton minimal em Wave 1; usar Buffer in-memory como fallback |
| **Total buffer recomendado** | **+1.5 dias** | Plano comporta 3-4.5 dias úteis |

## 10. Decisão (`@artifact-architect`)

✅ **APROVADO** — adapter pattern preservado (C7), reuso máximo da Wave 2 do social-media-agent, paralelização correta no application layer.
✅ **Composability** validada (ADR-004-DES): designer-agent pode ser chamado por social-media-agent OU direto. Interface estável via Zod schema.
✅ **Gate brand 99% individual** (não média) corretamente posicionado no `BrandGateService` do application layer (não no adapter).
⚠️ **Atenção:** `domain/design/` NUNCA importa SDK externo (hook `any-type-guard` + revisão manual em PR). Validador especialmente: o adapter é injetado via port `BrandValidator`.
⚠️ **Atenção:** evitar duplicar lógica de retry entre social-media e designer; considerar extrair `RetryPolicy` para `src/domain/shared/` em wave futura.

## 11. Próximo passo

→ `/novais-digital:tasks designer-agent` (decomposição em waves executáveis)
→ Curar 50 imagens calibração **em paralelo** com Wave 1 (não bloqueante)
→ Iniciar Fase 1 logo após Wave 6 do social-media-agent (reuso pleno dos adapters)

---

**Assinatura:** `@artifact-architect` Guardian (Sonnet) — 2026-05-13 — APPROVED
