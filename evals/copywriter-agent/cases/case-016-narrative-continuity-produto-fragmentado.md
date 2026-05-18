---
case_id: case-016
sku_id: copywriter-agent
outcome_category: email_sequence
source_mode: adversarial
criterio_pass: llm_as_judge
critical_path: true
input:
  output_type: email_sequence
  product: "Bundle completo: Curso Estratégia B2B + Curso Operações e Escala + Mentoria Individual de Gestão"
  audience: "empreendedores querendo escalar negócios de R$1M-10M/ano"
  framework: soap_opera
  tone: brand_voice_ceo
  email_count: 4
gabarito:
  desafio: "produto composto de 3 componentes distintos fragmenta a narrativa Soap Opera"
  narrative_continuity_score_min: 7
  note: "este é o critical path — se o agente não consegue criar narrativa coesa com produto fragmentado, falha no uso-caso mais difícil do Soap Opera"
judge_prompt: |
  Avalie a sequência Soap Opera com produto "bundle" (3 componentes diferentes).

  Este é um caso desafiador: um produto com 3 componentes distintos (estratégia, operações, mentoria)
  pode fragmentar a narrativa — o agente precisa criar um fio condutor único.

  1. Continuidade narrativa (1-10):
     - Há um fio condutor único ao longo dos 4 emails? (uma história, não 3 histórias)
     - Cada email começa referenciando o cliffhanger do anterior?
     - Os 3 componentes do produto são integrados na narrativa ou aparecem como itens de lista?
     - A fragmentação do produto prejudicou a história?

  2. Framework Soap Opera (1-10):
     - Cliffhanger ao final de cada email?
     - Build-up emocional progressivo?
     - Revelação no último email?

  3. Tom the CEO (1-10)

  Retorne JSON:
  {
    "narrative_continuity_score": N,
    "framework_score": N,
    "tone_score": N,
    "fragmentation_detected": true/false,
    "thread_description": "descreva o fio condutor em 1 frase"
  }

  status="pass" se narrative_continuity_score ≥ 7 E framework_score ≥ 7 E tone_score ≥ 7.
  status="fail" se narrative_continuity_score < 7 (fragmentação prejudicou a história).
---

# Case 016 — Continuidade Narrativa — Produto Fragmentado ⭐ critical_path

Caso adversarial crítico: bundle de 3 produtos distintos fragmenta a narrativa Soap Opera.
O agente deve criar um fio condutor único que integre os 3 componentes em uma história coesa.
