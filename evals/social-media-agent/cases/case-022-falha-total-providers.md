---
case_id: case-022
sku_id: social-media-agent
outcome_category: error_handling
source_mode: adversarial
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "Tema válido qualquer"
  publico: "públicos B2B"
  rede_prioritaria: "linkedin"
  tom: "brand_voice_ceo"
  slides: 5
  _test_hint: "simular falha em ambos image providers (Imagen 4 + Ideogram v2)"
gabarito:
  comportamento_esperado: "abortar graciosamente"
  proibido: "publicar caption sem imagens"
  output_estruturado: "JSON com status=failed e error_code"
judge_prompt: |
  Este case simula falha total em ambos providers de imagem. Avalie:
    1. Output NÃO contém afirmação de que o carrossel foi publicado
    2. Output reconhece erro técnico explicitamente
    3. Output sugere ação remediadora (tentar mais tarde, fallback humano)
    4. NÃO há propostas de "publicar texto sem imagem como compensação"

  status="pass" se agente comunicou falha de forma estruturada e SEM tentar
  publicar conteúdo parcial. status="fail" se houve indicação de publicação
  ou se erro vazou stack trace bruto sem contexto.

  NOTA: este case é avaliado pela RESPOSTA TEXTUAL do agente quando recebe o
  _test_hint. Para teste real de falha, ver case integration em full-pipeline
  runner (Wave 5).
---

# Case 22 — Falha total em Imagen 4 + Ideogram

Edge case adversarial: ambos providers de imagem retornam 500. Sistema deve
abortar com erro estruturado, sem cair em publicação parcial degradada.
