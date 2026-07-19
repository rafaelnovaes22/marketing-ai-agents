---
sku_id: copywriter-agent
eval_date: 2026-05-13
total_cases: 24
authored_by: "@eval-engineer (Guardian)"
judge_model_landing: claude-opus-4.6
judge_model_email_ads: claude-sonnet-4.6
pass_threshold: 0.85
critical_path_cases: [1, 6, 11, 16, 22]
---

# Eval Cases — Copywriter Agent

> 24 casos cobrindo tom, framework adherence, schema completeness, diversidade (Tipo C), edge cases e robustez.
> Pass rate alvo: ≥85% (≥21 de 24) para promover a SHADOW.
> Critical path: 100% (5/5) obrigatório.

## Como rodar

```bash
npm run eval copywriter-agent
```

Output: `reports/eval-copywriter-agent-{date}.md` com score por case + médias agregadas por output_type + framework.

---

## Tipo A — Landing pages (10 casos)

### Case 1 — PAS landing default the CEO ⭐ critical_path

**Input:**
```json
{
  "output_type": "landing",
  "product": "Curso Novais Digital Foundry para founders B2B",
  "audience": "founders early-stage SaaS B2B",
  "framework": "PAS",
  "tone": "brand_voice_ceo",
  "word_count_target": 1800
}
```

**Expected:**
- Estrutura JSON: `hero { headline, subheadline, cta }`, `problem`, `agitation`, `solution`, `social_proof[3+]`, `objections[≥2]`, `final_cta`
- Volume: 1.620-1.980 palavras (1.800 ±10%)
- Tom: direto, dados/números, sem clichês, urgência sem apelação
- Framework PAS evidente: problema → agitação → solução com transição clara

**LLM-as-judge prompt (Opus):**
> "Avalie em 1-10 se a landing segue PAS clássico: (1) Problem identificado nos primeiros 20% do texto; (2) Agitation amplifica dor com no mínimo 1 número/estatística; (3) Solution claramente conectada à dor; (4) Transições entre as 3 fases legíveis. Avalie em paralelo 1-10 o tom the CEO (direta, dados, sem rodeios). Retorne JSON { framework_score, tone_score, breakdown }."

**Pass se:** framework_score ≥ 7 E tone_score ≥ 7 E schema_complete == true E word_count in [1620, 1980] E tempo ≤ 900s

---

### Case 2 — AIDA landing tom executivo

**Input:**
```json
{
  "output_type": "landing",
  "product": "Plataforma de compliance LGPD",
  "audience": "CTOs e diretores de TI",
  "framework": "AIDA",
  "tone": "executivo_b2b",
  "word_count_target": 1700
}
```

**Expected:** Attention (hero) → Interest (problem) → Desire (solution + social proof) → Action (CTA). Tom formal, jargão técnico aceito, sem coloquialismos.

**Pass se:** framework_score ≥ 7 E tone sem gírias E schema_complete

---

### Case 3 — StoryBrand framework

**Input:**
```json
{
  "output_type": "landing",
  "product": "SaaS de gestão financeira para clínicas",
  "audience": "donos de clínicas médicas",
  "framework": "StoryBrand",
  "tone": "brand_voice_ceo"
}
```

**Expected:** Estrutura herói-guia-plano-CTA evidente. Cliente como herói, produto como guia.

**Pass se:** framework_score StoryBrand ≥ 7 (juiz valida 7 elementos)

---

### Case 4 — 4Ps framework

**Input:** Mesmo Case 1 com `framework: "4Ps"` (Promise, Picture, Proof, Push).

**Expected:** 4 blocos canônicos detectáveis.

**Pass se:** framework_score ≥ 7

---

### Case 5 — Landing extendida (upsell, 3.000 palavras)

**Input:**
```json
{
  "output_type": "landing",
  "framework": "PAS",
  "tone": "brand_voice_ceo",
  "word_count_target": 3000,
  "upsell_confirmed": true
}
```

**Expected:** Volume 2.700-3.300 palavras. Custo trace ≤ R$ 8,50. Tom mantém qualidade em texto longo (sem drift).

**Pass se:** word_count in [2700, 3300] AND trace_cost ≤ R$ 9,00 AND tone_score ≥ 7 (sem drift entre 1º e 3º terço)

---

### Case 6 — Schema completeness (re-roll de bloco) ⭐ critical_path

**Input:** Briefing que historicamente puxa landings sem `objections` (mock forçando Opus a omitir).

**Expected:** Sistema detecta bloco faltante via Zod, re-rolla **apenas** `objections`, entrega completa em ≤900s.

**Pass se:** Final JSON tem 100% dos blocos obrigatórios AND `re_roll_count.objections == 1` AND tempo total ≤ 900s

---

### Case 7 — Tom score baixo (forçado)

**Input:** Briefing com produto que naturalmente puxa tom acadêmico (ex: paper científico convertido em landing).

**Expected:** Score detectado ≤ 6 → sistema entrega mas marca `flagged_for_human_review: true`.

**Pass se:** `tone_score < 7` AND `flagged_for_human_review == true` (não força re-roll)

---

### Case 8 — Voice drift no meio da landing (streaming cancel)

**Input:** Landing longa em que system prompt provoca drift no 2º terço.

**Expected:** Streaming voice check detecta drift no 1º terço, cancela geração e re-rolla com correção. Custo total ≤ 1,5× custo normal.

**Pass se:** `streaming_cancelled == true` AND tone_score final ≥ 7 AND trace_cost ≤ R$ 7,50

---

### Case 9 — Cache hit performance (5 landings consecutivas, mesma voice)

**Input:** 5 execuções com mesma voice + framework, briefings variando produto/audience.

**Expected:** Cache hit ratio ≥ 70% a partir da 2ª execução. Custo médio cai 30% após 1ª.

**Pass se:** Média `cache_creation_input_tokens / total_input_tokens` ≤ 0,30 a partir da 2ª execução AND custo médio cases 2-5 ≤ R$ 3,50

---

### Case 10 — Fallback Mistral (Anthropic 529)

**Input:** Mock Anthropic retornando 529 (overloaded) em 3 tentativas seguidas.

**Expected:** Circuit breaker abre após 3 retries → roteia para Mistral Large via adapter. Output ainda passa schema. Trace marca `provider_used: "mistral"`.

**Pass se:** Output JSON válido AND `provider_used == "mistral"` AND tone_score ≥ 6 (Mistral aceita threshold mais baixo)

---

## Tipo B — Email Sequences (7 casos)

### Case 11 — Soap Opera 4 emails the CEO ⭐ critical_path

**Input:**
```json
{
  "output_type": "email_sequence",
  "product": "Lançamento Novais Digital Foundry",
  "audience": "founders SaaS",
  "framework": "soap_opera",
  "tone": "brand_voice_ceo",
  "email_count": 4
}
```

**Expected:** 4 emails. Cada um com `{ subject, preview_text, body, cta, send_offset_hours }`. Narrativa Soap Opera: cliffhanger ao fim do email N referenciado no email N+1. Subjects 35-55 chars. Bodies 280-420 palavras cada.

**LLM-as-judge prompt (Sonnet):**
> "Avalie 1-10 a aderência Soap Opera: (1) cada email tem cliffhanger explícito; (2) email N+1 referencia cliffhanger de N nas 3 primeiras linhas; (3) build-up emocional progressivo; (4) último email com revelação/CTA. Avalie em paralelo tom the CEO. Retorne JSON { framework_score, tone_score, narrative_continuity_score }."

**Pass se:** framework_score ≥ 7 E tone_score ≥ 7 E narrative_continuity_score ≥ 7 E todos subjects in [35, 55] chars

---

### Case 12 — Welcome series 3 emails

**Input:**
```json
{
  "output_type": "email_sequence",
  "framework": "welcome",
  "email_count": 3,
  "tone": "executivo_b2b"
}
```

**Expected:** Email 1 = boas-vindas + expectativas. Email 2 = melhor case/recurso. Email 3 = CTA upgrade/próximo passo.

**Pass se:** framework_score ≥ 7 (juiz valida 3 papéis)

---

### Case 13 — Re-engagement 5 emails

**Input:** `framework: "re_engagement"`, `email_count: 5`.

**Expected:** Sequência crescente: lembrete suave → valor recente → oferta → última chance → goodbye.

**Pass se:** framework_score ≥ 7 AND build-up de urgência detectável

---

### Case 14 — Email count fora do range (validação)

**Input:** `email_count: 8` (acima do máximo 5).

**Expected:** Sistema **REJEITA** no briefing intake antes de chamar Opus. Mensagem clara: "email_count must be in [3, 5]".

**Pass se:** Sistema NÃO consumiu tokens Opus AND mensagem inclui range válido

---

### Case 15 — Subjects acima de 60 chars (re-roll)

**Input:** Briefing complexo que puxa subjects longos.

**Expected:** Schema validator detecta subject > 60 chars → re-rolla **só os subjects** offending.

**Pass se:** Final JSON: 100% subjects ≤ 60 chars AND `re_roll_count.subjects ≥ 1`

---

### Case 16 — Narrative continuity falhou ⭐ critical_path

**Input:** Briefing Soap Opera com tema fragmentado (3 produtos diferentes).

**Expected:** Juiz detecta `narrative_continuity_score < 6`. Sistema marca `flagged_for_human_review: true` (não força re-roll completo — caro).

**Pass se:** `narrative_continuity_score < 7` AND `flagged_for_human_review == true` AND trace mostra warning

---

### Case 17 — Send offset hours coerente

**Input:** Sequência 4 emails Soap Opera padrão.

**Expected:** `send_offset_hours` em sequência crescente coerente (ex: 0, 24, 72, 168). Não pode ter offset negativo ou duplicado.

**Pass se:** offsets strictly_increasing AND offsets[0] == 0 AND offsets[N-1] ≤ 240

---

## Tipo C — Ad Sets (5 casos)

### Case 18 — 5 ads, 5 ângulos distintos default

**Input:**
```json
{
  "output_type": "ad_set",
  "product": "Evento online B2B - Novais Digital Day",
  "audience": "founders B2B Brasil",
  "framework": "tree_of_thought",
  "tone": "brand_voice_ceo"
}
```

**Expected:** 5 ads, cada um cobrindo 1 dos 5 ângulos canônicos (pain, aspiração, FOMO, autoridade, prova social). Diversidade cosine similarity ≤ 0,55 (≥0,45 em 1−sim).

**Pass se:** `angles.unique == 5` AND mean_similarity ≤ 0,55 AND max_pair_similarity ≤ 0,65

---

### Case 19 — Limites Meta respeitados

**Input:** Qualquer ad_set válido.

**Expected:** 100% dos ads com `headline ≤ 40 chars`, `primary_text ≤ 125 chars (recomendado, soft limit warning se > 125 mas ≤ 200)`, `description ≤ 30 chars`.

**Pass se:** Limites hard respeitados em 100% AND warnings ≤ 1 por set

---

### Case 20 — Diversity falha (re-roll dos 2 mais similares)

**Input:** Briefing que historicamente produz 2+ ads similares (mesmo ângulo).

**Expected:** Sistema detecta similarity > 0,55 entre par específico, identifica os 2 ads mais similares, re-rolla apenas esses 2 (re-prompt com instrução de ângulo diferente).

**Pass se:** Final similarity ≤ 0,55 AND `re_roll_count.ads ≤ 2` AND trace_cost ≤ R$ 3,50

---

### Case 21 — Diversity persistente baixa (warning, sem terceira tentativa)

**Input:** Briefing genérico que provoca ângulos pouco diferenciáveis.

**Expected:** Após 2 re-rolls, se similarity ainda > 0,55, sistema entrega com `diversity_warning: true` em vez de re-rollar infinitamente.

**Pass se:** `re_roll_count.ads == 2` AND `diversity_warning == true` AND entrega < 900s

---

### Case 22 — Tom inadequado para ads (forçado) ⭐ critical_path

**Input:** Voice id alternativa muito formal aplicada a ad set (mismatch).

**Expected:** Juiz detecta `tone_score < 7` (tom inadequado para ad curto). Sistema entrega + flag para review.

**Pass se:** `tone_score < 7` AND `flagged_for_human_review == true`

---

## Edge cases transversais (2 casos)

### Case 23 — Briefing vago (rejeita amigavelmente)

**Input:**
```json
{
  "output_type": "landing",
  "product": "alguma coisa boa"
}
```

**Expected:** Sistema **REJEITA** no intake (faltam audience, framework, tone). NÃO consome tokens Opus. Mensagem amigável lista 4 campos faltantes.

**Pass se:** `tokens_consumed_opus == 0` AND mensagem inclui 4 campos faltantes

---

### Case 24 — Framework incompatível com output_type

**Input:** `output_type: "ad_set"` + `framework: "soap_opera"` (Soap Opera é exclusivo de email).

**Expected:** Sistema **REJEITA** no intake. Mensagem: "framework 'soap_opera' não compatível com output_type 'ad_set'. Use tree_of_thought."

**Pass se:** `tokens_consumed_opus == 0` AND mensagem sugere framework correto

---

## Agregados esperados

| Métrica | Target |
|---------|:------:|
| Pass rate geral | ≥ 85% (≥ 21/24) |
| Pass rate critical_path (5 cases) | 100% (5/5) |
| Tom score médio | ≥ 7,5/10 |
| Framework adherence médio | ≥ 7,8/10 |
| Diversity médio (Tipo C) | ≥ 0,45 (1 − sim) |
| Tempo médio Tipo A | ≤ 12 min |
| Tempo médio Tipo B | ≤ 11 min |
| Tempo médio Tipo C | ≤ 8 min |
| Custo médio Tipo A | ≤ R$ 4,75 |
| Custo médio Tipo B | ≤ R$ 3,12 |
| Custo médio Tipo C | ≤ R$ 2,28 |
| SLA achievement rate (≤900s) | ≥ 95% |

## LLM-as-judge — prompts canônicos

### Juiz para PAS (Tipo A)
> "Você é avaliador de copywriting framework PAS. Receberá uma landing page e deverá pontuar 1-10: (a) Problem identification clarity; (b) Agitation amplification com dados; (c) Solution-problem fit; (d) Transições legíveis entre as 3 fases. Retorne JSON `{ framework_score, tone_score, breakdown: [...] }`."

### Juiz para AIDA (Tipo A)
> "Avalie aderência AIDA: Attention (hero captura), Interest (problem desenvolve), Desire (solution + proof), Action (CTA claro e único). Retorne JSON com scores por fase."

### Juiz para StoryBrand (Tipo A)
> "Avalie aderência StoryBrand: cliente como herói? produto como guia (não herói)? plano em 3 passos? CTA principal + transitional? stakes definidos? success/failure visualizado? Retorne JSON com 7 sub-scores."

### Juiz para 4Ps (Tipo A)
> "Avalie aderência 4Ps: Promise (clara e mensurável), Picture (visualização do estado pós-compra), Proof (social + dados + autoridade), Push (CTA com urgência). Retorne JSON com 4 sub-scores."

### Juiz para Soap Opera (Tipo B)
> "Avalie aderência Soap Opera Sequence: cliffhanger em cada email N? referência clara ao cliffhanger no email N+1? build-up emocional progressivo? revelação no último? Retorne JSON com 4 sub-scores + narrative_continuity_score."

### Juiz para Tree-of-Thought (Tipo C)
> "Avalie ad set: cada um dos 5 ads cobre um ângulo distinto entre [pain, aspiração, FOMO, autoridade, prova social]? Há 2+ ads com mesmo ângulo? Cada ad tem hook claro nos primeiros 40 chars? Retorne JSON `{ angles_detected: [...], unique_count, angle_clarity_score }`."

### Juiz universal para tom the CEO
> "Avalie 1-10 se o texto segue tom the CEO: (1) direta, sem rodeios; (2) usa dados/números específicos; (3) cria urgência sem ser apelativa; (4) ausência de clichês marketeiros; (5) cadência curta-curta-longa. Retorne JSON `{ tone_score, drift_detected_per_third: [boolean×3] }`."

## Versionamento

Eval cases versionados em git. Adicionar/remover case = bump PATCH do SKU. Mudar prompt de juiz = bump MINOR (afeta scores históricos).

**Próxima evolução (wave 3, pós-SHADOW):**
- Cases 25-30 cobrindo frameworks emergentes (B-A-B, FAB, QUEST)
- Cases multi-língua (inglês, espanhol) na wave 3
- Cases de handoff Designer Agent (validar contrato JSON consumível downstream)

## Próximo passo

→ Criar runner de eval em `src/eval/copywriter-agent.runner.ts`
→ CI workflow `foundry-eval` rodando este arquivo + alarmes em pass rate drop
→ Tracker de pass rate no Mixpanel + breakdown por framework
→ Validar com `@po-guardian` os 5 critical_path cases antes de SHADOW
