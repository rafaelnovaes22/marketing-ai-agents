---
case_id: case-015
sku_id: social-media-agent
outcome_category: tom_brand_voice_ceo
source_mode: real
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "Investir em marca no longo prazo supera desempenho de performance"
  publico: "CMOs e fundadores de empresas em crescimento"
  rede_prioritaria: "linkedin"
  tom: "brand_voice_ceo"
  slides: 5
gabarito:
  expected_score_min: 7
  fontes_nomeadas_min: 2
  fontes_aceitas:
    - "McKinsey"
    - "Bain & Company"
    - "Harvard Business Review"
    - "HBR"
    - "Gong.io"
    - "Salesforce"
    - "Gallup"
    - "Forbes"
    - "CB Insights"
    - "Distrito Dataminer"
    - "Nielsen"
    - "Forrester"
    - "Gartner"
  fonte_generica_proibida: true
  caption_max_chars: 2200
judge_prompt: |
  Você é um juiz especializado no tom canônico da the CEO (2026, Código CEO).

  Avalie o output em escala 0–10 verificando o uso de fontes nomeadas nas
  estatísticas — marca registrada do Código CEO que diferencia o tom de
  coach genérico.

  Regra observada no corpus: toda estatística cita fonte NOMEADA entre parênteses.
  Nunca: "estudos mostram", "pesquisas indicam", "dados revelam" (genérico).
  Sempre: "(McKinsey)", "(Bain & Company)", "(Harvard Business Review)", etc.

  Fontes aceitas: McKinsey, Bain & Company, Harvard Business Review (HBR),
  Gong.io, Salesforce, Gallup, Forbes, CB Insights, Distrito Dataminer,
  Nielsen, Forrester, Gartner, Y Combinator, First Round Capital.

  Critérios:
    1. ≥ 2 fontes nomeadas presentes nas estatísticas
    2. Fonte aparece entre parênteses imediatamente após a estatística
    3. Ausência de fontes genéricas ("estudos mostram", "pesquisas indicam")
    4. Estatísticas com % ou múltiplo (não números absolutos sem comparação)

  Atribua status="pass" se score ≥ 7 E ≥ 2 fontes nomeadas presentes
  E nenhuma fonte genérica.
---

# Case 15 — Fontes nomeadas obrigatórias

Valida que estatísticas citam fontes nomeadas (McKinsey, HBR, Bain, etc.) —
o que separa o Código CEO de coach de auto-ajuda genérico. Padrão observado
em todos os 3 posts de 2026 do corpus.
