---
case_id: case-018
sku_id: social-media-agent
outcome_category: tom_brand_voice_ceo
source_mode: synthetic
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "Por que 9 em 10 startups falham nos primeiros 5 anos"
  publico: "fundadores e investidores anjo"
  rede_prioritaria: "linkedin"
  tom: "brand_voice_ceo"
  slides: 5
gabarito:
  expected_score_min: 7
  bloco_fatos_obrigatorio: true
  contraste_binario_obrigatorio: true
  hashtags_tematicas: true
  caption_max_chars: 2200
judge_prompt: |
  Você é um juiz especializado no tom canônico da the CEO (2026, Código CEO).

  Avalie o output do agente em escala 0–10. Este case valida a combinação
  completa dos padrões 2026 em um tema de startup/empreendedorismo.

  Dimensões avaliadas (peso igual):
    1. Hook: frase-tese punitiva ou pergunta-tese provocativa (máx 15 palavras)
    2. Bloco "Vamos aos fatos:" com ≥ 3 bullets + fonte nomeada + % ou múltiplo
    3. Contraste binário posicionado próximo ao final
    4. CTA: pergunta retórica-cobrança ou mantra de obrigatoriedade
    5. Hashtags: 2-4 temáticas, sem #FocoNaExecução
    6. Vocabulário 2026: ≥ 3 palavras do núcleo (escala/estrutura/margem/método/etc)
    7. Caption ≤ 2200 chars com CTA explícito

  Atribua status="pass" se score ≥ 7 E pelo menos 5 das 7 dimensões plenamente cumpridas.
---

# Case 18 — Tema startups: teste combinado de padrões 2026

Validação integrada dos padrões do Código CEO 2026 em tema de startup —
domínio de especialidade da CEO como investidora. Testa a combinação
hook + fatos + contraste + CTA + hashtags + vocabulário.
