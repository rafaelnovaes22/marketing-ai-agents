---
sku_id: social-media-agent
sku_version: 0.1.0
project_type: agentic_saas
ai_enabled: true
criticality: B
current_stage: draft
spec_status: po_guardian_pending
spec_template_used: platform-sku-spec.template.md
created_at: 2026-05-13
last_updated: 2026-05-13
adrs_linked: [ADR-001-DS, ADR-002-DS]
priority: P0
---

# Spec: Social Media Agent

## 1. Outcome contratual (C2)

### 1.1 Promessa

Entregar 1 carrossel publicável em ≤8 minutos:
- **4-5 slides** padrão (default) JPG 1080×1080 com brand Acme aplicado
- **Caption** ≤2200 caracteres no tom solicitado (default: the CEO)
- **Legendas adaptadas** por rede social (LinkedIn long-form, IG/FB conciso, Twitter thread)
- **Publicação pronta** via Zernio em LinkedIn + Instagram + Facebook + Twitter

> Upsell disponível: 6-7 slides por +R$ 4 adicionais (preço total R$ 16).

### 1.2 Critério de aceite verificável

- [x] N slides JPG 1080×1080 (N=4-5 default OU 6-7 se upsell)
- [x] Caption ≤2200 chars com CTA explícito
- [x] Brand validation score ≥ 99% (Claude Sonnet 4.6 vision compara × brand_guide.yaml)
- [x] Tom score ≥ 7/10 (LLM-as-judge com prompt de tom the CEO)
- [x] Tempo total request → arquivo entregue ≤ 480s (8 min)
- [x] Publicação confirmada nas 4 redes (Zernio API retorna 200 + post_id)
- [x] Trace Langfuse com cost breakdown, latência, scores

### 1.3 Exemplos

**Positivos (✅ contam como sucesso):**

1. Input: "Carrossel sobre IA generativa para indústria, tom the CEO"
   Output: 5 slides + caption + 4 publicações, brand 99.4%, tom 8.2/10, 7m12s

2. Input: "Lançamento de produto B2B SaaS, foco early adopters, 6 slides"
   Output: 6 slides + caption + 4 publicações (upsell R$ 16), brand 99.1%, tom 7.8/10, 7m48s

**Negativos (❌ não contam):**

1. Input: "Faz alguma coisa bonita" → REJEITA com mensagem amigável pedindo briefing mínimo
2. Brand 87% (cores divergentes) → falha gate; refaz slide problemático antes de publicar
3. 8m30s total → falha SLA; trace marcado como `sla_violated=true` para análise

## 2. Stack técnico (C7 — portability)

| Camada | Provedor | Adapter local |
|--------|----------|---------------|
| **Copywriting** | Claude Sonnet 4.6 (Anthropic) | `lib/llm/claude-adapter.ts` |
| **Imagens (80% casos)** | Google Vertex Imagen 4 | `lib/image-gen/imagen-adapter.ts` |
| **Imagens com texto (fallback 20%)** | Ideogram v2 | `lib/image-gen/ideogram-adapter.ts` |
| **Brand validation** | Claude Sonnet 4.6 vision | `lib/brand/validator.ts` |
| **Publicação multi-rede** | Zernio API | `lib/social-publishers/zernio-adapter.ts` |
| **Telemetria** | Langfuse | `lib/observability/langfuse.ts` |
| **Domain layer** | TypeScript puro | `src/domain/carrossel/` (sem deps externas) |

> ADR-002-DS: estratégia de adapters isolando domain de SDKs específicos. Trocar Imagen 4 por DALL-E 3, por exemplo, = trocar `imagen-adapter.ts` sem tocar domain.

## 3. Lifecycle (C4)

```
draft (atual, hoje 2026-05-13)
  ↓ [@po-guardian approves outcome + @unit-economist approves C3]
SHADOW (interno, ~D6-D10 da semana 1)
  • 100+ execuções coletadas
  • Score eval médio ≥ 8/10
  • Sem cobrança (gratuito interno)
  ↓ [eval pass rate ≥85% + revisão humana 10% sample]
ASSISTED (~D11-D17)
  • Humano aprova cada carrossel antes de publicar
  • SLA contratual definido (/acme:sla-threshold)
  ↓ [SLA atingido 14 dias consecutivos]
AUTONOMOUS (~D18+)
  • Cobra R$ 12 por carrossel publicado
  • Audit mensal DeepAgent
```

## 4. Unit Economics (C3 — preview, detalhe em unit-economics.md)

```
Preço de venda padrão:        R$ 12,00
Custo máximo aceitável (25%): R$  3,00
Custo estimado realista:       R$  2,85 (após ADR-001-DS)
Margem:                       R$  9,15 (76%)
```

**Ver `unit-economics.md` para breakdown completo de tokens, imagens, infra.**

## 5. Telemetry (C6)

- **Langfuse traces:**
  - 1 trace por execução com spans: copy_generation, image_generation (×N), brand_validation, publication
  - Metadata: tenant_id, sku=social-media-agent, mode (shadow/assisted/autonomous), priority, brief_text
  - Cost breakdown por span (tokens × preço)
  - Latência total + por span

- **Métricas de negócio:**
  - Carrosséis/dia, /semana, /mês
  - Custo médio, custo P99
  - Score eval médio, brand consistency média
  - SLA achievement rate

- **Alertas:**
  - SLA violation → Slack #ops
  - Brand <95% → Slack #design
  - Custo > R$ 3 → Slack #finance

## 6. Portability (C7)

**Camadas isoladas:**
1. **Domain** (`src/domain/carrossel/`) — entidades + regras de negócio, zero deps externas
2. **Application** (`src/application/`) — use cases, orquestra domain
3. **Infrastructure** (`src/infrastructure/adapters/`) — adapters para LLMs, image gen, social APIs

**Princípio:** se trocarmos Anthropic por outro LLM, apenas `infrastructure/adapters/llm/` muda. Domain e application permanecem.

**Testes:**
- Domain testado isoladamente (Vitest unit, sem mock de LLM real)
- Application testado com fakes de adapters
- Infrastructure testado com integração real (Imagen 4, Zernio sandbox)

## 7. Tenant context (C8)

**Fase 1 (este SKU):** single-tenant — Acme própria como cliente único.

**Fase 2 (futura):** multi-tenant via:
- `tenant_id` propagado em toda chamada
- Brand guides por tenant (`brand_guides/{tenant_id}.yaml`)
- Limites de uso por tenant (rate limit, custo mensal)
- Audit trail particionado

## 8. Dependências externas

| Serviço | Criticidade | SLA conhecido | Fallback |
|---------|:----------:|---------------|----------|
| Anthropic API | 🔴 Crítica | 99.5% | — (single provider para LLM) |
| Google Vertex AI | 🔴 Crítica | 99.95% | Ideogram para imagens |
| Ideogram v2 | 🟡 Importante | 99.0% | — (fallback secundário) |
| Zernio API | 🟡 Importante | 98% | Retry exponencial + queue |
| Langfuse | 🟢 Não crítica | 98% | Logs estruturados Pino |

## 9. ADRs vinculados

- **ADR-001-DS:** Reduzir slides default de 5-7 para 4-5 (motivo: C3)
- **ADR-002-DS:** Adapter pattern para LLM/image-gen/social-publisher (motivo: C7)
- **ADR-003-DS:** Twitter usa modo thread (não single tweet) (motivo: limitação de caracteres da rede)

## 9.1 Insumos de calibração

- **[`tom-brand-voice-ceo.md`](./tom-brand-voice-ceo.md)** — 22 quotes verificados + 8 dimensões de tom + 5 few-shot examples. Insumo CRÍTICO para o system prompt do agente. Validar com the CEO (ou referência confiável) antes de promover SHADOW → ASSISTED.

## 10. Aprovações necessárias

- [ ] `@po-guardian` valida outcome (Seção 1)
- [ ] `@unit-economist` valida C3 (após unit-economics.md)
- [ ] `@artifact-architect` valida abstrações (após plan.md)
- [ ] Founder aprova preço R$ 12 e upsell R$ 16
