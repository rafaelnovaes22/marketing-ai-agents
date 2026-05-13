---
sku_id: social-media-agent
sku_version: 0.1.0
project_type: agentic_saas
ai_enabled: true
diagnose_date: 2026-05-13
diagnose_command: "/acme:diagnose social-media-agent"
po_guardian_status: pending_review
priority: P0
target_implementation_week: 1
---

# Diagnóstico — Social Media Agent

## 1. Problema do cliente

**Quem:** Founders B2B/B2C que postam em redes sociais ≥3x/semana e precisam de operação consistente com tom de voz definido.

**Dor concreta:**
- Criar 1 carrossel de qualidade manualmente leva **4-6 horas** (briefing → texto → design → revisão → upload em 4 redes).
- Brand consistency cai depois de 20-30 posts por fadiga humana (~70% manual vs 99% AI-validated).
- Custo operacional: 1 designer + 1 social media manager = R$ 33.000/mês para 52 posts/mês (R$ 635/post).
- Atrasos comprometem calendário editorial → perda de relevância em jornadas sazonais.

**Quanto a dor custa:** R$ 33.000/mês operacional + custo de oportunidade (posts não publicados = leads não capturados).

**Como medimos resolução:** carrossel publicável (4-5 slides + caption + legenda) entregue em ≤8 min, brand 99%+, custo ≤25% do preço.

## 2. Outcome contratual (C2)

**Promessa em uma frase:**
> "Entregar 1 carrossel (4-5 slides JPG 1080×1080 + caption ≤2200 chars + legendas por rede) no tom the CEO, brand Acme 99%+, pronto para publicar em LinkedIn / Instagram / Facebook / Twitter, em ≤8 min."

**Exemplos verificáveis:**

✅ **Positivo 1:** "Carrossel sobre IA generativa para industriais, tom the CEO" → 5 slides com hook + benefit + social proof + CTA + assinatura, brand 99%, 7m12s.

✅ **Positivo 2:** "Carrossel sobre lançamento de produto B2B SaaS, foco em early adopters" → 4 slides com problema + solução + diferencial + CTA, brand 99%, 6m44s.

❌ **Negativo 1:** "Faz alguma coisa bonita sobre IA" → REJEITA antes de gastar tokens (outcome vago, exige briefing mínimo de 3 campos: tema, público, rede).

❌ **Negativo 2:** Carrossel entregue em 6 min porém com 2 slides off-brand (cor errada, tipografia divergente) — NÃO conta como sucesso (brand <99%).

❌ **Negativo 3:** 5 slides perfeitos entregues em 12 min — NÃO conta (SLA violado).

## 3. ICP fit

**Cabe no ICP?** ✅ Sim — Acme Social posicionado como SaaS² para founders B2B/B2C que precisam manter presença consistente sem time operacional.

**Não cabe:** influencers que precisam de tom estritamente pessoal (não escalável via prompt engineering), agências com brand de cliente final (escopo single-tenant fase 1).

## 4. Hipóteses a validar (Week 1 SHADOW)

1. **Tom the CEO é replicável por Claude Sonnet 4.6 com prompt-engineered system prompt?**
   Hipótese: sim, com 30+ exemplos curados + LLM-as-judge ≥7/10 em 20 eval-cases.

2. **Brand consistency atinge 99%+ usando Imagen 4 + brand_guide.yaml + validação Claude Sonnet 4.6 vision?**
   Hipótese: sim para 80% dos casos com Imagen 4; Ideogram v2 cobre 20% (slides com texto destacado).

3. **Custo médio por carrossel cabe em R$ 3,00 (25% de R$ 12)?**
   Hipótese inicial: NÃO com 7 slides (~R$ 3,20). Provável ADR-001-DS reduzindo para 4-5 slides default.

4. **Adapter pattern Zernio publica em 4 redes sem ajuste manual?**
   Hipótese: sim para LinkedIn/IG/FB; Twitter exige formato compacto adicional (thread mode).

## 5. Riscos identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| C3 violation (custo > R$ 3) | 🔴 Alta | Bloqueia AUTONOMOUS | ADR-001-DS: reduzir slides default + upsell para 6-7 |
| Imagen 4 rejeita prompts com brand reconhecível | 🟡 Média | Atrasa 1 dia | Ideogram fallback (já planejado) |
| Tom the CEO não replicável consistently | 🟡 Média | Quebra promessa | LLM-as-judge ≥7/10 + curadoria humana SHADOW |
| Zernio API rate limit em pico | 🟢 Baixa | Latência ocasional | Queue + retry com backoff exponencial |
| Twitter exige formato thread | 🟡 Média | Adaptação extra | Adapter `lib/social-publishers/twitter.ts` com modo thread |

## 6. Restrições conhecidas

- **Single-tenant fase 1** (C8): apenas Acme própria. Multi-tenant entra na wave 2 do consumer.
- **Português brasileiro como primeira língua** (C7): adapter para outros idiomas só na wave 3.
- **Stack Claude + Google + Meta + Zernio** (definido em project.json): trocas exigem ADR.

## 7. Próximo passo

→ `/acme:spec --type=platform-sku social-media-agent`
→ Invocar `@unit-economist` para auditar C3 ANTES de plan.
→ Se C3 falhar, criar ADR-001-DS reduzindo slides default.

---

**Aprovação pendente:** `@po-guardian` revisar outcome contratual + ICP fit.
