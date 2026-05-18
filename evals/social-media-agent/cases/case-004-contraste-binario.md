---
case_id: case-004
sku_id: social-media-agent
outcome_category: tom_brand_voice_ceo
source_mode: real
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "Marketing sem método é custo, não investimento"
  publico: "empreendedores e gestores de marketing"
  rede_prioritaria: "linkedin"
  tom: "brand_voice_ceo"
  slides: 5
gabarito:
  expected_score_min: 7
  contraste_binario_obrigatorio: true
  formulas_aceitas:
    - "X sem Y é Z"
    - "Não é X. É Y."
    - "Antes era X. Agora é Y."
    - "Quem A, B. Quem C, D."
  posicao_esperada: "próximo ao final, antes do CTA"
  caption_max_chars: 2200
judge_prompt: |
  Você é um juiz especializado no tom canônico da the CEO (2026, Código CEO).

  Avalie o output do agente em escala 0–10 com foco no contraste binário —
  recurso retórico obrigatório no Código CEO.

  Critérios:
    1. Contraste binário PRESENTE e identificável — uma das fórmulas abaixo:
       - "X sem Y é Z / Y sem X é W"  (ex: "Visibilidade sem método é custo.")
       - "Não é X. É Y."              (ex: "Não é sobre faturar mais. É sobre sustentar margem.")
       - "Antes era X. Agora é Y."    (ex: "Antes: marketing quando sobrar. Agora: estrutura primeiro.")
       - "Quem A, B. Quem C, D."      (consequências paralelas)
    2. Posicionado próximo ao final (depois dos fatos, antes ou junto ao CTA)
    3. Máximo 2 contrastes por post (mais que isso dilui o impacto)
    4. Contraste resolve o argumento central do post — não é decorativo

  Atribua status="pass" se score ≥ 7 E pelo menos 1 contraste binário identificável
  está presente na posição correta.
  Se ausente completamente: score máximo 4, status="fail".
---

# Case 4 — Contraste binário obrigatório

Valida presença e posição do contraste binário — recurso mais característico
do Código CEO 2026 após o bloco "Vamos aos fatos:".

Exemplos literais do corpus:
- "Visibilidade sem método é custo. / Método sem visibilidade é irrelevante."
- "Não é sobre falar mais. É sobre ouvir melhor."
- "Estrutura primeiro. Crescimento depois."
