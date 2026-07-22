---
case_id: case-026
sku_id: copywriter-agent
outcome_category: instagram_caption
source_mode: synthetic
criterio_pass: llm_as_judge
critical_path: false
ground_truth_post_id: "synthetic"
ground_truth_likes: 0  # ilustrativo — corpus sintético
ground_truth_hook: "Você não precisa apagar todos os incêndios da sua empresa."
nota: "output_type instagram_caption é extensão planejada para integração com social-media-agent"
input:
  output_type: instagram_caption
  topic: "delegação e saída do operacional — líder que centraliza trava o crescimento"
  format: feed_image_caption
  tone: brand_voice_ceo
  hook_type: negacao_virada
  include_data: false
  include_list: true
  include_cta: true
  cta_keyword: "ESTRUTURA"
gabarito:
  hook_structure: negacao_virada
  hook_max_chars: 90
  list_items_min: 3
  list_format: "1- / 2- / 3-"
  cta_present: true
  closing_question: true
  hashtags: 0
  tone_score_min: 7
judge_prompt: |
  Você é avaliador de copy para Instagram no tom the CEO.
  O post âncora sintético (ver brand-voice.md) (~28k likes, valor ilustrativo) usa o hook: "Você não precisa apagar todos os incêndios da sua empresa."

  Avalie a caption gerada em 4 dimensões:

  1. Hook negação + virada (1-10):
     - Estrutura "Você não precisa de X" seguida de alternativa positiva?
     - Hook ≤ 90 chars?
     - A negação libera o leitor de uma crença limitante?
     - A virada aponta direção clara?

  2. Estrutura com lista (1-10):
     - Tem ao menos 3 itens em lista numerada formato "1- / 2- / 3-"?
     - Cada item é acionável (verbo no imperativo)?
     - A lista é precedida de setup que cria contexto?
     - A lista é seguida de conclusão que fecha o argumento?

  3. Tom the CEO (1-10):
     - "você" direto, sem impessoal?
     - Cadência curta-curta-longa?
     - Assertivo, sem condicional?
     - Sem hashtags?

  4. CTA e fechamento (pass/fail):
     - CTA com palavra ESTRUTURA em caps?
     - Pergunta final específica que incentiva comentário?
     - Zero hashtags?

  Retorne JSON:
  {
    "hook_score": N,
    "list_score": N,
    "tone_score": N,
    "cta_pass": true/false,
    "hook_char_count": N,
    "list_items_count": N,
    "list_format_correct": true/false,
    "hashtag_count": N,
    "breakdown": ["..."]
  }

  status="pass" se hook_score ≥ 7 E list_score ≥ 7 E tone_score ≥ 7 E cta_pass == true.
---

# Case 026 — Negação + Lista Estruturada Instagram

Valida hook estrutura negação/virada com corpo em lista numerada — segundo formato de maior
performance (~28k likes, valor ilustrativo). Foco em conteúdo educativo acionável sem dados, estruturado em
itens enumerados imperativo.
