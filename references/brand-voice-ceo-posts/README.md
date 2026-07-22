# Corpus "The CEO" — calibração de tom de voz (persona sintética)

> **Disclaimer:** "The CEO" é uma **persona fictícia** (fundadora/investidora
> brasileira) criada para demonstrar o pipeline de calibração de brand voice
> deste framework. Nenhum conteúdo neste diretório pertence a uma pessoa real.
> Na versão privada original, este diretório continha um corpus de posts
> públicos coletados manualmente; esse material foi **removido da versão
> pública** e substituído por esta descrição do método.

## Propósito

Documentar o método de calibração de tom de voz usado pelo
`social-media-agent`: coletar um corpus pequeno e auditável de posts de
referência, destilar padrões estruturais e usar essa destilação como fonte
única para o system prompt e para os eval-cases.

## Conteúdo

- [`PATTERNS.md`](./PATTERNS.md) — destilação estruturada dos padrões da
  persona (macro-estrutura de post, modos de hook, fórmulas de contraste
  binário, vocabulário-assinatura, CTA, anti-padrões). É o input canônico
  para [prompts/social-media-agent/system-prompts/brand_voice_ceo.md](../../prompts/social-media-agent/system-prompts/brand_voice_ceo.md)
  e para os eval-cases em [evals/social-media-agent/cases/](../../evals/social-media-agent/cases/).

## Método (replicável com o seu próprio corpus)

1. **Coleta manual** de 10-15 posts representativos da voz a replicar
   (copiar/colar com frontmatter: título, data, hashtags, "era", fontes
   citadas, recurso retórico dominante). Scraping automatizado de redes
   sociais viola ToS — a política do projeto é coleta manual.
2. **Estratificação temporal** ("eras"): peso dominante para os posts mais
   recentes; posts antigos mostram o que a voz **deixou de fazer**.
3. **Destilação** em um `PATTERNS.md`: estrutura em blocos, modos de hook,
   fórmulas de contraste, vocabulário-assinatura, anti-padrões.
4. **Propagação**: PATTERNS.md → system prompt versionado
   (`prompts/social-media-agent/v0.x.0/`) → eval-cases com LLM-as-judge →
   loop de refinamento.

## Distribuição temporal usada na demo

| Período | Posts | "Era" |
|---|---|---|
| Era atual | 3 | `era_atual` — provocador, dados + contraste binário |
| Transição | 3 | `transicao` — caso de estudo, didático |
| Antiga | 4 | `educativa` — expositivo, listas de conceitos |

## Regras de uso

- ✅ Calibração interna do prompt `brand_voice_ceo.md` e dos eval-cases.
- ✅ Análise contrastiva entre output do agente e padrões destilados
  (LLM-as-judge).
- ❌ Não usar o pipeline para publicar conteúdo atribuindo autoria a uma
  pessoa real. O agente produz **em um estilo**, nunca **como alguém**.
- ❌ Não usar corpora coletados para fine-tuning sem autorização explícita
  do titular do conteúdo.
