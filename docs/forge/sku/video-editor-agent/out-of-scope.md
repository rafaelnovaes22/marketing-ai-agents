---
sku_id: video-editor-agent
out_of_scope_for: video-editor-agent-premium
status: DEFERRED_TO_WAVE_2
deferred_by: "@unit-economist (audit) + @po-guardian (split) + Founder (approval)"
deferred_date: 2026-05-13
linked_adr: [ADR-001-VE, ADR-005-VE]
review_due: 2026-08-13
---

# Out of Scope — video-editor-agent-premium (DIFERIDO)

> ⚠️ Este documento registra o **diferimento explícito** do SKU `video-editor-agent-premium` (R$ 150 — Cenário B Veo 3 from-scratch) para wave 2 do consumer Acme Social.
>
> **Não criar arquivos `docs/forge/sku/video-editor-agent-premium/` nesta wave.**

## O que está diferido

### SKU `video-editor-agent-premium` (R$ 150)

**Outcome diferido:**
> "Gerar vídeo curto 30-90s do zero a partir de briefing textual, usando Veo 3 (com áudio nativo) ou Runway Gen-4.5 (fallback), em 3 aspect ratios + legendas em 5 idiomas."

**Cenário de uso (Cenário B):**
- Founder envia **briefing textual** (sem vídeo-fonte)
- Agente gera vídeo do zero via Veo 3 (até 30-60s)
- Compõe com FFmpeg em 3 aspect ratios
- Adiciona legendas em 5 idiomas (PT, EN, ES, FR, IT)

## Por que está diferido

### 1. Economia ainda inviável (C3 violation)

`unit-economics.md` Seção 4 documentou:

| Item | Valor |
|------|------:|
| Custo Veo 3 (30s × $0.50/seg) | R$ 79,50 |
| Custo total Cenário B | R$ 80,71 |
| Preço sugerido SKU premium | R$ 150 |
| Margem | **47%** (viola regra dos 25% — limite seria preço R$ 320+) |

**Margem 47% é insuficiente** para sustentar operações com risco de:
- Câmbio USD/BRL subindo
- Veo 3 ainda em beta (preço pode subir)
- Retries de geração custam caro (1 retry = R$ 79 extra)

### 2. Veo 3 em beta com waitlist

- Acesso restrito (waitlist Google)
- Preços não-finais
- Quota limits imprevisíveis
- Risco operacional alto para SKU comercial

### 3. Demanda não-validada

- ICP Acme Social é founders que já produzem vídeo (palestras, lives, podcasts)
- 80% dos casos cobertos por Cenário A (corte de input existente)
- Nenhuma evidência de demanda forte por Cenário B no momento

### 4. Speed-to-market (foco wave 1)

- Implementar 2 cenários simultaneamente atrasaria entrega do SKU R$ 30
- Cenário A é viável HOJE — não bloquear por Cenário B premium
- Aprendizados de Cenário A em produção informam decisões de Cenário B

## Critérios de re-ativação (revisão 2026-08-13)

Trigger de ativação (qualquer um basta para reabrir avaliação; **todos** necessários para implementar):

| Critério | Status atual | Trigger |
|----------|:------------:|---------|
| **Cenário A em AUTONOMOUS estável** | ⏳ pendente | ≥30 dias em AUTONOMOUS com SLA ≥95% |
| **Veo 3 preço** | $0.50/seg | Cair ≥50% (≤$0.25/seg) |
| **Demanda explícita** | 0 pedidos | ≥10 clientes pedindo Cenário B |
| **@unit-economist re-audit** | reprovado | Re-aprovar com margem ≥75% no preço viável |
| **Veo 3 sai do beta** | beta | Status GA + SLA contratual ≥99,5% |

## Alternativas avaliadas (e rejeitadas)

### Alternativa A — Implementar atrás de feature flag no SKU R$ 30
**Rejeitada:** ADR-001-VE + ADR-005-VE — risco de cliente acionar acidentalmente (R$ 80 custo vs R$ 30 preço = perda R$ 50/exec)

### Alternativa B — Cobrar R$ 150 e aceitar margem 47% como exceção
**Rejeitada:** viola C3 + sem demanda comprovada justifica o risco econômico

### Alternativa C — Composição de clips Veo 3 de 5s (reduz custo)
**Considerada — não implementada agora:**
- 30s = 6 clips × 5s = 6 × R$ 13,25 = R$ 79,50 (mesmo custo, mais complexidade)
- 1 clip 5s + extensão FFmpeg loop = qualidade baixa
- **Re-avaliar em 2026-08** com Veo 3 GA

### Alternativa D — Usar apenas Runway Gen-4.5 ($0.05/seg)
**Considerada — não implementada agora:**
- 30s × $0.05 = $1.50 = R$ 7,95 (viável!)
- Mas perde áudio nativo (diferencial)
- Pode virar SKU intermediário R$ 60 ("vídeo gerado sem áudio")
- **Re-avaliar quando Cenário A estabilizar**

## O que NÃO fazer durante wave 1 (consumer)

🚨 **Proibições explícitas:**

1. ❌ NÃO criar arquivos em `docs/forge/sku/video-editor-agent-premium/`
2. ❌ NÃO criar adapter `src/infrastructure/adapters/video-gen/veo3-adapter.ts`
3. ❌ NÃO criar adapter `src/infrastructure/adapters/video-gen/runway-adapter.ts`
4. ❌ NÃO importar SDKs Vertex AI (módulo Veo) ou Runway em qualquer camada
5. ❌ NÃO adicionar entry em `project.json` para `video-editor-agent-premium`
6. ❌ NÃO mencionar Cenário B em comunicação de marketing como "em breve" (apenas "wave 2 futura")

🛡️ **Mecanismos de enforcement:**

- **Lint rule custom** (Wave 2 T2.14 do tasks.md): bloqueia qualquer import de `video-gen/*`
- **CI gate:** `grep -r "video-gen\|veo3\|runway" src/` retorna 0 matches durante esta wave
- **Alerta Slack `#finance` CRITICAL:** se algum trace Langfuse mostrar `provider: veo3` ou `runway` durante esta wave
- **Pre-merge check** (`/acme:pre-merge-check`): incluir verificação no-veo3

## Roadmap de re-avaliação

```
2026-05-13 (HOJE)
  → Diferimento aprovado, this doc criado
  → Wave 1 consumer foca apenas Cenário A (R$ 30)

2026-05 a 2026-07 (próximos 3 meses)
  → Cenário A em SHADOW → ASSISTED → AUTONOMOUS
  → Monitorar pedidos de Cenário B em backlog
  → Acompanhar pricing Veo 3 (mensalmente)

2026-08-13 (REVIEW_DUE)
  → @unit-economist re-audit Veo 3 economics
  → @po-guardian valida demanda de mercado
  → Founder decide:
      (a) Implementar video-editor-agent-premium (criar tasks-tree completa)
      (b) Manter diferido +3 meses (re-review 2026-11-13)
      (c) Cancelar definitivamente (e.g., concorrente resolveu, mercado mudou)

2026-11-13 (REVIEW se mantiver diferido)
  → Mesmo ciclo de avaliação
```

## Sinais que justificam ativação ANTECIPADA (antes 2026-08)

⚡ **Reabrir avaliação imediatamente** se:

- Veo 3 lançar pricing GA com >50% redução
- 5+ clientes em 30 dias pedirem Cenário B com orçamento aprovado
- Concorrente direto lançar feature equivalente (risco competitivo)
- Runway Gen-4.5 ganhar áudio nativo (muda economics drasticamente)

## Comunicação ao cliente / pricing page

**Versão pública:**
> "Acme Social Video Editor (R$ 30) edita seus vídeos longos em clips prontos para todas as redes. Geração de vídeo do zero via IA está em nosso roadmap para 2026 H2 — entre em contato se precisar antecipadamente."

**Versão interna (vendas):**
> Cenário B não disponível na wave 1. Se cliente insistir em Veo 3 geração nova:
> 1. Capturar requisitos exatos (duração, frequência, budget)
> 2. Adicionar ao backlog `video-editor-agent-premium` (Notion/ClickUp)
> 3. Avisar founder se for grande conta (>R$ 5K/mês potencial)
> 4. NÃO prometer prazo até re-avaliação 2026-08

## Referências

- ADR-001-VE (split de SKUs)
- ADR-005-VE (premium como SKU separado)
- `unit-economics.md` Seção 4 (breakdown Cenário B)
- `unit-economics.md` Seção 8 (decisão @unit-economist)
- `lifecycle-stage.md` Seção "Critérios de re-avaliação para Cenário B"

## Próximo passo

→ Manter este documento atualizado a cada revisão (append-only)
→ Em 2026-08-13: criar issue "Re-avaliação video-editor-agent-premium" 30 dias antes
→ NÃO criar pasta `video-editor-agent-premium/` antes da decisão formal de ativação
