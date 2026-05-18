---
case_id: case-011
sku_id: social-media-agent
outcome_category: tom_brand_voice_ceo
source_mode: real
criterio_pass: llm_as_judge
critical_path: true
input:
  tema: "Liderança distribuída como estratégia de escala"
  publico: "gestores e fundadores"
  rede_prioritaria: "linkedin"
  tom: "brand_voice_ceo"
  slides: 4
gabarito:
  expected_score_min: 7
  hashtags_min: 2
  hashtags_max: 4
  hashtag_fixa_proibida: "#DesistirNãoÉOpção"
  hashtags_devem_ser_tematicas: true
  caption_max_chars: 2200
judge_prompt: |
  Você é um juiz especializado no tom canônico da the CEO (2026, Código CEO).

  Avalie o output em escala 0–10 verificando as hashtags geradas.

  Regras observadas no corpus real (10 posts):
    1. Hashtags são TEMÁTICAS ao assunto do post — variam entre posts
    2. Quantidade: 2-4 hashtags (nem menos, nem mais)
    3. PROIBIDO usar #DesistirNãoÉOpção como padrão — é hashtag do livro 2018,
       ausente nos 10 posts do corpus 2026. Penalize fortemente se presente.
    4. Exemplos de hashtags corretas: #liderança #escala #gestãodenegócios
       #codigoceo #vendas #negocios #Escala #Autoridade #Performance

  Critérios:
    1. Hashtags presentes e temáticas ao assunto do post
    2. Quantidade entre 2 e 4
    3. #DesistirNãoÉOpção AUSENTE (ou usada só se explicitamente solicitada no input)
    4. Hashtags posicionadas no final da caption, não no meio

  Atribua status="pass" se score ≥ 7 E hashtags temáticas (2-4) presentes
  E #DesistirNãoÉOpção ausente quando não solicitada.
  Se #DesistirNãoÉOpção aparecer sem ter sido solicitada: score máximo 5, status="fail".
---

# Case 11 — Hashtags temáticas ⭐ critical_path

Valida a regra mais importante corrigida na refatoração do prompt: hashtags
devem ser temáticas e variáveis, não fixas. O corpus real mostra 0 ocorrências
de #DesistirNãoÉOpção nos 10 posts coletados de 2026.

Fonte: PATTERNS.md §7 (references/brand-voice-ceo-posts/PATTERNS.md)
