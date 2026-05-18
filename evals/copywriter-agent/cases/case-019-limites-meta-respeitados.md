---
case_id: case-019
sku_id: copywriter-agent
outcome_category: ad_set
source_mode: real
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: ad_set
  product: "Software de gestão integrada para pequenas empresas — estoque, financeiro e vendas"
  audience: "donos de PMEs com 5-50 funcionários nos setores varejo e serviços"
  framework: tree_of_thought
  tone: executivo_b2b
gabarito:
  meta_limits_hard:
    headline_max_chars: 40
    description_max_chars: 30
  meta_limits_soft:
    primary_text_recommended: 125
    primary_text_max: 200
  all_hard_limits_respected: true
  note: "foco exclusivo nos limites de caracteres — produto genérico para isolar a variável"
judge_prompt: |
  Avalie o ad set de 5 anúncios Meta verificando conformidade com os limites de caracteres.

  Para cada anúncio, examine visualmente o headline, primary_text e description:
  - Headlines longos (mais de uma linha de texto, muitas palavras) violam o limite ≤40 chars
  - Primary texts muito longos (múltiplos parágrafos ou frases longas) podem violar ≤125 chars
  - Descriptions longos (mais de 4-5 palavras curtas) violam o limite ≤30 chars

  Avalie:
  1. Há headlines que claramente ultrapassam 40 chars? (frases longas com 6+ palavras tendem a violar)
  2. Há primary_texts que claramente ultrapassam 200 chars? (textos com 3+ frases longas tendem a violar)
  3. Há descriptions que claramente ultrapassam 30 chars? (mais de 4 palavras longas tendem a violar)
  4. Qualidade geral dos anúncios (tom executivo B2B, clareza, CTA) (1-10)

  Retorne DIRETAMENTE o JSON (sem texto antes):
  {
    "headline_violations_likely": N,
    "primary_text_violations_likely": N,
    "description_violations_likely": N,
    "quality_score": N,
    "limits_respected_overall": true/false
  }

  status="pass" se limits_respected_overall == true E quality_score ≥ 6.
  status="fail" se há violações claras de hard limits.
---

# Case 019 — Limites Meta Respeitados

Foco em conformidade de caracteres: todos os hard limits do Meta Ads (headline ≤40, description ≤30, primary_text ≤200).
Produto genérico para isolar a variável "limites" sem interferência de ângulo difícil.
