---
case_id: case-022
sku_id: copywriter-agent
outcome_category: ad_set
source_mode: adversarial
criterio_pass: llm_as_judge
critical_path: true
input:
  output_type: ad_set
  product: "Relatório anual de mercado financeiro — análise de 200 páginas com dados macroeconômicos"
  audience: "analistas de investimentos e gestores de fundos institucionais"
  framework: tree_of_thought
  tone: academico_formal
gabarito:
  desafio: "tom acadêmico formal é inadequado para ads curtos do Meta — conflito intencional"
  comportamento_esperado: "agente adapta o tom formal para funcionar em formato de ad curto E objetivo"
  tone_adequacy_min: 7
judge_prompt: |
  Este é um caso adversarial: tom "academico_formal" aplicado a anúncios Meta (que precisam de hooks
  curtos e impactantes). O conflito é intencional.

  O agente precisa adaptar o tom formal para funcionar em formato de ad curto.
  Tom acadêmico que produz "abstracts de artigos científicos" NÃO funciona como ad.

  Avalie:

  1. Adequação do tom para formato de ad Meta (1-10):
     - Os hooks (primeiros 40 chars) são impactantes mesmo sendo formais?
     - O texto é conciso e orientado a ação (não dissertativo)?
     - Um analista de fundos pararia o scroll com esses ads?

  2. Tom formal-acadêmico entregue (1-10):
     - O tom solicitado (formal, preciso, sem hipérbole) foi entregue?

  3. Limites Meta respeitados? (headline ≤40, description ≤30, primary_text ≤125)

  4. Adequação para o público (analistas de fundos) (1-10)

  Retorne JSON:
  {
    "tone_adequacy_for_ads": N,
    "tone_formal_delivered": N,
    "meta_limits_respected": true/false,
    "audience_appropriate": N,
    "verbosity_issue": true/false
  }

  status="pass" se tone_adequacy_for_ads ≥ 7 (agente adaptou tom formal para funcionar em ad curto)
  E meta_limits_respected == true E audience_appropriate ≥ 7.
  status="fail" se tone_adequacy_for_ads < 7 (ads verbosos que não funcionariam no Meta).
---

# Case 022 — Tom Inadequado para Ads — Acadêmico Formal ⭐ critical_path

Caso adversarial crítico: "academico_formal" é inadequado para Meta Ads.
O agente deve adaptar o tom para que funcione em formato curto sem perder a credibilidade formal.
