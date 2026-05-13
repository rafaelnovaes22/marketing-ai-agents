---
sku_id: social-media-agent
plan_date: 2026-05-13
audited_by: "@artifact-architect (Guardian)"
status: APPROVED
plan_template: aios-tdd-first (Forge-10)
implementation_window_days: 4
tier: B
---

# Plan Técnico — Social Media Agent

## 1. Resumo executivo

**4 dias de implementação** seguindo pipeline AIOS TDD-first (Forge-10):
1. **Foundation** (1 dia) — adapters + brand loader + abstrações
2. **Core** (1.5 dias) — copy generator + image generator + brand validator + assembler
3. **Eval** (0.5 dia) — eval-suite 20+ casos + SHADOW runner
4. **Ship** (1 dia) — Zernio publishers + SLA threshold + telemetria + dashboard

**Pipeline:** `spec → schema → test(red) → build(back+front) → test(verify) → review`

## 2. Arquitetura (3 camadas — C7)

```
┌─────────────────────────────────────────────────────────────┐
│  src/domain/carrossel/                                       │
│  Entidades puras, sem deps externas                          │
│  • Carrossel (5 slides + caption + legendas)                 │
│  • SlideContent (texto + visual_brief)                       │
│  • BrandGuide (cores, tipografia, composição)               │
│  • Tom (FounderVoice, ExecutivoB2B, ...)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  src/application/social-media-agent/                         │
│  Use cases, orquestra domain                                 │
│  • GenerateCarrosselUseCase                                  │
│  • PublishMultiNetworkUseCase                                │
│  • ValidateBrandUseCase                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  src/infrastructure/adapters/                                │
│  Adapters para SDKs externos                                 │
│  • llm/claude-adapter.ts (Anthropic SDK)                     │
│  • image-gen/imagen-adapter.ts (Vertex AI SDK)               │
│  • image-gen/ideogram-adapter.ts (Ideogram API)              │
│  • social-publishers/zernio-adapter.ts                       │
│  • brand/validator-adapter.ts (Claude vision)                │
│  • observability/langfuse-adapter.ts                         │
└─────────────────────────────────────────────────────────────┘
```

**Princípio C7:** trocar Anthropic → OpenAI = trocar 1 arquivo (`llm/openai-adapter.ts`). Domain e application **nunca** importam SDK específico.

## 3. Fase 1 — Foundation (1 dia)

### Entregáveis

| Item | Stack | Tier |
|------|-------|:----:|
| Setup TypeScript + Vitest + Playwright | TS 5.x + Vitest 1.x + Playwright 1.x | A |
| Schema Prisma básico (Carrossel, Execution, Trace) | PostgreSQL 16 + Prisma 6 | B |
| Brand guide loader (YAML → BrandGuide entity) | `js-yaml` | A |
| LLM adapter interface + ClaudeAdapter | Anthropic SDK | B |
| Image gen adapter interface + ImagenAdapter + IdeogramAdapter | Vertex AI SDK + Ideogram REST | B |
| Tom prompt engineering (system prompt the CEO) | Curated examples | B |
| Configuração Langfuse | Langfuse SDK | A |

### Output esperado fim Fase 1

- ✅ `npm run typecheck` passa sem erros
- ✅ Brand guide YAML carrega e valida
- ✅ ClaudeAdapter consegue gerar texto de teste
- ✅ ImagenAdapter consegue gerar imagem de teste
- ✅ Langfuse recebe trace de teste

## 4. Fase 2 — Core (1.5 dias)

### Entregáveis

| Item | Camada | Tier |
|------|--------|:----:|
| `GenerateCarrosselUseCase` | application | B |
| `Copy generator` (4-5 slides + caption + legendas por rede) | application | B |
| `Image generator orchestrator` (decide Imagen vs Ideogram por slide) | application | B |
| `Brand validator` (vision check ≥99%) | application | B |
| `Carrossel assembler` (junta tudo + valida outcome) | application | A |
| Retry logic + exponential backoff | infrastructure | A |

### Decisão Imagen vs Ideogram

```typescript
function decideImageProvider(slide: SlideContent): ImageProvider {
  if (slide.hasTextOverlay && slide.textWordCount > 15) {
    return 'ideogram'; // Imagen 4 ruim com texto longo
  }
  if (slide.requiresPersonImage && slide.brandReference) {
    return 'ideogram'; // Imagen 4 pode rejeitar
  }
  return 'imagen-4'; // 80% dos casos
}
```

### Output esperado fim Fase 2

- ✅ `npm test:unit` passa (coverage ≥85% Tier B)
- ✅ Geração end-to-end funciona localmente (mock adapters)
- ✅ Brand validation rejeita slides off-brand corretamente

## 5. Fase 3 — Eval (0.5 dia)

### Entregáveis

| Item | Detalhe |
|------|---------|
| `eval-cases.md` com 20+ cenários | Ver arquivo dedicado |
| LLM-as-judge runner | Claude Sonnet 4.6 com prompt de juiz |
| Eval CLI (`npm run eval social-media-agent`) | Roda todos cases, salva resultado |
| SHADOW mode runner | Executa em produção sem cobrar |

### Critérios de pass

- 20+ eval-cases (será 25+ para folga)
- Tom score médio ≥ 7,5/10
- Brand consistency média ≥ 99%
- Pass rate ≥ 85% (≥ 17 de 20 casos)

## 6. Fase 4 — Ship (1 dia)

### Entregáveis

| Item | Stack |
|------|-------|
| Zernio adapter (4 redes) | Zernio REST API |
| Twitter thread mode (ADR-003-DS) | Adapter especializado |
| SLA threshold definido (`/acme:sla-threshold`) | Documento + workflow |
| Telemetria Langfuse completa (traces + spans + metadata) | Langfuse SDK |
| Dashboard básico (Grafana/Mixpanel) | Métricas: posts/dia, custo, score, SLA |
| Alertas Slack (SLA, brand <95%, custo > R$ 3) | Slack webhook |
| Promoção draft → SHADOW (`/acme:promote`) | promotion-officer assina |

### Output esperado fim Fase 4

- ✅ `bash scripts/forge doctor` no projeto (consumer mode) sem erros críticos
- ✅ Eval-suite roda em CI
- ✅ Primeiro carrossel publicado em produção via SHADOW (sem cobrar)
- ✅ Langfuse mostra trace completo
- ✅ promotion-officer assina transição para SHADOW

## 7. Workflow AIOS TDD-first (Forge-10)

```bash
# 1. Spec validada (já feito)
@po-guardian valida spec.md
@unit-economist valida unit-economics.md

# 2. Schema (Prisma)
/acme:aios-run social-media-agent --step=schema

# 3. Test RED (testes ANTES do código)
/acme:aios-run social-media-agent --step=test --mode=red
# Operador roda `npm test` e CONFIRMA QUE FALHA
# (porque código ainda não existe)

# 4. Build (em paralelo: backend + frontend se houver)
/acme:aios-run social-media-agent --step=build

# 5. Test VERIFY (após build)
/acme:aios-run social-media-agent --step=test --mode=verify
# Veredicto: TESTES SUFICIENTES ou ADICIONAR TESTES

# 6. Review final
/acme:aios-run social-media-agent --step=review
# review_agent: APROVADO PARA MERGE: Sim/Não
```

## 8. Gates de qualidade (Tier B)

| Gate | Onde valida | Target |
|------|-------------|:------:|
| Coverage line (unit) | CI workflow `forge-test` | ≥ 85% |
| Coverage branch (unit) | CI workflow `forge-test` | ≥ 80% |
| Integration tests presentes | Gate G6 (Forge-10) | ≥ 5 testes |
| E2E Playwright (publicação real) | CI workflow `forge-test` | 3 happy paths |
| TDD red phase evidence | Gate G6 mecânico | `tests/social-media-agent/unit/` ≥ 1 arquivo antes do build |
| Eval-suite pass rate | `/acme:eval` | ≥ 85% |
| Brand validation médio | Métrica Langfuse | ≥ 99% |
| Tom score médio | LLM-as-judge | ≥ 7,5/10 |

## 9. Riscos do plano

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| TDD red phase atrasa Fase 1 (dev acostumado a code-first) | +0.5 dia | Pair programming primeira sessão; usar `/acme:aios-run --step=test --mode=red` |
| Prompt engineering do tom the CEO exige muitas iterações | +0.5 dia | Reservar Fase 3 para tuning; usar 30 exemplos curados como few-shot |
| Zernio API mudou (versão nova) | +0.5 dia | Sandbox primeiro; validar contratos |
| Brand validator gera muitos falsos positivos | +1 dia | Calibração com 50 imagens validadas manualmente |
| **Total buffer recomendado** | **+2 dias** | Plano comporta 4-6 dias realistas |

## 10. Decisão (`@artifact-architect`)

✅ **APROVADO** — adapter pattern garantido (C7), camadas isoladas, TDD-first respeitado.
✅ **Arquitetura suporta** evolução para multi-tenant (fase 2 consumer) sem refactor profundo.
⚠️ **Atenção:** garantir que `domain/carrossel/` NUNCA importe SDK externo durante implementação. Hook `any-type-guard` + revisão manual em PR.

## 11. Próximo passo

→ `/acme:tasks social-media-agent` (decomposição em ClickUp)
→ Iniciar Fase 1 amanhã (D2 do roadmap de 14 dias)

---

**Assinatura:** `@artifact-architect` Guardian (Sonnet) — 2026-05-13 — APPROVED
