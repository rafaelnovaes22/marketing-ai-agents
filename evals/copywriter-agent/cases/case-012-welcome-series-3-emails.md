---
case_id: case-012
sku_id: copywriter-agent
outcome_category: email_sequence
source_mode: real
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: email_sequence
  product: "Plataforma B2B de automação de vendas"
  audience: "novos usuários que acabaram de se cadastrar"
  framework: welcome
  tone: executivo_b2b
  email_count: 3
gabarito:
  email_count: 3
  framework_score_min: 7
  papeis_dos_emails:
    - "Email 1: boas-vindas + roadmap do que vem (sem vender imediatamente)"
    - "Email 2: melhor caso de uso ou recurso mais valioso (entrega valor real)"
    - "Email 3: CTA natural para próximo passo (upgrade, demo, feature avançada)"
judge_prompt: |
  Avalie a welcome series de 3 emails para plataforma B2B de automação de vendas:

  1. Estrutura Welcome (1-10):
     - Email 1 funciona como boas-vindas + roadmap? (NÃO tenta vender imediatamente)
     - Email 2 entrega valor real? (melhor recurso/caso de uso, não é só propaganda)
     - Email 3 tem CTA natural para próximo passo no produto?
     - Há progressão lógica (onboarding → valor → conversão)?

  2. Papéis dos emails (avalie cada um):
     - Email 1 faz o papel certo? (true/false)
     - Email 2 faz o papel certo? (true/false)
     - Email 3 faz o papel certo? (true/false)

  3. Tom executivo B2B (1-10):
     - Formal, sem entusiasmo excessivo?
     - Foco em utilidade para o usuário, não em features do produto?

  4. Subjects adequados para cada papel do email?

  Retorne JSON:
  {
    "structure_score": N,
    "email_roles_correct": [true/false, true/false, true/false],
    "tone_score": N,
    "subjects_appropriate": true/false
  }

  status="pass" se structure_score ≥ 7 E tone_score ≥ 7 E email_roles_correct == [true, true, true].
---

# Case 012 — Welcome Series 3 Emails

Valida o framework welcome: progressão onboarding → valor → conversão.
Tom executivo B2B testa que o agente não usa entusiasmo excessivo no tom de boas-vindas.
