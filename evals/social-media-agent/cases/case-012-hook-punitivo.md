---
case_id: case-012
sku_id: social-media-agent
outcome_category: tom_brand_voice_ceo
source_mode: real
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "Empresas que não medem resultado não escalam"
  publico: "gestores e fundadores de PME"
  rede_prioritaria: "linkedin"
  tom: "brand_voice_ceo"
  slides: 5
gabarito:
  expected_score_min: 7
  hook_deve_ser_frase_tese: true
  hook_max_palavras: 15
  hook_tom: "punitivo ou pergunta-tese provocativa"
  caption_max_chars: 2200
judge_prompt: |
  Você é um juiz especializado no tom canônico da the CEO (2026, Código CEO).

  Avalie o output em escala 0–10 com foco no hook (primeira linha / slide 1).

  Padrões válidos de hook no corpus de referência (sintético):
    Modo 1 — Frase-tese punitiva: afirmação seca que acusa um comportamento
      Ex: "Faturamento alto não é sinal de negócio saudável."
      Ex: "Sua empresa não tem problema de vendas. Tem problema de processo."
    Modo 2 — Pergunta-tese provocativa: pergunta que antecipa a tese
      Ex: "Seu time executa sozinho? Ou espera você decidir?"

  Padrões PROIBIDOS de hook:
    ❌ Pergunta vaga de auto-ajuda: "Você já se perguntou qual é o seu propósito?"
    ❌ Afirmação genérica motivacional: "Sucesso depende de você."
    ❌ Hook > 15 palavras (perde impacto)
    ❌ Hook com subordinadas: "Antes de começarmos, preciso te fazer uma pergunta..."

  Critérios:
    1. Hook é frase-tese seca (máx 15 palavras) OU pergunta-tese provocativa
    2. Hook acusa um comportamento/erro específico, não genérico
    3. Hook anuncia a tese que o post vai desenvolver
    4. Linguagem direta, sem amenização ("talvez", "pode ser que")

  Atribua status="pass" se score ≥ 7 E hook válido (frase-tese ou pergunta-tese).
---

# Case 12 — Hook punitivo / frase-tese

Valida que o hook é uma frase-tese seca e direta ou pergunta-tese provocativa,
não uma afirmação genérica ou pergunta de auto-ajuda. Padrão dominante nos
3 posts de 2026 do corpus.
