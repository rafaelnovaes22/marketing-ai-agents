---
case_id: case-025
sku_id: copywriter-agent
outcome_category: instagram_caption
source_mode: real
criterio_pass: llm_as_judge
critical_path: true
ground_truth_post_id: "17947804106983178"
ground_truth_likes: 198452
ground_truth_hook: "Talento é bom. Mas no ambiente errado, ele morre."
nota: "output_type instagram_caption é extensão planejada para integração com social-media-agent"
input:
  output_type: instagram_caption
  topic: "ambiente e crescimento — como o entorno limita ou acelera resultados"
  format: reel_caption
  tone: brand_voice_ceo
  hook_type: paradoxo
  include_data: true
  include_cta: true
  cta_keyword: "DECISÃO"
gabarito:
  hook_structure: paradoxo
  hook_max_chars: 80
  data_sources_min: 1
  data_attributed: true
  paragraphs_max_lines: 3
  cta_present: true
  closing_question: true
  hashtags: 0
  tone_score_min: 8
judge_prompt: |
  Você é avaliador de copy para Instagram no tom the CEO.
  O post de referência real (198k likes) usa o hook: "Talento é bom. Mas no ambiente errado, ele morre."

  Avalie a caption gerada em 5 dimensões:

  1. Hook paradoxo (1-10):
     - Estrutura X é bom/verdade. Mas Y destrói/limita/contradiz?
     - Hook ≤ 80 chars?
     - Cria tensão imediata sem explicar demais?
     - Primeira frase autossuficiente se o leitor parar aí?

  2. Tom the CEO (1-10) — use brand-voice.md como referência:
     - "você" direto em todo o texto?
     - Sem "talvez", "às vezes", "pode ser", linguagem apologética?
     - Cadência curta-curta-longa detectável?
     - Afirma com convicção, não sugere?

  3. Dados e fontes (1-10):
     - Ao menos 1 dado com número específico E fonte atribuída?
     - Fontes plausíveis (Gallup, McKinsey, Sebrae, HBR, etc.)?
     - Números específicos (não "muitas empresas", não "a maioria")?

  4. Estrutura (pass/fail):
     - Parágrafos ≤ 3 linhas sem bloco contínuo?
     - CTA com palavra em CAPS ("Comenta DECISÃO que...")?
     - Pergunta de fechamento específica (não genérica)?
     - Zero hashtags?

  5. Distância semântica do post âncora (1-10):
     - A caption aborda o mesmo tema (ambiente/entorno) mas com ângulo próprio?
     - Não é paráfrase do post real (seria plágio)?
     - Mantém o espírito sem copiar frases?

  Retorne JSON:
  {
    "hook_score": N,
    "tone_score": N,
    "data_score": N,
    "structure_pass": true/false,
    "semantic_distance_score": N,
    "hook_char_count": N,
    "hashtag_count": N,
    "has_cta_keyword": true/false,
    "has_closing_question": true/false,
    "breakdown": ["..."]
  }

  status="pass" se hook_score ≥ 8 E tone_score ≥ 8 E data_score ≥ 7
  E structure_pass == true E semantic_distance_score ≥ 6.
---

# Case 025 — Hook Paradoxo Instagram ⭐ critical_path

Valida capacidade de gerar hook estrutura paradoxo para reel caption, ancorado no post de
maior performance da conta (198k likes). Ground truth: padrão X é bom / mas Y.

Tom mínimo exigido: 8/10 (acima do threshold padrão de 7) porque paradoxo é o formato
de maior ROI de engajamento na conta.
