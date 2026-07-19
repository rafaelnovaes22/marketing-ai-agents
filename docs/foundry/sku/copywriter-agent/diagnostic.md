---
sku_id: copywriter-agent
sku_version: 0.1.0
project_type: agentic_saas
ai_enabled: true
diagnose_date: 2026-05-13
diagnose_command: "/novais-digital:diagnose copywriter-agent"
po_guardian_status: pending_review
priority: P0
target_implementation_week: 2
---

# Diagnóstico — Copywriter Agent

## 1. Problema do cliente

**Quem:** Founders B2B/B2C em lançamento ou tração inicial que precisam produzir copy de alta conversão (landing pages, sequências de e-mail de lançamento, criativos pagos Meta) sob pressão de calendário comercial.

**Dor concreta:**
- Escrever 1 landing page de conversão decente leva **8-12 horas** de copywriter sênior (research → estrutura → 1ª versão → revisão → ajustes pós-feedback).
- Sequência de lançamento (3-5 emails) consome **6-10 horas** adicionais e raramente sai com framework consistente (PAS, AIDA, hero's journey).
- Bateria de 5 anúncios Meta com ângulos distintos exige **3-5 horas** de bom copywriter mais 1-2 rounds de revisão criativa.
- Custo de mercado: copywriter sênior cobra **R$ 2.500-6.000 por landing**, **R$ 1.200-3.000 por sequência de email**, **R$ 800-2.000 por bateria de ads** — e atrasa, em média, 3-5 dias úteis.
- Variabilidade de qualidade: cada copywriter tem viés de estilo; difícil escalar voz/tom da marca sem treinar humanos por meses.

**Quanto a dor custa:** R$ 25-40k/mês em copy terceirizado para um founder em fase de tração que lança 2-3 campanhas/mês + atraso médio de 4 dias úteis por entrega = janelas comerciais perdidas.

**Como medimos resolução:** 1 entregável de copy (landing OU sequência de 3-5 emails OU 5 variações de anúncio Meta) pronto para revisão final em **≤15 min**, no tom definido, com framework declarado (PAS/AIDA/4Ps/Tree-of-Thought), custo ≤25% do preço.

## 2. Outcome contratual (C2)

**Promessa em uma frase:**
> "Entregar 1 dos três entregáveis de copy — (a) landing page completa (hero + 4-6 seções + CTA, copy puro estruturado em blocos JSON + Markdown), (b) sequência de 3-5 e-mails de lançamento (subject + preview + corpo + CTA por e-mail), OU (c) 5 variações de anúncio Meta (headline + primary text + description) — no tom solicitado, framework declarado, em ≤15 min."

### 2.1 Exemplos verificáveis

✅ **Positivo 1 (landing):** "Landing para curso de IA generativa B2B, público industriais, tom the CEO, framework PAS" → hero + problem + agitation + solution + 3 social proofs + 2 objections + CTA, ~1.800 palavras, tom 8/10, 12m18s.

✅ **Positivo 2 (email sequence):** "Sequência de lançamento 4 emails — curso Novais Digital Foundry, tom direto, framework Soap Opera + One-CTA" → 4 emails (subject + preview + body + CTA), gancho narrativo conectado, 11m44s.

✅ **Positivo 3 (ads Meta):** "5 ads para evento online B2B, ângulos diferentes" → 5 variações (pain, aspiração, FOMO, autoridade, prova social) com headline + primary + description nos limites Meta, 8m20s.

❌ **Negativo 1:** "Escreve uma copy boa pra mim" → REJEITA antes de gastar tokens (outcome vago, exige briefing mínimo: tipo de entregável, produto/oferta, público, framework OU "default").

❌ **Negativo 2:** Landing entregue em 10 min porém sem CTA explícito ou sem hero — NÃO conta (estrutura obrigatória incompleta).

❌ **Negativo 3:** Sequência de 5 emails entregue em 17 min — NÃO conta (SLA violado).

❌ **Negativo 4:** Bateria de ads com 5 variações idênticas em ângulo (ex.: todas em "FOMO") — NÃO conta (Tree-of-Thought exige 5 ângulos distintos).

## 3. ICP fit

**Cabe no ICP?** ✅ Sim — Novais Digital Social tem founder em fase de tração lançando 2-3 campanhas/mês como cliente fase 1 (single-tenant). Fase 2 expande para founders SaaS B2B com pipeline de lançamentos recorrentes.

**Não cabe:** copy regulada (financeira/farmacêutica) que exige aprovação jurídica humana inline, copy puramente literária/editorial (livros, ficção), copy hiper-localizada em micro-segmentos sem dados de público.

## 4. Hipóteses a validar (Week 2 SHADOW)

1. **Claude Opus 4.6 consegue manter framework declarado (PAS/AIDA/4Ps/Soap Opera) por toda extensão de uma landing 1.500-2.000 palavras sem drift?**
   Hipótese: sim, com system prompt estruturado em fases (Chain-of-Thought) e LLM-as-judge ≥7/10 em 20 eval-cases.

2. **Tree-of-Thought para 5 ads Meta produz 5 ângulos efetivamente distintos (cosine similarity entre primary texts ≤0,55)?**
   Hipótese: sim, com prompt explícito de "gere 5 hipóteses de ângulo antes de escrever; cada uma deve estar em uma das 5 categorias [pain, aspiração, FOMO, autoridade, prova social]".

3. **Custo médio por entregável cabe em R$ 20 (25% de R$ 80) considerando que Opus 4.6 é 5× mais caro que Sonnet 4.6?**
   Hipótese inicial: sim com folga para email/ads; landing é o caso crítico (maior volume de output tokens). Prompt caching agressivo (system + framework templates + brand voice) é essencial.

4. **Output estruturado (JSON) por bloco da landing é viável sem prejuízo de qualidade?**
   Hipótese: sim, schema-guided output (JSON com fields `hero`, `problem`, `agitation`, `solution`, `social_proof[]`, `cta`) reduz pós-processamento e facilita handoff para Designer Agent / Webflow adapter.

5. **Modelo único Opus 4.6 cobre os 3 tipos de entregável sem fine-tuning, apenas mudando system prompt?**
   Hipótese: sim, com 3 system prompts versionados (`landing.v1`, `email-sequence.v1`, `ads-meta.v1`) + roteador determinístico baseado em campo `output_type` do briefing.

## 5. Riscos identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| C3 violation em landing longa (>2.500 palavras) — Opus output tokens estouram R$ 20 | 🟡 Média | Bloqueia AUTONOMOUS em outliers | ADR-001-CW: cap em ~2.000 palavras default + upsell para landing extendida |
| Tom inconsistente entre blocos da landing | 🟡 Média | Quebra promessa | Prompt caching de "voice exemplars" + LLM-as-judge por bloco |
| Tree-of-Thought de ads gera 5 ângulos pouco distintos | 🟡 Média | Cliente percebe baixa entrega | Validação automática de cosine similarity ≤0,55 antes de devolver |
| Latência Opus 4.6 em landing longa > 15 min | 🟡 Média | SLA violado | Streaming + paralelização de seções via 2 sub-calls quando possível |
| Câmbio USD/BRL sobe (custo Opus em USD) | 🟡 Média | Margem reduz | Preço em BRL é fixo curto prazo; revisar trimestral |
| Cliente envia briefing vago | 🔴 Alta | Re-roll caro | Briefing schema obrigatório com 5 campos mínimos antes de invocar Opus |
| Handoff para Designer Agent (caso landing precise de hero visual) falha | 🟢 Baixa | UX ruim | Contrato JSON estável entre agentes (ADR-003-CW) |

## 6. Restrições conhecidas

- **Single-tenant fase 1** (C8): apenas Novais Digital própria. Brand voice = the CEO (default) + voices alternativas via prompt parameter.
- **Português brasileiro como primeira língua** (C7): inglês entra na wave 3.
- **Stack Claude Opus 4.6** (definido em project.json): troca de modelo exige ADR. Mistral Large fica como contingência declarada via adapter (C7).
- **Sem geração de imagens neste SKU:** copy puro. Se entregável exigir visual, handoff explícito ao Designer Agent (contrato JSON).
- **Sem publicação automática** neste agente: copy entregue como artefato estruturado; publicação (Webflow/Flodesk/Meta) é responsabilidade de outro agente ou do humano em ASSISTED.

## 7. Próximo passo

→ `/novais-digital:spec --type=platform-sku copywriter-agent`
→ Invocar `@unit-economist` para auditar C3 ANTES de plan — caso crítico é landing longa.
→ Validar com `@po-guardian` a estrutura JSON do output (contrato com Designer/Webflow).
→ Se C3 falhar em landing, criar ADR-001-CW limitando palavras default + upsell.

---

**Aprovação pendente:** `@po-guardian` revisar outcome contratual + ICP fit + contrato JSON do output.
