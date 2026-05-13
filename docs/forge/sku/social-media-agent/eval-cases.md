---
sku_id: social-media-agent
eval_date: 2026-05-13
total_cases: 22
authored_by: "@eval-engineer (Guardian)"
judge_model: claude-sonnet-4.6
pass_threshold: 0.85
critical_path_cases: [1, 5, 10, 15, 20]
---

# Eval Cases — Social Media Agent

> 22 casos cobrindo tom, brand consistency, edge cases e robustez.
> Pass rate alvo: ≥85% (≥18 de 22) para promover a SHADOW.

## Como rodar

```bash
npm run eval social-media-agent
```

Output: `reports/eval-social-media-agent-{date}.md` com score por case + médias agregadas.

---

## Case 1 — Tom the CEO básico ⭐ critical_path

**Input:**
```json
{
  "tema": "IA generativa para indústria",
  "publico": "executivos industriais B2B",
  "rede_prioritaria": "linkedin",
  "tom": "brand_voice_ceo",
  "slides": 5
}
```

**Expected outcome:**
- Tom: direto, sem rodeios, dados/números, sem clichês
- Estrutura: hook impactante + problema reconhecido + solução clara + prova social + CTA urgente
- Brand: cores Acme + tipografia Inter + V-cut dividers
- Caption: até 2200 chars, com CTA explícito
- Tempo: ≤480s

**LLM-as-judge prompt:**
> "Avalie em escala 1-10 se o output segue o tom de the CEO: (1) direta, sem rodeios; (2) usa dados/números específicos; (3) cria urgência sem ser apelativa; (4) estrutura hook-problema-solução-prova-CTA. ≥7 = pass."

**Pass se:** Score ≥ 7/10 E brand ≥ 99% E tempo ≤ 480s

---

## Case 2 — Tom executivo B2B (não-CEO)

**Input:**
```json
{
  "tema": "Compliance LGPD em SaaS",
  "publico": "CTOs e diretores de TI",
  "rede_prioritaria": "linkedin",
  "tom": "executivo_b2b",
  "slides": 4
}
```

**Expected:** Tom formal, sem gírias, jargão técnico aceito, urgência via deadline regulatório.

**Pass:** Score ≥ 7 + brand ≥ 99% + caption sem coloquialismos

---

## Case 3 — Brand consistency forte (cores)

**Input:**
```json
{
  "tema": "Lançamento produto fintech",
  "tom": "executivo_b2b",
  "slides": 5,
  "brand_strictness": "high"
}
```

**Expected:** Todas as 5 imagens usam EXCLUSIVAMENTE paleta Acme (#0A1628, #2563EB, #5EEAD4, #FFFFFF, #F5F7FA).

**Pass se:** Brand validator score ≥ 99% E cores fora da paleta = 0%

---

## Case 4 — Brand consistency tipografia

**Input:** Mesmo case 3, foco em tipografia

**Expected:** Tipografia Inter (Headlines Bold, Body Regular) em todos os slides.

**Pass se:** Fontes não-Inter = 0% (Claude vision detecta)

---

## Case 5 — Slide com texto destacado (Ideogram fallback) ⭐ critical_path

**Input:**
```json
{
  "tema": "Pesquisa: 73% das empresas IA terão ROI negativo",
  "slides": 5,
  "deve_destacar_numero": "73%"
}
```

**Expected:** Slide 1 com "73%" gigante e bem renderizado. Sistema decide Ideogram v2 (não Imagen 4).

**Pass se:** Slide 1 tem "73%" legível, sem distorções, e `decideImageProvider` retornou `ideogram` para esse slide.

---

## Case 6 — Caption longa (limite 2200 chars)

**Input:** Tema complexo que exige caption longa.

**Expected:** Caption ≤ 2200 chars, sem truncamento abrupto, com CTA no final.

**Pass se:** Length ≤ 2200 AND ends_with_cta == true

---

## Case 7 — Multi-rede adaptado

**Input:**
```json
{
  "tema": "Acme Social em 4 redes",
  "rede_prioritaria": "instagram",
  "slides": 5
}
```

**Expected:** Output inclui:
- LinkedIn: caption long-form profissional
- Instagram: caption com hashtags, emojis sutis
- Facebook: caption misto comunidade
- Twitter: thread com primeiro tweet + 4 replies

**Pass se:** As 4 versões existem e diferem (não copy-paste)

---

## Case 8 — Twitter thread mode (ADR-003-DS)

**Input:** Mesmo case 7, foco no output Twitter

**Expected:** Output Twitter é array de 5 tweets [primeiro + 4 replies], cada ≤ 280 chars.

**Pass se:** `output.twitter.length == 5 && every(t => t.length <= 280)`

---

## Case 9 — Briefing vago (rejeita amigavelmente)

**Input:**
```json
{
  "tema": "alguma coisa bonita",
  "publico": ""
}
```

**Expected:** Sistema **REJEITA** com mensagem amigável pedindo:
- Tema específico
- Público-alvo
- Rede prioritária

**Pass se:** Sistema NÃO consumiu tokens de imagem AND mensagem inclui as 3 perguntas.

---

## Case 10 — Briefing com palavras-chave ofensivas ⭐ critical_path

**Input:** Tema com termos sensíveis (ex: política partidária, religião, conteúdo adulto)

**Expected:** Sistema rejeita com referência a out-of-scope.md OR aplica filtro de conteúdo.

**Pass se:** Sistema marca `content_rejected: true` em vez de gerar.

---

## Case 11 — Upsell (6 slides, preço R$ 16)

**Input:**
```json
{
  "tema": "Case study completo",
  "slides": 6,
  "upsell_confirmed": true
}
```

**Expected:** 6 slides entregues, custo ≤ R$ 2,01, preço R$ 16, margem ~87%.

**Pass se:** N_slides == 6 AND trace_cost ≤ R$ 2,30

---

## Case 12 — Upsell 7 slides

**Input:** slides=7

**Expected:** 7 slides, custo ≤ R$ 2,27, preço R$ 16

**Pass se:** N_slides == 7 AND trace_cost ≤ R$ 2,50

---

## Case 13 — SLA borderline (8 min limit)

**Input:** Tema complexo que pode demorar.

**Expected:** Geração ≤ 480s.

**Pass se:** total_seconds ≤ 480

---

## Case 14 — SLA violation (timeout)

**Input:** Tema que força loops de retry.

**Expected:** Sistema retorna após 480s com `sla_violated: true` em vez de continuar.

**Pass se:** Total ≤ 500s (margem de 20s para shutdown gracioso) AND `sla_violated == true`

---

## Case 15 — Brand violation detectada e refeita ⭐ critical_path

**Input:** Forçar Imagen 4 a gerar imagem off-brand (prompt menos específico).

**Expected:** Brand validator detecta < 99%, sistema refaz 1 vez automaticamente.

**Pass se:** `retry_count <= 1` AND final brand ≥ 99%

---

## Case 16 — Brand violation NÃO refeita (degradação aceita)

**Input:** Brand validator score = 96-98% (não crítico).

**Expected:** Sistema entrega com warning em vez de refazer (evita explodir custo).

**Pass se:** `retry_count == 0` AND warning logged

---

## Case 17 — Tom score baixo (forçado)

**Input:** Briefing que naturalmente puxa tom diferente do the CEO.

**Expected:** Score ≤ 6 documentado, sistema entrega mas marca para review humano em ASSISTED.

**Pass se:** `tom_score < 7` AND `flagged_for_human_review == true`

---

## Case 18 — Multi-tenant (futuro — fase 2)

**Input:** Mesmo briefing com 2 `tenant_id` diferentes.

**Expected:** Brand_guide diferente por tenant_id.

**Pass se:** Output usa brand correto do tenant_id (mock em fase 1).

> Fase 1 ignora multi-tenant (single-tenant Acme). Case marcado como `skip_in_phase_1`.

---

## Case 19 — Tokens cache hit (performance)

**Input:** 10 execuções consecutivas com mesmo brand_guide.

**Expected:** Cache hit ratio ≥ 70% no Anthropic prompt cache.

**Pass se:** Média de `cache_creation_input_tokens / total_input_tokens` ≤ 0.30 a partir da 2ª execução.

---

## Case 20 — Zernio failure (retry graceful) ⭐ critical_path

**Input:** Forçar Zernio API a falhar em 1 das 4 redes (mock).

**Expected:** Sistema retry 3x com backoff, depois marca rede como `pending_manual` e segue.

**Pass se:** Out das 3 redes restantes publicaram E `pending_manual` registrado em trace.

---

## Case 21 — Multi-imagem batch (Imagen 4 lote)

**Input:** Briefing que precisa de 5 imagens (todas Imagen 4).

**Expected:** Sistema aproveita batch API para desconto.

**Pass se:** Cost por imagem ≤ $0,035 (vs $0,04 single)

---

## Case 22 — Falha total em Imagen 4 + Ideogram

**Input:** Mock ambos providers retornando 500.

**Expected:** Sistema retorna erro estruturado SEM publicar caption incompleta.

**Pass se:** Sistema `aborts gracefully` AND alerta Slack disparado.

---

## Agregados esperados

| Métrica | Target |
|---------|:------:|
| Pass rate geral | ≥ 85% (≥ 19/22) |
| Pass rate critical_path (5 cases) | 100% (5/5) |
| Tom score médio | ≥ 7,5/10 |
| Brand consistency média | ≥ 99% |
| Tempo médio | ≤ 7m |
| Custo médio | ≤ R$ 2,00 |

## Versionamento

Eval cases versionados em git. Adicionar/remover case = bump PATCH do SKU.

**Próxima evolução:** adicionar cases 23-30 cobrindo redes emergentes (Threads, Bluesky) na wave 3.

## Próximo passo

→ Criar runner de eval em `src/eval/social-media-agent.runner.ts`
→ CI workflow `forge-eval` rodando este arquivo
→ Tracker de pass rate no Mixpanel
