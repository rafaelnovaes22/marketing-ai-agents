---
sku_id: video-editor-agent
lifecycle_type: agentic
current_stage: draft
created_at: 2026-05-13
last_transition: 2026-05-13
scenario_scope: A_only
---

# Lifecycle Stage — Video Editor Agent

> Append-only log de transições de estado. Versão agentic_saas: SHADOW → ASSISTED → AUTONOMOUS.
> Escopo: **Cenário A apenas** (corte de input). Cenário B diferido — ver `out-of-scope.md`.

## Estado atual

**`draft`** — spec criada, ainda não implementada. ADR-001-VE aprovado (split de SKUs).

## Histórico de transições

| Stage | Data | Aprovador | Gates aprovados | Notas |
|-------|------|-----------|-----------------|-------|
| `(new)` → `draft` | 2026-05-13 | @po-guardian (pending review) | Diagnose + spec + unit-economics + ADR-001-VE | SKU mais apertado da plataforma. Founder aprovou split (R$ 30 corte / R$ 150 premium diferido). |

## Próximas transições previstas

### `draft → SHADOW` (alvo: ~D63, fim da semana 9 do roadmap)

**Gates necessários (6):**

1. [ ] `@po-guardian` revisou e aprovou `spec.md` outcome contratual + split ADR-001-VE
2. [x] `@unit-economist` aprovou `unit-economics.md` (Cenário A APPROVED, Cenário B diferido) — APROVADO 2026-05-13
3. [x] `@artifact-architect` aprovou `plan.md` (C5/C7 + lint no-veo3) — APROVADO 2026-05-13
4. [ ] Eval-suite com ≥ 85% pass rate (`/acme:eval video-editor-agent`)
5. [ ] Coverage Tier B atingido (≥ 85% line, ≥ 80% branch)
6. [ ] **Lint rule no-veo3 ativa em CI** (mecanismo de bloqueio do Cenário B)

**Comando para transição:** `/acme:promote video-editor-agent --to=shadow`

**Quem assina:** `@promotion-officer`

### `SHADOW → ASSISTED` (alvo: ~D70, após 7 dias em SHADOW)

**Gates necessários:**

- 50+ execuções coletadas em SHADOW (vídeos reais teste internos Acme)
- Cut quality score médio ≥ 7,5/10
- Transcription accuracy média ≥ 95%
- Brand consistency média ≥ 95%
- SLA achievement rate ≥ 95% (≤5% das execuções violam 10min)
- 0 incidentes de C3 violation (custo > R$ 7,50)
- 0 invocações Veo 3 detectadas (deve ser estatisticamente impossível com lint, mas monitorar)
- Human review de 20% sample (≥10 vídeos aprovados manualmente)

**Comando:** `/acme:promote video-editor-agent --to=assisted`

**Pré-requisito adicional:** `/acme:sla-threshold video-editor-agent` define SLA contratual.

### `ASSISTED → AUTONOMOUS` (alvo: ~D84, após 14 dias em ASSISTED)

**Gates necessários:**

- 14 dias consecutivos com humano aprovando ≥95% das execuções
- 0 rejeições nos últimos 7 dias
- SLA achievement ≥ 95% sustentado
- Cliente piloto (Acme própria) endossa qualidade dos cortes
- DeepAgent mensal `@reviewer` audit pass (C1-C8)
- Custo médio sustentado ≤ R$ 5,00 (folga de 33% sobre limite C3)

**A partir deste ponto:** sistema cobra R$ 30 por vídeo entregue (Cenário A).

## Rollback

Cada transição pode ser revertida:
- `/acme:promote video-editor-agent --to=shadow` (de ASSISTED ou AUTONOMOUS)
- `/acme:promote video-editor-agent --to=draft` (de SHADOW)

**Quando reverter:**
- Pass rate cai abaixo de 70% por 24h
- Custo médio ultrapassa R$ 7,50 por 3 dias consecutivos
- Transcription accuracy <90% em sample de 10 execuções
- 3+ incidentes de input >90min mal-tratados em uma semana
- DeepAgent mensal reprova auditoria
- **Qualquer invocação Veo 3 detectada → rollback imediato + post-mortem**

## Métricas de saúde por stage

### draft
- Spec aprovada pelo po-guardian ⏳
- Unit economics dentro do limite C3 ✅ (Cenário A)
- Plan aprovado pelo artifact-architect ✅
- Eval-cases definidos ✅
- ADR-001-VE assinado (split) ✅
- ADR-004-VE assinado (cap 90min) ✅
- ADR-005-VE assinado (premium como SKU separado diferido) ✅

### SHADOW
- ≥ 50 execuções/semana coletadas (vídeos teste internos)
- Custo médio rastreado e dentro do esperado (≤R$ 5,00)
- Cut quality score ≥ 7,5 médio
- Transcription accuracy ≥ 95%
- Bugs críticos = 0
- Veo 3 invocations = 0 (gate hard-stop)

### ASSISTED
- Human approval rate ≥ 95%
- Tempo de revisão humana < 5min/vídeo
- Custo médio estável (não-crescente)
- Founder usa output em redes reais (validação qualitativa)

### AUTONOMOUS
- Receita gerada > custo total
- NPS de quem usa ≥ 8
- Audit mensal DeepAgent pass
- Cap de 90min sustentando C3 sem necessidade de surcharge

## Critérios de re-avaliação para Cenário B (`video-editor-agent-premium`)

**NÃO implementar antes de:**
1. Cenário A em AUTONOMOUS estável por ≥30 dias
2. Re-auditoria Veo 3 pricing (next: 2026-08, ver `out-of-scope.md`)
3. Demanda explícita ≥10 clientes pedindo geração from-scratch
4. Aprovação @unit-economist sobre margem aceitável (47% atual vs target 75%)

## Próximo passo

→ Submeter `spec.md` para revisão final de `@po-guardian`
→ Iniciar Wave 1 do plan.md (ElevenLabs Scribe adapter + FFmpeg setup)
→ Garantir lint rule no-veo3 ativa antes de qualquer commit em Wave 2
