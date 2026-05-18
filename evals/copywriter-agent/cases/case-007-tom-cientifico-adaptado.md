---
case_id: case-007
sku_id: copywriter-agent
outcome_category: landing_page
source_mode: adversarial
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: landing
  product: "Protocolo validado clinicamente de reabilitação motora pós-AVC"
  audience: "fisioterapeutas hospitalares em UTIs de reabilitação"
  framework: AIDA
  tone: brand_voice_ceo
gabarito:
  desafio: "conteúdo clínico-científico que naturalmente puxa tom acadêmico formal"
  comportamento_esperado: "agente deve adaptar linguagem científica para o tom CEO — direto, dados, sem jargão não traduzido"
  tone_score_min: 7
  framework_score_min: 7
judge_prompt: |
  Você vai avaliar uma landing page sobre protocolo clínico de reabilitação motora pós-AVC
  escrita no tom the CEO para fisioterapeutas hospitalares.

  Este é um caso difícil: conteúdo científico-clínico tende a ficar acadêmico.
  O agente deve adaptar para tom CEO mantendo credibilidade clínica.

  1. Tom the CEO aplicado a conteúdo clínico (1-10):
     - Manteve linguagem direta e pragmática mesmo com tema clínico?
     - Usa estatísticas clínicas específicas (% de recuperação, tempo, p-value se relevante)?
     - Traduz jargão médico em resultado prático para o fisioterapeuta?
     - Cria urgência sem sensacionalismo clínico?

  2. Framework AIDA (1-10):
     - Attention: captura atenção do fisioterapeuta com dado ou situação de UTI?
     - Interest: contexto clínico relevante desenvolvido?
     - Desire: resultado prático do protocolo para o paciente e para o profissional?
     - Action: CTA adequado para profissional de saúde?

  3. Houve "drift acadêmico"? (o texto ficou mais paper científico do que landing page)

  Retorne JSON:
  {
    "tone_score": N,
    "framework_score": N,
    "academic_drift": true/false,
    "adaptation_notes": "..."
  }

  status="pass" se tone_score ≥ 7 E framework_score ≥ 7 E academic_drift == false.
  status="fail" se o texto ficou acadêmico (drift = true) ou scores < 7.
---

# Case 007 — Tom Científico Adaptado para the CEO

Caso adversarial: conteúdo clínico-científico tende a puxar o tom para acadêmico formal.
Valida que o agente traduz a linguagem científica para o estilo direto CEO sem perder credibilidade.
