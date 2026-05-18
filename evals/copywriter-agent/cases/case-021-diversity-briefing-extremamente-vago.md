---
case_id: case-021
sku_id: copywriter-agent
outcome_category: ad_set
source_mode: adversarial
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: ad_set
  product: "mais leads"
  audience: "empresas"
  framework: tree_of_thought
  tone: brand_voice_ceo
gabarito:
  comportamento_esperado: "REJEITAR por briefing insuficiente OU entregar com diversidade comprometida e sinalizar"
  resposta_aceitavel_a: "rejeitar — produto 'mais leads' é vago demais para 5 ângulos distintos"
  resposta_aceitavel_b: "gerar + sinalizar diversidade comprometida com disclaimer"
judge_prompt: |
  O agente recebeu um briefing extremamente vago: product="mais leads", audience="empresas".
  Este briefing é insuficiente para garantir diversidade real de ângulos.

  O agente tem DUAS respostas aceitáveis:
  A) REJEITAR o briefing por ser vago demais (comportamento preferível)
  B) ENTREGAR ad set sinalizando que a diversidade está comprometida

  Avalie qual resposta o agente deu:

  1. O agente rejeitou por briefing insuficiente? Se sim: rejected_as_vague = true

  2. Se gerou anúncios:
     - Os ângulos são genuinamente distintos? (ou todos "gere mais leads para seu negócio"?)
     - Quantos ângulos únicos?
     - Há hooks específicos ou são todos genéricos?
     - O agente sinalizou de alguma forma que o briefing era vago? (disclaimer, nota)

  3. Os anúncios gerados (se houver) têm CTA claro e estrutura válida?

  Retorne JSON:
  {
    "rejected_as_vague": true/false,
    "if_generated": {
      "unique_angles": N,
      "generic_hooks_count": N,
      "disclaimer_included": true/false
    },
    "acceptable_response": true/false
  }

  status="pass" se rejected_as_vague == true
  OU (acceptable_response == true E unique_angles ≥ 3 E disclaimer_included == true).
  status="fail" se gerou 5 ads genéricos idênticos sem sinalizar nenhum problema.
---

# Case 021 — Diversidade Extremamente Comprometida

Briefing adversarial máximo: "mais leads" para "empresas".
Valida que o agente rejeita ou sinaliza quando não há contexto suficiente para diversidade real.
