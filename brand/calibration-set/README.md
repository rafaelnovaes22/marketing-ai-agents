# Calibration Set — Designer Agent (DES-T4.1 → T4.3)

Set de 50 imagens curadas humanamente para calibrar o `BrandValidatorAdapter`.
**Gate inquebrantável:** concordância humano × validator ≥ 90% antes de promover designer-agent para SHADOW (ADR-001-DES + lifecycle-stage.md gate 5).

## Mix exigido

| Bucket | Qtd | Expectativa de score humano | Pasta |
|--------|----:|---|---|
| **on-brand** | 20 | ≥ 99 | `on-brand/` |
| **borderline** | 15 | 96–98 | `borderline/` |
| **off-brand** | 15 | < 96 | `off-brand/` |

## Origem das imagens (fluxo aprovado)

Gere as 50 via **Higgsfield web UI** (one-shot, não como adapter de produção — ver benchmarking 2026-05-20):

1. **on-brand (20)** — Upload os frames do screencast de referência (assets não incluídos no repo público) como style reference; gere 7 variações dirigidas mantendo paleta + composição Novais Digital. Os frames originais contam — copie-os para `on-brand/` também (já são `brand_score: 1.0` no `novais-digital-brand-guide.yaml`).
2. **borderline (15)** — Solte o style strength, peça desvios sutis: "mesma paleta mas tipografia serif", "cores Novais Digital mas composição assimétrica", "Inter mas cantos retos".
3. **off-brand (15)** — Prompts ostensivamente fora da marca: "Comic Sans, paleta amarelo/vermelho, gradient roxo", "stock photo com texto Times New Roman", "layout caótico cores neon".

**Nomeação:** `{bucket}_{NN}.png` (ex: `on_001.png`, `border_007.png`, `off_012.png`). Formato `.png` ou `.jpg`/`.jpeg`. Resolução-alvo 1080×1350 (4:5 carrossel) mas qualquer resolução funciona — o validator opera sobre conteúdo visual.

## Pipeline

```bash
# 1. Após colocar as 50 imagens nas 3 pastas:
npm run brand:calibration:seed
#   → gera/atualiza brand/calibration-ratings.csv com 1 linha por imagem

# 2. Você preenche as 5 colunas humanas no CSV (DES-T4.2, ~1.5h):
#    - color_0_100, typography_0_100, composition_0_100, corner_radius_0_100, score_total_0_100, notes

# 3. Rodar o validator nas 50 e medir concordância (DES-T4.3):
npm run brand:calibration:run
#   → consome OpenAI Anthropic API (ANTHROPIC_API_KEY no .env)
#   → emite relatório brand/calibration-set/runs/{ISO_TIMESTAMP}.md
#   → exit 0 se concordância ≥ 90% / exit 1 se < 90%
```

## Critérios de rating (4 dimensões)

Cada dimensão 0–100. `score_total` pode ser média ponderada conforme `validator_rules.score_weight` do brand_guide.yaml (color 0.4, typography 0.3, composition 0.2, corner_radius 0.1), ou seu julgamento direto — declare em `notes` se desviar da média.

- **color (40%)** — imagem usa exclusivamente cores de `colors.primary` + `colors.secondary`? Qualquer cor fora = penalidade proporcional.
- **typography (30%)** — texto em Inter (ou fallback `Manrope/Geist/system-ui`)? Headlines bold/black + body regular/medium?
- **composition (20%)** — center-aligned + whitespace generoso + grid claro?
- **corner_radius (10%)** — botões pill, cards `16px`, badges `12px`?

## Gate de promoção

| Resultado `run-brand-calibration.ts` | Ação |
|---|---|
| Concordância ≥ 90% **e** MAE ≤ 5pp | Gate 5 do lifecycle-stage **liberado**; segue Wave 4 → 5 |
| Concordância 85–89% | Iteração 1: tunar prompt do validator (DES-T4.4) e re-rodar |
| Concordância < 85% | Iteração 2 + revisão de critérios (DES-T4.5); se persistir, abrir ADR para revisar threshold ou troca de juiz |

## Arquivos não versionados

PNG/JPG das 50 imagens **não vão pro git** (gitignore em `.gitignore` raiz já cobre `brand/calibration-set/*/*.png|*.jpg|*.jpeg`). Apenas `.gitkeep` + README + CSV + reports são tracked.
