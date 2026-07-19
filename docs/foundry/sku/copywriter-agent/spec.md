---
sku_id: copywriter-agent
sku_version: 0.1.1
project_type: agentic_saas
ai_enabled: true
criticality: B
current_stage: draft
spec_status: po_guardian_approved
spec_template_used: platform-sku-spec.template.md
created_at: 2026-05-13
last_updated: 2026-05-19
adrs_linked: [ADR-001-CW, ADR-002-CW, ADR-003-CW]
priority: P0
c4_thresholds:
  agreement_rate_min: 0.90
  latency_p95_ms: 900000
  cost_per_outcome_max: 5.50
  min_run_count: 50
  min_window_days: 14
  escalation_categories:
    - pii_detected
    - competitor_ip_referenced
    - illegal_claim
  quality_breach_action: rollback
  approved_by: "Rafael de Novaes (Engenheiro de IA — founder/CTO)"
  approved_at: 2026-05-19
  signature_hash: a8efb5c67b05ccc0
---

# Spec: Copywriter Agent

## 1. Outcome contratual (C2)

### 1.0 Cláusula de outcome (canônica para contrato)

> **"Entregar, em ≤15 minutos após `briefing_submitted` válido, exatamente 1 entregável de copy do tipo declarado em `output_type` — landing page estruturada (hero + 4-6 seções + CTA), sequência de 3-5 e-mails (subject + preview + body + CTA por email) OU 5 variações de anúncio Meta (headline + primary_text + description) — no framework solicitado e tom requisitado, com schema JSON íntegro (zero campos obrigatórios faltantes) e tom score por entregável ≥ 7,0/10."**

`outcome_clause_id: copywriter-agent.outcome.v1`
`trigger_event: briefing_submitted`
`sla_clock_start: briefing.accepted_at`
`sla_clock_stop: delivery_emitted.timestamp`
`billing_event: delivery_accepted` (em AUTONOMOUS)

### 1.1 Trigger event

- **Evento canônico:** `briefing_submitted`
- **Definição:** payload JSON validado pelo Zod schema (`lib/briefing/parser.ts`) contendo no mínimo: `output_type` (landing|email_sequence|ads_meta), `product_or_offer`, `target_audience`, `framework` (ou "default"), `voice_id` (ou "brand-voice-ceo"), `tenant_id`.
- **SLA clock start:** timestamp `briefing.accepted_at` (após parse bem-sucedido).
- **SLA clock stop:** timestamp do primeiro evento `delivery_emitted` com `schema_validation=pass`.
- **Evento de cobrança (AUTONOMOUS):** `delivery_accepted` (após gate de schema + tom + diversidade quando Tipo C).
- **Evento de não-cobrança:** `briefing_rejected` (briefing inválido) ou `sla_violated=true`.

### 1.2 Promessa

Entregar, em ≤15 minutos, **1 dentre 3 tipos de output** (definido por `output_type` no briefing):

#### Tipo A — Landing page
- **Estrutura obrigatória (blocos JSON):** `hero { headline, subheadline, cta }`, `problem`, `agitation`, `solution`, `social_proof[3+]`, `objections[≥2]`, `final_cta`
- **Volume:** 1.500-2.000 palavras default; upsell `landing_extended` para 2.500-3.500 palavras (+R$ 30)
  > **Upsell `landing_extended`:** preço R$ 110 (R$ 80 + R$ 30), SLA estendido para 20 min, custo cap proporcional R$ 27,50 (25% de R$ 110), tom score ≥ 7,0/10 mantido. Tratado como variante de `output_type=landing` — não é tipo novo (C8).
- **Formato saída:** JSON estruturado + Markdown renderizado equivalente
- **Framework declarado:** PAS (default) | AIDA | 4Ps | StoryBrand
- **Tom:** the CEO (default) ou voice id alternativa

#### Tipo B — Sequência de e-mail
- **Estrutura obrigatória:** 3-5 e-mails (default 4), cada um com `{ subject, preview_text, body, cta, send_offset_hours }`
- **Total de palavras:** 1.200-2.000 (somando todos)
- **Framework:** Soap Opera Sequence (default) | Welcome Series | Re-engagement
- **Conectividade narrativa:** gancho do email N referencia email N-1 quando aplicável

#### Tipo C — 5 variações de anúncio Meta
- **Estrutura obrigatória:** 5 ads × `{ headline ≤40 chars, primary_text ≤125 chars (recomendado), description ≤30 chars, angle }`
- **Tree-of-Thought:** cada ad cobre 1 dos 5 ângulos distintos (pain, aspiração, FOMO, autoridade, prova social)
- **Validação automática:** cosine similarity entre `primary_text` ≤ 0,55

### 1.2 Critérios de aceite verificáveis

- [x] `output_type` declarado e schema JSON correspondente preenchido sem campos obrigatórios faltantes
- [x] Framework declarado em metadata (`framework_used`) corresponde ao solicitado
- [x] Tom score por entregável ≥ 7,0/10 (gate de aceite individual; abaixo disso re-roll automático 1× antes de devolver)
- [x] Tom score médio rolling 14 dias ≥ 7,8/10 (gate de manutenção em AUTONOMOUS; abaixo aciona revisão humana e pode degradar para ASSISTED)
- [x] (Tipo A) Volume de palavras dentro do range default 1.500-2.000 (±10%)
- [x] (Tipo B) Sequência tem N emails (N=4 default) com campos completos
- [x] (Tipo C) Limites de caracteres Meta respeitados em 100% das variações + diversidade ≥0,45 (1 − similarity)
- [x] Tempo total request → JSON entregue ≤ 900s (15 min)
- [x] Trace Langfuse com cost breakdown, latência, scores, framework, tipo de output

### 1.3 Exemplos

**Positivos (✅ contam como sucesso):**

1. Tipo A — "Landing para curso Novais Digital Foundry, público founders B2B, framework PAS, tom CEO"
   → JSON com 7 blocos + Markdown 1.870 palavras, tom 8.1/10, 12m18s, custo R$ 4,12

2. Tipo B — "Sequência 4 emails para lançamento 7 dias, Soap Opera"
   → 4 emails (subjects 35-48 chars, bodies 280-420 palavras cada) com gancho narrativo, 10m32s, custo R$ 2,98

3. Tipo C — "5 ads Meta para evento online B2B"
   → 5 variações × 5 ângulos distintos, similarity média 0,38, todos sob limites Meta, 7m04s, custo R$ 2,21

**Negativos (❌ não contam):**

1. Briefing sem `output_type` ou produto/oferta → REJEITA com mensagem amigável pedindo briefing schema mínimo
2. Landing entregue sem bloco `final_cta` → falha gate de schema; refaz bloco antes de devolver
3. 5 ads com similarity média > 0,55 → falha diversidade; re-roll dos 2 mais similares
4. SLA > 900s → trace marcado `sla_violated=true`; não cobra
5. Sequência de 4 emails entregue, mas email 3 não referencia gancho do email 2 (`references_previous=false` quando deveria ser `true`) → falha gate de conectividade narrativa; refaz email 3 antes de devolver

## 2. Stack técnico (C7 — portability)

| Camada | Provedor | Adapter local |
|--------|----------|---------------|
| **Orquestração + Copy (todos os tipos)** | Claude Opus 4.6 (Anthropic) | `lib/llm/claude-adapter.ts` |
| **Fallback / contingência** | Mistral Large (declarado, não default) | `lib/llm/mistral-adapter.ts` |
| **Tom / voice validation** | Claude Sonnet 4.6 (LLM-as-judge) | `lib/voice/validator.ts` |
| **Diversidade de ads (cosine similarity)** | text-embedding-3-small (OpenAI) ou embeddings Voyage | `lib/embeddings/embeddings-adapter.ts` |
| **Schema validation (JSON output)** | Zod (TS) | `lib/schema/copy-schemas.ts` |
| **Briefing intake** | Zod schema + reject if invalid | `lib/briefing/parser.ts` |
| **Telemetria** | Langfuse | `lib/observability/langfuse.ts` |
| **Domain layer** | TypeScript puro | `src/domain/copy/` (sem deps externas) |

> **ADR-002-CW:** estratégia de adapters isolando domain de SDKs. Trocar Opus por Mistral = trocar `claude-adapter.ts` por `mistral-adapter.ts` sem tocar domain.
>
> **ADR-003-CW:** contrato JSON estável de output (versionado em `lib/schema/copy-schemas.ts` com `schema_version` em cada artefato) permite handoff seguro para Designer Agent, Webflow publisher, etc.

## 3. Lifecycle (C4)

```
draft (atual, hoje 2026-05-13)
  ↓ [@po-guardian approves outcome + @unit-economist approves C3]
SHADOW (interno, ~semana 2, D8-D14)
  • 60+ execuções coletadas (20 landings, 20 sequences, 20 ads sets)
  • Score eval médio ≥ 7,5/10
  • Sem cobrança (gratuito interno)
  • Foco: validar tom + framework adherence + custo Opus em landing longa
  ↓ [eval pass rate ≥85% + revisão humana 15% sample + C3 confirmado em produção]
ASSISTED (~semana 3-4)
  • Humano aprova cada entregável antes de uso comercial
  • SLA contratual definido (/novais-digital:sla-threshold)
  • Coleta de feedback para refinar voice exemplars
  ↓ [SLA atingido 14 dias consecutivos + tom score médio ≥ 7,8/10]
AUTONOMOUS (~semana 5+)
  • Cobra R$ 80 por entregável aprovado
  • Audit mensal DeepAgent
  • Upsells (landing extendida) habilitados
```

## 4. Unit Economics (C3 — preview, detalhe em unit-economics.md)

```
Preço de venda padrão:        R$ 80,00
Custo máximo aceitável (25%): R$ 20,00
Custo estimado por cenário:
  • Tipo A (landing 1.800 palavras): R$  4,75
  • Tipo B (sequência 4 emails):     R$  3,12
  • Tipo C (5 ads Meta):             R$  2,28
  • Média ponderada (40/35/25):      R$  3,55
Margem média:                  R$ 76,45 (~96%)
```

**Ver `unit-economics.md` para breakdown completo de tokens, embeddings, infra, eval.**

## 5. Telemetry (C6)

- **Langfuse traces:**
  - 1 trace por execução com spans: `briefing_parse`, `framework_planning`, `copy_generation` (×N blocos para landing, ×N para emails), `voice_validation`, `diversity_check` (apenas Tipo C), `schema_validation`
  - Metadata: `tenant_id`, `sku=copywriter-agent`, `output_type` (landing/email/ads), `framework`, `mode` (shadow/assisted/autonomous), `priority`, `briefing_hash`, `upsell_flag`
  - Cost breakdown por span (tokens × preço Opus) + cache hit ratio
  - Latência total + por span (alerta se total > 800s aproximando do SLA)

- **Métricas de negócio:**
  - Entregáveis/dia por tipo, /semana, /mês
  - Custo médio e P99 por tipo
  - Score tom médio, framework adherence, diversidade de ads (Tipo C)
  - SLA achievement rate por tipo
  - Re-roll rate (quantos falham gate de schema/diversidade na primeira tentativa)

- **Alertas:**
  - SLA violation → Slack `#ops`
  - Custo > R$ 15 em landing → Slack `#finance`
  - Tom score < 6/10 → Slack `#brand`
  - Diversidade ads < 0,40 média semanal → Slack `#brand`

## 6. Portability (C7)

**Camadas isoladas:**
1. **Domain** (`src/domain/copy/`) — entidades (`LandingPage`, `EmailSequence`, `AdSet`), regras de framework, validação de estrutura — zero deps externas
2. **Application** (`src/application/copywriter/`) — use cases (`GenerateLanding`, `GenerateEmailSequence`, `GenerateAdSet`), orquestra domain e adapters
3. **Infrastructure** (`src/infrastructure/adapters/`) — adapters para LLMs, embeddings, observability

**Princípio:** trocar Opus por Mistral exige apenas `infrastructure/adapters/llm/`. Schema de output e regras de framework ficam no domain.

**Testes:**
- Domain testado isoladamente (Vitest unit, sem mock de LLM real) — valida regras de schema, completude de blocos
- Application testado com fakes de adapters — simula respostas de LLM
- Infrastructure testado com integração real (Anthropic sandbox + OpenAI embeddings sandbox)

## 7. Tenant context (C8)

**Fase 1 (este SKU):** single-tenant — Novais Digital própria como cliente único. Voice exemplars = the CEO.

**Fase 2 (futura):** multi-tenant via:
- `tenant_id` propagado em toda chamada
- Voice exemplars por tenant (`voices/{tenant_id}/exemplars.yaml`) + frameworks default por tenant
- Limites de uso por tenant (rate limit, custo mensal, quantos upsells/mês)
- Audit trail particionado por tenant

## 8. Dependências externas

| Serviço | Criticidade | SLA conhecido | Fallback |
|---------|:----------:|---------------|----------|
| Anthropic API (Opus 4.6) | 🔴 Crítica | 99.5% | Mistral Large via adapter |
| OpenAI Embeddings (para Tipo C) | 🟡 Importante | 99.9% | Voyage embeddings via adapter |
| Anthropic API (Sonnet 4.6 judge) | 🟡 Importante | 99.5% | Heuristic-based fallback (skip score) |
| Langfuse | 🟢 Não crítica | 98% | Logs estruturados Pino |

## 9. ADRs vinculados

- **ADR-001-CW:** Limitar landing default em 1.500-2.000 palavras + upsell para 2.500-3.500 (+R$ 30) (motivo: C3 + previsibilidade de SLA)
- **ADR-002-CW:** Adapter pattern para LLM e embeddings (motivo: C7 portability — habilita Mistral fallback e Voyage)
- **ADR-003-CW:** Contrato JSON estável versionado para output (motivo: handoff seguro com Designer/Webflow/Flodesk + facilita migração de schema)

## 9.1 Insumos de calibração

- **`tom-brand-voice-ceo.md`** (compartilhado com Social Media Agent) — voice exemplars + 8 dimensões de tom + few-shots. Insumo CRÍTICO para system prompt deste agente também.
- **`frameworks/landing/PAS.md`, `AIDA.md`, `4Ps.md`, `StoryBrand.md`** — templates estruturais (a serem criados na fase de plan).
- **`frameworks/email/soap-opera.md`, `welcome.md`, `re-engagement.md`** — templates de sequência.
- **`frameworks/ads/tree-of-thought.md`** — 5 ângulos × exemplos.

## 10. Aprovações necessárias

- [x] `@po-guardian` valida outcome contratual + schema JSON de output (Seções 1 e 2) — **APPROVED 2026-05-18** (`outcome_clause_id: copywriter-agent.outcome.v1`)
- [ ] `@unit-economist` valida C3 nos 3 tipos (após `unit-economics.md`)
- [ ] `@artifact-architect` valida abstrações + contratos entre agentes (após `plan.md`)
- [ ] Founder aprova preço R$ 80 + upsell de landing extendida (+R$ 30)
