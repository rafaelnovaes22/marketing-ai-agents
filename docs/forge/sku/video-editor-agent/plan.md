---
sku_id: video-editor-agent
plan_date: 2026-05-13
audited_by: "@artifact-architect (Guardian)"
status: APPROVED
plan_template: aios-tdd-first (Forge-10)
implementation_window_days: 4
tier: B
scenario_scope: A_only (corte de input)
veo3_excluded: true
linked_adr: [ADR-001-VE, ADR-004-VE, ADR-005-VE]
---

# Plan Técnico — Video Editor Agent (Cenário A apenas)

> 🚨 **ESCOPO RESTRITO POR ADR-001-VE:** Este plano cobre **APENAS Cenário A** — corte de vídeo input (longo) em clips 30-90s.
> O Cenário B (Veo 3 geração nova) foi DIFERIDO para `video-editor-agent-premium` na wave 2 do consumer. Ver `out-of-scope.md`.
> **NÃO implementar adapters Veo 3 / Runway nesta wave.** Domain mantém abstrações compatíveis para evolução futura, mas zero código de geração.

## 1. Resumo executivo

**3-4 dias úteis** seguindo pipeline AIOS TDD-first (Forge-10):

1. **Foundation** (1 dia) — ElevenLabs Scribe adapter + FFmpeg setup + storage S3
2. **Core** (1.5 dias) — VideoCutterUseCase + ScriptGeneratorUseCase + tradução 5 idiomas + brand validator
3. **Eval + RED tests** (0.5 dia) — eval-suite 20+ casos + LLM-as-judge + testes RED
4. **Ship** (1 dia) — multi-aspect ratio render + legendas hardcoded + SLA + promoção SHADOW

**Pipeline:** `spec → schema → test(red) → build → test(verify) → review`

## 2. Arquitetura (3 camadas — C7)

```
┌─────────────────────────────────────────────────────────────┐
│  src/domain/video-short/                                     │
│  Entidades puras, sem deps externas                          │
│  • VideoShort (clip 30-90s + 3 aspect ratios)                │
│  • Cut (timestamp_in, timestamp_out, hook_score, reason)     │
│  • Caption (text, language, srt, hardcoded?)                 │
│  • AspectRatio (NINE_SIXTEEN | ONE_ONE | SIXTEEN_NINE)       │
│  • Transcript (segments + speakers + confidence)             │
│  • Script (timestamps + justificativa + caption por rede)    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  src/application/video-editor-agent/                         │
│  Use cases — orquestra domain                                │
│  • VideoCutterUseCase (input longo → seleciona N clips)      │
│  • ScriptGeneratorUseCase (transcript → roteiro+captions)    │
│  • TranslateCaptionsUseCase (PT-BR → EN/ES/FR/IT)            │
│  • RenderMultiAspectUseCase (1 clip → 3 MP4s)                │
│  • ValidateBrandUseCase (frames lower-third)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  src/infrastructure/adapters/                                │
│  Adapters para SDKs externos                                 │
│  • transcription/elevenlabs-adapter.ts                       │
│  • transcription/google-stt-adapter.ts (fallback)            │
│  • llm/claude-adapter.ts (análise + tradução + script)       │
│  • brand/validator-adapter.ts (Claude vision)                │
│  • video-processing/ffmpeg-adapter.ts (corte + render)       │
│  • storage/s3-adapter.ts                                     │
│  • observability/langfuse-adapter.ts                         │
│  ❌ video-gen/veo3-adapter.ts — NÃO criar nesta wave         │
│  ❌ video-gen/runway-adapter.ts — NÃO criar nesta wave       │
└─────────────────────────────────────────────────────────────┘
```

**Princípio C7:** trocar ElevenLabs → Google STT = trocar 1 arquivo. Domain e application **nunca** importam SDK específico.

**Princípio anti-vazamento Cenário B:** durante esta wave, qualquer import de `video-gen/*` em application/domain quebra CI (lint rule custom).

## 3. Fase 1 — Foundation (1 dia)

### Entregáveis

| Item | Stack | Tier |
|------|-------|:----:|
| Setup TS 5.x + Vitest 1.x + Playwright 1.x | TS + Vitest + Playwright | A |
| Schema Prisma (`VideoShort`, `Execution`, `Transcript`, `LangfuseTrace`) | PostgreSQL 16 + Prisma 6 | B |
| Brand guide loader (lower-third config por aspect ratio) | `js-yaml` | A |
| ElevenLabs Scribe v2 adapter + retry/backoff | ElevenLabs SDK | B |
| Google STT v2 adapter (fallback) | Google Cloud SDK | B |
| FFmpeg adapter (corte, render multi-aspect, hardcode subs) | `fluent-ffmpeg` + binário layer Lambda | B |
| Smoke test FFmpeg: corta vídeo 1min em 3 ratios | — | A |
| S3 + CloudFront setup (bucket, signed URLs) | AWS SDK | A |
| Langfuse adapter | Langfuse SDK | A |

### Notas críticas

- **FFmpeg deve estar no Lambda layer** (binário ~50MB). Validar deploy local + IaC antes de prosseguir.
- **Bucket S3:** lifecycle policy 30 dias (auto-cleanup de inputs grandes pra controlar custo storage).
- ElevenLabs Scribe v2 retorna timestamps por palavra → preservar para legendas precisas (não só por sentença).

### Output esperado fim Fase 1

- ✅ `npm run typecheck` passa
- ✅ ElevenLabs Scribe transcreve áudio teste (5min) → JSON com word-level timestamps
- ✅ FFmpeg corta clip 30s de input 5min em 3 aspect ratios (9:16, 1:1, 16:9), todos ≤25MB
- ✅ Upload S3 + signed URL funcionando

## 4. Fase 2 — Core (1.5 dias)

### Entregáveis

| Item | Camada | Tier |
|------|--------|:----:|
| Domain: `VideoShort`, `Cut`, `Caption`, `AspectRatio`, `Transcript` + invariantes | domain | B |
| Domain tests puros (sem mock externo) | domain | B |
| `VideoCutterUseCase` (transcript → seleciona 1-N cortes "publicáveis") | application | B |
| `ScriptGeneratorUseCase` (cortes → roteiro PT-BR + captions multi-rede + hashtags) | application | B |
| `TranslateCaptionsUseCase` (PT-BR → EN/ES/FR/IT com glossário) | application | B |
| `ValidateBrandUseCase` (Sonnet 4.6 vision verifica lower-third) | application | B |
| Retry logic + exponential backoff (ElevenLabs/Anthropic 529) | infrastructure | A |
| **Circuit breaker:** rejeita inputs >90min (ADR-004-VE) | application | A |
| Prompt engineering: "seleção de cortes virais" (30+ few-shot) | prompts/ | B |
| Glossário tradução B2B/AI (PT→EN/ES/FR/IT) | data/glossary.yaml | B |

### Lógica de seleção de cortes (núcleo do agente)

```typescript
// pseudo-code
async function selectCuts(transcript: Transcript, maxClips = 5): Promise<Cut[]> {
  const prompt = buildCutSelectionPrompt(transcript, brand_guide, fewShotExamples);
  const response = await llm.generate(prompt); // Claude Sonnet 4.6
  const candidates: Cut[] = parseClaudeResponse(response);
  // Filtros mecânicos pós-LLM:
  return candidates
    .filter(c => c.duration_seconds >= 30 && c.duration_seconds <= 90)
    .filter(c => c.hook_score >= 7)
    .slice(0, maxClips);
}
```

### Output esperado fim Fase 2

- ✅ `npm test:unit` passa (coverage ≥85% Tier B)
- ✅ E2E mock: input 5min teste → 2 clips selecionados + roteiro + 5 idiomas
- ✅ Brand validator rejeita lower-third off-brand
- ✅ Cap de 90min retorna erro estruturado (não consome Scribe)

## 5. Fase 3 — Eval + Test RED (0.5 dia)

### Entregáveis

| Item | Detalhe |
|------|---------|
| `eval-cases.md` com 20+ cenários | ver arquivo dedicado |
| LLM-as-judge runner (qualidade de cortes) | Claude Sonnet 4.6 com prompt de juiz curado |
| Eval CLI (`npm run eval video-editor-agent`) | roda todos cases, salva resultado |
| `/acme:aios-run --step=test --mode=red` gera testes que FALHAM | Gate G6 evidence |
| Operador confirma RED localmente | commit `RED phase confirmed` |

### Critérios de pass

- 20+ eval-cases (alvo 22)
- Cut quality score médio ≥ 7,5/10
- Brand consistency média ≥ 95% (mais permissivo que social-media por causa de variação natural de frames)
- Transcription accuracy ≥ 95% em PT-BR
- Pass rate ≥ 85%

## 6. Fase 4 — Build + Integration + Ship (1 dia)

### Entregáveis

| Item | Stack |
|------|-------|
| Test VERIFY (`/acme:aios-run --step=test --mode=verify`) | Forge-10 |
| Integration com vídeo real curto (5min the CEO brand) | E2E |
| Multi-aspect rendering pipeline completo (9:16, 1:1, 16:9) | FFmpeg + smart crop |
| Hardcoded captions queimadas na 9:16 (ADR-003-VE) | FFmpeg drawtext + libass |
| SRT separado para 5 idiomas (todas versões) | FFmpeg/custom writer |
| `/acme:sla-threshold video-editor-agent` (SLA contratual) | gate |
| Dashboard Mixpanel (vídeos/dia, custo/segundo, SLA, transcription acc) | Mixpanel |
| Alertas Slack (SLA, custo > R$ 7,50, transcription <90%, **Veo 3 invocation = CRITICAL**) | Slack webhook |
| `/acme:promote video-editor-agent --to=shadow` | promotion-officer |

### Output esperado fim Fase 4

- ✅ E2E com vídeo real teste 5min: 2 clips × 3 aspect ratios × 5 idiomas em ≤10min
- ✅ Custo medido em produção (sample 5 vídeos) ≤ R$ 5,00 médio
- ✅ Langfuse mostra trace completo (15+ spans)
- ✅ promotion-officer assina transição para SHADOW

## 7. Workflow AIOS TDD-first (Forge-10)

```bash
# Spec validada ✅ + plan ✅ + unit-economics ✅
@po-guardian valida spec.md
@unit-economist valida unit-economics.md (APPROVED_WITH_ADR_SPLIT)

# Schema
/acme:aios-run video-editor-agent --step=schema

# Test RED (testes ANTES do código)
/acme:aios-run video-editor-agent --step=test --mode=red
# Operador roda npm test e CONFIRMA QUE FALHA

# Build
/acme:aios-run video-editor-agent --step=build

# Test VERIFY
/acme:aios-run video-editor-agent --step=test --mode=verify

# Review final
/acme:aios-run video-editor-agent --step=review
```

## 8. Gates de qualidade (Tier B)

| Gate | Onde valida | Target |
|------|-------------|:------:|
| Coverage line (unit) | CI `forge-test` | ≥ 85% |
| Coverage branch (unit) | CI `forge-test` | ≥ 80% |
| Integration tests presentes | Gate G6 | ≥ 5 testes |
| E2E (vídeo real curto) | CI semanal | 2 happy paths |
| TDD red phase evidence | Gate G6 mecânico | tests antes do build |
| **No-Veo3 import check** | CI lint custom | `grep -r "video-gen" src/` retorna 0 |
| Eval pass rate | `/acme:eval` | ≥ 85% |
| Cut quality score | LLM-as-judge | ≥ 7,5/10 |
| Transcription accuracy | sample humano + LLM-judge | ≥ 95% |
| Brand consistency | métrica Langfuse | ≥ 95% |

## 9. Constraints críticos

### 9.1 Cap duração input (ADR-004-VE)

**Hard cap 90 minutos.** Acima disso, sistema retorna erro estruturado pedindo trim manual OU encaminha para custom B2B.

Motivo: 120min × $0.024 = $2.88 = R$ 15,26 → viola C3 mesmo no preço R$ 30.

### 9.2 Veo 3 BLOQUEADO

Adapter `video-gen/veo3-adapter.ts` **não existe nesta wave**. Lint rule custom impede import.

Se descobrir necessidade durante implementação → STOP, abrir ADR no `video-editor-agent-premium` (ver `out-of-scope.md`).

### 9.3 FFmpeg infra

Binário em Lambda layer. Smoke test obrigatório em CI antes de qualquer build.

## 10. Riscos do plano

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| ElevenLabs Scribe v2 acurácia <95% em PT-BR coloquial | Legendas ruins | Fallback Google STT + LLM-as-judge sample 10% |
| Seleção de cortes pelo LLM tem qualidade baixa (sem hook claro) | Score eval cai | Few-shot 30+ exemplos curados manualmente; tuning Fase 3 |
| FFmpeg Lambda layer >50MB (limite) | Deploy quebra | Container image (ECR) em vez de layer |
| Smart crop 16:9 → 9:16 corta cabeça/face do speaker | Qualidade visual ruim | Face detection (MediaPipe leve) antes do crop |
| Hardcoded subs sincronização ruim | Legendas off-time | Usar word-level timestamps Scribe v2 |
| Inputs >90min chegando muito | Frustração cliente | Mensagem clara + sugestão de trim |
| **Total buffer recomendado** | **+1 dia** | Plano comporta 3-4 dias realistas |

## 11. Decisão (`@artifact-architect`)

✅ **APROVADO** — adapter pattern garantido (C7), Veo 3 isolado e bloqueado, cap de 90min protege C3.
✅ **Arquitetura suporta** evolução para `video-editor-agent-premium` (wave 2) sem refactor profundo — basta adicionar adapters `video-gen/*` e habilitar UseCase paralelo.
⚠️ **Atenção:** garantir que `domain/video-short/` NUNCA importe SDK externo. Hook `any-type-guard` + revisão manual em PR.
⚠️ **Lint rule custom obrigatória:** bloquear qualquer import de `video-gen/*` nesta wave.

## 12. Próximo passo

→ `/acme:tasks video-editor-agent` (decomposição em ClickUp)
→ Iniciar Fase 1 (Setup + ElevenLabs adapter)

---

**Assinatura:** `@artifact-architect` Guardian (Sonnet) — 2026-05-13 — APPROVED
