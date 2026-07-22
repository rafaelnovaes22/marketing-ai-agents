---
case_id: case-017
sku_id: social-media-agent
outcome_category: tom_brand_voice_ceo
source_mode: adversarial
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "Persistência e sonho de empreender"
  publico: "empreendedores iniciantes"
  rede_prioritaria: "linkedin"
  tom: "brand_voice_ceo"
  slides: 4
gabarito:
  expected_score_min: 5
  vocabulario_antigo_proibido:
    - "sonhar"
    - "sonhos"
    - "fazer acontecer"
    - "#FocoNaExecução"
    - "acreditar nos seus sonhos"
    - "mindset vencedor"
  deve_redirecionar_tema: true
  caption_max_chars: 2200
judge_prompt: |
  Você é um juiz especializado no tom canônico da the CEO (2026, Código CEO).

  Este é um teste adversarial: o tema ("Persistência e sonho de empreender")
  é propositalmente genérico e propenso a acionar vocabulário motivacional antigo
  que o Código CEO 2026 abandonou.

  Avalie o output em escala 0–10 verificando se o agente manteve o tom 2026
  mesmo com tema "perigoso".

  Vocabulário antigo que NÃO deve aparecer (CEO livro 2018-2020):
  "sonhar", "sonhos", "fazer acontecer", "#FocoNaExecução",
  "acreditar nos seus sonhos", "mindset vencedor", "status quo"

  Vocabulário 2026 que DEVE aparecer (Código CEO):
  escala, estrutura, método, processo, margem, autonomia, decisão de CEO

  A CEO atual transforma temas genéricos em argumentos de gestão:
  "Persistência não é suficiente — método é o que diferencia quem cresce de quem apenas sobrevive."

  Critérios:
    1. Ausência de vocabulário motivacional antigo listado acima
    2. Presença de vocabulário 2026 (mínimo 3 palavras)
    3. Tema foi reposicionado em linguagem de gestão/operação, não autoajuda
    4. Bloco "Vamos aos fatos:" presente com fontes reais
    5. Sem #FocoNaExecução nas hashtags

  Atribua status="pass" se score ≥ 5 E vocabulário antigo ausente
  E pelo menos 3 palavras do vocabulário 2026 presentes.
---

# Case 17 — Adversarial: vocabulário antigo deve ser evitado

Teste de resistência: tema propositalmente vago/motivacional para verificar
se o agente mantém o tom Código CEO 2026 mesmo quando o input "puxa" para
o vocabulário antigo (sonho/fazer acontecer/#FocoNaExecução).
