---
sku_id: video-editor-agent
sku_version: 0.1.0
project_type: agentic_saas
ai_enabled: true
criticality: B
current_stage: draft
spec_status: po_guardian_pending
spec_template_used: platform-sku-spec.template.md
created_at: 2026-05-13
last_updated: 2026-05-13
adrs_linked: [ADR-001-VE, ADR-002-VE, ADR-003-VE]
priority: P1
---

# Spec: Video Editor Agent

## 1. Outcome contratual (C2)

### 1.1 Promessa (SKU padrão R$ 30 — Cenário A)

Entregar 1 vídeo curto (30-90s) publicável em ≤10 minutos:
- **INPUT:** vídeo longo (livestream, palestra, podcast — até 2h) OU briefing textual
- **OUTPUT 1 — Vídeo curto:** 1 clip 30-90s renderizado em **3 aspect ratios**:
  - **9:16** (Reels / TikTok / YouTube Shorts)
  - **1:1** (Instagram feed / LinkedIn)
  - **16:9** (YouTube / Twitter)
- **OUTPUT 2 — Legendas em 5 idiomas:**
  - PT-BR (master), EN-US, ES, FR, IT
  - Entregue como SRT separado **E** hardcoded (queimado no vídeo na versão 9:16)
- **OUTPUT 3 — Roteiro/script gerado** (PT-BR):
  - Timestamp dos cortes selecionados (com justificativa de seleção)
  - Sugestão de caption por rede (hook + CTA)
  - Sugestão de hashtags (5-7 por rede)

> **SKU PREMIUM separado** (`video-editor-agent-premium`, R$ 150 — futuro): geração de vídeo do zero via Veo 3. Não coberto neste SKU base. Ver ADR-001-VE.

### 1.2 Critério de aceite verificável

- [x] 1 vídeo curto entregue em 3 arquivos (9:16, 1:1, 16:9) — formato MP4 H.264, ≤25MB cada
- [x] Duração entre **30s e 90s** (hard limit por aspect ratio)
- [x] Legendas em **5 idiomas** entregues como SRT + hardcoded queimado na versão 9:16
- [x] Roteiro/script PT-BR com timestamps + justificativa de cortes
- [x] Tempo total request → entrega ≤ **600s (10 min)** para input ≤60min; ≤900s (15min) para input 60-120min (cobrança adicional)
- [x] Brand validation score ≥ 95% (Claude Sonnet 4.6 vision avalia lower-thirds + legend safe-area)
- [x] Transcription accuracy ≥ 95% em PT-BR (LLM-as-judge sample 10%)
- [x] Trace Langfuse com cost breakdown, latência, scores

### 1.3 Exemplos

**Positivos (✅ contam como sucesso):**

1. Input: Live de 1h da the CEO sobre growth-hacking
   Output: 3 clips de 45-60s + 5 idiomas + roteiro, brand 96%, 8m42s

2. Input: Podcast 35min (B2B SaaS com convidado)
   Output: 4 clips × 3 aspect ratios + lower-third com nome do convidado, 9m18s

**Negativos (❌ não contam):**

1. Input: "faz um vídeo legal" sem fonte → REJEITA pedindo input (vídeo OU briefing)
2. Entrega só em 9:16 (faltam 1:1 e 16:9) → falha gate; re-renderiza
3. 11m30s total → falha SLA; trace marcado como `sla_violated=true`
4. Legendas EN com erro grosseiro de tradução (gíria PT mal-traduzida) → falha eval; re-gera com glossário

## 2. Stack técnico (C7 — portability)

| Camada | Provedor | Adapter local |
|--------|----------|---------------|
| **Transcrição (input longo)** | ElevenLabs Scribe v2 | `lib/transcription/elevenlabs-adapter.ts` |
| **Transcrição (fallback)** | Google Speech-to-Text v2 | `lib/transcription/google-stt-adapter.ts` |
| **Análise de cortes (LLM)** | Claude Sonnet 4.6 | `lib/llm/claude-adapter.ts` |
| **Tradução multi-idioma** | Claude Sonnet 4.6 (contextual) | `lib/i18n/translator.ts` |
| **Geração de vídeo (Cenário B / premium)** | Google Veo 3 | `lib/video-gen/veo3-adapter.ts` |
| **Geração de vídeo (fallback)** | Runway Gen-4.5 | `lib/video-gen/runway-adapter.ts` |
| **Brand validation (frames)** | Claude Sonnet 4.6 vision | `lib/brand/validator.ts` |
| **Processamento de vídeo (cortes, render, legendas hardcoded, aspect ratios)** | FFmpeg (self-hosted) | `lib/video-processing/ffmpeg-adapter.ts` |
| **Storage de vídeo** | AWS S3 + CloudFront | `lib/storage/s3-adapter.ts` |
| **Telemetria** | Langfuse | `lib/observability/langfuse.ts` |
| **Domain layer** | TypeScript puro | `src/domain/video-short/` |

> ADR-002-VE: Veo 3 como provider primário para Cenário B, Runway Gen-4.5 como fallback (10× mais barato; perde áudio nativo).
> ADR-003-VE: Legendas entregues como **SRT separado + hardcoded na 9:16** (não em todas, para preservar editabilidade nas demais).

## 3. Lifecycle (C4)

```
draft (atual, hoje 2026-05-13)
  ↓ [@po-guardian approves outcome + @unit-economist approves C3 + ADR-001-VE assinado]
SHADOW (interno, ~D55-D63 da semana 9)
  • 50+ execuções coletadas (Cenário A apenas)
  • Score eval médio ≥ 7.5/10 (cortes "publicáveis")
  • Transcription accuracy ≥ 95% (sample humano)
  • Sem cobrança (gratuito interno)
  ↓ [eval pass rate ≥80% + revisão humana 20% sample]
ASSISTED (~D64-D77)
  • Humano aprova cada vídeo antes de publicar
  • SLA contratual definido (/novais-digital:sla-threshold)
  • Brand validation gate ≥95%
  ↓ [SLA atingido 14 dias consecutivos + custo médio ≤ R$ 7.50]
AUTONOMOUS (~D78+)
  • Cobra R$ 30 por vídeo entregue (Cenário A)
  • Audit mensal DeepAgent
  • Cenário B (Veo 3) permanece behind feature flag até SKU premium ser ativado
```

## 4. Unit Economics (C3 — preview, detalhe em unit-economics.md)

```
Preço de venda padrão (Cenário A):  R$ 30,00
Custo máximo aceitável (25%):       R$  7,50
Custo estimado realista (Cenário A): R$  4,80  ✅ PASSA C3
Margem (Cenário A):                  R$ 25,20 (84%)

— SKU PREMIUM (Cenário B, futuro) —
Preço de venda premium:              R$ 150,00
Custo estimado realista (Cenário B): R$  79,00 ❌ no preço padrão
                                     R$  79,00 ✅ no preço premium R$ 150 (margem 47%)
```

**Decisão de pricing CRÍTICA documentada em `unit-economics.md` e ADR-001-VE.**

## 5. Telemetry (C6)

- **Langfuse traces:**
  - 1 trace por execução com spans: `transcription`, `cut_selection`, `translation` (×5 idiomas), `brand_validation`, `ffmpeg_render` (×3 ratios), `upload_s3`
  - Metadata: tenant_id, sku=video-editor-agent, mode (shadow/assisted/autonomous), priority, input_duration_seconds, output_duration_seconds, scenario (A_cut | B_veo3)
  - Cost breakdown por span (custo por segundo de output)
  - Latência total + por span

- **Métricas de negócio:**
  - Vídeos/dia, /semana, /mês
  - **Custo médio por SEGUNDO de output** (KPI primário deste SKU)
  - Custo médio total, custo P99
  - Score eval médio, brand consistency, transcription accuracy
  - SLA achievement rate

- **Alertas:**
  - SLA violation → Slack #ops
  - Custo > R$ 7,50 → Slack #finance (CRITICAL: bloqueia execução automática)
  - Veo 3 invocado em SKU padrão → Slack #finance (deveria ser premium)
  - Transcription accuracy <90% → Slack #ai-ops

## 6. Portability (C7)

**Camadas isoladas:**
1. **Domain** (`src/domain/video-short/`) — entidades (VideoShort, Cut, Caption, AspectRatio) + regras
2. **Application** (`src/application/`) — use cases (`CutFromLongVideo`, `GenerateVeo3Video`)
3. **Infrastructure** (`src/infrastructure/adapters/`) — adapters para transcrição, vídeo-gen, FFmpeg, storage

**Princípio:** trocar Veo 3 por Runway = trocar `infrastructure/adapters/video-gen/`. Domain e application permanecem.

**Testes:**
- Domain testado isoladamente (Vitest unit, sem mock de provider real)
- Application testado com fakes de adapters
- Infrastructure testado com integração real (ElevenLabs sandbox, Vertex Veo 3 staging, Runway sandbox)
- E2E: 1 vídeo de teste curto (5min) processado fim-a-fim em CI semanal (custo controlado)

## 7. Tenant context (C8)

**Fase 1 (este SKU):** single-tenant — Novais Digital própria como cliente único.

**Fase 2 (futura):** multi-tenant via:
- `tenant_id` propagado em toda chamada
- Brand guides por tenant (lower-third, fonte de legenda, cores de safe-area)
- Glossário de tradução por tenant (termos técnicos / nomes de produto)
- Limites de uso por tenant (rate limit, custo mensal, duração máxima de input)
- Storage particionado por tenant em S3

## 8. Dependências externas

| Serviço | Criticidade | SLA conhecido | Fallback |
|---------|:----------:|---------------|----------|
| ElevenLabs Scribe v2 | 🔴 Crítica | 99.0% | Google Speech-to-Text v2 |
| Google Vertex Veo 3 | 🟡 Importante (só Cenário B) | 99.0% (beta) | Runway Gen-4.5 |
| Runway Gen-4.5 | 🟢 Fallback | 99.0% | — |
| Anthropic API | 🔴 Crítica | 99.5% | — (single provider para LLM) |
| AWS S3 + CloudFront | 🔴 Crítica | 99.99% | — (delivery layer) |
| FFmpeg (self-hosted) | 🔴 Crítica | gerenciada | — (containerizado, multi-AZ) |
| Langfuse | 🟢 Não crítica | 98% | Logs estruturados Pino |

## 9. ADRs vinculados

- **ADR-001-VE:** **Split de SKUs — video-editor-agent (R$ 30) vs video-editor-agent-premium (R$ 150)**
  - Motivo: Veo 3 custa $0.50/seg → 30s = R$ 80 sozinho → viola C3 no preço R$ 30.
  - Decisão: SKU padrão cobre apenas Cenário A (corte de input). Cenário B (Veo 3 geração nova) é SKU premium separado.

- **ADR-002-VE:** **Veo 3 como provider primário (Cenário B), Runway Gen-4.5 como fallback**
  - Motivo: Veo 3 tem áudio nativo (vantagem competitiva), mas Runway é 10× mais barato e mais estável (sem waitlist).
  - Decisão: Veo 3 preferido quando áudio nativo é requisito; Runway acionado se Veo 3 retorna quota_exceeded ou falha de geração.

- **ADR-003-VE:** **Legendas: SRT separado + hardcoded apenas na versão 9:16**
  - Motivo: TikTok/Reels exigem legenda queimada (não suportam SRT nativo). Feed Instagram (1:1) e YouTube (16:9) suportam SRT.
  - Decisão: hardcode somente na 9:16; SRT acompanha todas as versões para post-edição.

## 9.1 Insumos de calibração

- **Glossário de tradução por domínio** — termos técnicos (B2B SaaS, growth, AI) traduzidos com contexto curado. Crítico para qualidade EN/ES/FR/IT.
- **Few-shot de "cortes virais"** — 30+ exemplos curados de momentos publicáveis (hook + payoff em 30-90s) para alimentar o LLM-as-judge de seleção de cortes.
- **Brand guide de lower-thirds** — fonte, cor, posição safe-area por aspect ratio (igual em 9:16, 1:1, 16:9).

## 10. Aprovações necessárias

- [ ] `@po-guardian` valida outcome (Seção 1) **+ split de SKUs (ADR-001-VE)**
- [ ] `@unit-economist` valida C3 (após unit-economics.md) — atenção ao Cenário B
- [ ] `@artifact-architect` valida abstrações (após plan.md)
- [ ] Founder aprova:
  - [ ] Preço R$ 30 para Cenário A (corte de input)
  - [ ] Diferimento do Cenário B (Veo 3) para SKU premium futuro (R$ 150)
  - [ ] Cap de input em 2h
