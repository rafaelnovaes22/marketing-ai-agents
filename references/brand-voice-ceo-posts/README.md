# Corpus the CEO — calibração de tom de voz

## Propósito

Este corpus é a **fonte única e auditável** dos padrões reais de escrita da
the CEO usados para calibrar o `social-media-agent` do Novais Digital Social
(prompt em [prompts/social-media-agent/system-prompts/brand_voice_ceo.md](../../prompts/social-media-agent/system-prompts/brand_voice_ceo.md)).

Foi criado em D4 do roadmap 14-dias, depois que a inspeção do prompt
existente revelou que ele havia sido escrito apenas com 2 few-shot
sintéticos + princípios descritos de cabeça, sem corpus real de referência.

## Conteúdo

- [`PATTERNS.md`](./PATTERNS.md) — destilação estruturada dos padrões
  observados nos 10 posts (output principal — input para refator do prompt
  e expansão de eval-cases).
- [`posts/`](./posts/) — 10 posts brutos com frontmatter (title, date,
  hashtags, era, fontes citadas, recurso dominante).

## Fonte e método de coleta

- **Origem:** LinkedIn público da the CEO (https://www.linkedin.com/in/brandprofile)
- **Método:** coleta **manual** pelo founder (Rafael de Novaes) em
  2026-05-18, copiando-colando o texto integral de cada post.
- **Motivo de ser manual:** scraping automatizado do LinkedIn viola o ToS
  da plataforma e expõe a conta a banimento — política do projeto.

## Distribuição temporal (importante para calibração)

| Período | Posts | "Era" |
|---|---|---|
| 2026 (fev) | 1, 2, 3 | `2026_codigo_ceo` — atual, provocador, dados+contraste |
| 2024–2025 | 4, 5, 6 | `2024_2025_transicao` — caso de estudo, didático |
| 2021 | 7, 8, 9, 10 | `2021_educativo` — expositivo, listas de conceitos |

O `PATTERNS.md` dá **peso dominante aos posts 1-3** (era atual). Posts
antigos servem como contexto histórico e mostram o que ela **deixou de
fazer** (didatismo expositivo, "a gente/nós").

## Uso autorizado

- ✅ **Calibração interna** do prompt `brand_voice_ceo.md` e dos
  eval-cases do `social-media-agent`.
- ✅ **Análise contrastiva** entre output do agente e padrões reais
  (LLM-as-judge).
- ✅ **Few-shot examples** com trechos curtos citando a fonte.
- ❌ **Não redistribuir** o corpus fora deste repositório.
- ❌ **Não publicar** posts gerados pelo agente atribuindo autoria à
  the CEO. O agente produz no **estilo dela**, não como ela.
- ❌ **Não usar** para fine-tuning de modelo sem autorização explícita.

## Status

- Coleta: ✅ 2026-05-18 (10 posts)
- PATTERNS.md: ✅ 2026-05-18
- Próxima coleta planejada: quando refator do prompt revelar lacunas
  (ex: posts sobre captação de funding, sobre vendas B2B enterprise).
