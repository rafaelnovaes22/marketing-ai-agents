---
case_id: case-017
sku_id: copywriter-agent
outcome_category: email_sequence
source_mode: synthetic
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: email_sequence
  product: "Bootcamp de vendas B2B — 7 dias de imersão online"
  audience: "SDRs e account executives júnior em empresas SaaS"
  framework: soap_opera
  tone: brand_voice_ceo
  email_count: 4
gabarito:
  offset_rules:
    - "offsets estritamente crescentes"
    - "offset[0] == 0"
    - "offset[N-1] ≤ 240 horas (10 dias)"
    - "sem offsets negativos ou duplicados"
  framework_score_min: 7
  tone_score_min: 7
judge_prompt: |
  Avalie a sequência de 4 emails, focando nos send_offset_hours:

  1. Extraia os send_offset_hours dos 4 emails do JSON:
     offset[0] = ____ horas
     offset[1] = ____ horas
     offset[2] = ____ horas
     offset[3] = ____ horas

  2. Valide as regras:
     - offset[0] == 0? (primeiro email enviado imediatamente)
     - Todos os offsets são estritamente crescentes? (cada um maior que o anterior)
     - Nenhum offset é negativo ou duplicado?
     - offset[3] ≤ 240 horas?

  3. O espaçamento entre emails faz sentido para uma sequência de vendas?
     (ex: 0h, 24h, 72h, 168h é um padrão razoável — evitar 0h, 0h, 0h, 0h ou 0h, 500h)

  4. Framework Soap Opera (1-10) e Tom the CEO (1-10)

  Retorne JSON:
  {
    "offsets": [N, N, N, N],
    "offset_start_zero": true/false,
    "offsets_strictly_increasing": true/false,
    "offsets_in_range": true/false,
    "offsets_valid": true/false,
    "spacing_logical": true/false,
    "framework_score": N,
    "tone_score": N
  }

  status="pass" se offsets_valid == true E spacing_logical == true E framework_score ≥ 7 E tone_score ≥ 7.
---

# Case 017 — Send Offset Hours Coerente

Valida que o agente gera send_offset_hours em sequência crescente estrita, com offset[0]=0
e último offset ≤240h. Testa output determinístico do schema de email.
