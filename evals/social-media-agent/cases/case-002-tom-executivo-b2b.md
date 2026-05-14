---
case_id: case-002
sku_id: social-media-agent
outcome_category: tom_alternativo
source_mode: real
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "Compliance LGPD em SaaS"
  publico: "CTOs e diretores de TI"
  rede_prioritaria: "linkedin"
  tom: "executivo_b2b"
  slides: 4
gabarito:
  expected_score_min: 7
  estilo_obrigatorio:
    - "formal, sem gírias"
    - "jargão técnico aceito (LGPD, ANPD, encarregado)"
    - "urgência via deadline regulatório (multa, ANPD, prazo)"
  caption_sem_coloquialismos: true
judge_prompt: |
  Avalie se o output segue tom EXECUTIVO B2B (não the CEO):
    1. Tom formal, sem gírias ou coloquialismos ("galera", "tipo", "rolar")
    2. Jargão técnico de compliance aceito e correto
    3. Urgência ancorada em deadline regulatório
    4. Caption profissional, sem emojis decorativos

  status="pass" se score ≥ 7 E NÃO houver gíria/coloquialismo na caption.
---

# Case 2 — Tom executivo B2B (não-CEO)

Cobertura de tom alternativo. Garante que o sistema não força tom CEO em
briefings que pedem voice corporativa.
