---
sku_id: copywriter-agent
audit_date: 2026-05-13
audited_by: "@unit-economist (Guardian)"
status: APPROVED_WITH_ADR
linked_adr: ADR-001-CW
c3_check: PASS (custo médio ponderado R$ 3,55 ≤ R$ 20,00)
margin_percent: 95.6%
---

# Unit Economics — Copywriter Agent

> **Caveat de transparência:** preços de modelo Anthropic Opus assumidos a seguir são as faixas públicas conhecidas para a família Opus em 2026-05 (input ~$15/MTok, output ~$75/MTok). Caso preço oficial divirja, recalcular. Câmbio USD/BRL = R$ 5,30 (mesmo do social-media-agent para consistência).

## 1. Preço e meta de custo (C3)

| Item | Valor |
|------|------:|
| Preço de venda padrão (qualquer dos 3 tipos) | R$ 80,00 |
| Preço upsell landing extendida (2.500-3.500 palavras) | R$ 110,00 |
| Custo máximo aceitável (25% × R$ 80) | R$ 20,00 |
| Custo estimado Tipo A (landing 1.800 palavras) | **R$ 4,75** ✅ |
| Custo estimado Tipo B (sequência 4 emails) | **R$ 3,12** ✅ |
| Custo estimado Tipo C (5 ads Meta) | **R$ 2,28** ✅ |
| Custo médio ponderado (mix 40/35/25) | **R$ 3,55** |
| Margem absoluta média | R$ 76,45 |
| Margem percentual média | **95,6%** |

## 2. Premissas de preço Claude Opus 4.6

| Item | Preço unitário |
|------|---------------:|
| Input tokens | $15,00 / 1M tokens |
| Output tokens | $75,00 / 1M tokens |
| Cached input (prompt caching) | $1,50 / 1M tokens (90% off) |
| Câmbio USD/BRL | R$ 5,30 |
| Cache hit ratio esperado em produção | 75% (system prompt + framework templates + voice exemplars são estáveis) |

## 3. Breakdown — Tipo A: Landing page (1.800 palavras default)

### 3.1 Copy generation — Claude Opus 4.6

| Componente | Tokens | Cálculo | Custo |
|-----------|-------:|---------|------:|
| Input total (system + framework + voice + briefing) | 8.000 | — | — |
| Input cached (75%) | 6.000 | 6.000 × $1.50/1M | $0,009 → R$ 0,048 |
| Input não-cached (25%) | 2.000 | 2.000 × $15/1M | $0,030 → R$ 0,159 |
| Output (1.800 palavras × ~1,5 token/palavra ≈ 2.700 tok) | 2.700 | 2.700 × $75/1M | $0,2025 → R$ 1,073 |
| **Subtotal copy (Opus)** | | | **R$ 1,28** |

### 3.2 Voice validation — Claude Sonnet 4.6 (LLM-as-judge)

| Componente | Valor |
|-----------|------:|
| Input: copy + voice exemplars (~5.500 tok) × $3/1M | R$ 0,087 |
| Output: score + breakdown por bloco (~600 tok) × $15/1M | R$ 0,048 |
| **Subtotal voice validation** | **R$ 0,14** |

### 3.3 Schema validation (Zod) + Infraestrutura

| Componente | Valor |
|-----------|------:|
| Lambda execution (~30s, 1GB RAM) | R$ 0,06 |
| PostgreSQL (RDS, prorated) | R$ 0,03 |
| Redis cache (prorated) | R$ 0,01 |
| Langfuse self-hosted (prorated) | R$ 0,05 |
| **Subtotal infra** | **R$ 0,15** |

### 3.4 Eval-cases (amortizado, 1 LLM-as-judge eval a cada 15 execuções)

| Componente | Valor |
|-----------|------:|
| Eval suite Opus-as-judge ~ R$ 0,60 por execução / 15 | R$ 0,04 |
| **Subtotal eval** | **R$ 0,04** |

### 3.5 Telemetria

| Componente | Valor |
|-----------|------:|
| 1 trace × ~12 spans Langfuse | R$ 0,01 |
| **Subtotal telemetria** | **R$ 0,01** |

### 3.6 Re-roll buffer (~20% — landing tem maior probabilidade de retry por schema/voice)

| Componente | Valor |
|-----------|------:|
| Buffer = soma × 0,2 | R$ 0,32 |
| **Subtotal buffer** | **R$ 0,32** |

### 3.7 Total Tipo A (landing 1.800 palavras)

| Componente | Custo |
|-----------|------:|
| Copy generation (Opus) | R$ 1,28 |
| Voice validation (Sonnet) | R$ 0,14 |
| Infraestrutura | R$ 0,15 |
| Eval-cases amortizado | R$ 0,04 |
| Telemetria | R$ 0,01 |
| Buffer 20% | R$ 0,32 |
| **TOTAL Tipo A** | **R$ 1,94** |
| | |
| Buffer adicional landing (re-roll de blocos individuais, ~50% adicional do copy) | R$ 0,64 |
| Margem de segurança contra spike de output (até 2.000 palavras) | R$ 0,40 |
| Margem de cache hit pior que 75% (sensibilidade) | R$ 0,30 |
| **TOTAL conservador Tipo A** | **R$ 3,28** |

> Para conservadorismo no audit, usamos **R$ 4,75** como custo realista de Tipo A absorvendo todos os cenários piores (cache hit cai para 60%, output sobe para 2.000 palavras, 1 re-roll de bloco em 30% dos casos). Ainda fica em **5,9% do preço**, com folga de 76% sobre C3.

## 4. Breakdown — Tipo B: Sequência de 4 e-mails

### 4.1 Copy generation — Claude Opus 4.6

| Componente | Tokens | Custo |
|-----------|-------:|------:|
| Input total (system + framework email + voice + briefing) | 6.500 | — |
| Input cached (75%) → 4.875 × $1.50/1M | | R$ 0,039 |
| Input não-cached (25%) → 1.625 × $15/1M | | R$ 0,129 |
| Output 4 emails × ~280-420 palavras + subjects + preview ≈ 2.200 tok | | R$ 0,874 |
| **Subtotal copy (Opus)** | | **R$ 1,04** |

### 4.2 Demais componentes

| Componente | Valor |
|-----------|------:|
| Voice validation (Sonnet, menor escopo: ~3.500 input + 400 output) | R$ 0,09 |
| Infraestrutura (Lambda ~22s) | R$ 0,12 |
| Eval-cases amortizado | R$ 0,03 |
| Telemetria | R$ 0,01 |
| Buffer 15% | R$ 0,19 |
| **Subtotal não-copy** | **R$ 0,44** |

### 4.3 Total Tipo B

| Item | Custo |
|------|------:|
| Copy generation Opus | R$ 1,04 |
| Validação + infra + eval + telemetria + buffer | R$ 0,44 |
| **Base** | **R$ 1,48** |
| Margem conservadora (re-roll de 1 email em 25% dos casos + cache pior) | R$ 1,64 |
| **TOTAL conservador Tipo B** | **R$ 3,12** |

## 5. Breakdown — Tipo C: 5 variações de anúncio Meta

### 5.1 Copy generation — Claude Opus 4.6

| Componente | Tokens | Custo |
|-----------|-------:|------:|
| Input total (system + framework ToT + 5 ângulos + voice + briefing) | 5.000 | — |
| Input cached (75%) → 3.750 × $1.50/1M | | R$ 0,030 |
| Input não-cached (25%) → 1.250 × $15/1M | | R$ 0,099 |
| Output 5 ads × (headline + primary + description) ≈ 900 tok | | R$ 0,358 |
| **Subtotal copy (Opus)** | | **R$ 0,49** |

### 5.2 Diversity check — Embeddings

| Componente | Valor |
|-----------|------:|
| 5 × text-embedding-3-small ($0,02/1M tok, ~150 tok cada) | $0,00002 → ~R$ 0,001 |
| **Subtotal embeddings** | **~R$ 0,01** |

### 5.3 Demais componentes

| Componente | Valor |
|-----------|------:|
| Voice validation (Sonnet, escopo enxuto) | R$ 0,05 |
| Infraestrutura (Lambda ~12s) | R$ 0,08 |
| Eval-cases amortizado | R$ 0,02 |
| Telemetria | R$ 0,01 |
| Buffer 25% (Tree-of-Thought tem maior chance de re-roll por similarity) | R$ 0,17 |
| **Subtotal não-copy** | **R$ 0,33** |

### 5.4 Total Tipo C

| Item | Custo |
|------|------:|
| Copy generation Opus | R$ 0,49 |
| Embeddings + validação + infra + eval + telemetria + buffer | R$ 0,34 |
| **Base** | **R$ 0,83** |
| Margem conservadora (re-roll por similarity em 35% dos casos) | R$ 1,45 |
| **TOTAL conservador Tipo C** | **R$ 2,28** |

## 6. Análise por cenário

### Cenário 1 — Landing padrão (1.800 palavras)
- Custo: R$ 4,75 (conservador)
- Preço: R$ 80,00
- Margem: R$ 75,25 (**94%**)

### Cenário 2 — Email sequence (4 emails)
- Custo: R$ 3,12
- Preço: R$ 80,00
- Margem: R$ 76,88 (**96%**)

### Cenário 3 — 5 ads Meta
- Custo: R$ 2,28
- Preço: R$ 80,00
- Margem: R$ 77,72 (**97%**)

### Cenário 4 — Landing extendida (upsell, 3.000 palavras)
- Custo estimado: R$ 7,40 (output sobe ~65%)
- Preço upsell: R$ 110,00
- Margem: R$ 102,60 (**93%**)

### Cenário 5 — Mix realista mensal (40% landing / 35% email / 25% ads)
- Custo médio ponderado: R$ 3,55
- Preço médio: R$ 80,00
- Margem: R$ 76,45 (**95,6%**)

## 7. Riscos econômicos identificados

| Risco | Probabilidade | Impacto em C3 | Mitigação |
|-------|:------------:|:-------------:|-----------|
| Anthropic Opus sobe 30% (input+output) | 🟡 Média | +R$ 1,40 em landing (folga ainda 70%) | Adapter para Mistral Large via C7 (ADR-002-CW) |
| Cache hit ratio fica em 50% (não 75%) | 🟡 Média | +R$ 0,80 em landing | Tuning de prompt structure + ephemeral cache |
| Câmbio USD/BRL sobe para 6,30 | 🟡 Média | +R$ 0,85 em landing | Hedge / reajuste trimestral de preço BRL |
| Re-roll de bloco em 50% das landings (vs 30% esperado) | 🟡 Média | +R$ 1,00 em landing | Voice exemplars de melhor qualidade + system prompt refinado em SHADOW |
| Cliente abusa de upsell landing extendida sem pagar | 🟢 Baixa | Margem cai | Schema valida `word_count_target`; cobra upsell automático se >2.200 palavras |
| Tree-of-Thought de ads exige 3+ re-rolls | 🟢 Baixa | +R$ 1,50 em ads (still <10% do preço) | Prompt explícito de 5 categorias + early-exit se similarity 1ª try ≤0,55 |

## 8. Otimizações futuras (não bloqueantes)

1. **Cache mais agressivo** — voice exemplars + frameworks + briefing schema → cache hit 85% possível → economia ~R$ 0,30 por landing.
2. **Output streaming + cancelamento** — se LLM-as-judge detecta drift de tom no 1º terço da landing, cancela e re-roll com correção (economiza ~30% de tokens de output em casos ruins).
3. **Tipo C: Mistral Large** poderia substituir Opus (ads são mais curtos e menos exigentes em raciocínio) → economia ~R$ 0,35 por bateria. Avaliar em ASSISTED.
4. **Batch processing** — Anthropic Batches API (50% off) para entregáveis com SLA flexível (sequências de email programadas com >1h de antecedência).

## 9. Sensibilidade — Quando C3 violaria?

| Cenário extremo | Custo Tipo A | C3 violado? |
|-----------------|-------------:|:-----------:|
| Opus +50% preço + USD 6,30 + cache 50% | R$ 8,90 | ✅ Não (folga 56%) |
| Cliente pede landing 4.000 palavras sem upsell | R$ 10,20 | ✅ Não (folga 49%) — mas margem cai a 87% |
| Combinação anterior + 3 re-rolls de bloco | R$ 14,80 | ✅ Não (folga 26%) — entra em zona de alerta |
| Adicional: cache colapsa para 0% | R$ 19,40 | ⚠️ Quase no limite — gate de monitoramento |

> Recomendação: monitorar em SHADOW os 4 fatores (preço Opus, câmbio, cache hit, re-roll rate). Alarme em `#finance` se custo P95 de Tipo A passar de R$ 12.

## 10. Decisão (`@unit-economist`)

✅ **APROVADO C3** com folga média de 82% sobre o limite (R$ 3,55 médio ≤ R$ 20,00).
✅ **APROVADO upsell** landing extendida com margem 93%.
✅ **APROVADO os 3 tipos de output** com custos individuais bem abaixo do teto.
⚠️ **ADR-001-CW recomendado** para limitar landing default em 1.500-2.000 palavras (não bloqueante, mas evita cair em zona de alerta da sensibilidade).
⚠️ **Monitorar** mensalmente: preço Opus, cache hit ratio efetivo, re-roll rate, câmbio USD/BRL. Alarme em Slack `#finance` para custo Tipo A P95 > R$ 12.
✅ **Recomendação adicional:** validar premissa de preço Opus 4.6 (caveat na seção 0) com a documentação oficial Anthropic vigente antes de promover SHADOW → ASSISTED.

## 11. Próximo passo

→ `/acme:plan copywriter-agent`
→ Invocar `@artifact-architect` para validar abstrações (domain + adapter pattern) e contrato JSON de output (ADR-003-CW)
→ Criar templates de framework (PAS/AIDA/4Ps/StoryBrand/Soap Opera/Tree-of-Thought)
→ Verificar premissa de pricing Opus 4.6 com fonte oficial Anthropic antes de SHADOW

---

**Assinatura:** `@unit-economist` Guardian (Sonnet) — 2026-05-13 — APPROVED com caveat de validação de preço Opus 4.6
