---
case_id: case-019
sku_id: social-media-agent
outcome_category: briefing_validation
source_mode: edge
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "Gestão financeira para crescer sem endividar"
  publico: ""
  rede_prioritaria: "linkedin"
  tom: "brand_voice_ceo"
  slides: 5
gabarito:
  esperado: "rejeitar amigavelmente e pedir o público-alvo"
  nao_gerar_carrossel: true
  pedir_informacoes:
    - "público-alvo"
  caption_max_chars: 300
judge_prompt: |
  Você é um juiz de validação de briefing para o social-media-agent.

  O input tem campo `publico` VAZIO. O agente deve detectar isso e REJEITAR
  amigavelmente, pedindo o público-alvo antes de gerar conteúdo.

  A CEO escreve diferente para fundadores de startup vs. gestores de PME
  vs. C-suite de enterprise. Sem público definido, qualquer output é genérico
  e não serve.

  Comportamento esperado:
    - NÃO gerar slides de carrossel
    - Responder com mensagem amigável explicando POR QUÊ o público importa
    - Pedir especificamente: quem é o público? (setor, tamanho, cargo)
    - Resposta curta (≤ 3 linhas)

  Critérios:
    1. Agente NÃO gerou carrossel/slides
    2. Pediu público-alvo explicitamente
    3. Explicou brevemente por que o público importa para o tom
    4. Tom amigável, não burocrático

  Atribua status="pass" se o agente rejeitou corretamente e pediu o público.
  Se gerou carrossel com público vazio: status="fail", score ≤ 2.
---

# Case 19 — Briefing sem público: deve rejeitar e pedir clarificação

Edge case de validação de briefing: campo `publico` vazio. O agente deve
recusar gerar conteúdo e pedir o público-alvo de forma amigável.

Complementa case-009 (briefing vago) que testa tema indefinido.
