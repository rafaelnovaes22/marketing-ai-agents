---
case_id: case-016
sku_id: social-media-agent
outcome_category: multi_network_adaptation
source_mode: synthetic
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "Vender valor ou competir por preço — a escolha define sua margem"
  publico: "empreendedores e autônomos"
  rede_prioritaria: "instagram"
  tom: "brand_voice_ceo"
  slides: 5
gabarito:
  expected_score_min: 7
  formato_instagram:
    emojis_na_caption: true
    hashtags_min: 5
    hashtags_max: 15
    quebras_de_linha_visuais: true
    linguagem_mais_acessivel: true
  nao_confundir_com_linkedin: true
  caption_max_chars: 2200
judge_prompt: |
  Você é um juiz especializado em adaptação de conteúdo por rede social.

  Avalie o output em escala 0–10 verificando se o agente adaptou corretamente
  o conteúdo para INSTAGRAM — formato diferente do LinkedIn.

  Diferenças esperadas para Instagram vs LinkedIn:
    Instagram:
    - Caption com emojis (pelo menos 3-5 nos primeiros parágrafos)
    - Mais hashtags: 5-15 (Instagram rankeia por hashtag, LinkedIn não)
    - Quebras de linha mais frequentes (leitura em mobile)
    - Linguagem um pouco mais acessível/menos formal
    - Slides podem ter mais cor/emoji no texto visual

    LinkedIn:
    - Caption longa, formal, dados+autoridade
    - 2-4 hashtags temáticas
    - Parágrafos mais longos

  Critérios:
    1. Caption com emojis presentes (mínimo 3)
    2. 5-15 hashtags no final da caption
    3. Quebras de linha mais frequentes que no padrão LinkedIn
    4. Mesmo núcleo de conteúdo (fatos, contraste, CTA) mas tom mais dinâmico

  Atribua status="pass" se score ≥ 7 E adaptação Instagram correta (emojis + mais hashtags).
---

# Case 16 — Instagram: formato diferente do LinkedIn

Valida que o agente adapta o formato para Instagram corretamente:
mais emojis, mais hashtags, quebras de linha mais frequentes.
Complementa case-007 (multi_network_adaptation existente).
