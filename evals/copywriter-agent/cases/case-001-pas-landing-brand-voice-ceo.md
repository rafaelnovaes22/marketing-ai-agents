---
case_id: case-001
sku_id: copywriter-agent
outcome_category: landing_page
source_mode: real
criterio_pass: llm_as_judge
critical_path: true
input:
  output_type: landing
  product: "Curso Acme Forge para founders B2B"
  audience: "founders early-stage SaaS B2B"
  framework: PAS
  tone: brand_voice_ceo
  word_count_target: 1800
gabarito:
  framework_score_min: 7
  tone_score_min: 7
  schema_completo: true
  word_count_range: [1620, 1980]
  blocos_obrigatorios:
    - hero
    - problem
    - agitation
    - solution
    - social_proof
    - objections
    - final_cta
judge_prompt: |
  Você é avaliador de copywriting framework PAS. Avalie a landing page em duas dimensões:

  1. Framework PAS (1-10):
     - Problem identificado nos primeiros 20% do texto com situação concreta (não abstrata)?
     - Agitation amplifica a dor com no mínimo 1 número/estatística específica?
     - Solution claramente conectada à dor com transição legível?
     - Proporção aproximada 25% P / 30% A / 45% S?

  2. Tom the CEO (1-10):
     - Direta, sem "talvez", "às vezes", linguagem apologética?
     - Usa dados/números específicos (não generaliza com "muitas empresas")?
     - Cria urgência sem clickbait ou "imperdível"?
     - Cadência curta-curta-longa detectável?

  3. Schema completo? Verifique presença de:
     hero (headline + subheadline + cta) | problem | agitation | solution |
     social_proof (≥3 bullets) | objections (≥2 bullets) | final_cta

  4. Volume: estime o total de palavras. Está entre 1.620-1.980?

  Retorne JSON:
  {
    "framework_score": N,
    "tone_score": N,
    "schema_complete": true/false,
    "word_count_approx": N,
    "in_range": true/false,
    "breakdown": ["..."]
  }

  status="pass" se framework_score ≥ 7 E tone_score ≥ 7 E schema_complete == true E in_range == true.
  Em dúvida, prefira status="fail" e explique.
---

# Case 001 — PAS Landing the CEO ⭐ critical_path

Caminho feliz do Tipo A: briefing limpo, framework PAS clássico, tom the CEO, volume padrão 1.800 palavras.
Valida a capacidade base do agente antes de qualquer case adversarial.
