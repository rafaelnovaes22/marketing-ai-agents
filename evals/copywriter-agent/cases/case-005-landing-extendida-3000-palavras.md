---
case_id: case-005
sku_id: copywriter-agent
outcome_category: landing_page
source_mode: synthetic
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: landing
  product: "Programa de Aceleração para SaaS B2B — 6 meses com mentoria semanal"
  audience: "founders SaaS B2B com faturamento R$50k-500k/mês buscando escalar"
  framework: PAS
  tone: brand_voice_ceo
  word_count_target: 3000
  upsell_confirmed: true
gabarito:
  word_count_range: [2700, 3300]
  tone_score_min: 7
  tone_consistency: "sem drift entre 1º e 3º terço"
  framework_score_min: 7
judge_prompt: |
  Avalie esta landing page longa (target: 3.000 palavras) em três dimensões:

  1. Consistência de tom the CEO ao longo do texto (1-10):
     - Divida mentalmente o texto em 3 terços
     - O 1º terço mantém o mesmo estilo direto do 3º terço?
     - Há algum momento em que o texto fica mais "suave", genérico ou clichê?
     - Se detectar drift evidente no 2º ou 3º terço: deduza 2 pontos

  2. Framework PAS em texto longo (1-10):
     - Problem claramente estabelecido com situação concreta?
     - Agitation amplificada com dados do mercado de SaaS B2B?
     - Solution como resolução natural da dor, não lista de features?

  3. Volume (estimativa): o texto está entre 2.700-3.300 palavras?

  Retorne JSON:
  {
    "tone_score": N,
    "drift_detected": true/false,
    "drift_location": "1st/2nd/3rd third or none",
    "framework_score": N,
    "word_count_approx": N,
    "in_range": true/false
  }

  status="pass" se tone_score ≥ 7 E drift_detected == false E framework_score ≥ 7 E in_range == true.
---

# Case 005 — Landing Extendida 3.000 Palavras

Testa o agente em copy longo (upsell_confirmed=true → target 2.700-3.300 palavras).
Risco principal: drift de voz no 2º terço quando o agente "cansa" de manter o tom CEO.
