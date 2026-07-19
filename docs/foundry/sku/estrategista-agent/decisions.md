# Decisions — Estrategista Agent (ADRs locais)

> ADRs específicos deste SKU. Decisões globais do projeto ficam em `docs/foundry/decisions.md` raiz. Convenção de IDs: **ADR-NNN-EST** (EST = Estrategista).

---

## ADR-001-EST — AARRR como framework canônico v1

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C2 (Outcome contratual) + C4 (Verifiable Evaluation)

### Contexto

Diagnóstico de funil pode ser conduzido por múltiplos frameworks:
- **AARRR** (Pirate Metrics): Acquisition → Activation → Revenue → Retention → Referral — Dave McClure, 2007
- **HEART** (Google): SchoolPlatform, Engagement, Adoption, Retention, Task success — UX-centric
- **Pirate Metrics atualizado** (variantes): AAARRR (incluindo "Awareness")
- **North Star Metric Tree** (Amplitude): hierarquia em torno de 1 NSM
- **OMTM** (One Metric That Matters): Lean Analytics, foco em 1 métrica por estágio do negócio

Cada framework tem caso de uso distinto. Suportar todos = explosão combinatorial de prompts + few-shots + eval cases. Suportar nenhum = output não-estruturado, eval impossível.

### Decisão

**AARRR como framework canônico v1.** Único framework suportado no MVP.
HEART e Pirate Metrics atualizado ficam para v2 (escopo wave 2), expostos via flag `framework` no input contratual.

### Motivação

1. **Cobertura:** AARRR cobre ~90% dos casos B2B/B2C SaaS e e-commerce do ICP fase 1.
2. **Maturidade:** framework com 18+ anos de uso, fartura de literatura, exemplos, anti-patterns documentados.
3. **Estrutura simples e auditável:** 5 etapas sequenciais → eval cases mecanicamente verificáveis.
4. **Calibração com few-shots viável:** 15 exemplos curados cobrem o espaço razoavelmente.
5. **Eval-suite tractable:** 22 cases focados em AARRR vs ~80+ cases para cobrir 3 frameworks.

### Consequências

- ✅ MVP entrega valor em 3-4 dias (vs 7-10 dias se 3 frameworks).
- ✅ System prompt do Opus 4.6 enxuto (~6K tokens, 80% cache hit).
- ✅ Eval-cases focados → confidence maior no pass rate.
- ⚠️ Tenants UX-heavy (consumer apps com foco em engajamento) podem pedir HEART — workaround: marcar como "fora do escopo v1, sugerir analista humano OU aguardar v2".
- ✅ Wave 2 (multi-framework) é extensão arquitetural simples: novo prompt + new few-shots + new eval section.

### Re-examinar

- Após 50 diagnósticos em AUTONOMOUS: se >20% dos tenants pedem framework alternativo, priorizar wave 2.
- Se HEART começa a dominar conversas no nicho de produto: antecipar.

---

## ADR-002-EST — Confidence intervals explícitos por recomendação (alta/média/baixa)

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C1 (Diagnose-first / Honestidade) + C4 (Verifiable Evaluation)

### Contexto

LLMs (Opus incluído) têm tendência a apresentar TODAS as recomendações com tom igualmente confiante, mesmo quando o dataset subjacente é fraco ou os padrões observados são marginais. Isso é uma armadilha de honestidade: o tenant pode implementar uma rec "baixa confiança" como se fosse "alta", desperdiçando recursos.

Opções consideradas:
- A) Não declarar confidence — deixar tenant inferir (rejected: tenant não sabe; honestidade comprometida)
- B) Intervalo numérico (ex: 60-80%) — preciso mas falsamente científico para dados ruidosos
- C) **3 níveis qualitativos: alta / média / baixa** com justificativa textual (escolhido)
- D) Bayesian credible intervals — sobre-engenharia para um agente de marketing

### Decisão

Cada recomendação no output **DEVE** ter campo `confidence: alta | média | baixa` com justificativa de 1 frase explicando por quê (ex: "alta — dataset de 180 dias com padrão consistente em 12 cohorts"; "baixa — apenas 35 dias de dados, padrão pode ser ruído sazonal").

**Regra de ouro:** se nenhuma das 3 recomendações atinge `confidence ≥ média`, o agente **declara "dados insuficientes para 3 recomendações confiáveis"** e entrega só 1-2 fundamentadas, **sem completar com placeholders genéricos**.

### Motivação

1. **Honestidade C1:** alinha com constraint constitucional de não inventar certeza onde não há.
2. **Tenant ganha contexto para priorizar:** implementa primeiro recs `alta`, deixa `baixa` para experimentação.
3. **Calibração mecanicamente auditável:** eval cases adversariais (Seção D do eval-cases.md) forçam Opus a usar cada nível.
4. **Custo zero adicional:** 3 tokens extras por rec no output.
5. **Qualitativo > quantitativo:** dados de funil são frequentemente ruidosos; intervalos numéricos dariam falsa precisão.

### Consequências

- ✅ Eval cases 18, 19, 20 (adversariais) garantem calibração mecânica.
- ✅ Cliente pode priorizar implementação.
- ✅ Reduz risco de "recomendação baixa confiança implementada como alta" → menos arrependimento.
- ⚠️ Few-shots têm que cobrir explicitamente os 3 níveis (responsabilidade Wave 5).
- ⚠️ Tenants pode acharem "agente inseguro" se muitas `baixa` aparecerem — mitigação: educar via copy do relatório.

### Re-examinar

- Após 30 diagnósticos: se distribuição de confidence é ~70% alta, 25% média, 5% baixa → ok.
- Se distribuição vira 95% alta → Opus não está calibrando, voltar para few-shots adversariais.
- Se distribuição vira 50% baixa → ICP miss ou pre-check fraco demais.

---

## ADR-003-EST — Pre-check de qualidade de dados como gate constitucional

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C1 (Diagnose-first / Honestidade) + C3 (Unit Economics)

### Contexto

Tentar fazer análise estatística com poucos dados é academicamente errado (intervalos de confiança explodem) e pragmaticamente desperdício (gasta tokens Opus para entregar análise frágil que o tenant não deveria implementar).

Sem pre-check, o agente:
- Gasta tokens Opus tentando "tirar leite de pedra"
- Entrega recomendações de baixa qualidade (mascaradas como `alta` por falta de calibração)
- Cliente implementa decisões erradas
- Custo médio sobe (R$ 13 → R$ 18+) sem entregar valor

### Decisão

**Gate constitucional ANTES de qualquer chamada Opus:**

```
SE days_of_data < 30 OU active_users_in_period < 100:
  → RECUSA explícita com mensagem amigável
  → ZERO tokens Opus gastos
  → Custo total ≤ R$ 0,15 (apenas 2 queries Mixpanel)
  → NÃO cobra do tenant

SE tracking de evento crítico AARRR ausente (Activation):
  → RECUSA com sugestão de tracking setup
  → ZERO tokens Opus

SE tracking parcial (ex: Revenue não tracked):
  → PROSSEGUE com warning explícito
  → Recs de domínio sem tracking marcadas confidence: baixa
```

**Thresholds:** **≥30 dias E ≥100 usuários ativos** no período. Calibrados em pesquisa de literatura de analytics (Lean Analytics + Refoundry curriculum) — abaixo disso, padrões observados são frequentemente artefatos.

### Motivação

1. **Honestidade C1:** alinhado com constraint "se dados <30 dias OU <100 usuários ativos → recusa explícita, não tenta o que dá".
2. **Unit economics C3:** Cenário C (recusa) custa R$ 0,15. Cenário A (análise completa) custa R$ 13. Economia ~99% em casos sem dados.
3. **Proteção do tenant:** evita que cliente implemente decisões erradas baseadas em dados frágeis.
4. **Sinal de ICP fit:** rejection rate >25% sustentado = ICP miss (tenants do plano errado); rejection 10-15% = ICP saudável.

### Consequências

- ✅ Custo médio do SKU permanece em R$ 13 mesmo com mix de tenants imaturos.
- ✅ Mensagem de recusa pode incluir CTA upstream ("contrate setup de tracking primeiro").
- ✅ Pre-check rejection rate vira métrica de produto/growth (alerta >25% no Slack #growth).
- ⚠️ Tenants podem reclamar "paguei e foi recusado" — mitigação: NÃO cobra em caso de rejeição (cenário C unit-economics).
- ⚠️ Thresholds 30d/100u podem ser questionados — ajustes ficam dentro de novo ADR-005-EST se necessário.

### Re-examinar

- Após 100 diagnósticos: validar se 30d/100u realmente é o threshold certo (talvez seja 45d/200u?)
- Se rejection rate sustentadamente >25%: revisar ICP ou educação de funnel/onboarding upstream.
- Se rejection rate sustentadamente <5%: thresholds podem estar baixos demais.

---

## ADR-004-EST — Output Markdown v1, HTML/dashboard interativo v2

**Status:** ✅ Aceito 2026-05-13 — **decisão founder pendente confirmação final**
**Princípio relacionado:** C2 (Outcome contratual) + C3 (Unit Economics)

### Contexto

O relatório de diagnóstico pode ser entregue em múltiplos formatos:
- **Markdown** simples (texto + headers + tabelas)
- **HTML estático** (com cores, gráficos como SVG/PNG)
- **Dashboard interativo** (React/Vue, drill-down em cohorts, comparações)
- **PDF** (Markdown → PDF pipeline)

Founder mencionou interesse em HTML/dashboard durante diagnóstico inicial. Decisão fica em aberto até validação.

Opções consideradas:
- A) **Markdown v1, HTML/dashboard v2** (escolhido)
- B) HTML estático v1 (rejected: complexity sobe sem clear value-add quando o conteúdo é o que importa)
- C) Dashboard interativo v1 (rejected: 3× o trabalho de implementação; risco de atrasar promoção)

### Decisão

**v1: Markdown puro como output contratual.**
- Entregue como string Markdown via API
- Renderizável em Notion, ClickUp, e-mail, qualquer ferramenta
- Custo de renderização: R$ 0 (sem LLM, sem rendering pipeline)

**v2 (futuro, não bloqueante MVP): HTML/dashboard interativo.**
- Adapter de renderer separado (`OutputRenderer` port em `src/domain/funnel/ports/`)
- Markdown vira "JSON estruturado intermediário" que pode alimentar qualquer renderer
- Decisão fica aberta para wave 2 conforme feedback dos tenants piloto

### Motivação

1. **MVP rápido:** Markdown elimina 1-2 dias de trabalho frontend (chart libs, theming, deploy).
2. **Universalidade:** Markdown abre em qualquer ferramenta que o tenant use (Notion, Slack, e-mail).
3. **Unit economics C3:** zero custo adicional de render. HTML/dashboard adicionaria infra (CDN, storage, signed URLs).
4. **Conteúdo > forma no MVP:** se as 3 recs são acionáveis e os números são honestos, Markdown comunica isso fine.
5. **Reversibilidade:** v2 dashboard é extensão arquitetural simples (adapter de renderer); domínio não muda.

### Consequências

- ✅ Wave 5 ship em 1 dia (não 3).
- ✅ Output portável (Markdown copia-e-cola em qualquer lugar).
- ✅ Custo de output: R$ 0 (renderer determinístico CPU only).
- ⚠️ Tenants visuais podem achar "menos premium" — mitigação: branding sutil no header + tabela bem formatada.
- ⚠️ Founder pode mudar de ideia se feedback for "queria dashboard" — re-examinar em wave 2.
- ✅ Estrutura intermediária JSON facilita v2 sem refactor de domain.

### Re-examinar

- **Decisão founder explícita pendente:** confirmar Markdown v1 antes do início da Wave 5.
- Após 30 diagnósticos em SHADOW: coletar feedback "formato adequado?". Se ≥30% pede mais visual → priorizar v2.
- Se um tenant enterprise pagar premium por dashboard: antecipar wave 2.

---

## Princípios para futuros ADRs

- **Numeração:** ADR-NNN-EST sequencial
- **Status:** Proposto | Aceito | Rejeitado | Substituído por ADR-XXX-EST
- **Estrutura:** Contexto → Decisão → Motivação → Consequências → Re-examinar
- **Quando criar:** mudança arquitetural OU trade-off significativo (não toda decisão trivial)

## ADRs antecipados (provavelmente surgirão)

- **ADR-005-EST:** Como lidar com tenant-specific event mapping (cada Mixpanel project usa nomes diferentes) — calibração via `config/tenants/{id}/event-mapping.yaml` ou ML-based?
- **ADR-006-EST:** Cache TTL diferenciado por janela (24h período encerrado / 1h período corrente) — confirmar valores após 100 execuções.
- **ADR-007-EST:** Multi-tenant fase 2 — particionamento de cache + audit + rate limit.

## Próximo passo

→ Confirmar com founder ADR-004-EST (Markdown v1)
→ Criar few-shot-examples.md alinhado com ADR-001-EST (AARRR) e ADR-002-EST (3 confidence levels)
→ Iniciar Wave 1 do plan.md
