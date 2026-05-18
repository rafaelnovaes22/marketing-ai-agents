---
case_id: case-024
sku_id: copywriter-agent
outcome_category: briefing_validation
source_mode: edge
criterio_pass: llm_as_judge
critical_path: false
input:
  output_type: ad_set
  product: "Software de CRM para equipes de vendas B2B"
  audience: "gerentes de vendas e SDRs em empresas SaaS"
  framework: soap_opera
  tone: brand_voice_ceo
gabarito:
  comportamento_esperado: "REJEITAR — soap_opera é exclusivo de email_sequence, incompatível com ad_set"
  mensagem_obrigatoria: "framework 'soap_opera' não é compatível com output_type 'ad_set'"
  sugestao_obrigatoria: "tree_of_thought"
  proibido: "gerar ad_set usando framework soap_opera"
judge_prompt: |
  O agente recebeu output_type="ad_set" com framework="soap_opera".
  Combinação inválida: soap_opera é exclusivo de email sequences.

  Avalie se o agente recusou CORRETAMENTE:
  1. Output é uma mensagem de rejeição (NÃO é um ad set)?
  2. A mensagem explica que soap_opera não é compatível com ad_set?
  3. A mensagem sugere o framework correto para ad_set? (tree_of_thought)
  4. Tom útil — explica o motivo sem ser punitivo?
  5. NÃO tentou gerar ad_set com soap_opera de forma criativa?

  Retorne JSON:
  {
    "rejected_correctly": true/false,
    "explained_incompatibility": true/false,
    "suggested_tree_of_thought": true/false,
    "helpful_tone": true/false,
    "no_generation_attempt": true/false
  }

  status="pass" se rejected_correctly == true E explained_incompatibility == true
  E suggested_tree_of_thought == true E no_generation_attempt == true.
  status="fail" se o agente tentou gerar ad_set com soap_opera ou não explicou a incompatibilidade.
---

# Case 024 — Framework Incompatível — Rejeita com Sugestão

Edge case: soap_opera + ad_set é combinação inválida.
O agente deve rejeitar explicando a incompatibilidade E sugerindo tree_of_thought como alternativa.
