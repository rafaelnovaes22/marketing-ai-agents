---
case_id: case-028
sku_id: copywriter-agent
outcome_category: instagram_caption
source_mode: real
criterio_pass: llm_as_judge
critical_path: false
ground_truth_post_id: "18108734558305131"
ground_truth_likes: 1182
ground_truth_comments: 133
ground_truth_hook: "O mito do empreendedor-herói está quebrando mais negócios do que crises externas."
ground_truth_format: CAROUSEL_ALBUM
nota: |
  Carousel tem comentário/like ratio muito maior que reels (133 comentários / 1182 likes = 11%).
  Reels têm ratio < 1%. Carousel é o formato de geração de lead via comentário.
  output_type instagram_caption é extensão planejada para integração com social-media-agent.
input:
  output_type: instagram_caption
  topic: "mito destruído — crença comum do empreendedor que prejudica o negócio"
  format: carousel_caption
  tone: brand_voice_ceo
  hook_type: mito_destruido
  include_data: true
  include_cta: true
  cta_keyword: "ESTRUTURA"
  target_engagement: comentarios
gabarito:
  hook_structure: mito_destruido
  hook_max_chars: 100
  mito_named_explicitly: true
  data_sources_min: 1
  data_attributed: true
  consequence_stated: true
  cta_present: true
  closing_question: true
  hashtags: 0
  tone_score_min: 7
  comment_bait: true
judge_prompt: |
  Você é avaliador de copy para Instagram carousel no tom the CEO.
  O post de referência real (1.182 likes, 133 comentários = 11% ratio — excepcionalmente alto)
  usa o hook: "O mito do empreendedor-herói está quebrando mais negócios do que crises externas."

  O formato carousel prioriza engajamento via comentários, não alcance.
  Avalie a caption gerada em 5 dimensões:

  1. Hook mito destruído (1-10):
     - Nomeia explicitamente um mito ou crença comum?
     - Conecta o mito a consequência negativa concreta?
     - Hook ≤ 100 chars?
     - Cria dissonância cognitiva? (leitor acredita no mito → post ameaça essa crença)

  2. Argumento com dado (1-10):
     - Usa dado com número e fonte?
     - O dado reforça o argumento contra o mito (não é dado aleatório)?

  3. Consequência declarada (1-10):
     - O post declara explicitamente o que acontece com quem mantém a crença?
     - A consequência é específica (não "você vai ter problemas")?

  4. Otimização para comentários (1-10):
     - A pergunta de fechamento tem resposta binária fácil? (sim/não ou uma palavra)?
     - O leitor se identifica com o mito descrito (provável de se expor nos comentários)?
     - CTA instrui ação clara nos comentários?

  5. Tom the CEO (1-10):
     - "você" direto?
     - Sem condicional?
     - Zero hashtags?
     - Parágrafos curtos?

  Retorne JSON:
  {
    "hook_score": N,
    "argument_score": N,
    "consequence_score": N,
    "comment_optimization_score": N,
    "tone_score": N,
    "hook_char_count": N,
    "mito_named": true/false,
    "has_closing_question": true/false,
    "hashtag_count": N,
    "breakdown": ["..."]
  }

  status="pass" se hook_score ≥ 7 E argument_score ≥ 7 E consequence_score ≥ 7
  E comment_optimization_score ≥ 7 E tone_score ≥ 7.
---

# Case 028 — Mito Destruído Carousel Instagram

Valida hook "mito destruído" para formato carousel, otimizado para comentários (não alcance).
O ratio 11% comentário/like do post âncora é 10x+ superior ao padrão de reels.
Testa capacidade de gerar copy que provoca identificação + exposição nos comentários.
