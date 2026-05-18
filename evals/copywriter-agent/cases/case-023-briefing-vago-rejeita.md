---
case_id: case-023
sku_id: copywriter-agent
outcome_category: briefing_validation
source_mode: edge
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: landing
  product: "alguma coisa boa"
gabarito:
  comportamento_esperado: "REJEITAR amigavelmente — faltam audience, framework, tone"
  campos_faltantes_min:
    - audience
    - framework
    - tone
  proibido: "gerar landing page com briefing vago"
judge_prompt: |
  O agente recebeu um briefing extremamente vago para landing page:
  apenas output_type="landing" e product="alguma coisa boa".

  Avalie se o agente recusou CORRETAMENTE:
  1. Output é uma mensagem de rejeição/esclarecimento (NÃO é uma landing page gerada)?
  2. A mensagem lista os campos faltantes? (pelo menos audience, framework, tone)
  3. Tom amigável e útil (não é mensagem de erro genérica tipo "erro 400")?
  4. NÃO tentou "adivinhar" os campos faltantes e gerar landing page assim mesmo?

  Retorne JSON:
  {
    "rejected_correctly": true/false,
    "listed_missing_fields": true/false,
    "missing_fields_mentioned": ["..."],
    "friendly_tone": true/false,
    "no_generation_attempt": true/false
  }

  status="pass" se rejected_correctly == true E listed_missing_fields == true
  E no_generation_attempt == true.
  status="fail" se o agente tentou gerar landing page com briefing vago
  ou não listou os campos faltantes.
---

# Case 023 — Briefing Vago — Rejeita Amigavelmente

Edge case de validação: o agente deve recusar briefing insuficiente antes de gerar qualquer copy.
Valida que o agente não "adivinha" campos faltantes — pede esclarecimento de forma útil.
