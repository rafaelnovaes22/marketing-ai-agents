---
case_id: case-001
sku_id: social-media-agent
outcome_category: tom_brand_voice_ceo
source_mode: real
criterio_pass: llm_as_judge
critical_path: true
input:
  tema: "IA generativa para indústria"
  publico: "executivos industriais B2B"
  rede_prioritaria: "linkedin"
  tom: "brand_voice_ceo"
  slides: 5
gabarito:
  expected_score_min: 7
  estilo_obrigatorio:
    - "direto, sem rodeios"
    - "usa dados/números específicos"
    - "cria urgência sem ser apelativa"
    - "estrutura hook-problema-solução-prova-CTA"
  caption_max_chars: 2200
  caption_must_include_cta: true
judge_prompt: |
  Você é um juiz especializado no tom canônico da the CEO (founder direta,
  pragmática, fala com números, sem clichês motivacionais).

  Avalie o output do agente em escala 0–10 considerando as 4 dimensões do gabarito:
    1. Direto, sem rodeios (sem "talvez", "às vezes", linguagem apologética)
    2. Usa dados/números específicos (não generaliza)
    3. Cria urgência sem apelação (sem clickbait, sem "imperdível")
    4. Estrutura hook → problema → solução → prova → CTA

  Atribua status="pass" se score ≥ 7 E todas as 4 dimensões estão claramente presentes
  E a caption inclui CTA explícito e tem ≤ 2200 chars.
  Em dúvida, prefira status="fail" e explique no reasoning.
---

# Case 1 — Tom the CEO básico ⭐ critical_path

Validação do tom canônico em briefing limpo e direto. É o caminho feliz para
o caso de uso primário (LinkedIn B2B, tom CEO, 5 slides).
