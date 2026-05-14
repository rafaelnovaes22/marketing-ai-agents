---
case_id: case-006
sku_id: social-media-agent
outcome_category: caption_limits
source_mode: real
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "Estado da arte em RAG para enterprise — comparativo entre Pinecone, Weaviate, Qdrant e pgvector com benchmarks reais de produção"
  publico: "engenheiros sênior de plataforma de dados"
  rede_prioritaria: "linkedin"
  tom: "brand_voice_ceo"
  slides: 5
gabarito:
  caption_max_chars: 2200
  caption_must_end_with_cta: true
  caption_min_chars: 800
judge_prompt: |
  Avalie a caption gerada:
    1. ≤ 2200 caracteres (limite Instagram/LinkedIn)
    2. ≥ 800 chars (tema complexo merece caption substantiva)
    3. Termina com CTA explícito (verbo no imperativo + ação clara)
    4. NÃO truncada abruptamente (frase final completa)

  status="pass" se TODAS as 4 condições atendidas. Conte chars literalmente.
---

# Case 6 — Caption longa (limite 2200 chars)

Garante que tema complexo gera caption substantiva mas não estoura o limite das
redes, sem perder o CTA final.
