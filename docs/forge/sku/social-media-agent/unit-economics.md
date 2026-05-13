---
sku_id: social-media-agent
audit_date: 2026-05-13
audited_by: "@unit-economist (Guardian)"
status: APPROVED_WITH_ADR
linked_adr: ADR-001-DS
c3_check: PASS (R$ 2,85 ≤ R$ 3,00)
margin_percent: 76.25%
---

# Unit Economics — Social Media Agent

## 1. Preço e meta de custo (C3)

| Item | Valor |
|------|------:|
| Preço de venda (4-5 slides padrão) | R$ 12,00 |
| Preço upsell (6-7 slides) | R$ 16,00 |
| Custo máximo aceitável (25%) | R$ 3,00 |
| Custo estimado pós-ADR-001-DS | **R$ 2,85** ✅ |
| Margem absoluta | R$ 9,15 |
| Margem percentual | **76,25%** |

## 2. Breakdown de custo (4-5 slides padrão)

### 2.1 Copywriting — Claude Sonnet 4.6

| Componente | Valor |
|-----------|------:|
| Input tokens (system + briefing + brand guide context) | ~4.000 |
| Output tokens (caption + legenda por rede + alt text) | ~2.500 |
| Cache hit ratio esperado (brand guide + system prompt) | 70% |
| Custo input (cached): 4.000 × 70% × $0.30/1M = $0.00084 | R$ 0,005 |
| Custo input (não-cached): 4.000 × 30% × $3.00/1M = $0.0036 | R$ 0,019 |
| Custo output: 2.500 × $15.00/1M = $0.0375 | R$ 0,199 |
| **Subtotal copywriting** | **R$ 0,22** |

### 2.2 Imagens — Google Vertex Imagen 4 (4 slides padrão)

| Componente | Valor |
|-----------|------:|
| Imagens via Imagen 4 (4 imagens × $0.04) | $0,16 |
| Conversão BRL ($1 = R$ 5,30) | R$ 0,85 |
| **Subtotal imagens (4 slides)** | **R$ 0,85** |

### 2.3 Imagem com texto destacado — Ideogram v2 (1 slide fallback)

| Componente | Valor |
|-----------|------:|
| Imagem via Ideogram v2 (1 imagem × $0.02) | $0,02 |
| Conversão BRL | R$ 0,11 |
| **Subtotal Ideogram** | **R$ 0,11** |

### 2.4 Brand Validation — Claude Sonnet 4.6 vision

| Componente | Valor |
|-----------|------:|
| Input: 5 imagens 1080×1080 = ~5.500 vision tokens | 5.500 |
| Output: score + relatório de issues = ~800 tokens | 800 |
| Custo input: 5.500 × $3.00/1M = $0.0165 | R$ 0,087 |
| Custo output: 800 × $15.00/1M = $0.012 | R$ 0,064 |
| **Subtotal validation** | **R$ 0,15** |

### 2.5 Publicação Zernio API (4 redes)

| Componente | Valor |
|-----------|------:|
| Zernio pricing: $0,01 por post × 4 redes | $0,04 |
| Conversão BRL | R$ 0,21 |
| **Subtotal publicação** | **R$ 0,21** |

### 2.6 Infraestrutura (AWS Lambda + DB)

| Componente | Valor |
|-----------|------:|
| Lambda execution (~10s, 1GB RAM) | R$ 0,02 |
| PostgreSQL (RDS, prorated) | R$ 0,03 |
| Redis cache (ElastiCache, prorated) | R$ 0,01 |
| Langfuse self-hosted (prorated) | R$ 0,05 |
| **Subtotal infra** | **R$ 0,11** |

### 2.7 Eval-cases (custo amortizado)

| Componente | Valor |
|-----------|------:|
| LLM-as-judge eval 1× a cada 20 execuções (sample) | R$ 0,15 / 20 |
| Por execução: R$ 0,15 / 20 | R$ 0,008 ≈ R$ 0,01 |
| **Subtotal eval** | **R$ 0,01** |

### 2.8 Telemetria Langfuse

| Componente | Valor |
|-----------|------:|
| 1 trace × ~10 spans × R$ 0,00005/span | R$ 0,0005 ≈ R$ 0,01 |
| **Subtotal telemetria** | **R$ 0,01** |

### 2.9 Buffer para variabilidade (~10%)

| Componente | Valor |
|-----------|------:|
| Buffer = soma × 0,1 | R$ 0,18 |
| **Subtotal buffer** | **R$ 0,18** |

## 3. Total

| Componente | Custo |
|-----------|------:|
| Copywriting | R$ 0,22 |
| Imagens Imagen 4 | R$ 0,85 |
| Imagem Ideogram (1) | R$ 0,11 |
| Brand validation | R$ 0,15 |
| Publicação Zernio | R$ 0,21 |
| Infraestrutura | R$ 0,11 |
| Eval-cases amortizado | R$ 0,01 |
| Telemetria | R$ 0,01 |
| Buffer 10% | R$ 0,18 |
| **TOTAL** | **R$ 1,85** |
| | |
| **C3 limit (25% × R$ 12)** | **R$ 3,00** |
| **Folga** | **R$ 1,15 (38%)** |

> **Atualização:** após decompor com mais granularidade, custo realista é **R$ 1,85** (15.4% do preço) — bem abaixo do limite de 25%. Diagnose preliminar superestimou (R$ 3,20 → R$ 1,85). ADR-001-DS ainda válido (4-5 slides default) mas C3 passa com margem confortável.

## 4. Análise por cenário

### Cenário A — Padrão (4 slides)
- Custo: R$ 1,64 (sem Ideogram fallback)
- Preço: R$ 12,00
- Margem: 86%

### Cenário B — Padrão (5 slides com 1 Ideogram)
- Custo: R$ 1,85 (atual)
- Preço: R$ 12,00
- Margem: 84%

### Cenário C — Upsell (6 slides)
- Custo: R$ 2,01 (adicional Imagen)
- Preço: R$ 16,00
- Margem: 87%

### Cenário D — Upsell (7 slides com 2 Ideogram)
- Custo: R$ 2,27
- Preço: R$ 16,00
- Margem: 86%

## 5. Riscos econômicos identificados

| Risco | Probabilidade | Impacto em C3 | Mitigação |
|-------|:------------:|:-------------:|-----------|
| Anthropic aumenta preço de tokens em 30% | 🟡 Média | +R$ 0,07 (folga ainda OK) | Multi-provider via adapter (C7) |
| Vertex Imagen 4 sobe para $0,06/img | 🟡 Média | +R$ 0,42 (folga reduz a 25%) | Renegociar volume ou migrar para FLUX |
| Câmbio USD/BRL sobe para 6,00 | 🟡 Média | +R$ 0,25 (folga reduz a 30%) | Hedge via faturamento em USD |
| Brand validation requer 2 retries (re-roll) | 🟢 Baixa | +R$ 1,00 em 5% dos casos | Tuning do prompt de validação (target 99%+ first-pass) |

## 6. Otimizações futuras (não bloqueantes)

1. **Prompt caching agressivo** (já considerado 70%) — pode chegar a 85% com brand context estável → economia ~R$ 0,03
2. **Lote de imagens** — Imagen 4 oferece desconto para 100+ requests/dia → economia ~10%
3. **Cache de imagens "evergreen"** (templates re-usáveis) — economia adicional
4. **Compressão JPG inteligente** — não impacta custo mas reduz infra (~R$ 0,02)

## 7. Decisão (`@unit-economist`)

✅ **APROVADO C3** com folga de 38% sobre o limite.
✅ **APROVADO upsell** (6-7 slides) com margem 86-87%.
⚠️ **ADR-001-DS recomendado** mas não bloqueante — mantém 4-5 slides default para preservar previsibilidade de custo e tempo de geração.
✅ **Monitorar** custo de Imagen 4 e câmbio mensalmente.

## 8. Próximo passo

→ `/acme:plan social-media-agent`
→ Invocar `@artifact-architect` para validar abstrações
→ Garantir adapter pattern (C7) preservado no código

---

**Assinatura:** `@unit-economist` Guardian (Sonnet) — 2026-05-13 — APPROVED
