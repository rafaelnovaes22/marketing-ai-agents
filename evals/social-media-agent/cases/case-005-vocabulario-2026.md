---
case_id: case-005
sku_id: social-media-agent
outcome_category: tom_brand_voice_ceo
source_mode: real
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "Crescimento sustentável exige estrutura antes de escala"
  publico: "fundadores em estágio de crescimento acelerado"
  rede_prioritaria: "linkedin"
  tom: "brand_voice_ceo"
  slides: 5
gabarito:
  expected_score_min: 7
  vocabulario_2026_min_palavras: 4
  vocabulario_2026:
    - "escala"
    - "estrutura"
    - "margem"
    - "processo"
    - "método"
    - "autonomia"
    - "gargalo"
    - "postura"
    - "presença"
    - "sobrevivência"
    - "decisão de CEO"
    - "mercado não perdoa"
  caption_max_chars: 2200
judge_prompt: |
  Você é um juiz especializado no tom canônico da the CEO (2026, Código CEO).

  Avalie o output em escala 0–10 verificando se o vocabulário-assinatura do
  Código CEO 2026 está sendo usado corretamente.

  Vocabulário esperado (mínimo 4 presentes):
  escala, estrutura, margem, processo, método, autonomia, gargalo, postura,
  presença, sobrevivência, "decisão de CEO", "mercado não perdoa"

  Vocabulário obsoleto (do "CEO livro" 2018-2020 — penalize fortemente):
  "fazer acontecer", "sonhar", "status quo", "jornada empreendedora vencedora",
  "#DesistirNãoÉOpção" (como substituição de conteúdo real)

  Critérios:
    1. ≥ 4 palavras do vocabulário 2026 presentes no output
    2. Vocabulário obsoleto ausente ou raramente presente (máx 1 ocorrência)
    3. Palavras usadas com peso real no argumento, não como enfeite
    4. Tom de gestão/operação, não de autoajuda

  Atribua status="pass" se score ≥ 7 E ≥ 4 palavras do vocab 2026 presentes
  E vocabulário obsoleto ausente.
---

# Case 5 — Vocabulário-assinatura 2026

Valida que o agente usa o vocabulário atual do Código CEO (escala/estrutura/
margem/método/gargalo) e não o vocabulário do livro antigo (sonho/execução/
fazer acontecer). Correção feita na refatoração do prompt baseada no corpus real.
