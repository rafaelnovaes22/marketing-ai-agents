---
case_id: case-007
sku_id: social-media-agent
outcome_category: multi_network_adaptation
source_mode: real
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "Acme Social em 4 redes"
  rede_prioritaria: "instagram"
  tom: "brand_voice_ceo"
  slides: 5
gabarito:
  redes_obrigatorias: ["linkedin", "instagram", "facebook", "twitter"]
  regras:
    linkedin: "caption long-form profissional"
    instagram: "caption com hashtags + emojis sutis"
    facebook: "caption misto comunidade"
    twitter: "thread com primeiro tweet + 4 replies"
  proibido: "copy-paste literal entre redes"
judge_prompt: |
  Avalie se output cobre as 4 redes (LinkedIn, Instagram, Facebook, Twitter) com
  adaptações distintas:
    1. Cada rede tem caption ≠ literalmente (não copy-paste; pode preservar
       essência mas formato/tom diferente)
    2. LinkedIn: long-form, sem emojis decorativos, postura profissional
    3. Instagram: hashtags presentes (3–10), emojis sutis OK
    4. Facebook: tom comunitário, pergunta no final OK
    5. Twitter: estrutura de thread (não 1 tweet único longo)

  status="pass" se TODAS as 4 redes existem E diferem entre si E seguem o estilo
  esperado para cada plataforma.
---

# Case 7 — Multi-rede adaptado

Valida que o agente entende as 4 plataformas como destinos distintos, não como
clones com mesma caption.
