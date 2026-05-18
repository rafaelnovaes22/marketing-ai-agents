---
case_id: case-009
sku_id: copywriter-agent
outcome_category: landing_page
source_mode: synthetic
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: landing
  product: "SaaS de onboarding estruturado para equipes de RH"
  audience: "heads de RH em empresas 100-500 funcionários"
  framework: PAS
  tone: brand_voice_ceo
  word_count_target: 1800
gabarito:
  framework_score_min: 7
  tone_score_min: 7
  schema_completo: true
  note: "domínio RH — valida diversidade de produto coberta pela suite"
judge_prompt: |
  Avalie a landing page para produto de onboarding de RH:

  1. Framework PAS (1-10):
     - Problem: dor real e específica de heads de RH (onboarding caótico, turnover, tempo perdido)?
     - Agitation: dados do mercado de RH (ex: custo de turnover, % de colaboradores que saem nos 90 dias)?
     - Solution: resolução conectada à dor, não lista de features?

  2. Tom the CEO (1-10):
     - Linguagem direta para executivos de RH?
     - Dados específicos do setor (%, tempo de onboarding em dias, custo por contratação)?
     - Urgência sem apelação?

  3. Schema completo? (hero + problem + agitation + solution + social_proof ≥3 + objections ≥2 + final_cta)

  Retorne JSON:
  {
    "framework_score": N,
    "tone_score": N,
    "schema_complete": true/false,
    "rh_specificity_score": N,
    "breakdown": ["..."]
  }

  status="pass" se framework_score ≥ 7 E tone_score ≥ 7 E schema_complete == true.
---

# Case 009 — Landing RH — Diversidade de Produto

Caso sintético: mesmo framework PAS + tom CEO do case-001 mas em domínio RH.
Valida que o agente produz copy específico para o setor (não genérico) e cobre a diversidade da suite.
