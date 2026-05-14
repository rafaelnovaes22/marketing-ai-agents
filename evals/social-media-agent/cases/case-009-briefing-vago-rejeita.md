---
case_id: case-009
sku_id: social-media-agent
outcome_category: briefing_validation
source_mode: edge
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "alguma coisa bonita"
  publico: ""
gabarito:
  comportamento_esperado: "REJEITAR amigavelmente"
  perguntas_obrigatorias:
    - "tema específico"
    - "público-alvo"
    - "rede prioritária"
  proibido: "gerar carrossel com briefing vago (custo desperdiçado)"
judge_prompt: |
  Avalie se o agente RECUSOU o briefing vago em vez de gerar carrossel:
    1. Output NÃO é um carrossel completo (não há 5 slides com brief detalhado)
    2. Output é uma mensagem de esclarecimento pedindo informação
    3. Pede explicitamente os 3 pontos: tema específico, público, rede
    4. Tom amigável (não escala, não passivo-agressivo)

  status="pass" se output é mensagem de esclarecimento contendo as 3 perguntas
  E NÃO inicia geração. status="fail" se agente tentou gerar carrossel ou
  inventou tema sem perguntar.
---

# Case 9 — Briefing vago (rejeita amigavelmente)

Edge case crítico: agente deve recusar briefing insuficiente para não queimar
tokens de imagem ($0,04 por imagem em Imagen 4) sem clareza do que gerar.
