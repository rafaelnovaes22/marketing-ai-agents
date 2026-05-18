---
case_id: case-020
sku_id: social-media-agent
outcome_category: multi_network_adaptation
source_mode: synthetic
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "Gestão de equipe: autonomia vs controle"
  publico: "donos de pequenas empresas"
  rede_prioritaria: "facebook"
  tom: "brand_voice_ceo"
  slides: 4
gabarito:
  expected_score_min: 6
  formato_facebook:
    texto_mais_longo_que_twitter: true
    menos_formal_que_linkedin: true
    hashtags_min: 1
    hashtags_max: 5
    emojis_opcionais: true
  nao_usar_formato_twitter_thread: true
  caption_max_chars: 2200
judge_prompt: |
  Você é um juiz especializado em adaptação de conteúdo por rede social.

  Avalie o output em escala 0–10 para Facebook — tom intermediário entre
  LinkedIn (formal) e Instagram (visual/casual).

  Características esperadas para Facebook:
    - Texto mais narrativo, menos bullet-point que LinkedIn
    - Linguagem um pouco mais conversacional ("Você já passou por isso?")
    - Emojis opcionais (1-3 para pontuar, não decorar)
    - Hashtags: 1-5 (Facebook não rankeia muito por hashtag)
    - Caption pode ser longa, mas parágrafos menores que LinkedIn

  NÃO deve:
    - Usar formato thread de Twitter (tweets numerados)
    - Ser tão formal quanto LinkedIn
    - Ter 10+ hashtags (Instagram)

  Critérios:
    1. Formato distinguível do LinkedIn (menos formal) e do Twitter (não thread)
    2. Conteúdo central mantido (hook + fatos + contraste + CTA)
    3. Tom da CEO preservado mesmo com adaptação
    4. 1-5 hashtags

  Atribua status="pass" se score ≥ 6 E formato Facebook correto.
---

# Case 20 — Facebook: tom intermediário

Valida adaptação para Facebook — mais conversacional que LinkedIn,
menos visual que Instagram, sem thread de Twitter. Completa cobertura
de 4 redes junto com case-007 (LinkedIn/Instagram/Facebook/Twitter).
