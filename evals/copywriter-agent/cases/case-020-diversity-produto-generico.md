---
case_id: case-020
sku_id: copywriter-agent
outcome_category: ad_set
source_mode: adversarial
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: ad_set
  product: "Desconto de fim de ano — 30% off em todos os planos por tempo limitado"
  audience: "leads que abandonaram o checkout nos últimos 30 dias"
  framework: tree_of_thought
  tone: brand_voice_ceo
gabarito:
  desafio: "produto de desconto genérico tende a produzir 2+ ads similares com ângulo FOMO"
  angles_min_unique: 4
  max_similar_pairs: 1
  diversity_score_min: 6
judge_prompt: |
  Este é um caso adversarial: produto "30% off" tende a produzir anúncios similares com ângulo FOMO repetido.

  Avalie o ad set de 5 anúncios quanto à DIVERSIDADE REAL:

  1. Identifique o ângulo de cada anúncio (pain / aspiration / fomo / authority / social_proof):
     - Ad 1: ângulo = _____
     - Ad 2: ângulo = _____
     - Ad 3: ângulo = _____
     - Ad 4: ângulo = _____
     - Ad 5: ângulo = _____

  2. Quantos ângulos únicos? (mínimo aceitável: 4)

  3. Há pares similares? (mesmo ângulo OU linguagem quase idêntica apesar de ângulo diferente)
     - Sim/Não? Quantos pares?

  4. Diversidade de hooks: cada anúncio começa de forma genuinamente diferente?

  5. Tom the CEO (1-10)

  Retorne JSON:
  {
    "angles_per_ad": ["...", "...", "...", "...", "..."],
    "unique_angles": N,
    "similar_pairs": N,
    "diversity_score": N,
    "tone_score": N
  }

  status="pass" se unique_angles ≥ 4 E similar_pairs ≤ 1 E tone_score ≥ 7 E diversity_score ≥ 6.
  status="fail" se unique_angles < 4 (produto genérico capturou o agente em loop FOMO).
---

# Case 020 — Diversidade com Produto Genérico de Desconto

Caso adversarial: "30% off por tempo limitado" tende a puxar todos os anúncios para ângulo FOMO.
Valida que o agente consegue extrair 4-5 ângulos distintos mesmo de briefing que convida ao FOMO.
