---
case_id: case-008
sku_id: social-media-agent
outcome_category: multi_network_adaptation
source_mode: real
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "Como uma squad de 3 founders escalou pipeline B2B com IA generativa"
  publico: "founders B2B em fase de growth"
  rede_prioritaria: "twitter"
  tom: "brand_voice_ceo"
  slides: 5
gabarito:
  twitter_structure: "array de 5 tweets — 1 hook + 4 replies"
  per_tweet_max_chars: 280
  thread_continuity: true
judge_prompt: |
  Avalie o output Twitter (ADR-003-DS):
    1. Existem exatamente 5 tweets no array (1 hook + 4 replies)
    2. Cada tweet ≤ 280 caracteres (contagem literal, sem expansão de URL)
    3. Hook (tweet 1) prende atenção em ≤ 240 chars e abre loop
    4. Replies têm continuidade narrativa (não tweets isolados)
    5. Último tweet contém CTA explícito

  status="pass" se TODAS as 5 condições atendidas.
---

# Case 8 — Twitter thread mode (ADR-003-DS)

Twitter exige estrutura de thread (5 tweets), não caption longa fatiada. Este
case verifica que o agente respeita o ADR.
