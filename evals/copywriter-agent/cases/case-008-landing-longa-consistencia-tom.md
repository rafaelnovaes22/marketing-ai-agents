---
case_id: case-008
sku_id: copywriter-agent
outcome_category: landing_page
source_mode: edge
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: landing
  product: "Plataforma de automação de relatórios financeiros para médias empresas"
  audience: "CFOs e controllers de empresas 100-500 funcionários"
  framework: PAS
  tone: brand_voice_ceo
  word_count_target: 2500
gabarito:
  desafio: "landing acima de 2.000 palavras — risco de drift de voz no 2º terço"
  drift_tolerance: 2
  framework_score_min: 7
  min_tone_per_third: 6
judge_prompt: |
  Avalie esta landing page longa (2.500 palavras) quanto à CONSISTÊNCIA de tom ao longo do texto.

  Divida o texto em 3 partes aproximadamente iguais e avalie cada parte:

  1. Tom do 1º terço (1-10): Tom the CEO detectável? (direto, dados, urgência honesta)
  2. Tom do 2º terço (1-10): Manteve o padrão? Ficou mais genérico ou dissertativo?
  3. Tom do 3º terço (1-10): Recuperou ou manteve?

  Calcule drift_magnitude = max(tone_per_third) - min(tone_per_third)
  Marque drift_detected = true se drift_magnitude > 2

  Avalie também:
  - Framework PAS identificável ao longo do texto (1-10)?
  - Schema completo?

  Retorne JSON:
  {
    "tone_per_third": [N, N, N],
    "drift_detected": true/false,
    "drift_magnitude": N,
    "framework_score": N,
    "schema_complete": true/false
  }

  status="pass" se drift_detected == false E min(tone_per_third) ≥ 6 E framework_score ≥ 7.
  status="fail" se drift > 2 pontos entre terços ou qualquer terço < 6.
---

# Case 008 — Landing Longa — Consistência de Tom

Edge case: landing de 2.500 palavras expõe drift de voz no 2º terço.
Valida que o agente mantém o tom CEO consistente ao longo de copy acima de 2.000 palavras.
