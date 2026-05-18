---
case_id: case-018
sku_id: copywriter-agent
outcome_category: ad_set
source_mode: real
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: ad_set
  product: "Evento online B2B — Acme Day — 1 dia de imersão em IA para founders"
  audience: "founders B2B Brasil com 5-100 funcionários"
  framework: tree_of_thought
  tone: brand_voice_ceo
gabarito:
  ad_count: 5
  angulos_required:
    - pain
    - aspiration
    - fomo
    - authority
    - social_proof
  diversity_required: true
  meta_limits:
    headline_max: 40
    primary_text_max: 125
    description_max: 30
judge_prompt: |
  Avalie o ad set de 5 anúncios para evento B2B no tom the CEO:

  1. Diversidade de ângulos (1-10):
     - Identifique o ângulo de cada anúncio: pain / aspiration / fomo / authority / social_proof
     - Há exatamente 5 ângulos distintos? (1 por anúncio)
     - Há 2 ou mais anúncios com o mesmo ângulo? (problema)

  2. Tom the CEO (1-10):
     - Hooks diretos e impactantes nos primeiros 40 chars?
     - Dados específicos onde cabem (ex: "87% dos founders..." ou "R$2M em pipeline")?
     - CTAs claros no imperativo?

  3. Limites Meta (meça cada campo):
     - Headlines: todos ≤ 40 chars? (HARD LIMIT)
     - Primary texts: todos ≤ 125 chars? (medir exatamente)
     - Descriptions: todos ≤ 30 chars? (HARD LIMIT)

  Retorne JSON:
  {
    "angles_detected": ["pain", "aspiration", "fomo", "authority", "social_proof"],
    "unique_angles": N,
    "all_five_angles_covered": true/false,
    "tone_score": N,
    "headline_lengths": [N, N, N, N, N],
    "headlines_valid": true/false,
    "primary_text_lengths": [N, N, N, N, N],
    "primary_texts_valid": true/false,
    "description_lengths": [N, N, N, N, N],
    "descriptions_valid": true/false
  }

  status="pass" se unique_angles == 5 E all_five_angles_covered == true E tone_score ≥ 7
  E headlines_valid == true E primary_texts_valid == true E descriptions_valid == true.
---

# Case 018 — 5 Ads 5 Ângulos Distintos

Caminho feliz do Tipo C: valida que o agente gera os 5 ângulos canônicos com diversidade real
e respeita os limites de caracteres do Meta Ads.
