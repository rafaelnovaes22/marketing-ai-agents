---
sku_id: designer-agent
sku_version: 0.1.0
project_type: agentic_saas
ai_enabled: true
criticality: B
current_stage: draft
spec_status: po_guardian_pending
spec_template_used: platform-sku-spec.template.md
created_at: 2026-05-13
last_updated: 2026-05-13
adrs_linked: [ADR-001-DES, ADR-002-DES, ADR-003-DES]
priority: P0
upstream_caller: social-media-agent (opcional) ou cliente direto
downstream_consumer: social-media-agent (consome imagens para publicar) ou cliente
---

# Spec: Designer Agent

## 1. Outcome contratual (C2)

### 1.1 Promessa

Entregar **1 carrossel de design completo** em ≤20 minutos:
- **7 slides** padrão (default) JPG 1080×1080 com brand Acme aplicado
- **Brand consistency ≥ 99%** (validador multimodal Sonnet 4.6 vision × `brand/acme-brand-guide.yaml`)
- **Split estratégico:** Imagen 4 para slides visual-heavy (≈5 slides) + Ideogram v2 para slides com texto literal (≈2 slides)
- **Output bruto:** 7 arquivos JPG + manifesto JSON com metadata por slide (provider, brand_score, retries, prompts usados)

> Variante econômica: 5 slides por R$ 15 (preço reduzido, mesmo gate de qualidade). Decisão de variantes consolidada em ADR-001-DES.

> **Escopo NEGATIVO explícito:** o designer-agent NÃO escreve caption, NÃO publica em rede social, NÃO gera vídeo. Esses são outcome_units de outros agentes.

### 1.2 Critério de aceite verificável

- [x] N slides JPG 1080×1080, sRGB, ≤ 800KB cada (N=7 default, N=5 variante econômica)
- [x] Brand validation score ≥ 99% por slide (não média — gate individual)
- [x] Composição respeita `composition.alignment: center` + `whitespace: generous` (YAML)
- [x] Tipografia: apenas Inter (ou fallbacks listados) — detectado por vision validator
- [x] Paleta: apenas cores em `colors.primary` + `colors.secondary` do YAML
- [x] Tempo total request → manifesto JSON entregue ≤ 1200s (20 min)
- [x] Trace Langfuse com cost breakdown, latência por slide, brand_score por slide, retries
- [x] Manifesto JSON inclui: slide_index, provider_used (imagen|ideogram), brand_score, prompt_hash, retry_count, render_time_ms

### 1.3 Exemplos

**Positivos (✅ contam como sucesso):**

1. Input: `{ tema: "governança de IA B2B", num_slides: 7, dominant_mode: "dark", caller: "social-media-agent" }`
   Output: 7 slides (5 Imagen 4 + 2 Ideogram), brand scores [99.4, 99.7, 99.1, 99.3, 99.5, 99.2, 99.6], 17m48s, 1 retry total.

2. Input: `{ tema: "lançamento produto SaaS", num_slides: 5, variant: "economic", caller: "founder_direct" }`
   Output: 5 slides Imagen 4, brand scores ≥ 99.5%, 11m20s, 0 retries.

**Negativos (❌ não contam):**

1. Input: `{ "alguma coisa bonita" }` → REJEITA com mensagem amigável pedindo briefing mínimo (tema, num_slides, dominant_mode).
2. Slide 3 sai com brand 96% → dispara política `rejection_threshold: 96` → 1 re-roll automático; se segunda tentativa também < 99%, fallback Ideogram; se ainda falha, output marcado `degraded=true` e operação humana é alertada.
3. 7 slides perfeitos entregues em 21min → falha SLA; trace marcado `sla_violated=true`.
4. Briefing pede 10 slides → REJEITA (escopo v0.1.0 = 5-7 slides; upsell futuro em ADR).

## 2. Stack técnico (C7 — portability)

| Camada | Provedor | Adapter local |
|--------|----------|---------------|
| **Imagens visual-heavy (≈70%)** | Google Vertex Imagen 4 | `src/infrastructure/adapters/image-gen/imagen-adapter.ts` ✅ existe |
| **Imagens com texto literal (≈30%)** | Ideogram v2 | `src/infrastructure/adapters/image-gen/ideogram-adapter.ts` ✅ existe |
| **Brand validation (vision)** | Claude Sonnet 4.6 (multimodal) | `src/infrastructure/adapters/llm/claude-adapter.ts` (modo vision) |
| **Brand guide (fonte canônica)** | YAML estruturado | `brand/acme-brand-guide.yaml` (read-only para o agente) |
| **Telemetria** | Langfuse | `src/infrastructure/adapters/observability/langfuse-adapter.ts` |
| **Storage de slides** | AWS S3 (presigned URLs) | `src/infrastructure/adapters/storage/s3-adapter.ts` (a criar se não existe) |
| **Domain layer** | TypeScript puro | `src/domain/design/` (sem deps externas) |

> ADR-002-DES governa a estratégia de roteamento Imagen 4 × Ideogram v2 baseado em metadata do slide (`requires_literal_text: bool`).

## 3. Lifecycle (C4)

```
draft (atual, 2026-05-13)
  ↓ [@po-guardian approves outcome + @unit-economist approves C3]
SHADOW (interno, ~D8-D14 da semana 2)
  • 100+ carrosséis gerados (700+ slides)
  • Score eval médio ≥ 8/10
  • Auditoria humana 10% sample → calibrar validator
  • Sem cobrança
  ↓ [eval pass rate ≥85% + concordância validator-humano ≥90%]
ASSISTED (~D15-D21)
  • Humano aprova cada carrossel antes do consumo (social-media ou cliente)
  • SLA contratual ativado
  • Re-roll-rate monitorado (target ≤ 15%)
  ↓ [SLA atingido 14 dias consecutivos + custo médio ≤ R$ 2,00]
AUTONOMOUS (~D22+)
  • Cobra R$ 20 por carrossel completo (R$ 15 variante econômica)
  • Audit mensal DeepAgent
  • Brand drift monitor semanal
```

## 4. Unit Economics (C3 — preview, detalhe em `unit-economics.md`)

```
Preço de venda padrão (7 slides):  R$ 20,00
Variante econômica (5 slides):     R$ 15,00
Custo máximo aceitável (25%):      R$  5,00
Custo estimado realista:           R$  2,02 (≈10% do preço)
Margem absoluta (7 slides):        R$ 17,98
Margem percentual:                 ≈ 89.9%
```

**Ver `unit-economics.md` para breakdown completo de imagens, validação, retries, infra.**

## 5. Telemetry (C6)

- **Langfuse traces:**
  - 1 trace por execução com spans: `intake_briefing`, `prompt_planning`, `image_generation` (×7 paralelo), `brand_validation` (×7 serial), `retry_loop` (condicional), `manifest_output`
  - Metadata: `tenant_id`, `sku=designer-agent`, `mode` (shadow/assisted/autonomous), `caller` (social-media-agent | direct), `num_slides`, `dominant_mode`
  - Cost breakdown por span (USD → BRL convertido)
  - Latência total + por span + P50/P95/P99 por slide

- **Métricas de negócio:**
  - Carrosséis/dia, /semana, /mês
  - Brand score médio + distribuição (histograma 96-100%)
  - Re-roll rate por slide-type (heavy text × visual)
  - Imagen 4 × Ideogram v2 split observado (target 70/30)
  - Custo médio, P99 custo
  - SLA achievement rate

- **Alertas:**
  - SLA violation → Slack `#ops`
  - Slide com brand < 96% após 2 retries → Slack `#design`
  - Re-roll rate > 25% em janela 24h → Slack `#design` (sinal de drift no Imagen ou Ideogram)
  - Custo > R$ 4 em um único carrossel → Slack `#finance`

## 6. Portability (C7)

**Camadas isoladas:**
1. **Domain** (`src/domain/design/`) — entidades Carrossel, Slide, BrandScore + regras de negócio (gate 99%, política de retry). Zero deps externas.
2. **Application** (`src/application/use-cases/generate-carrossel/`) — orquestra: intake → plan → generate → validate → retry → output. Recebe adapters via DI.
3. **Infrastructure** (`src/infrastructure/adapters/`) — image-gen (Imagen, Ideogram), llm (Claude vision), storage (S3), observability (Langfuse).

**Princípio:** trocar Imagen 4 por DALL-E 3 = trocar `imagen-adapter.ts` por `dalle-adapter.ts` mantendo a interface `ImageGenerator`. Domain e application permanecem intactos. Adapters já existem para Imagen + Ideogram.

**Testes:**
- Domain testado isoladamente (Vitest unit, sem mock de LLM real) — regras de gate, política de retry, formato de manifesto.
- Application testado com fakes de adapters (`fake-image-generator.ts` retorna fixtures).
- Infrastructure testado com integração real (Imagen 4 sandbox, Ideogram sandbox) em CI nightly.

## 7. Tenant context (C8)

**Fase 1 (este SKU):** single-tenant — apenas Acme própria.
- `brand_guide.yaml` é singleton lido de `brand/acme-brand-guide.yaml`.
- Eval-cases curados são da Acme.

**Fase 2 (futura, wave 2 consumer):** multi-tenant via:
- `tenant_id` propagado em toda chamada (input do agente).
- Brand guides por tenant: `brand_guides/{tenant_id}.yaml`.
- Eval-cases particionados por tenant.
- Audit trail particionado (Langfuse `metadata.tenant_id`).
- Rate limit por tenant (max carrosséis/dia).
- Custo agregado por tenant para billing.

## 8. Dependências externas

| Serviço | Criticidade | SLA conhecido | Fallback |
|---------|:----------:|---------------|----------|
| Google Vertex Imagen 4 | 🔴 Crítica | 99.95% | Ideogram v2 cobre slides remanescentes |
| Ideogram v2 | 🔴 Crítica | 99.0% | Imagen 4 + overlay tipográfico via Canvas (degraded path) |
| Anthropic API (Sonnet 4.6 vision) | 🔴 Crítica | 99.5% | — (single provider para vision); circuit breaker + retry exponencial |
| AWS S3 | 🟡 Importante | 99.99% | Retry + local buffer |
| Langfuse | 🟢 Não crítica | 98% | Logs estruturados Pino como fallback |

## 9. ADRs vinculados

- **ADR-001-DES** — Threshold brand fixado em 99% (motivo: política do founder + brand_guide.yaml). Define também variante econômica 5 slides @ R$ 15 vs padrão 7 slides @ R$ 20.
- **ADR-002-DES** — Strategy de roteamento Imagen 4 × Ideogram v2 baseado em `slide.requires_literal_text` (motivo: Imagen falha em texto literal grande; Ideogram falha em fotorealismo). Inclui fallback overlay Canvas se ambos falharem.
- **ADR-003-DES** — Política de retry: 1 re-roll automático se brand < 99%; se segunda tentativa também falha, fallback para o outro provider; se ainda falha, output `degraded=true` com alerta humano (motivo: equilibrar qualidade × custo de re-roll).

## 9.1 Insumos de calibração

- **[`brand/acme-brand-guide.yaml`](../../../../brand/acme-brand-guide.yaml)** — fonte canônica de paleta, tipografia, composição, validator_rules, thresholds. **CRÍTICO:** o agente lê em runtime, nunca edita.
- **`brand/examples_on_brand/*.jpg`** — referência visual para few-shot do prompt de geração + ground truth do validator.
- **30+ eval-cases curados** (a coletar em SHADOW semana 2) — pares (briefing → carrossel esperado) com brand_score humano rated.

## 10. Aprovações necessárias

- [ ] `@po-guardian` valida outcome (Seção 1) + escopo negativo (sem vídeo, sem caption, sem publicação)
- [ ] `@unit-economist` valida C3 (após `unit-economics.md`)
- [ ] `@artifact-architect` valida abstrações (após `plan.md`): adapter pattern Imagen/Ideogram preservado
- [ ] Founder aprova preço R$ 20 (padrão) e R$ 15 (econômica)
- [ ] Founder aprova threshold 99% (já no brand_guide; reconfirmar como SLA contratual)
