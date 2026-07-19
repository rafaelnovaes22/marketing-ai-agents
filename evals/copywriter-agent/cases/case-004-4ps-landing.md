---
case_id: case-004
sku_id: copywriter-agent
outcome_category: landing_page
source_mode: synthetic
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: landing
  product: "Curso Novais Digital Foundry para founders B2B"
  audience: "founders early-stage SaaS B2B"
  framework: 4Ps
  tone: brand_voice_ceo
  word_count_target: 1800
gabarito:
  framework_score_min: 7
  tone_score_min: 7
  blocos_4ps:
    - "Promise: clara e mensurável"
    - "Picture: visualização do estado pós-compra"
    - "Proof: social + dados + autoridade"
    - "Push: CTA com urgência"
judge_prompt: |
  Avalie a landing page quanto à aderência ao framework 4Ps (Promise, Picture, Proof, Push):

  1. Promise (1-10): A promessa central é clara e mensurável? Não é vaga ("transforme sua vida")?
  2. Picture (1-10): Cria visualização concreta do estado pós-compra? Há antes/depois ou cena específica?
  3. Proof (1-10): Inclui prova social (depoimentos, números de clientes) + autoridade (quem criou, credenciais)?
  4. Push (1-10): CTA com urgência real (não falsa urgência)? É único e claro?

  Calcule framework_score_avg = média dos 4 sub-scores.

  Tom the CEO (1-10): critério canônico (direta, dados, sem clichê, urgência genuína).

  Retorne JSON:
  {
    "promise_score": N,
    "picture_score": N,
    "proof_score": N,
    "push_score": N,
    "framework_score_avg": N,
    "tone_score": N,
    "weakest_block": "nome do bloco mais fraco"
  }

  status="pass" se framework_score_avg ≥ 7 E todos os 4 sub-scores ≥ 6 E tone_score ≥ 7.
  status="fail" se qualquer sub-score < 6 ou média < 7.
---

# Case 004 — 4Ps Landing

Mesmo produto do case-001 mas com framework 4Ps. Valida que o agente diferencia estruturas
e não entrega PAS rebatizado. Sintético: mesmo produto para isolar a variável framework.
