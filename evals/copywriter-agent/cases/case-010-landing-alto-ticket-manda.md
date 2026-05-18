---
case_id: case-010
sku_id: copywriter-agent
outcome_category: landing_page
source_mode: edge
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: landing
  product: "Consultoria de M&A para empresas de tecnologia — processo buy-side e sell-side"
  audience: "founders tech buscando exit ou captação série B+"
  framework: AIDA
  tone: executivo_b2b
  word_count_target: 1600
gabarito:
  framework_score_min: 7
  tone_score_min: 7
  adequado_para_alto_ticket: true
  note: "produto de alto ticket exige credenciais + processo — risco de landing genérica com linguagem de vendas agressiva"
judge_prompt: |
  Avalie a landing page para consultoria de M&A tech (produto de alto ticket, audience sofisticada):

  1. Framework AIDA (1-10):
     - Attention: captura atenção de founders sofisticados sem clichê de vendas?
     - Interest: contexto de M&A tech relevante e atual (valuation, múltiplos, ambiente de captação)?
     - Desire: processo diferenciado + credenciais claros (track record, metodologia)?
     - Action: CTA adequado para decisão de alto valor ("agendar conversa", não "comprar agora")?

  2. Tom executivo B2B para alto ticket (1-10):
     - Linguagem de nível founder/investidor?
     - Sem exageros, sem promessas genéricas, sem urgência artificial?
     - Credibilidade estabelecida de forma concisa?

  3. Adequação para produto de alto ticket (true/false):
     - O CTA respeita o processo de decisão longo (agenda reunião, não "feche agora")?
     - O copy não parece landing de produto de R$ 500?

  Retorne JSON:
  {
    "framework_score": N,
    "tone_score": N,
    "appropriate_for_high_ticket": true/false,
    "breakdown": ["..."]
  }

  status="pass" se framework_score ≥ 7 E tone_score ≥ 7 E appropriate_for_high_ticket == true.
---

# Case 010 — Landing Alto Ticket M&A

Edge case: produto de alto ticket (M&A consultoria) com audience sofisticada.
Risco: agente produz landing genérica com linguagem agressiva de vendas inadequada para founders/VCs.
