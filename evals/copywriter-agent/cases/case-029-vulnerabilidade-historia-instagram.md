---
case_id: case-029
sku_id: copywriter-agent
outcome_category: instagram_caption
source_mode: synthetic
criterio_pass: llm_as_judge
critical_path: false
ground_truth_post_id: "synthetic"
ground_truth_likes: 0  # ilustrativo — corpus sintético
ground_truth_comments: 0  # ilustrativo — corpus sintético
ground_truth_hook: "Faturar bem sozinha parece incrível."
ground_truth_format: REELS
nota: |
  Posts de vulnerabilidade têm likes menores mas conversão maior (leads qualificados).
  O padrão vulnerabilidade→lição→CTA é o mais próximo de venda direta sem parecer anúncio.
  output_type instagram_caption é extensão planejada para integração com social-media-agent.
input:
  output_type: instagram_caption
  topic: "história de cliente ou founder — transformação de esforço solo para estrutura escalável"
  format: reel_caption
  tone: brand_voice_ceo
  hook_type: narrativa_frustrada
  story_arc: "antes (dor) → virada (método) → depois (resultado com número)"
  include_data: false
  include_story: true
  include_cta: true
  cta_keyword: "COF"
gabarito:
  hook_structure: narrativa_frustrada
  hook_max_chars: 80
  story_arc_present: true
  result_has_number: true
  vulnerability_connected_to_lesson: true
  lesson_actionable: true
  cta_present: true
  closing_question: true
  hashtags: 0
  tone_score_min: 7
judge_prompt: |
  Você é avaliador de copy para Instagram no tom the CEO.
  O post âncora sintético (ver brand-voice.md) usa o hook: "Faturar bem sozinha parece incrível."
  Seguido de: "Até você perceber que o negócio só existe enquanto você aguenta."
  E termina com transformação: faturamento R$30k → R$120k em 4 meses via estrutura.

  O padrão é: hook aspiracional → inversão dolorosa → jornada de transformação → CTA.

  Avalie a caption gerada em 5 dimensões:

  1. Hook narrativa frustrada (1-10):
     - Começa com algo que parece bom (aspiração)?
     - Segunda frase inverte — "Até X" ou "Mas Y"?
     - Hook ≤ 80 chars?
     - Cria identificação imediata com o leitor que está naquela situação?

  2. Arco de história (1-10):
     - Tem 3 fases claras: antes (dor específica) → virada (ação concreta) → depois (resultado)?
     - A dor é específica e concreta (não "estava travada")?
     - A virada tem passos enumerados (1, 2, 3...)?
     - O resultado tem número específico (não "cresceu muito")?

  3. Vulnerabilidade conectada à lição (1-10):
     - A vulnerabilidade não é gratuita — serve de setup para a lição?
     - A lição é acionável (o leitor pode replicar)?
     - O tom permanece assertivo mesmo na vulnerabilidade?

  4. Tom the CEO (1-10):
     - "você" ao endereçar o leitor?
     - Afirmativo sobre a solução ("não foi sobre trabalhar mais, foi sobre estrutura")?
     - Sem hashtags?
     - Parágrafos curtos?

  5. CTA de conversão (pass/fail):
     - CTA com palavra COF em caps?
     - Pergunta final identifica quem está na situação descrita?

  Retorne JSON:
  {
    "hook_score": N,
    "story_arc_score": N,
    "vulnerability_lesson_score": N,
    "tone_score": N,
    "cta_pass": true/false,
    "hook_char_count": N,
    "result_has_number": true/false,
    "story_phases_present": ["antes", "virada", "depois"],
    "hashtag_count": N,
    "breakdown": ["..."]
  }

  status="pass" se hook_score ≥ 7 E story_arc_score ≥ 7 E vulnerability_lesson_score ≥ 7
  E tone_score ≥ 7 E cta_pass == true E result_has_number == true.
---

# Case 029 — Vulnerabilidade + História de Transformação Instagram

Valida padrão narrativa frustrada com arco antes/virada/depois ancorado em número real.
Post âncora (R$30k→R$120k em 4 meses) é o case de transformação mais completo da conta.
Testa capacidade de gerar copy de prova social sem parecer depoimento genérico.
