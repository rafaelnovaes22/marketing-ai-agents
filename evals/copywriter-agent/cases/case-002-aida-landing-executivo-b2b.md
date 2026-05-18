---
case_id: case-002
sku_id: copywriter-agent
outcome_category: landing_page
source_mode: real
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: landing
  product: "Plataforma de compliance LGPD para empresas de tecnologia"
  audience: "CTOs e diretores de TI de empresas 200+ funcionários"
  framework: AIDA
  tone: executivo_b2b
  word_count_target: 1700
gabarito:
  framework_score_min: 7
  tone_score_min: 7
  schema_completo: true
judge_prompt: |
  Avalie a landing page para plataforma de compliance LGPD em duas dimensões:

  1. Framework AIDA (1-10):
     - Attention: hero captura atenção nos primeiros 100 chars com dado, pergunta ou contraste relevante para CTOs?
     - Interest: problema desenvolvido com contexto técnico-regulatório adequado ao público?
     - Desire: solução + prova social + benefícios claros em linguagem de resultado de negócio?
     - Action: CTA único, claro, sem ambiguidade (não há múltiplos CTAs competindo)?

  2. Tom executivo B2B (1-10):
     - Formal sem ser burocrático?
     - Jargão técnico presente e contextualizado (LGPD, compliance, DPO, etc.)?
     - Sem gírias, sem coloquialismos, sem entusiasmo excessivo?
     - Foco em ROI/risco/resultado de negócio, não apenas em features?

  3. Schema completo? (hero + sections problem/agitation/solution/social_proof/objections/final_cta)

  Retorne JSON:
  {
    "framework_score": N,
    "tone_score": N,
    "schema_complete": true/false,
    "breakdown": ["..."]
  }

  status="pass" se framework_score ≥ 7 E tone_score ≥ 7 E schema_complete == true.
---

# Case 002 — AIDA Landing Executivo B2B

Valida a combinação AIDA + tom executivo B2B com produto técnico-regulatório.
Testa se o agente adapta a linguagem para CTOs sem perder a estrutura AIDA.
