---
sku_id: video-editor-agent
tasks_date: 2026-05-13
total_tasks: 36
estimated_days: 3-4
tier: B
waves: 6
scenario_scope: A_only
veo3_excluded: true
---

# Tasks — Video Editor Agent (Cenário A apenas)

> Decomposição do plano em tasks executáveis. Cenário B (Veo 3) NÃO está incluído — ver `out-of-scope.md`.
>
> Sintaxe: **[ID] Nome — esforço — dono — deps**

## Wave 1 — Foundation (1 dia)

- [ ] **T1.1** Setup TS 5.x + Vitest 1.x + Playwright 1.x — 1h — dev — sem deps
- [ ] **T1.2** Schema Prisma 6 (`VideoShort`, `Execution`, `Transcript`, `Cut`, `LangfuseTrace`) — 1.5h — dev — T1.1
- [ ] **T1.3** Migrations + seed mínimo (1 brand_guide lower-third) — 30min — dev — T1.2
- [ ] **T1.4** Brand guide loader (YAML → lower-third config por aspect ratio) — 1h — dev — T1.1
- [ ] **T1.5** `TranscriptionProvider` interface + ElevenLabs Scribe v2 impl + word-level timestamps — 2h — dev — T1.1
- [ ] **T1.6** Google STT v2 adapter (fallback) — 1h — dev — T1.5
- [ ] **T1.7** `FFmpegAdapter` setup: corte, render multi-aspect, drawtext/libass — 2h — dev — T1.1
- [ ] **T1.8** FFmpeg Lambda layer (binário ~50MB) OU container ECR — 1.5h — devops — T1.7
- [ ] **T1.9** S3 + CloudFront setup (bucket video-editor, signed URLs, lifecycle 30d) — 1h — devops — T1.1
- [ ] **T1.10** Langfuse adapter + setup local — 1h — dev — T1.1
- [ ] **T1.11** Smoke test FFmpeg: corta vídeo 1min em 3 aspect ratios — 30min — dev — T1.7, T1.8
- [ ] **T1.12** Smoke test ElevenLabs: transcreve áudio 5min PT-BR — 30min — dev — T1.5

**Total Wave 1:** ~13h (1-1.5 dia útil com buffer)

## Wave 2 — Domain + Application (1.5 dia)

- [ ] **T2.1** Domain: `VideoShort`, `Cut`, `Caption`, `AspectRatio`, `Transcript` + invariantes — 2h — dev — T1.1
- [ ] **T2.2** Domain: regra cap input ≤90min (ADR-004-VE) — 30min — dev — T2.1
- [ ] **T2.3** Domain: testes unit puros (sem mock externo) — 1.5h — dev — T2.1, T2.2
- [ ] **T2.4** Prompt engineering: seleção de cortes virais (30+ few-shot) — 2h — dev — Wave 1
- [ ] **T2.5** `VideoCutterUseCase` (transcript → cortes com hook_score ≥7) — 2.5h — dev — T2.4
- [ ] **T2.6** `ScriptGeneratorUseCase` (cortes → roteiro PT-BR + captions multi-rede + hashtags) — 2h — dev — T2.5
- [ ] **T2.7** Glossário tradução B2B/AI (PT→EN/ES/FR/IT) em YAML — 1h — dev — sem deps
- [ ] **T2.8** `TranslateCaptionsUseCase` (Sonnet 4.6 + glossário contextual) — 1.5h — dev — T2.7
- [ ] **T2.9** `ValidateBrandUseCase` (Sonnet 4.6 vision em frames lower-third) — 1.5h — dev — Wave 1
- [ ] **T2.10** `RenderMultiAspectUseCase` (1 clip → 3 MP4s + hardcoded subs na 9:16) — 2h — dev — T1.7
- [ ] **T2.11** Smart crop face-aware (MediaPipe ou centro-pesado) para 9:16 — 1.5h — dev — T2.10
- [ ] **T2.12** Retry + backoff exponencial (ElevenLabs 503, Anthropic 529) — 1h — dev — Wave 1
- [ ] **T2.13** Circuit breaker: rejeita input >90min sem consumir Scribe — 30min — dev — T2.2
- [ ] **T2.14** Lint rule custom: bloqueia import de `video-gen/*` em qualquer camada — 30min — dev — sem deps
- [ ] **T2.15** Testes integration com fakes de adapters — 2h — dev — T2.5, T2.6, T2.8

**Total Wave 2:** ~22h (~1.5-2 dias)

## Wave 3 — Test RED (TDD-first, Forge-10)

> ⚠️ **Forge-10 obriga:** test_agent em mode=red gera testes ANTES de Wave 4 (build final).
> Operador roda `npm test` e CONFIRMA QUE FALHA antes de prosseguir.

- [ ] **T3.1** `/acme:aios-run --step=test --mode=red` (gera tests/video-editor-agent/{unit,integration,e2e}/) — 30min — dev/agent
- [ ] **T3.2** Operador valida que testes falham (RED phase confirmada) — 15min — dev
- [ ] **T3.3** Commit do plano de testes + RED evidence — 15min — dev

**Total Wave 3:** ~1h

## Wave 4 — Build + Integration (vídeo real curto)

- [ ] **T4.1** Implementar testes para passar RED → GREEN — itens de W1/W2
- [ ] **T4.2** E2E real: vídeo the CEO 5min → 2 clips × 3 ratios × 5 idiomas — 2h — dev
- [ ] **T4.3** Medição de custo real (Langfuse) em 5 execuções sample — 1h — dev
- [ ] **T4.4** Validação manual de qualidade dos cortes (humano) — 1h — founder/dev

**Total Wave 4:** ~5h (parcialmente coberto em W1/W2)

## Wave 5 — Multi-aspect renderização + legendas multi-idioma + Test VERIFY (0.5 dia)

- [ ] **T5.1** `/acme:aios-run --step=test --mode=verify` (cobertura + gaps) — 30min — agent
- [ ] **T5.2** Hardcoded subs queimadas na 9:16 (libass + word-level timestamps) — 1.5h — dev
- [ ] **T5.3** SRT separado para 5 idiomas em todas versões (writer custom) — 1h — dev
- [ ] **T5.4** Eval-suite: 22 cases curados em `eval-cases.md` — 2h — dev
- [ ] **T5.5** LLM-as-judge runner (cut quality + translation quality) — 1.5h — dev
- [ ] **T5.6** CLI `npm run eval video-editor-agent` — 30min — dev
- [ ] **T5.7** CI workflow `forge-test` ativo para este SKU + lint no-veo3 — 1h — dev

**Total Wave 5:** ~8h

## Wave 6 — Ship + SLA + Promoção SHADOW (1 dia)

- [ ] **T6.1** `/acme:sla-threshold video-editor-agent` (SLA contratual 10min) — 30min — dev
- [ ] **T6.2** Dashboard Mixpanel (vídeos/dia, custo/segundo, SLA, transcription acc, cut quality) — 2h — dev
- [ ] **T6.3** Alertas Slack:
  - SLA violation (>10min)
  - Custo > R$ 7,50 (CRITICAL hard-stop)
  - Veo 3 invocation detected (CRITICAL — não deveria existir nesta wave)
  - Transcription accuracy <90%
  - Input >90min (cap acionado)
  — 1.5h — dev
- [ ] **T6.4** Documentação README + runbook ops (FFmpeg infra, Scribe quota, fallback Google STT) — 1.5h — dev
- [ ] **T6.5** `/acme:promote video-editor-agent --to=shadow` (promotion-officer assina) — 30min — agent
- [ ] **T6.6** Smoke run em SHADOW: 10 vídeos teste em 1 semana — agendamento — devops

**Total Wave 6:** ~6h

## Resumo

| Wave | Esforço | Cobertura |
|------|--------:|-----------|
| 1 — Foundation | 13h | Adapters Scribe/FFmpeg/S3 + brand loader |
| 2 — Domain + Application | 22h | Use cases + cortes + tradução + brand validator |
| 3 — Test RED (TDD) | 1h | Gate G6 evidence |
| 4 — Build + integration | 5h | Cobertura ≥85% + E2E vídeo real |
| 5 — Multi-aspect + Eval | 8h | Render 3 ratios + legendas hardcoded + eval-suite |
| 6 — Ship | 6h | SLA + dashboard + alertas + promoção SHADOW |
| **TOTAL** | **~55h** | **~3-4 dias úteis com buffer** |

## Dependências cross-wave

```
W1 (Foundation: Scribe + FFmpeg + S3)
  ↓
W2 (Domain + Application: cortes + tradução + brand + cap 90min)
  ↓
W3 (Test RED) — BLOQUEIA Build via Gate G6
  ↓
W4 (Build + Integration com vídeo real)
  ↓
W5 (Multi-aspect + legendas + Eval-suite)
  ↓
W6 (Ship + SLA + promote SHADOW)
```

## Gates antes de cada Wave

| Wave | Gate de entrada |
|------|-----------------|
| W2 | Wave 1 completa + smoke Scribe + smoke FFmpeg passam |
| W3 | Spec ✅ + plan ✅ + lint no-veo3 ativo |
| W4 | Testes RED commitados + falham localmente |
| W5 | Build completo + npm typecheck OK + E2E real passa |
| W6 | Eval-suite pass rate ≥85% + coverage Tier B + cut quality ≥7,5 |

## ClickUp blueprint

> Cada task acima vira 1 card no ClickUp. ID do card = `VEA-T1.1`, `VEA-T1.2`, etc.
>
> VEA = Video Editor Agent

Veja `templates/clickup-blueprint.template.md` para estrutura de lists/folders.

## Constraints reforçados

🚨 **NÃO criar arquivos `src/infrastructure/adapters/video-gen/*` nesta wave.**
🚨 **NÃO importar Veo 3 / Runway SDKs.**
🚨 **Lint rule custom (T2.14) é GATE BLOQUEADOR no CI.**

Se durante implementação surgir necessidade de Veo 3 → STOP, abrir issue referenciando `out-of-scope.md`.

## Próximo passo

→ Criar `eval-cases.md` (T5.4 antecipado para discussão de critérios)
→ Criar `decisions.md` local com ADR-001/002/003/004/005-VE
→ Iniciar Wave 1 (Setup + ElevenLabs adapter + FFmpeg layer)
