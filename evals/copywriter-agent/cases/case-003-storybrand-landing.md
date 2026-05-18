---
case_id: case-003
sku_id: copywriter-agent
outcome_category: landing_page
source_mode: real
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: landing
  product: "SaaS de gestão financeira para clínicas médicas"
  audience: "donos de clínicas médicas 5-30 profissionais"
  framework: StoryBrand
  tone: brand_voice_ceo
gabarito:
  framework_score_min: 7
  tone_score_min: 7
  elementos_storybrand_min: 5
judge_prompt: |
  Avalie a landing page quanto à aderência ao framework StoryBrand (7 elementos):

  1. Avalie cada elemento (presente/ausente + clareza 1-3):
     a. Cliente posicionado como herói (protagonista que precisa de ajuda)?
     b. Produto posicionado como guia (facilitador — NÃO como herói)?
     c. Plano em 3 passos claro e simples?
     d. CTA principal direto e acima da dobra?
     e. CTA transitional (soft — ex: "saiba mais", "ver demo")?
     f. Stakes de fracasso mencionados (o que acontece se não agir)?
     g. Stakes de sucesso visualizados (vida depois da solução)?

  2. Score StoryBrand (1-10): proporção de elementos presentes × clareza

  3. Tom the CEO (1-10): mesmo critério canônico

  Retorne JSON:
  {
    "storybrand_score": N,
    "elements_present": ["a", "b", "c", ...],
    "missing_elements": ["..."],
    "tone_score": N
  }

  status="pass" se storybrand_score ≥ 7 (≥5 elementos claramente presentes) E tone_score ≥ 7.
---

# Case 003 — StoryBrand Landing

Valida o framework StoryBrand: o agente deve posicionar o cliente como herói e o produto como guia.
Produto de gestão para clínicas é terreno neutro — sem viés de autopromoção.
