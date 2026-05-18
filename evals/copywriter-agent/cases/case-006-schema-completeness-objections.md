---
case_id: case-006
sku_id: copywriter-agent
outcome_category: landing_page
source_mode: adversarial
criterio_pass: llm_as_judge
critical_path: true
input:
  output_type: landing
  product: "Plataforma de análise de dados para e-commerce — dashboard + alertas automáticos"
  audience: "gestores de e-commerce em marketplaces (Mercado Livre, Amazon, Shopee)"
  framework: PAS
  tone: brand_voice_ceo
  word_count_target: 1800
gabarito:
  schema_obrigatorio:
    - hero
    - problem
    - agitation
    - solution
    - social_proof
    - objections
    - final_cta
  objections_min: 2
  note: "briefs técnicos de dados/analytics tendem a pular objections — este case foca nesse risco"
judge_prompt: |
  Avalie se a landing page está COMPLETA com TODOS os blocos obrigatórios.

  Verifique a presença e qualidade de cada bloco:
  1. Hero: tem headline (≤90 chars), subheadline, CTA?
  2. Problem: identifica a dor real do gestor de e-commerce?
  3. Agitation: amplifica com número/estatística concreta?
  4. Solution: explica o produto de forma conectada à dor?
  5. Social proof: ≥3 bullets com casos/números?
  6. **Objections: ≥2 objeções respondidas?** (bloco frequentemente omitido)
  7. Final CTA: chamada final para ação?

  Atenção especial à seção objections: landing pages técnicas (dados, analytics) tendem a omiti-la.
  Se não encontrar ≥2 objeções explicitamente respondidas, marque schema_complete = false.

  Retorne JSON:
  {
    "blocks_present": {
      "hero": true/false,
      "problem": true/false,
      "agitation": true/false,
      "solution": true/false,
      "social_proof": true/false,
      "objections": true/false,
      "final_cta": true/false
    },
    "schema_complete": true/false,
    "objections_count": N,
    "framework_score": N,
    "tone_score": N
  }

  status="pass" se schema_complete == true E objections_count ≥ 2 E framework_score ≥ 7 E tone_score ≥ 7.
---

# Case 006 — Schema Completeness (Objections) ⭐ critical_path

Caso adversarial: briefing técnico de plataforma de dados que historicamente puxa landings
sem seção de objections. Valida que o agente sempre inclui objections mesmo em produto técnico.
