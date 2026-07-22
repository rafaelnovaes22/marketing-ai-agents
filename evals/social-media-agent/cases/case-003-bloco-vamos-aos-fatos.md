---
case_id: case-003
sku_id: social-media-agent
outcome_category: tom_brand_voice_ceo
source_mode: real
criterio_pass: llm_as_judge
critical_path: true
input:
  tema: "Excesso de centralização mata o crescimento do negócio"
  publico: "fundadores e donos de PME"
  rede_prioritaria: "linkedin"
  tom: "brand_voice_ceo"
  slides: 5
gabarito:
  expected_score_min: 7
  bloco_fatos_obrigatorio: true
  fatos_min_bullets: 3
  fatos_exige_fonte_nomeada: true
  caption_max_chars: 2200
  caption_must_include_cta: true
judge_prompt: |
  Você é um juiz especializado no tom canônico da the CEO (2026, Código CEO).

  Avalie o output do agente em escala 0–10 com foco na presença obrigatória do
  bloco "Vamos aos fatos:" (padrão real do corpus LinkedIn da CEO).

  Critérios de avaliação:
    1. Bloco "Vamos aos fatos:" (ou "Os números:" ou "Vamos aos dados:") PRESENTE
       — deve conter exatamente 3 bullets com estatística + fonte nomeada entre parênteses
    2. Cada bullet deve incluir % ou múltiplo (ex: "60% mais devagar", "3x mais retrabalho")
    3. Fonte nomeada real (McKinsey, Harvard Business Review, Gallup, Bain, HBR, Gong.io,
       Salesforce, CB Insights, etc.) — não genérica ("estudos mostram")
    4. O bloco está posicionado antes do contraste binário/CTA, não no início

  Atribua status="pass" se score ≥ 7 E o bloco "Vamos aos fatos:" está presente
  com ≥ 3 bullets com fonte nomeada e % ou múltiplo.
  Se o bloco estiver ausente, score máximo é 4 e status="fail".
---

# Case 3 — Bloco "Vamos aos fatos:" obrigatório ⭐ critical_path

Valida que o agente inclui o recurso mais característico do Código CEO 2026:
bullets de estatística com fonte nomeada. Padrão ausente no prompt antigo,
introduzido na refatoração baseada no corpus de referência da persona sintética.

Fontes aceitáveis: McKinsey, Bain & Company, Harvard Business Review, Gong.io,
Salesforce, Gallup, Forbes, CB Insights, Distrito Dataminer.
