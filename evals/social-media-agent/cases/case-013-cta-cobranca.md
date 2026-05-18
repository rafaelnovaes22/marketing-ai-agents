---
case_id: case-013
sku_id: social-media-agent
outcome_category: tom_brand_voice_ceo
source_mode: real
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "Quem não vende valor compete por preço e trabalha dobrado"
  publico: "empreendedores e equipes de vendas"
  rede_prioritaria: "linkedin"
  tom: "brand_voice_ceo"
  slides: 5
gabarito:
  expected_score_min: 7
  cta_tipo_esperado: "pergunta retórica-cobrança ou mantra de obrigatoriedade"
  cta_proibido: "compartilhe se concorda, marca um amigo, comente abaixo o que achou"
  caption_max_chars: 2200
judge_prompt: |
  Você é um juiz especializado no tom canônico da the CEO (2026, Código CEO).

  Avalie o output em escala 0–10 com foco no CTA (último slide e fechamento da caption).

  Padrões VÁLIDOS de CTA no corpus:
    Tipo 1 — Pergunta retórica-cobrança (mais punchy):
      "Você vai aprender do jeito caro ou do jeito inteligente?"
      "Entendeu onde eu quero chegar?"
    Tipo 2 — Mantra de obrigatoriedade (afirmação seca de fechamento):
      "Vender não é opcional."
      "Negócio saudável não pede herói. Pede sistema."
    Tipo 3 — Pergunta específica ao contexto (secundário):
      "Me conta: qual o gargalo que mais trava sua operação hoje?"

  Padrões PROIBIDOS:
    ❌ "Compartilha se concorda"
    ❌ "Marca um amigo que precisa ouvir"
    ❌ "Comente abaixo o que você achou" — genérico, sem pergunta real
    ❌ CTA genérico sem relação com o tema do post
    ❌ CTA muito longo (> 2 frases)

  ATENÇÃO — NÃO confundir:
    ✅ VÁLIDO: "Me conta nos comentários: qual o gargalo que mais trava sua operação hoje?"
       → É Tipo 3 (pergunta específica ao contexto), VÁLIDO porque tem pergunta real com conteúdo
    ❌ INVÁLIDO: "Me conta nos comentários o que você achou"
       → Pedido vago de engajamento, sem pergunta de conteúdo real

  Critérios:
    1. CTA é pergunta retórica-cobrança OU mantra de obrigatoriedade OU pergunta específica
    2. CTA é conciso (≤ 2 frases)
    3. CTA está relacionado ao tema específico do post
    4. Ausência de pedidos passivos de engajamento (compartilhe/marca/comente)

  Atribua status="pass" se score ≥ 7 E CTA válido no tipo correto.
---

# Case 13 — CTA pergunta retórica-cobrança

Valida que o CTA tem força e especificidade — pergunta retórica que cobra o
leitor ou mantra de obrigatoriedade. Sem pedidos passivos de engajamento.
