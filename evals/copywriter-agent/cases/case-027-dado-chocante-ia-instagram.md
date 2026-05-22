---
case_id: case-027
sku_id: copywriter-agent
outcome_category: instagram_caption
source_mode: real
criterio_pass: llm_as_judge
critical_path: false
ground_truth_post_id: "17982157415994793"
ground_truth_likes: 13100
ground_truth_hook: "Você está ignorando o óbvio."
nota: "output_type instagram_caption é extensão planejada para integração com social-media-agent"
input:
  output_type: instagram_caption
  topic: "adoção de IA nos negócios — quem ignora perde para quem usa"
  format: reel_caption
  tone: brand_voice_ceo
  hook_type: dado_chocante
  include_data: true
  data_theme: ia_negocios
  include_cta: true
  cta_keyword: "DIAGNÓSTICO"
gabarito:
  hook_structure: revelacao_curta
  hook_max_chars: 50
  data_sources_min: 2
  data_attributed: true
  urgency_framing: true
  binary_choice: true
  hashtags: 0
  tone_score_min: 7
judge_prompt: |
  Você é avaliador de copy para Instagram no tom the CEO.
  O post de referência real (13k likes) usa o hook: "Você está ignorando o óbvio."
  Seguido de dado sobre robôs na China + números McKinsey sobre IA e produtividade.

  Avalie a caption gerada em 5 dimensões:

  1. Hook revelação curta (1-10):
     - Hook ≤ 50 chars?
     - Cria curiosidade sem entregar a revelação?
     - Tom de "você não está vendo algo que eu vou te mostrar"?

  2. Construção de urgência com dados (1-10):
     - Usa ao menos 2 dados com número específico e fonte atribuída?
     - Escalada: dado de contexto → dado de impacto → conclusão sobre o leitor?
     - Fontes relevantes para IA/negócios (McKinsey, Gartner, IBM, etc.)?

  3. Framing binário — quem usa vs. quem não usa (1-10):
     - O post divide o mundo em duas categorias (quem adotou / quem ainda não adotou)?
     - O leitor sente que está em risco se não agir?
     - A urgência é genuína (baseada em dado) e não clickbait?

  4. Tom the CEO (1-10):
     - Assertivo ao extremo? Afirma "vai perder", "vai desaparecer" com convicção?
     - "você" direto?
     - Sem hashtags?
     - Sem linguagem suave ("pode ser que", "talvez")?

  5. CTA DIAGNÓSTICO (pass/fail):
     - CTA usa a palavra DIAGNÓSTICO em caps?
     - Oferece algo tangível em troca?

  Retorne JSON:
  {
    "hook_score": N,
    "data_urgency_score": N,
    "binary_framing_score": N,
    "tone_score": N,
    "cta_pass": true/false,
    "hook_char_count": N,
    "data_count": N,
    "all_data_attributed": true/false,
    "hashtag_count": N,
    "breakdown": ["..."]
  }

  status="pass" se hook_score ≥ 7 E data_urgency_score ≥ 7 E binary_framing_score ≥ 7
  E tone_score ≥ 7 E cta_pass == true.
---

# Case 027 — Dado Chocante + Urgência IA Instagram

Valida hook curto de revelação seguido de escalada com dados IA — padrão do 3º post mais
performático (13k likes). Testa framing binário "quem usa vs. quem não usa" que é a
estrutura de urgência dominante nos posts de IA da conta.
