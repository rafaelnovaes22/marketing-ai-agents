---
case_id: case-013
sku_id: copywriter-agent
outcome_category: email_sequence
source_mode: synthetic
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: email_sequence
  product: "SaaS de gestão de projetos para agências de marketing"
  audience: "usuários inativos há 60+ dias"
  framework: re_engagement
  tone: brand_voice_ceo
  email_count: 5
gabarito:
  email_count: 5
  framework_score_min: 7
  progressao_urgencia: true
  has_opt_out: true
  progressao_esperada:
    - "Email 1: lembrete suave + valor recente (sem pressão)"
    - "Email 2: novo conteúdo ou feature de destaque"
    - "Email 3: oferta especial ou benefício"
    - "Email 4: última chance — urgência genuína"
    - "Email 5: goodbye com opt-out claro (LGPD)"
judge_prompt: |
  Avalie a sequência de re-engagement de 5 emails no tom the CEO:

  1. Progressão de urgência (1-10):
     - Email 1 suave, sem pressão?
     - Urgência aumenta progressivamente a cada email?
     - Email 4 tem urgência clara mas genuína (não "promoção imperdível AGORA")?
     - Email 5 tem opt-out explícito e sem ressentimento? (LGPD compliance)

  2. Estrutura de re-engagement (1-10):
     - Cada email tem razão clara para o usuário reativar (não só "volte para nós")?
     - Há valor entregue ou proposta em cada email?

  3. Tom the CEO (1-10): critério canônico

  4. Email 5 oferece opt-out claro? (true/false — importante para LGPD)

  Retorne JSON:
  {
    "urgency_progression_score": N,
    "structure_score": N,
    "tone_score": N,
    "has_opt_out": true/false,
    "email_purposes": ["propósito em 1 frase cada"]
  }

  status="pass" se urgency_progression_score ≥ 7 E structure_score ≥ 7 E tone_score ≥ 7 E has_opt_out == true.
---

# Case 013 — Re-engagement 5 Emails

Valida o framework re_engagement com progressão suave→urgência→goodbye.
Testa LGPD compliance (opt-out no Email 5) e que o agente respeita a progressão de urgência.
