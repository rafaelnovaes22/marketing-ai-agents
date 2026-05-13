---
sku_id: video-editor-agent
eval_date: 2026-05-13
total_cases: 22
authored_by: "@eval-engineer (Guardian)"
judge_model: claude-sonnet-4.6
pass_threshold: 0.85
critical_path_cases: [1, 6, 11, 14, 18]
scenario_scope: A_only
---

# Eval Cases — Video Editor Agent (Cenário A)

> 22 casos cobrindo seleção de cortes, multi-aspect, legendas multi-idioma, edge cases, SLA.
> Pass rate alvo: ≥85% (≥19 de 22) para promover a SHADOW.
> Cenário B (Veo 3) NÃO testado nesta wave — ver `out-of-scope.md`.

## Como rodar

```bash
npm run eval video-editor-agent
```

Output: `reports/eval-video-editor-agent-{date}.md` com score por case + médias agregadas.

---

## Bloco A — Seleção de cortes inteligentes (5 cases)

### Case 1 — Cortes em palestra 30min ⭐ critical_path

**Input:**
```json
{
  "video_url": "s3://test/palestra-ceo-30min.mp4",
  "duration_seconds": 1800,
  "language": "pt-BR",
  "max_clips": 3
}
```

**Expected outcome:**
- 3 clips selecionados, cada 30-90s
- Cada clip contém hook + payoff identificáveis
- Cut quality score ≥ 7/10 (LLM-as-judge)
- Tempo total ≤ 600s

**LLM-as-judge prompt:**
> "Avalie em escala 1-10: (1) o clip tem hook claro nos primeiros 3s? (2) tem payoff/conclusão antes do fim? (3) faz sentido fora de contexto da palestra inteira? (4) duração apropriada para Reels/TikTok? ≥7 = pass."

**Pass se:** 3 clips entregues E score médio ≥ 7 E tempo ≤ 600s

---

### Case 2 — Cortes em live 60min

**Input:** Live 60min, max_clips=5

**Expected:** 4-5 clips, hooks variados (problema, dado, prova social, CTA, controversa)

**Pass se:** ≥4 clips E score médio ≥ 7 E tempo ≤ 600s

---

### Case 3 — Cortes em podcast 90min (limite hard cap)

**Input:** Podcast 90min B2B SaaS

**Expected:** Sistema aceita (≤90min), seleciona 5 clips de momentos diferentes

**Pass se:** 5 clips E nenhum clip do mesmo trecho 5min de contiguidade E score médio ≥ 7

---

### Case 4 — Identificação de CTA explícito

**Input:** Vídeo onde palestrante diz "acessa meu site acme.social/curso" no minuto 42

**Expected:** Um dos clips selecionados contém o CTA OU sistema gera CTA artificial no script

**Pass se:** Trace mostra `cta_detected: true` OR script de pelo menos 1 clip inclui CTA equivalente

---

### Case 5 — Vídeo sem hook claro (degradação aceita)

**Input:** Vídeo monótono (palestra técnica densa sem ganchos)

**Expected:** Sistema entrega clips mas marca `low_hook_quality: true` E score ≤6 documentado

**Pass se:** N_clips entregues ≥ 1 E `flagged_for_human_review == true`

---

## Bloco B — Multi-aspect ratio (3 cases)

### Case 6 — Renderização 9:16 com face-aware crop ⭐ critical_path

**Input:** Vídeo 16:9 com speaker no centro-direita

**Expected:** Versão 9:16 mantém o speaker enquadrado (face detection ativo)

**Pass se:** Vision check confirma `face_in_safe_area: true` em ≥90% dos frames do clip 9:16

---

### Case 7 — Renderização 1:1 (Instagram feed)

**Input:** Mesmo vídeo case 6

**Expected:** Crop center-weighted, lower-third visível, sem ultrapassar safe area

**Pass se:** Arquivo MP4 H.264 1080x1080 ≤25MB E lower-third dentro safe area

---

### Case 8 — Renderização 16:9 (YouTube/Twitter)

**Input:** Mesmo vídeo

**Expected:** Mantém aspect original (ou letterbox se input não-16:9), full HD 1920x1080

**Pass se:** Arquivo MP4 H.264 1920x1080 ≤25MB E sem distorção

---

## Bloco C — Legendas multi-idioma (5 cases)

### Case 9 — Legendas PT-BR (master) precisão ≥95%

**Input:** Vídeo PT-BR com gírias ("massa", "trampo", "véi")

**Expected:** Transcript word-level ≥95% acurácia (LLM-as-judge sample 10 trechos)

**Pass se:** Acurácia ≥95% E SRT sincronizado word-level

---

### Case 10 — Tradução EN-US com glossário B2B

**Input:** Caption PT-BR "Esse SaaS escala growth 10x sem CAC explodir"

**Expected:** EN preserva termos técnicos: "This SaaS scales growth 10x without CAC exploding" (não traduz "growth"/"CAC")

**Pass se:** LLM-judge confirma preservação de jargão E tradução natural ≥8/10

---

### Case 11 — Tradução ES (Espanhol LATAM neutro) ⭐ critical_path

**Input:** Caption PT-BR

**Expected:** ES sem regionalismos fortes (não "vosotros", não "che")

**Pass se:** LLM-judge confirma "Spanish neutral LATAM" E acurácia ≥95%

---

### Case 12 — Tradução FR (Francês padrão)

**Input:** Caption PT-BR

**Expected:** FR padrão (Paris), accents corretos

**Pass se:** Acurácia ≥95% E accents preservados (UTF-8 SRT)

---

### Case 13 — Tradução IT (Italiano)

**Input:** Caption PT-BR

**Expected:** IT idiomático

**Pass se:** Acurácia ≥95%

---

## Bloco D — Hardcoded subs na 9:16 (ADR-003-VE)

### Case 14 — Subs queimadas na 9:16 ⭐ critical_path

**Input:** Clip 60s

**Expected:** Versão 9:16 tem legendas queimadas (drawtext/libass), versões 1:1 e 16:9 NÃO têm hardcoded (só SRT separado)

**Pass se:** Vision check 9:16 = legenda visível em ≥80% dos frames com fala E 1:1/16:9 sem texto queimado

---

### Case 15 — Subs sincronizadas word-level

**Input:** Vídeo com fala rápida (>180wpm)

**Expected:** Legendas aparecem palavra-a-palavra com timing ≤200ms de offset

**Pass se:** Sample 5 timestamps confere com áudio ≤200ms drift

---

## Bloco E — Edge cases (4 cases)

### Case 16 — Vídeo >90min (cap acionado)

**Input:** Vídeo 120min

**Expected:** Sistema REJEITA antes de chamar Scribe (circuit breaker) com mensagem clara

**Pass se:** Sistema NÃO consumiu tokens Scribe E mensagem inclui sugestão de trim manual

---

### Case 17 — Vídeo sem áudio (mudo)

**Input:** Vídeo silent demo (sem fala)

**Expected:** Sistema detecta áudio mudo via Scribe (0 segmentos) e retorna erro estruturado

**Pass se:** `error_code: "no_audio_detected"` E sistema não tenta cortar às cegas

---

### Case 18 — Vídeo só com música (sem fala) ⭐ critical_path

**Input:** Trecho de vídeo com música de fundo mas sem narração

**Expected:** Scribe retorna 0 palavras → sistema marca `transcript_empty: true` e degrada graciosamente OU oferece cortes só visuais

**Pass se:** Não publica conteúdo com transcrição falsa E retorna mensagem clara

---

### Case 19 — Input corrompido / formato inválido

**Input:** Arquivo .mov com codec não-suportado

**Expected:** FFmpeg falha graciosamente, sistema retorna erro estruturado

**Pass se:** `error_code: "input_format_unsupported"` E sugestão de re-encoding para MP4 H.264

---

## Bloco F — SLA + custo (3 cases)

### Case 20 — SLA borderline (10min limit)

**Input:** Vídeo 90min (worst case dentro do cap)

**Expected:** Processamento total ≤ 600s

**Pass se:** total_seconds ≤ 600 E todos os outputs entregues

---

### Case 21 — SLA violation (timeout gracioso)

**Input:** Cenário forçado (Scribe lento + FFmpeg retry)

**Expected:** Sistema retorna após 600s com `sla_violated: true`

**Pass se:** total_seconds ≤ 650 (margem shutdown) E flag setada

---

### Case 22 — Custo dentro do limite C3

**Input:** Vídeo 60min típico

**Expected:** Custo total ≤ R$ 7,50

**Pass se:** Trace cost ≤ R$ 7,50 (alarme hard-stop em R$ 7,50)

---

## Agregados esperados

| Métrica | Target |
|---------|:------:|
| Pass rate geral | ≥ 85% (≥ 19/22) |
| Pass rate critical_path (5 cases) | 100% (5/5) |
| Cut quality score médio | ≥ 7,5/10 |
| Transcription accuracy média | ≥ 95% |
| Translation quality média (4 idiomas) | ≥ 8/10 |
| Brand consistency média | ≥ 95% |
| Tempo médio | ≤ 8 min |
| Custo médio | ≤ R$ 5,00 |

## LLM-as-judge prompt central

```
Você é juiz de qualidade de vídeos curtos para redes sociais.
Avalie o clip recebido nas dimensões:

1. HOOK (1-10): primeiros 3s capturam atenção?
2. PAYOFF (1-10): tem conclusão/insight antes do fim?
3. STANDALONE (1-10): faz sentido fora do contexto do vídeo longo?
4. SOCIAL_FIT (1-10): apropriado para Reels/TikTok/Shorts?

Output JSON:
{
  "hook": <int>,
  "payoff": <int>,
  "standalone": <int>,
  "social_fit": <int>,
  "overall": <média>,
  "justification": "..."
}

≥7 overall = pass.
```

## Versionamento

Eval cases versionados em git. Adicionar/remover case = bump PATCH do SKU.

**Próxima evolução:**
- Wave 2 consumer: cases 23-30 cobrirão Cenário B (Veo 3) quando `video-editor-agent-premium` for ativado.
- Adicionar idiomas DE, JA, ZH (wave 2 i18n).

## Próximo passo

→ Criar runner de eval em `src/eval/video-editor-agent.runner.ts`
→ CI workflow `forge-eval` rodando este arquivo
→ Tracker de pass rate no Mixpanel
