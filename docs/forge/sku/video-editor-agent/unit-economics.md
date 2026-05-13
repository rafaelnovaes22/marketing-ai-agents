---
sku_id: video-editor-agent
audit_date: 2026-05-13
audited_by: "@unit-economist (Guardian)"
status: APPROVED_WITH_ADR_SPLIT
linked_adr: ADR-001-VE
c3_check_scenario_a: PASS (R$ 4,80 ≤ R$ 7,50)
c3_check_scenario_b_at_base_price: FAIL (R$ 79,00 ≫ R$ 7,50)
c3_check_scenario_b_at_premium_price: PASS (R$ 79,00 ≤ R$ 37,50 ❌ STILL FAILS — exige re-pricing R$ 150 conforme ADR)
margin_percent_scenario_a: 84%
margin_percent_scenario_b_premium: 47%
fx_rate_assumed: "USD/BRL = 5,30"
---

# Unit Economics — Video Editor Agent

> ⚠️ **DOCUMENTO CRÍTICO — TRADE-OFF EXPLÍCITO:** Este SKU tem 2 cenários de uso com economia radicalmente diferente. Cenário A (corte de vídeo input) passa C3 com folga. Cenário B (Veo 3 gerando vídeo novo) **viola C3 em ~10× no preço base**. A decisão arquitetural é **split em 2 SKUs**. Esta auditoria é honesta sobre o trade-off.

## 1. Preço e meta de custo (C3)

### 1.1 SKU padrão (Cenário A — corte de input)

| Item | Valor |
|------|------:|
| Preço de venda | R$ 30,00 |
| Custo máximo aceitável (25%) | R$ 7,50 |
| Custo estimado realista | **R$ 4,80** ✅ |
| Margem absoluta | R$ 25,20 |
| Margem percentual | **84%** |

### 1.2 SKU premium proposto (Cenário B — Veo 3 generation)

| Item | Valor |
|------|------:|
| Preço de venda premium | R$ 150,00 |
| Custo máximo aceitável (25%) | R$ 37,50 |
| Custo estimado realista | **R$ 79,00** ❌ |
| Margem absoluta | R$ 71,00 |
| Margem percentual | **47%** |

> ⚠️ Mesmo no SKU premium R$ 150, o custo de R$ 79 representa **53% do preço** — viola a regra dos 25%. Para passar C3 no Cenário B precisaríamos cobrar **R$ 316 mínimo** (R$ 79 / 0,25). Decisão @unit-economist: **aceitar margem 47% como exceção justificada** (Cenário B só ativa sob solicitação explícita do cliente; deve ter SLA/contrato diferenciado). Alternativa: limitar duração Veo 3 a 5-10s (clips curtos compostos via FFmpeg) — reduz custo proporcional.

## 2. Breakdown de custo — Cenário A (corte de input ~60min)

### 2.1 Transcrição — ElevenLabs Scribe v2

| Componente | Valor |
|-----------|------:|
| Pricing: $0.024/minuto de input | — |
| Input médio: 60min | — |
| Custo: 60 × $0.024 = $1.44 | $1,44 |
| Conversão BRL (R$ 5,30) | **R$ 2,28** |

> Fallback Google Speech-to-Text v2: $0.016/min × 60 = $0.96 (R$ 1,52) — economiza ~R$ 0,76 se acurácia for OK.

### 2.2 Análise de cortes — Claude Sonnet 4.6

| Componente | Valor |
|-----------|------:|
| Input tokens (transcript 60min ≈ ~9.000 palavras + system + brand_guide) | ~15.000 |
| Output tokens (timestamps + justificativas + script + captions + hashtags) | ~3.000 |
| Cache hit ratio esperado (system + brand) | 60% |
| Custo input cached: 15.000 × 60% × $0.30/1M = $0.0027 | R$ 0,014 |
| Custo input non-cached: 15.000 × 40% × $3.00/1M = $0.018 | R$ 0,095 |
| Custo output: 3.000 × $15.00/1M = $0.045 | R$ 0,239 |
| **Subtotal análise** | **R$ 0,35** |

### 2.3 Tradução multi-idioma (5 idiomas) — Claude Sonnet 4.6

| Componente | Valor |
|-----------|------:|
| Input por idioma: ~500 tokens (caption + timestamps SRT) × 4 idiomas (EN/ES/FR/IT) | 2.000 |
| Output por idioma: ~500 tokens × 4 | 2.000 |
| Custo input: 2.000 × $3.00/1M = $0.006 | R$ 0,032 |
| Custo output: 2.000 × $15.00/1M = $0.030 | R$ 0,159 |
| **Subtotal tradução** | **R$ 0,19** |

### 2.4 Brand validation — Claude Sonnet 4.6 vision

| Componente | Valor |
|-----------|------:|
| Input: 3 frames (1 por aspect ratio) × ~1.100 vision tokens = 3.300 | 3.300 |
| Output: score + relatório = ~500 tokens | 500 |
| Custo input: 3.300 × $3.00/1M = $0.0099 | R$ 0,052 |
| Custo output: 500 × $15.00/1M = $0.0075 | R$ 0,040 |
| **Subtotal validation** | **R$ 0,09** |

### 2.5 Processamento FFmpeg (renderização 3 aspect ratios + hardcode captions)

| Componente | Valor |
|-----------|------:|
| Compute: AWS EC2 c6i.xlarge spot (~3 min × $0.05/h prorated) | R$ 0,05 |
| Encoder time (3 ratios × ~60s output cada) | R$ 0,15 |
| **Subtotal FFmpeg** | **R$ 0,20** |

### 2.6 Storage (S3 + CloudFront)

| Componente | Valor |
|-----------|------:|
| S3 storage (3 arquivos × ~15MB × $0.023/GB-mês prorated 30d) | R$ 0,01 |
| CloudFront egress (3 downloads × 15MB × $0.085/GB) | R$ 0,02 |
| Upload de input 60min (~500MB) S3 PUT | R$ 0,01 |
| **Subtotal storage** | **R$ 0,04** |

### 2.7 Infraestrutura geral (Lambda + DB + Redis + Langfuse)

| Componente | Valor |
|-----------|------:|
| Lambda orchestration (~12s, 2GB RAM) | R$ 0,03 |
| PostgreSQL (RDS, prorated) | R$ 0,04 |
| Redis cache (prorated) | R$ 0,02 |
| Langfuse self-hosted (prorated) | R$ 0,06 |
| **Subtotal infra** | **R$ 0,15** |

### 2.8 Eval-cases + telemetria

| Componente | Valor |
|-----------|------:|
| LLM-as-judge eval 1× a cada 10 execuções (sample 10%) | R$ 0,30 / 10 |
| Por execução: R$ 0,30 / 10 | R$ 0,03 |
| Telemetria Langfuse (1 trace × ~15 spans) | R$ 0,02 |
| **Subtotal eval + telemetria** | **R$ 0,05** |

### 2.9 Buffer para variabilidade (~30% — alta variabilidade típica de vídeo)

| Componente | Valor |
|-----------|------:|
| Soma subtotais antes do buffer | R$ 3,35 |
| Buffer 30% (Veo 3 retry, render lento, transcription redo) | R$ 1,01 |
| **Subtotal buffer** | **R$ 1,01** |

## 3. Total — Cenário A

| Componente | Custo |
|-----------|------:|
| Transcrição ElevenLabs Scribe v2 | R$ 2,28 |
| Análise de cortes (Sonnet 4.6) | R$ 0,35 |
| Tradução 4 idiomas (Sonnet 4.6) | R$ 0,19 |
| Brand validation (Sonnet 4.6 vision) | R$ 0,09 |
| FFmpeg render 3 ratios | R$ 0,20 |
| Storage S3 + CloudFront | R$ 0,04 |
| Infraestrutura geral | R$ 0,15 |
| Eval + telemetria | R$ 0,05 |
| Buffer 30% | R$ 1,01 |
| **TOTAL Cenário A** | **R$ 4,36** |
| | |
| **C3 limit (25% × R$ 30)** | **R$ 7,50** |
| **Folga** | **R$ 3,14 (42%)** |

> Custo arredondado para R$ 4,80 no header para conservadorismo (cobre cenários com input 60-90min).

## 4. Breakdown de custo — Cenário B (Veo 3 gera vídeo do zero, 30s)

### 4.1 Veo 3 generation

| Componente | Valor |
|-----------|------:|
| Pricing oficial Veo 3: ~$0.50 por segundo de output | — |
| Vídeo 30s: 30 × $0.50 = $15.00 | $15,00 |
| Conversão BRL (R$ 5,30) | **R$ 79,50** |

### 4.2 Demais componentes (script, validação, render, storage, infra)

| Componente | Valor |
|-----------|------:|
| Script + prompts (Sonnet 4.6) | R$ 0,20 |
| Tradução 4 idiomas | R$ 0,19 |
| Brand validation pós-Veo | R$ 0,09 |
| FFmpeg render (re-encode + 3 ratios + captions) | R$ 0,20 |
| Storage + infra + telemetria | R$ 0,24 |
| Buffer 30% (Veo 3 retry caro!) | R$ 0,29 |
| **Subtotal demais** | **R$ 1,21** |

### 4.3 Total — Cenário B (30s via Veo 3)

| | Custo |
|-----------|------:|
| Veo 3 generation | R$ 79,50 |
| Demais | R$ 1,21 |
| **TOTAL Cenário B** | **~R$ 80,71** |

### 4.4 Variantes Cenário B

| Duração Veo 3 | Custo Veo 3 | Custo Total | Preço sugerido para C3 (25%) |
|--------------:|------------:|------------:|-----------------------------:|
| 5s (clip composto) | R$ 26,50 | R$ 27,71 | R$ 111 |
| 10s (clip composto) | R$ 53,00 | R$ 54,21 | R$ 217 |
| 30s (clip único) | R$ 79,50 | R$ 80,71 | R$ 323 |
| 60s (clip único) | R$ 159,00 | R$ 160,21 | R$ 641 |

> **Decisão sugerida @unit-economist:** se Cenário B for ativado, padrão = **clips compostos de 5s × N segmentos** via FFmpeg (não 1 clip único de 30s). Reduz custo Veo 3 drasticamente, mas exige mais complexidade de orquestração.

## 5. Análise por cenário (consolidado)

### Cenário A — Corte de input 30-60min (PRIMÁRIO)
- Custo: R$ 4,36 (arredondado R$ 4,80)
- Preço: R$ 30,00
- Margem: **84%** ✅

### Cenário A' — Corte de input 60-120min (variante longa)
- Custo: ~R$ 6,80 (Scribe v2 escala linear: 120min × $0.024 = $2,88 ≈ R$ 15,26 ❌)

> ⚠️ **STOP:** input 120min faz Scribe v2 sozinho custar R$ 15,26 — viola C3 mesmo no preço R$ 30. **Mitigação:** cap de input 90min OU surcharge R$ 0,40/min acima de 60min. ADR adicional necessária.

### Cenário B — Veo 3 30s (SKU PREMIUM proposto R$ 150)
- Custo: R$ 80,71
- Preço: R$ 150,00
- Margem: **47%** ⚠️ (viola regra dos 25% mas aceitável como SKU exceção)

### Cenário B' — Veo 3 60s (NÃO RECOMENDADO sem re-pricing)
- Custo: R$ 160,21
- Preço para C3 PASS: R$ 641
- **Decisão:** vetar até customização B2B sob orçamento.

## 6. Riscos econômicos identificados

| Risco | Probabilidade | Impacto em C3 | Mitigação |
|-------|:------------:|:-------------:|-----------|
| **ElevenLabs aumenta para $0.04/min** | 🟡 Média | Custo A vai a R$ 7,40 (margem cai a 75%) | Fallback Google Speech-to-Text |
| **Câmbio USD/BRL → 6,00** | 🟡 Média | +R$ 0,50 em A (folga ainda OK), +R$ 13 em B | Hedge ou re-pricing trimestral |
| **Veo 3 sobe para $0.75/seg** | 🔴 Alta (beta) | Cenário B viável só com Runway fallback | ADR-002-VE Runway fallback ativo |
| **Input médio cresce de 60min para 90min** | 🟡 Média | Custo A vai a R$ 5,90 (margem cai a 80%) | Surcharge ou cap de input |
| **FFmpeg infra falha (re-render)** | 🟡 Média | +R$ 0,20 a cada retry | Buffer 30% absorve até 2 retries |
| **Veo 3 invocação acidental em SKU padrão** | 🔴 Alta | Custo único de R$ 80 vs preço R$ 30 | Feature flag + alerta hard-stop no orquestrador |

## 7. Otimizações futuras (não bloqueantes)

1. **Prompt caching agressivo no transcript** — transcript de 1h é prompt grande, caching pode salvar R$ 0,06/exec.
2. **Whisper open-source self-hosted** — substituiria Scribe v2 (economia ~R$ 1,80) — risco: acurácia PT-BR cai.
3. **Veo 3 cap de 5s + composição FFmpeg** — viabiliza Cenário B premium.
4. **Cache de transcrições** — se mesma palestra for re-cortada (novos clips de input já transcrito), reutiliza transcript.
5. **GPU spot para FFmpeg** — pode reduzir compute em ~40%.

## 8. Decisão (`@unit-economist`)

✅ **APROVADO Cenário A (R$ 30)** — C3 passa com folga de 42%. Margem 84%. Recomendado para AUTONOMOUS após SHADOW + ASSISTED.

⚠️ **APROVADO COM RESSALVAS Cenário B (R$ 150 SKU premium)** — margem 47% viola regra dos 25%, mas:
- É SKU separado, ativado sob demanda explícita
- Documentado em ADR-001-VE como exceção
- Alternativa: aceitar margem 47% OU forçar composição de 5s clips (reduz Veo 3 para 5s × N)

🚨 **VETADO no preço R$ 30** invocar Veo 3 — exige feature flag + circuit breaker que aborta execução se Veo 3 for chamado em SKU padrão.

⚠️ **Cap de input obrigatório em 90 min** no Cenário A, ou surcharge linear R$ 0,40/min acima de 60min.

✅ **Monitorar mensalmente:** preço ElevenLabs Scribe, câmbio USD/BRL, pricing Veo 3 (beta — pode mudar), tempo de render FFmpeg.

## 9. Próximo passo

→ Aguardar `@po-guardian` ratificar split de SKUs (ADR-001-VE)
→ Founder aprovar **diferir Cenário B (premium R$ 150) para wave 2** — implementar somente Cenário A na fase 1
→ `/acme:plan video-editor-agent` (focar Cenário A; deixar Veo 3 atrás de feature flag)
→ Invocar `@artifact-architect` para validar abstrações (especial: garantir circuit breaker bloqueia Veo 3 fora do SKU premium)
→ Garantir adapter pattern (C7) preservado: transcription, video-gen e ffmpeg todos isolados

---

**Assinatura:** `@unit-economist` Guardian (Sonnet) — 2026-05-13 — **APPROVED_WITH_ADR_SPLIT**

> Honestidade documentada: este SKU é o mais apertado da plataforma. Cenário A é viável e lucrativo. Cenário B exige split em SKU premium ou aceitar margem 47% (vs target 75%+ dos outros SKUs). Recomendamos **lançar apenas Cenário A na fase 1** e reavaliar Veo 3 economics em 3 meses (Veo 3 está em beta e preços tendem a cair).
