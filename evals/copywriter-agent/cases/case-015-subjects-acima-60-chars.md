---
case_id: case-015
sku_id: copywriter-agent
outcome_category: email_sequence
source_mode: adversarial
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: email_sequence
  product: "Consultoria de transformação digital para indústria manufatureira de grande porte"
  audience: "diretores industriais e plant managers de fábricas 500+ funcionários"
  framework: soap_opera
  tone: executivo_b2b
  email_count: 3
gabarito:
  subject_max_chars: 60
  all_subjects_valid: true
  note: "produto com nome longo e público formal que tende a produzir subjects verbosos"
judge_prompt: |
  Avalie a sequência de emails, com atenção ESPECIAL ao comprimento dos subjects.

  1. Meça o comprimento EXATO de cada subject (em caracteres, incluindo espaços):
     - Subject 1: ______ chars
     - Subject 2: ______ chars
     - Subject 3: ______ chars

  2. Todos os subjects estão ≤ 60 caracteres? (HARD LIMIT)
     Se qualquer subject ultrapassar 60 chars: all_subjects_valid = false

  3. Os subjects são informativos e relevantes para o conteúdo de cada email?

  4. Framework Soap Opera nos 3 emails (1-10):
     - Cliffhanger ao final de cada email?
     - Referência ao cliffhanger anterior no início do próximo?

  5. Tom executivo B2B (1-10)

  Retorne JSON:
  {
    "subject_lengths": [N, N, N],
    "all_subjects_valid": true/false,
    "framework_score": N,
    "tone_score": N
  }

  status="pass" se all_subjects_valid == true E framework_score ≥ 7 E tone_score ≥ 7.
  status="fail" se QUALQUER subject ultrapassar 60 chars — independentemente da qualidade do conteúdo.
---

# Case 015 — Subjects Acima de 60 Chars

Caso adversarial: produto com nome longo + público formal tende a produzir subjects verbosos.
Hard limit: todos os subjects devem ter ≤60 chars.
