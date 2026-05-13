---
sku_id: designer-agent
audit_date: 2026-05-13
audited_by: "@unit-economist (Guardian)"
status: APPROVED
linked_adrs: [ADR-001-DES, ADR-002-DES, ADR-003-DES]
c3_check: PASS (R$ 2,02 ≤ R$ 5,00)
margin_percent: 89.9%
fx_rate_used: "USD 1.00 = BRL 5.30"
---

# Unit Economics — Designer Agent

## 1. Preço e meta de custo (C3)

| Item | Valor |
|------|------:|
| Preço de venda padrão (7 slides) | R$ 20,00 |
| Preço variante econômica (5 slides) | R$ 15,00 |
| Custo máximo aceitável (25% × R$ 20) | R$ 5,00 |
| Custo estimado realista (7 slides padrão) | **R$ 2,02** ✅ |
| Margem absoluta (padrão) | R$ 17,98 |
| Margem percentual (padrão) | **89,9%** |

**Verdict C3:** ✅ PASSA com folga de **R$ 2,98 (≈60%)** sobre o limite. Folga acomoda volatilidade de câmbio, retries, tuning futuro.

## 2. Breakdown de custo (7 slides padrão — Cenário B)

### 2.1 Geração de imagem — split Imagen 4 + Ideogram v2

Premissa do split (ADR-002-DES): ~5 slides via Imagen 4 (visual-heavy) + ~2 slides via Ideogram v2 (texto literal).

| Componente | Quantidade | Unit cost USD | Subtotal USD |
|-----------|:---------:|--------------:|-------------:|
| Imagen 4 — slides visual-heavy | 5 | $0.040 | $0.200 |
| Ideogram v2 — slides com texto | 2 | $0.020 | $0.040 |
| **Subtotal geração** | **7** | — | **$0.240** |
| Conversão BRL (×5,30) | — | — | **R$ 1,27** |

### 2.2 Brand validation — Claude Sonnet 4.6 vision (7 slides)

Validação multimodal por slide: vision input + relatório estruturado de output.

| Componente | Valor |
|-----------|------:|
| Vision input: 7 imagens 1080×1080 × ~1000 tokens cada | ~7.000 tokens |
| Text input: brand_guide context (cached) + system prompt | ~3.000 tokens |
| Output: 7 scores + 7 relatórios de issues curtos | ~1.000 tokens |
| Cache hit ratio (brand guide + system prompt) | 75% |
| Custo input cached: 3.000 × 75% × $0.30/1M = $0.0007 | R$ 0,004 |
| Custo input non-cached vision: 7.000 × $3.00/1M = $0.021 | R$ 0,111 |
| Custo input non-cached text: 3.000 × 25% × $3.00/1M = $0.00225 | R$ 0,012 |
| Custo output: 1.000 × $15.00/1M = $0.015 | R$ 0,080 |
| **Subtotal validation** | **R$ 0,21** |

### 2.3 Retry amortizado (re-roll estimado 15%)

Política ADR-003-DES: ~15% dos slides disparam 1 re-roll (segunda geração + segunda validação). Em média ~1 slide a cada carrossel.

| Componente | Valor |
|-----------|------:|
| Re-roll médio: 0,15 × 7 ≈ 1 slide adicional | — |
| Custo do slide adicional (Imagen 4 + 1 validação) | $0.04 + ~$0.005 = $0.045 |
| Conversão BRL | R$ 0,24 |
| Amortização sobre todos os carrosséis (já é média) | R$ 0,24 |
| **Subtotal retry amortizado** | **R$ 0,24** |

> Nota: 15% é a hipótese inicial; será calibrado em SHADOW. Se subir para 30%, custo de retry vai a R$ 0,48 — ainda dentro da folga.

### 2.4 Infraestrutura (AWS + storage)

| Componente | Valor |
|-----------|------:|
| Lambda execution (~15s para orquestração, 2GB RAM) | R$ 0,04 |
| S3 storage + egress (7 JPGs × ~600KB) | R$ 0,02 |
| PostgreSQL (manifesto + metadata, prorated) | R$ 0,03 |
| Redis cache (prompts + brand context, prorated) | R$ 0,02 |
| **Subtotal infra** | **R$ 0,11** |

### 2.5 Telemetria (Langfuse self-hosted)

| Componente | Valor |
|-----------|------:|
| 1 trace × ~18 spans (intake + plan + 7 gen + 7 val + retry + output) | R$ 0,01 |
| **Subtotal telemetria** | **R$ 0,01** |

### 2.6 Eval-cases (amortizado 1 a cada 20 execuções)

| Componente | Valor |
|-----------|------:|
| LLM-as-judge eval suite (rodada periódica) | R$ 0,20 / 20 |
| Por execução | R$ 0,01 |
| **Subtotal eval** | **R$ 0,01** |

### 2.7 Buffer de variabilidade (~10%)

| Componente | Valor |
|-----------|------:|
| Buffer = (1,27 + 0,21 + 0,24 + 0,11 + 0,01 + 0,01) × 0,10 | R$ 0,18 |
| **Subtotal buffer** | **R$ 0,18** (arredondado R$ 0,17) |

## 3. Total (7 slides padrão)

| Componente | Custo |
|-----------|------:|
| Geração imagens (5 Imagen + 2 Ideogram) | R$ 1,27 |
| Brand validation (7 slides, vision) | R$ 0,21 |
| Retry amortizado (15%) | R$ 0,24 |
| Infraestrutura | R$ 0,11 |
| Telemetria | R$ 0,01 |
| Eval amortizado | R$ 0,01 |
| Buffer 10% | R$ 0,18 |
| **TOTAL** | **R$ 2,03** |
| | |
| **C3 limit (25% × R$ 20)** | **R$ 5,00** |
| **Folga absoluta** | **R$ 2,97** |
| **Folga relativa** | **≈ 59,4%** |
| **Custo / preço** | **≈ 10,15%** |

> Custo é **10% do preço** — muito abaixo do limite de 25%. C3 passa com folga generosa, acomodando variações de câmbio e provider pricing.

## 4. Análise por cenário

### Cenário A — Variante econômica (5 slides, sem retry)
- Imagens: 4 Imagen + 1 Ideogram = $0.18 = R$ 0,95
- Validation 5 slides: R$ 0,16
- Retry amortizado 15%: R$ 0,17
- Infra + telemetria + eval + buffer: R$ 0,28
- **Custo total: R$ 1,56**
- Preço: R$ 15,00
- **Margem: R$ 13,44 (89,6%)**

### Cenário B — Padrão (7 slides, retry esperado)
- Custo total: **R$ 2,03**
- Preço: R$ 20,00
- **Margem: R$ 17,97 (89,9%)**

### Cenário C — Padrão com retry alto (30% — pior caso esperado)
- Custo total: R$ 2,27
- Preço: R$ 20,00
- **Margem: R$ 17,73 (88,7%)** — ainda muito saudável

### Cenário D — Stress test (câmbio 6,00 + Imagen $0.06)
- Imagens: 5 × $0.06 + 2 × $0.02 = $0.34 = R$ 2,04
- Validation: ~R$ 0,24 (câmbio)
- Retry + infra + buffer: ~R$ 0,55
- **Custo total: R$ 2,83**
- Preço: R$ 20,00
- **Margem: 85,8%** — ainda passa C3 (R$ 2,83 < R$ 5,00)

## 5. Riscos econômicos identificados

| Risco | Probabilidade | Impacto em C3 | Mitigação |
|-------|:------------:|:-------------:|-----------|
| Vertex Imagen 4 sobe para $0.06/img | 🟡 Média | +R$ 0,53/carrossel (folga ainda OK) | Adapter pattern (C7): trocar para FLUX ou DALL-E sem tocar domain |
| Re-roll rate sobe para 40% | 🟡 Média | +R$ 0,40 (folga reduz a 50%) | Tuning iterativo do prompt + calibração validator em SHADOW |
| Câmbio USD/BRL sobe para 6,00 | 🟡 Média | +R$ 0,40 (folga reduz a 50%) | Hedge via faturamento USD futuro / repasse no preço |
| Anthropic aumenta vision tokens 30% | 🟢 Baixa | +R$ 0,07 | Cache mais agressivo (75% → 85%) |
| Ideogram v2 fica indisponível (downtime) | 🟢 Baixa | Fallback overlay Canvas custa CPU extra (+R$ 0,02) | Já previsto em ADR-002-DES |
| Founder aumenta threshold para 99.5% | 🟢 Baixa | Re-roll rate sobe ~10pp | ADR-001-DES governa; mudança exige re-validação |

## 6. Otimizações futuras (não bloqueantes)

1. **Prompt caching agressivo** — brand guide context é estável; subir cache hit para 85% economiza ~R$ 0,02
2. **Batch discount Imagen 4** — Google oferece desconto para 100+ requests/dia → economia ~10% nas imagens
3. **Cache de slides "template"** (background-only patterns evergreen) — reutilizar layers comuns → economia ~R$ 0,15 em carrosséis com tema recorrente
4. **Compressão JPG inteligente** (mozjpeg) — reduz S3 egress sem impacto perceptual
5. **Ideogram alternative pricing tier** — se chegarmos em volume alto, negociar bulk

## 7. Decisão (`@unit-economist`)

✅ **APROVADO C3** com folga de **≈60%** sobre o limite — mais saudável que social-media-agent (38%).
✅ **APROVADO variante econômica** (5 slides @ R$ 15) com margem 89,6%.
✅ **APROVADO retry budget** de até 30% antes de alarme (custo ainda dentro do limite).
⚠️ **MONITORAR mensalmente:** câmbio USD/BRL + pricing Vertex Imagen + re-roll rate observado.
⚠️ **Em SHADOW**, validar a hipótese de 15% retry rate. Se observado >25%, abrir ADR para tuning de prompt ou ajuste de threshold.

## 8. Próximo passo

→ `/acme:plan designer-agent`
→ Invocar `@artifact-architect` para validar abstrações Imagen/Ideogram (adapter pattern já existente)
→ Curar 30+ eval-cases on-brand (referenciar `examples_on_brand` em `brand/acme-brand-guide.yaml`)
→ Definir contrato de input/output JSON com `social-media-agent` (handoff de briefing)

---

**Assinatura:** `@unit-economist` Guardian (Sonnet) — 2026-05-13 — APPROVED
