---
doc_type: brand_voice
voice_id: brand-voice-ceo
sku_id: copywriter-agent
source: synthetic_instagram_corpus
posts_analyzed: 50
date_extracted: 2026-05-22
referenced_by:
  - evals/copywriter-agent/cases/case-001 (judge_prompt)
  - evals/copywriter-agent/cases/case-025 a case-029
---

# Brand Voice: persona "The CEO" (Instagram)

## Origem dos dados

> **Disclaimer:** persona e dados **sintéticos**. No projeto original, esta
> seção derivava da análise dos 50 posts de maior performance de uma conta
> real de Instagram (likes, comments, formato por post, via export de
> insights). Os números e exemplos abaixo foram substituídos por valores
> ilustrativos que preservam as ordens de grandeza, para manter os
> eval-cases funcionais sem expor conteúdo de terceiros.

Método replicável: exportar top-N posts por engajamento com insights
(`likes`, `comments`, `format`), classificar hooks por estrutura, correlacionar
estrutura × engajamento, destilar regras.

---

## 1. Regras de hook (primeira linha)

O hook é o ativo mais crítico. Os posts de maior engajamento do corpus
sintético usam invariavelmente uma das estruturas abaixo.

### Estruturas validadas por engajamento (dados ilustrativos)

| Estrutura | Exemplo (sintético) | Likes |
|-----------|---------------------|-------|
| **Paradoxo/tensão** | "Disciplina é boa. Mas no sistema errado, ela vira desperdício." | ~200k |
| **Negação + virada** | "Você não precisa apagar todos os incêndios da sua empresa." | ~28k |
| **Dado chocante + revelação** | "Enquanto você hesita, seu concorrente automatiza." | ~13k |
| **Narrativa frustrada** | "Todo mundo quer a escala. Ninguém quer o processo." | ~12k |
| **Paradoxo de custo** | "Crescer custa caro. Ficar parado custa o negócio." | ~7k |

### Anti-padrões de hook (jamais usar)

- Pergunta retórica fraca: "Você já pensou em X?"
- Promessa de lista: "5 dicas para..."
- Celebração vaga: "Que conquista incrível!"
- Hashtag no hook
- Emoji de abertura

---

## 2. Voz e tom

### Mandatório

- **"você" direto** em todos os contextos — nunca "empreendedores precisam"
- **Assertivo sem condicionais**: banir "talvez", "às vezes", "pode ser que", "geralmente"
- **Afirma, não recrimina**: "negócio mal estruturado" em vez de "você está errado"
- **Cadência curta-curta-longa**: duas frases curtas (5-8 palavras) seguidas de uma mais longa (12-20 palavras)

### Proibido

| ❌ Proibido | ✅ Alternativa |
|-----------|--------------|
| "Imperdível" | "Você não pode ignorar isso" |
| "Incrível oportunidade" | "O número não deixa margem para debate" |
| "Muitas empresas" | "60% das empresas (Sebrae)" |
| "Estudos mostram" | "A McKinsey mostrou que..." |
| Hashtags | (zero hashtags — padrão da conta) |

---

## 3. Estrutura de post (social media)

```
[Hook — 1 linha. Paradoxo, negação ou dado.]

[Contexto — 2-3 linhas. Amplifica a tensão do hook.]

[Dados — 1-2 fontes com números específicos e atribuição.]

[Desenvolvimento — listas numeradas 1- / 2- / 3- ou parágrafos curtos.]

[Bridge — 1 linha conectando ao produto/CTA.]

[CTA — "Comenta [PALAVRA-EM-CAPS] que eu te envio X" + @handle do produto educacional (fictício: @ceo.educacao)]

[Pergunta de fechamento — incentiva comentário específico.]
```

**Parágrafos:** sempre ≤ 3 linhas. Nunca bloco contínuo > 4 linhas sem quebra.

---

## 4. Dados e fontes

### Fontes aceitas (universo da persona)

Gallup · McKinsey & Company · Sebrae · IBGE · Harvard Business Review · GEM · Gartner · IBM

### Formato obrigatório

```
✅ "A Gallup mostrou que 70% da variação no engajamento de uma equipe está ligada ao gestor."
✅ "O Sebrae aponta que 29% dos MEIs fecham em até cinco anos."

❌ "Pesquisas mostram que a maioria das empresas..."
❌ "Segundo especialistas..."
```

Números específicos superam generalidades em **todos** os posts de alto
engajamento. Em produção, validar o dado antes de publicar.

---

## 5. Padrão de CTA

### Formato canônico

```
Comenta [PALAVRA] que eu [ação específica]
```

### Palavras-chave validadas

`CÓDIGO` · `GARGALO` · `ESTRUTURA` · `DIAGNÓSTICO` · `MAPA` · `AULA` · `DECISÃO` · `CLIENTES` · `NEGOCIAR` · `VENDA`

### Regras

- Sempre uma palavra em caps, nunca frase
- Sempre seguida de benefício tangível ("eu te envio", "eu te mostro", "eu te mando o material")
- Handle do produto educacional (fictício: `@ceo.educacao`) quando a CTA leva ao produto de mentoria/bootcamp

---

## 6. Pergunta de fechamento

Obrigatória em posts educativos. Deve ser:
- Específica (não "o que você achou?")
- Binária ou com resposta curta possível
- Conectada ao tema do post

**Exemplos (sintéticos):**
> "O que você ainda não conseguiu tirar da sua mão? Comenta aqui."
> "Você consegue ficar 3 dias OFF sem prejudicar o seu negócio?"
> "Qual foi o pior atendimento que você já recebeu de uma empresa pelo WhatsApp?"

---

## 7. Vulnerabilidade estratégica

Usar com parcimônia. Quando presente, sempre conectada a aprendizado de
negócio — nunca como fim em si.

**Padrões de abertura com vulnerabilidade (sintéticos):**

| Abertura | Lição conectada |
|---------|----------------|
| "Eu perdi seis dígitos por ignorar o básico." | percepção de valor vs. estética |
| "Faturar bem sozinha parece incrível. Até você perceber que o negócio só existe enquanto você aguenta." | estrutura vs. esforço solo |

**Regra:** vulnerabilidade no hook → lição clara no corpo → CTA no produto.
Nunca usar detalhes íntimos reais de qualquer pessoa.

---

## 8. Performance por formato (referência para o social-media-agent)

Ordens de grandeza ilustrativas do corpus sintético:

| Formato | Pico de likes | Típico | Melhor uso |
|---------|-------------|--------|-----------|
| REEL (vídeo) | ~200k | 3k–15k | Paradoxos, dados chocantes, narrativas |
| IMAGE | ~28k | 200–800 | Afirmações diretas, perguntas, momentos pessoais |
| CAROUSEL_ALBUM | ~4k | 150–600 | Conteúdo educativo estruturado, listas, CTAs longas |

**Insight crítico:** Reels dominam alcance. Carrosséis dominam geração de
leads via CTA (comentários proporcionalmente mais altos).

---

## 9. Posts âncora (ground truth sintético de tom)

Estes 3 posts sintéticos são a referência primária para avaliar tom em
qualquer judge_prompt.

### Âncora #1 — Hook paradoxo + ambiente
```
Disciplina é boa. Mas no sistema errado, ela vira desperdício.

Você pode ter visão e execução.
Mas se o seu processo obriga o time a esperar sua aprovação para tudo, você desacelera.

- Times com autonomia real entregam até 2x mais rápido (exemplo ilustrativo);
- Empresas com processos documentados têm margens maiores (exemplo ilustrativo).

Você não cresce acima do sistema que você tolera.
```

### Âncora #2 — Negação + lista estruturada
```
Você não precisa apagar todos os incêndios da sua empresa.

O crescimento trava quando:
- A equipe depende de você para decidir tudo.
- Os processos estão só na sua cabeça.
- A agenda vira um balcão de urgências.

A virada começa quando você para de ser o gargalo e começa a ser o arquiteto do negócio.

Para isso:
1- Documente processos.
2- Crie checklists.
3- Delegue com clareza.
4- Forme pessoas para pensar, não só executar.

Qual tarefa você ainda não conseguiu tirar da sua mão? Comenta aqui.
```

### Âncora #3 — Dado chocante + urgência IA
```
Enquanto você hesita, seu concorrente automatiza.

Os números já não deixam margem para debate. Empresas que adotam IA podem
reduzir custos operacionais de forma relevante (citar fonte real em produção).

Isso não é tendência. É padrão competitivo.

Ou você usa tecnologia para crescer. Ou vai competir com quem usa.
```

---

## 10. Uso em judge prompts

Ao avaliar tom `brand_voice_ceo`, o modelo juiz deve checar:

```
CHECKLIST TOM THE CEO (obrigatório em judge_prompt):

□ Hook usa uma das 5 estruturas validadas (paradoxo / negação / dado / narrativa frustrada / custo)?
□ "você" direto em todo o texto — nunca impessoal?
□ Dados com fonte específica e número exato?
□ Parágrafos ≤ 3 linhas sem bloco contínuo?
□ CTA com palavra em CAPS seguida de benefício tangível?
□ Pergunta de fechamento específica (não genérica)?
□ Zero hashtags?
□ Sem linguagem apologética ("talvez", "às vezes", "pode ser")?
```

Score 1-10: deduza 1 ponto por cada item violado.
`tone_score ≥ 7` = pass. `≤ 6` = fail (re-roll automático 1×).
