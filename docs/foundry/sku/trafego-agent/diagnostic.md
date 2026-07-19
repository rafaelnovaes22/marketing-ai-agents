---
sku_id: trafego-agent
sku_version: 0.1.0
project_type: agentic_saas
ai_enabled: true
diagnose_date: 2026-05-13
diagnose_command: "/novais-digital:diagnose trafego-agent"
po_guardian_status: pending_review
priority: P1
target_implementation_week: 9
---

# Diagnóstico — Gestor de Tráfego Agent

## 1. Problema do cliente

**Quem:** Founders B2B/B2C que rodam mídia paga em Meta (Facebook + Instagram) com investimento mensal R$ 10k–R$ 100k e dependem de gestor de tráfego humano para criar, monitorar e otimizar campanhas.

**Dor concreta:**
- 1 gestor de tráfego sênior custa **R$ 8.000–R$ 15.000/mês** (CLT ou agência).
- Setup manual de campanha (Campaign + AdSets + Ads + targeting + budget) consome **2–4 horas**.
- Otimização humana acontece **1×/dia (no máximo)** — Meta gera dados a cada 15 min mas nenhum humano monitora 24/7.
- Multi-armed bandit / alocação dinâmica de budget é raramente implementado de forma rigorosa (depende de planilhas e "feeling").
- Founder paga ~R$ 30k/mês de ad spend e ainda mais R$ 10k de gestão → 33% de overhead.

**Quanto a dor custa:** R$ 8–15k/mês fixos + custo de oportunidade (campanhas sub-otimizadas queimam 20–40% do budget conforme benchmark interno Novais Digital).

**Como medimos resolução:** Campanha Meta completa (Campaign + AdSets + Ads + targeting + budget + tracking ativo + bandit configurado) entregue em ≤5 min, com otimização automática a cada 4h, custo de criação ≤25% do preço (R$ 12,50).

## 2. Outcome contratual (C2)

**Promessa em uma frase:**
> "Entregar 1 campanha Meta publicada (1 Campaign + ≥1 AdSet + 3–5 Ads variantes A/B) com targeting completo (audience + geo + age + interests), budget definido, tracking ROAS/CPA/CTR ativo via Mixpanel e otimização automática Multi-Armed Bandit ajustando a cada 4h — em ≤5 min."

**Exemplos verificáveis:**

✅ **Positivo 1:** "Campanha conversão para curso B2B, R$ 200/dia, público founders BR 28–45" → 1 Campaign CONVERSIONS + 2 AdSets (Lookalike 1% + Interesses) + 4 Ads (variantes A/B/C/D recebendo criativo+copy de Designer/Copywriter) + Mixpanel tracking + bandit ativo em 4m12s.

✅ **Positivo 2:** "Campanha tráfego R$ 100/dia para landing de webinar, público amplo SP-RJ 25–55" → 1 Campaign LINK_CLICKS + 1 AdSet + 3 Ads + bandit configurado em 3m48s.

❌ **Negativo 1:** "Roda anúncio aí pra mim" → REJEITA antes de gastar tokens (briefing mínimo exigido: objetivo, budget diário, público-alvo, criativo+copy disponíveis).

❌ **Negativo 2:** Campanha criada em 4 min porém Meta rejeita 3 dos 4 ads por política → NÃO conta como sucesso até retry com criativo alternativo resultar em ≥2 ads aprovados.

❌ **Negativo 3:** Setup completo em 6m30s — NÃO conta (SLA violado).

❌ **Negativo 4:** Campanha publicada mas sem Mixpanel tracking funcionando (events não chegam) — NÃO conta (outcome incompleto, não é otimizável).

## 3. ICP fit

**Cabe no ICP?** ✅ Sim — Founders B2B/B2C com ad spend mensal ≥R$ 10k em Meta. Substitui ou complementa gestor de tráfego humano. SKU integra com Designer + Copywriter (recebe criativo + copy deles) → fecha workflow "post pago end-to-end".

**Não cabe:**
- Contas Meta novas (<30 dias) sem pixel/eventos configurados — exige onboarding manual de tracking.
- Contas com restrição de Special Ad Category (housing, credit, employment, política) — exige humano no loop (compliance).
- Founders que rodam <R$ 3k/mês — overhead da Novais Digital não compensa.
- Plataformas além de Meta (Google Ads, TikTok Ads, LinkedIn Ads) — fora do escopo fase 1.

## 4. Hipóteses a validar (Week 9 SHADOW)

1. **Meta Marketing API é estável o bastante para criação programática de 100 campanhas/mês sem rejeições estruturais?**
   Hipótese: sim para criação; ~5–10% de ads são rejeitados por policy review e exigem retry com criativo/copy alternativo. Necessário ADR-002-TF.

2. **Multi-armed bandit (epsilon-greedy ou UCB1) converge para "winner" em ≤72h com ≥3 variantes e budget R$ 100–300/dia?**
   Hipótese: sim para campanhas com ≥50 conversões/semana. Campanhas de baixo volume (<10 conv/semana) exigem janela maior — bandit pode regredir para A/B test estatístico.

3. **Claude Opus 4.6 gera targeting + estratégia com qualidade ≥7/10 (LLM-as-judge + revisão de gestor humano sample 10%)?**
   Hipótese: sim para públicos com interesses bem documentados na Graph API; públicos nicho exigem fallback para Lookalike + custom audiences existentes.

4. **Custo de criação cabe em R$ 12,50 (25% de R$ 50) considerando bandit roda 6×/dia × 7 dias?**
   Hipótese: sim com folga generosa (~R$ 6,50 estimado). Bandit usa Sonnet/Haiku, não Opus.

5. **Mixpanel attribution captura ≥90% dos eventos de conversão sem perda?**
   Hipótese: sim com Conversions API + browser pixel duplo. Fallback Meta CAPI direto se Mixpanel falhar.

## 5. Riscos identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| **Meta rejeita ads por policy review** | 🟡 Média (5–10%) | Outcome incompleto | ADR-002-TF: retry com criativo alternativo + escalation humana após 2 retries |
| **Meta suspende conta de ads (banimento)** | 🟢 Baixa (<1%) | 🔴 Crítico — paralisa SKU | Múltiplas Business Manager, política de compliance pre-flight check |
| **Mudança breaking na Meta Marketing API** | 🟡 Média (1–2×/ano) | Para SKU dias/semanas | ADR-003-TF: adapter versionado + feature flag por endpoint |
| **Multi-armed bandit não converge (low volume)** | 🟡 Média | Otimização sub-ótima | Fallback para A/B test fixo após 72h sem convergência |
| **Mixpanel attribution falha** | 🟢 Baixa | Bandit decide sem dados | Fallback Meta CAPI insights direto |
| **C3 violation** (custo > R$ 12,50) | 🟢 Baixa | Bloqueia AUTONOMOUS | Estimativa atual R$ 6,50 — folga 48% |
| **Cliente confunde "preço SKU" com "ad spend"** | 🟡 Média | Reclamação / churn | Comunicação explícita: SKU cobra R$ 50 pela CRIAÇÃO/OTIMIZAÇÃO; ad spend é separado e debitado direto do cartão Meta do cliente |
| **Designer/Copywriter Agent não entrega input a tempo** | 🟡 Média | SLA violado | Aceitar criativo+copy pré-existente do cliente como input alternativo |

## 6. Restrições conhecidas

- **Apenas Meta (Facebook + Instagram)** fase 1. Google/TikTok/LinkedIn em waves futuras.
- **Single-tenant fase 1** (C8): única Business Manager (Novais Digital). Multi-tenant exige tenant_id → Meta ad_account_id mapping.
- **Português brasileiro** como mercado primário (geo BR, currency BRL). Internacional em wave 3.
- **Não cobre Special Ad Categories** (housing, credit, employment, política) — compliance exige humano.
- **Stack Claude + Meta Ads API + Mixpanel** (definido em project.json): trocas exigem ADR.
- **Cliente paga ad spend separadamente** — SKU cobra R$ 50 só pela criação+otimização. Ad spend (ex: R$ 30k/mês) sai do cartão Meta do cliente direto.

## 7. Próximo passo

→ `/novais-digital:spec --type=platform-sku trafego-agent`
→ Invocar `@unit-economist` para auditar C3 (estimativa R$ 6,50, folga generosa).
→ Validar com founder a assinatura "criação + otimização separada do ad spend" no contrato.
→ Pre-flight compliance check Meta: documentar política de Special Ad Categories.

---

**Aprovação pendente:** `@po-guardian` revisar outcome contratual + separação contratual entre fee Novais Digital e ad spend do cliente.
