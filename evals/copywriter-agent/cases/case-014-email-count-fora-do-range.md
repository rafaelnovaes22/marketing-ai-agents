---
case_id: case-014
sku_id: copywriter-agent
outcome_category: briefing_validation
source_mode: edge
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: email_sequence
  product: "Lançamento de curso online de copywriting"
  audience: "empreendedores digitais interessados em marketing"
  framework: soap_opera
  tone: brand_voice_ceo
  email_count: 8
gabarito:
  comportamento_esperado: "REJEITAR — email_count=8 está fora do range válido [3, 5]"
  mensagem_obrigatoria: "email_count must be in [3, 5]"
  proibido: "gerar sequência com 8 emails"
judge_prompt: |
  O agente recebeu email_count=8 (acima do máximo de 5 permitido pelo sistema).

  Avalie se o agente recusou corretamente:
  1. O output é uma mensagem de rejeição/erro (NÃO é uma sequência de emails)?
  2. A mensagem informa que email_count=8 é inválido?
  3. A mensagem indica o range válido [3, 5]?
  4. O agente NÃO tentou gerar uma sequência de 8 emails (nem parcialmente)?

  Retorne JSON:
  {
    "rejected": true/false,
    "informed_range": true/false,
    "no_generation_attempt": true/false,
    "rejection_message": "transcrição do que o agente disse"
  }

  status="pass" se rejected == true E informed_range == true E no_generation_attempt == true.
  status="fail" se o agente tentou gerar 8 emails ou não informou o range correto.
---

# Case 014 — Email Count Fora do Range

Edge case de validação de input: email_count=8 deve ser rejeitado antes de qualquer chamada ao LLM gerador.
O agente deve retornar mensagem clara com o range válido [3, 5].
