---
case_id: case-014
sku_id: social-media-agent
outcome_category: tom_brand_voice_ceo
source_mode: synthetic
criterio_pass: llm_as_judge
critical_path: false
input:
  tema: "Processos claros eliminam retrabalho e dobram a margem"
  publico: "gestores de operação e fundadores"
  rede_prioritaria: "linkedin"
  tom: "brand_voice_ceo"
  slides: 6
gabarito:
  expected_score_min: 6
  caso_real_esperado: true
  caso_deve_ser_anonimizado: true
  nao_usar_nome_proprio: true
  caption_max_chars: 2200
judge_prompt: |
  Você é um juiz especializado no tom canônico da the CEO (2026, Código CEO).

  Avalie o output em escala 0–10 com foco no "caso real anonimizado" —
  recurso frequente no corpus de posts da CEO.

  Padrão esperado ("Vejo isso com frequência"):
    - Introduz um caso de empresa/empreendedor anônimo ("Em um caso real...")
    - Descreve o PROBLEMA que a empresa tinha
    - Descreve a VIRADA (o que mudou quando aplicaram a solução)
    - Fecha com resultado concreto (cresceu, margem melhorou, etc.)
    - SEM nomes próprios de empresa ou pessoa (anonimizado)

  Critérios:
    1. Caso real presente — mínimo 2-3 linhas descrevendo situação + virada
    2. Anonimizado — sem nomes de empresa ou pessoa
    3. Segue estrutura problema → mudança → resultado
    4. Integrado ao fluxo do post (não colado como "história à parte")
    5. Opcional mas valorizado: introduzido por "Vejo isso com frequência" ou similar

  Atribua status="pass" se score ≥ 6 E caso real anonimizado presente.
  Se ausente: score máximo 6, status depende das outras dimensões.
---

# Case 14 — Caso real anonimizado

Valida que o agente inclui o padrão "Vejo isso com frequência" — anedota
empresarial anonimizada com estrutura problema → virada → resultado.
Recurso frequente nos posts 2026 do corpus.
