---
case_id: case-011
sku_id: copywriter-agent
outcome_category: email_sequence
source_mode: real
criterio_pass: llm_as_judge
critical_path: true
input:
  output_type: email_sequence
  product: "Lançamento Acme Forge — plataforma para construir agentes IA"
  audience: "founders SaaS B2B com 5-50 funcionários"
  framework: soap_opera
  tone: brand_voice_ceo
  email_count: 4
gabarito:
  email_count: 4
  framework_score_min: 7
  tone_score_min: 7
  narrative_continuity_score_min: 7
  subject_length_range: [35, 55]
  body_word_count_range: [280, 420]
  schema_por_email:
    - position
    - subject
    - preview_text
    - body
    - cta
    - send_offset_hours
judge_prompt: |
  Avalie a sequência de 4 emails Soap Opera no tom the CEO:

  1. Framework Soap Opera (1-10):
     - Cada email tem cliffhanger explícito no final?
     - Email N+1 referencia o cliffhanger do email N nas primeiras 3 linhas?
     - Build-up emocional progressivo (tensão aumenta a cada email)?
     - Último email tem revelação/resolução + CTA mais forte da sequência?

  2. Continuidade narrativa (1-10):
     - A história faz sentido do início ao fim?
     - Personagem/situação consistente entre os 4 emails?
     - O leitor tem razão para abrir o próximo email?

  3. Tom the CEO (1-10): direto, dados, urgência genuína, cadência curta-curta-longa

  4. Subjects: meça o comprimento de cada subject em chars. Todos entre 35-55?

  5. Schema por email: cada um tem position, subject, preview_text, body, cta, send_offset_hours?

  Retorne JSON:
  {
    "framework_score": N,
    "narrative_continuity_score": N,
    "tone_score": N,
    "subject_lengths": [N, N, N, N],
    "subjects_valid": true/false,
    "schema_complete": true/false
  }

  status="pass" se framework_score ≥ 7 E narrative_continuity_score ≥ 7 E tone_score ≥ 7
  E subjects_valid == true E schema_complete == true.
---

# Case 011 — Soap Opera 4 Emails the CEO ⭐ critical_path

Caminho feliz do Tipo B: Soap Opera clássico com 4 emails no tom CEO.
Valida cliffhanger→referência→build-up→revelação + subjects dentro do range.
