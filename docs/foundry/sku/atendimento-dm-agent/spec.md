---
sku_id: atendimento-dm-agent
sku_version: 0.1.0
project_type: agentic_saas
ai_enabled: true
criticality: A
current_stage: draft
spec_status: po_guardian_pending
spec_template_used: platform-sku-spec.template.md
created_at: 2026-05-13
last_updated: 2026-05-13
adrs_linked: [ADR-001-DM, ADR-002-DM, ADR-003-DM]
priority: P2
---

# Spec: Atendimento DM Agent

> ⚠️ **Criticality A** — único SKU em tempo real do portfólio. Padrões de honestidade, escalonamento consciente e LGPD são intransigentes.

## 1. Outcome contratual (C2)

### 1.1 Promessa

Para cada DM recebido (Instagram Messaging, Facebook Messenger, WhatsApp Cloud API), entregar de forma 24/7:

- **OUTPUT 1 — Resposta natural em <10s** end-to-end (webhook recebido → mensagem enviada via Meta API).
- **OUTPUT 2 — BANT score atualizado** após cada turno do usuário (Budget, Authority, Need, Timeline; cada dimensão 0-2; confidence 0-1).
- **OUTPUT 3 — Decisão de roteamento:**
  - Se `BANT_qualified=true` (B≥2, A≥1, N≥2, T≥1) **e** confidence ≥ 0.7 → handoff em CRM (deal criado, contato atualizado, owner notificado) → **cobra R$ 5**.
  - Se `confidence < 0.7` **ou** trigger de escalonamento obrigatório → escalonamento humano (Slack + contexto preservado) → **não cobra**.
  - Se `intent = small_talk | spam | bot` → resposta cordial sem qualificar → **não cobra**.

> **Outcome unit cobrado** (`lead_qualificado_dm`): apenas conversas que cumprem todos os 3 critérios (resposta em <10s + BANT qualified + handoff CRM registrado).

### 1.2 Critério de aceite verificável

- [x] Resposta enviada via Meta API com timestamp `sent_at - webhook_received_at ≤ 10000ms` (p95).
- [x] Mensagem retornada pela Meta API com status `delivered` (não apenas `sent`).
- [x] BANT score persistido em Postgres com schema `{B: 0-2, A: 0-2, N: 0-2, T: 0-2, confidence: 0-1, turn: int}`.
- [x] Se qualificado: CRM API retorna 200 + `deal_id`; trace inclui `crm_handoff_success=true`.
- [x] Se escalado: Slack webhook 200 + `escalation_id`; trace inclui `escalation_reason` (low_confidence | hard_trigger | adversarial | error).
- [x] Trace Langfuse com 1 span por turno + 1 trace por conversa; cost breakdown por turno; tenant_id e canal (ig|fb|wa).
- [x] Honestidade gate: respostas que mencionam preço, prazo, condições contratuais OU desconto sem base no tenant context **bloqueiam envio** e forçam escalonamento.

### 1.3 Exemplos

**Positivos (✅ cobram R$ 5):**

1. **Lead qualificado clean (IG DM, 3 turnos, 23h47 sábado):**
   - Usuário: "Oi, vocês fazem tráfego pra ecommerce?"
   - Agent (4.2s): pergunta BANT-N + BANT-T em tom consultivo
   - Usuário: "300k/mês, problema é CAC, quero começar mês que vem"
   - Agent (3.8s): confirma fit + handoff
   - Output: BANT (2,2,2,2) conf 0.93 → HubSpot deal criado, R$ 5 cobrados, p95 turno 4.0s

2. **Lead qualificado WhatsApp Business (5 turnos, horário comercial):**
   - 5 turnos × ~3.5s = todos dentro do SLA
   - BANT (2,1,2,2) conf 0.78 → cobra (acima threshold 0.7)

**Negativos (❌ não cobram):**

1. **Escalonamento consciente:** usuário pede "preço final fechado 12 meses" → trigger de escalonamento obrigatório (ADR-002-DM) → humano assume, agent não cobra
2. **SLA violado:** resposta em 13s (Meta API lenta) → `sla_violated=true`, não cobra mesmo se qualificou
3. **Confidence baixa:** BANT (2,1,2,1) conf 0.62 → abaixo de 0.7, escala humano para confirmar, não cobra
4. **Alucinação detectada:** agent sugere preço sem base → bloqueado por honestidade gate, escala P0, não cobra
5. **Adversarial:** usuário tenta jailbreak ("ignore instruções") → input filter detecta, escala, não cobra
6. **Small talk:** "oi tudo bem?" sem intent comercial → responde cordial mas não qualifica

## 2. Stack técnico (C7 — portability)

| Camada | Provedor | Adapter local |
|--------|----------|---------------|
| **LLM em tempo real** | Claude Haiku 4.5 (Anthropic, streaming) | `lib/llm/claude-haiku-adapter.ts` |
| **Canal Instagram** | Instagram Messaging API (Meta Graph) | `lib/channels/instagram-adapter.ts` |
| **Canal Facebook** | Facebook Messenger Platform | `lib/channels/messenger-adapter.ts` |
| **Canal WhatsApp** | WhatsApp Cloud API (Meta) | `lib/channels/whatsapp-adapter.ts` |
| **Webhook ingress** | API Gateway + Lambda | `src/infrastructure/webhooks/` |
| **CRM (default)** | HubSpot Free | `lib/crm/hubspot-adapter.ts` |
| **CRM (per-tenant injetável)** | RD Station / ActiveCampaign / Salesforce | `lib/crm/{vendor}-adapter.ts` via factory |
| **State de conversa** | Postgres (persistente) + Redis (sessão ativa, TTL 30 min) | `src/infrastructure/state/` |
| **BANT classifier** | Claude Haiku 4.5 (prompt dedicado) | `lib/classifier/bant.ts` |
| **Honestidade / hard triggers** | Regex + Haiku 4.5 classifier | `lib/safety/hard-triggers.ts` |
| **Escalonamento** | Slack Webhook (tenant-specific channel) | `lib/escalation/slack-adapter.ts` |
| **Telemetria** | Langfuse (trace por conversa, span por turno) | `lib/observability/langfuse.ts` |
| **Domain** | TypeScript puro | `src/domain/conversation/` |

> **ADR-002-DM** padroniza adapter pattern por canal e por CRM. Adicionar Telegram = adicionar `telegram-adapter.ts`, sem tocar domain. Trocar HubSpot por RD Station per-tenant = factory recebe `tenant.crm_vendor`.

### 2.1 Fluxo runtime (turno único)

```
Webhook Meta API (ig|fb|wa)
  ↓ [≤ 500ms para Lambda warm]
Input validation + LGPD opt-in check
  ↓
Adversarial / hard-trigger filter (regex + classifier)
  ↓ se trigger → escalonamento Slack → fim
Carregar conversa (Redis hot, Postgres fallback)
  ↓
Prompt cached (system + tenant context + brand voice ~3.5K tokens, 80% hit rate)
  ↓
Claude Haiku 4.5 streaming → resposta + tool_call(update_bant)
  ↓ [target p95 ≤ 5s para LLM]
Honestidade gate (regex de preço/prazo/desconto sem evidência)
  ↓ se bloqueio → escalonamento
Send via Meta API (canal correto)
  ↓ [target p95 ≤ 2s]
Persistir turno + BANT (Postgres) + atualizar Redis
  ↓ async
Se BANT qualified + confidence ≥ 0.7 → CRM handoff + cobrança
```

**Budget de latência (target p95 ≤ 10s):**
- Webhook → Lambda: 0.5s
- State load (Redis): 0.1s
- Safety filters: 0.3s
- LLM (Haiku 4.5 streaming): 5.0s
- Honestidade gate: 0.2s
- Meta API send: 2.0s
- **Total target p95: 8.1s** (buffer 1.9s)

## 3. Lifecycle (C4) — Criticality A exige rito mais conservador

```
draft (atual, 2026-05-13)
  ↓ [@po-guardian + @unit-economist aprovam + tenant assina DPA LGPD]
SHADOW (interno Novais Digital, ≥30 dias — mais longo que B)
  • 500+ conversas reais coletadas
  • Eval BANT vs ground truth humano ≥ 90%
  • Honestidade gate 0 falsos negativos em conversas críticas
  • SLA p95 ≤ 10s em produção real (não só load test)
  • LLM-as-judge naturalidade ≥ 8/10
  • Auditoria 100% manual por humano
  ↓ [todos os critérios passam por 14 dias consecutivos]
ASSISTED (≥30 dias adicionais)
  • Humano revisa CADA resposta antes do envio (window curta — 30s para aprovar/editar)
  • Métricas: aprovação > 95%, edição < 10%
  • Cobrança ainda OFF (gratuito interno)
  ↓ [SLA + qualidade estáveis + audit DeepAgent passou]
AUTONOMOUS
  • Cobra R$ 5 por lead_qualificado_dm
  • Audit DeepAgent semanal + sample manual 10%
  • Kill switch: 3 incidentes graves em 7 dias → rollback automático para ASSISTED
```

## 4. Unit Economics (C3 — preview, detalhe em unit-economics.md)

```
Preço de venda:                R$ 5,00 por lead_qualificado_dm
Custo máximo aceitável (25%):  R$ 1,25
Custo estimado (5 turnos):     R$ 0,27 (5,4% do preço)
Custo pior cenário (20 turnos):R$ 0,80 (16% do preço)
Margem (cenário típico):       R$ 4,73 (94,6%)
```

> Folga **enorme** sobre o C3 limit — Haiku 4.5 + prompt caching agressivo torna o custo dominado por infra, não por LLM. **Ver `unit-economics.md`.**

## 5. Telemetry (C6)

**Modelo de trace:**
- 1 **trace** por conversa (vida útil: do primeiro DM até qualificação OU escalonamento OU TTL 7 dias de inatividade).
- 1 **span** por turno (webhook → resposta enviada) com sub-spans: `safety_filter`, `llm_call`, `honestidade_gate`, `meta_api_send`, `state_persist`, `bant_classify`.
- Metadata por trace: `tenant_id`, `channel (ig|fb|wa)`, `user_external_id` (hash + salt LGPD), `sku=atendimento-dm-agent`, `mode (shadow|assisted|autonomous)`.
- Metadata por span: `turn_number`, `latency_ms`, `tokens_in`, `tokens_out`, `cache_hit_ratio`, `bant_after_turn`, `confidence`.

**Métricas de negócio (Prometheus):**
- DMs/hora, /dia (por canal)
- p50, p95, p99 de latência por turno
- Qualification rate (qualified / total conversas com intent comercial)
- Escalation rate (escalados / total) — target ≤ 15%
- Cost por conversa qualificada (target ≤ R$ 0,80)
- Falsos positivos BANT (audit sample manual)

**Alertas (Slack #ops-realtime):**
- 🔴 p95 latência > 9s por 5 min → P0
- 🔴 Meta API error rate > 5% por 5 min → P0
- 🔴 Honestidade gate triggered > 10× em 1h → investigar prompt drift
- 🟡 Escalation rate > 25% por 1h → revisar threshold
- 🟡 Cost/conversa > R$ 1,00 → revisar prompt caching

## 6. Portability (C7)

**Camadas isoladas:**
1. **Domain** (`src/domain/conversation/`) — entidades `Conversation`, `Turn`, `BantScore`, regras puras
2. **Application** (`src/application/`) — use case `HandleIncomingDm`, orquestra
3. **Infrastructure** (`src/infrastructure/`) — adapters: canais, LLM, CRM, state, telemetria

**Princípios:**
- Trocar Haiku 4.5 → outro LLM = mudar 1 adapter
- Adicionar Telegram = adicionar `telegram-adapter.ts` implementando interface `ChannelAdapter`
- Trocar CRM per-tenant = factory `CrmAdapterFactory.forTenant(tenantId)` resolve em runtime
- Domain testado isoladamente; adapters testados contra sandboxes (Meta Test, HubSpot dev)

## 7. Tenant context (C8)

**Fase 1 (este SKU):** single-tenant (Novais Digital própria), mas **já desenhado multi-tenant-ready** porque é o primeiro SKU vendido como SaaS na wave 2.

**Por-tenant config:**
- `brand_voice.yaml` (tom + frases-chave + proibições)
- `product_catalog.yaml` (produtos + preços baseline + condições) — fonte de verdade do honestidade gate
- `crm_config.yaml` (`vendor: hubspot|rd_station|active_campaign|salesforce`, `api_credentials_secret_ref`, `default_owner_id`)
- `escalation_config.yaml` (`slack_webhook_url`, `business_hours_for_slack_priority`)
- `hard_triggers.yaml` (palavras-chave per-tenant; defaults: "preço final", "fechar contrato", "reclamação", "cancelar", "advogado", "Procon")
- `lgpd.yaml` (`opt_in_required: true`, `retention_days: 90`, `dpa_signed_at`)

## 8. Dependências externas

| Serviço | Criticidade | SLA conhecido | Fallback |
|---------|:----------:|---------------|----------|
| Anthropic API (Haiku 4.5) | 🔴 Crítica | 99.5% | Buffer de retry curto; após 2 falhas → escala humano |
| Instagram Messaging API | 🔴 Crítica | 99% | Queue + retry; se canal down >5min → modo "responderei em breve" via fallback Messenger ou WhatsApp |
| Facebook Messenger | 🔴 Crítica | 99% | Idem |
| WhatsApp Cloud API | 🔴 Crítica | 99.9% | Mais estável dos três; canal-irmão primário |
| HubSpot API (CRM default) | 🟡 Importante | 99.5% | Se down: persiste deal em Postgres queue, sync quando recuperar |
| Slack Webhook (escalonamento) | 🟡 Importante | 99% | Email fallback per-tenant |
| Langfuse | 🟢 Não crítica | 98% | Logs Pino |
| Postgres + Redis | 🔴 Crítica | 99.95% | RDS multi-AZ; Redis com replica |

## 9. ADRs vinculados

- **ADR-001-DM:** Confidence threshold 0.7 para autorresponder/qualificar. Abaixo disso, sempre escalonamento humano. (motivo: criticality A + qualidade CRM)
- **ADR-002-DM:** Lista de gatilhos de escalonamento obrigatório (palavras-chave: "preço final", "fechar", "desconto X%", "Procon", "advogado", "reclamação grave", "cancelar agora", "boleto", "comprovante", etc.). Honestidade > automação. (motivo: criticality A + não-alucinação + LGPD)
- **ADR-003-DM:** Retenção de histórico 90 dias máxima; opt-in LGPD obrigatório na 1ª resposta; direito de esquecimento via comando "esqueça meus dados". Hard cap de 25 turnos por conversa antes de escalar humano. (motivo: LGPD + C3)

## 9.1 Insumos de calibração

- **`bant-rubric.yaml`** (a criar): rubrica detalhada de scoring 0-2 por dimensão BANT com exemplos PT-BR
- **`hard-triggers-pt-br.yaml`** (a criar): lista canônica de gatilhos por idioma
- **`tom-brand-voice-ceo.md`** (reutilizado do social-media-agent): tom-base aplicado também em DMs com ajustes para conversação 1:1
- **`eval-cases/`** (a criar): 100 conversas anotadas (BANT ground truth + decisão correta de escalar) — insumo CRÍTICO para SHADOW

## 10. Aprovações necessárias

- [ ] `@po-guardian` valida outcome contratual + política de não-cobrança em escalonamento (Seção 1)
- [ ] `@unit-economist` valida C3 (após `unit-economics.md`)
- [ ] `@artifact-architect` valida abstração de adapters (channel + CRM) — pós-plan
- [ ] **Founder + DPO** aprovam DPA LGPD + política de retenção 90 dias antes do SHADOW
- [ ] Founder aprova preço R$ 5 por lead_qualificado_dm e política de não-cobrança
- [ ] Founder aprova kill switch (3 incidentes graves em 7 dias → rollback automático)
