---
doc_type: brand_voice
voice_id: brand-voice-ceo
sku_id: copywriter-agent
source: instagram_analysis_top_50
posts_analyzed: 50
likes_range: [175, 198452]
date_extracted: 2026-05-22
referenced_by:
  - evals/copywriter-agent/cases/case-001 (judge_prompt)
  - evals/copywriter-agent/cases/case-025 a case-029
---

# Brand Voice: the CEO

## Origem dos dados

Análise de 50 posts de maior performance do Instagram @brandprofile (abr–mai 2026).
Dados extraídos de: `instagram_top_50_with_insights.json`, `instagram_hooks.json`, `instagram_carousels.json`, `instagram_cases.json`.

---

## 1. Regras de hook (primeira linha)

O hook é o ativo mais crítico. Os 5 posts de > 10k likes usam invariavelmente uma das estruturas abaixo.

### Estruturas validadas por engajamento

| Estrutura | Exemplo real | Likes |
|-----------|-------------|-------|
| **Paradoxo/tensão** | "Talento é bom. Mas no ambiente errado, ele morre." | 198.452 |
| **Negação + virada** | "Você não precisa ser o herói com o extintor sempre na mão." | 27.959 |
| **Dado chocante + revelação** | "Você está ignorando o óbvio." (→ robôs na China) | 13.100 |
| **Narrativa frustrada** | "Todo mundo ama falar de sucesso. Ninguém quer viver o começo." | 12.104 |
| **Paradoxo de custo** | "Crescer dói, mas estagnar custa mais caro." | 6.633 |

### Anti-padrões de hook (jamais usar)

- Pergunta retórica fraca: "Você já pensou em X?"
- Promessa de lista: "5 dicas para..."
- Celebração vaga: "Que conquista incrível!"
- Hashtag no hook
- Emoji de abertura (exceto 🪷 em conteúdo pessoal muito específico)

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

[CTA — "Comenta [PALAVRA-EM-CAPS] que eu te envio X" + @feneducacao]

[Pergunta de fechamento — incentiva comentário específico.]
```

**Parágrafos:** sempre ≤ 3 linhas. Nunca bloco contínuo > 4 linhas sem quebra.

---

## 4. Dados e fontes

### Fontes aceitas (usadas na conta)

Gallup · McKinsey & Company · Sebrae · IBGE · Harvard Business Review · GEM · Gartner · IBM · Dominican University · Simon Sinek · Noel Tichy

### Formato obrigatório

```
✅ "A Gallup mostrou que 70% da variação no engajamento de uma equipe está ligada ao gestor."
✅ "O Sebrae aponta que 29% dos MEIs fecham em até cinco anos."
✅ "Segundo a McKinsey, empresas que implementam IA de forma estratégica podem aumentar o fluxo de caixa em até 20%."

❌ "Pesquisas mostram que a maioria das empresas..."
❌ "Segundo especialistas..."
```

Números específicos superam generalidades em **todos** os posts de alto engajamento.

---

## 5. Padrão de CTA

### Formato canônico

```
Comenta [PALAVRA] que eu [ação específica]
```

### Palavras-chave validadas

`CÓDIGO` · `BOOT` · `GARGALO` · `ESTRUTURA` · `DIAGNÓSTICO` · `MAPA` · `AULA` · `DECISÃO` · `CLIENTES` · `NEGOCIAR` · `VENDA`

### Regras

- Sempre uma palavra em caps, nunca frase
- Sempre seguida de benefício tangível ("eu te envio", "eu te mostro", "eu te mando o material")
- @feneducacao quando a CTA leva ao produto de mentoria/bootcamp

---

## 6. Pergunta de fechamento

Obrigatória em posts educativos. Deve ser:
- Específica (não "o que você achou?")
- Binária ou com resposta curta possível
- Conectada ao tema do post

**Exemplos reais (alto comentários):**
> "O que você ainda não conseguiu tirar da sua mão? Comenta aqui." (106 comentários)
> "Agora me responda: você consegue ficar 3 dias OFF sem prejudicar o seu negócio?" (21 comentários)
> "Qual foi o pior atendimento que você já recebeu de uma empresa pelo WhatsApp?" (123 comentários)

---

## 7. Vulnerabilidade estratégica

Usar com parsimônia. Quando presente, sempre conectada a aprendizado de negócio — nunca como fim em si.

**Posts com vulnerabilidade de maior impacto:**

| Abertura | Lição conectada | Likes |
|---------|----------------|-------|
| "Eu perdi R$ 280 mil por ignorar o básico." | percepção de valor vs. estética | 471 |
| "Faturar R$30k sozinha parece incrível. Até você perceber que o negócio só existe enquanto você aguenta." | estrutura vs. esforço solo | 262 |
| "Já fiz fertilização in vitro, inseminação artificial e por fim congelei óvulos." | resiliência + não romantizar luta | 2.281 |

**Regra:** vulnerabilidade no hook → lição clara no corpo → CTA no produto.

---

## 8. Performance por formato (referência para o social-media-agent)

| Formato | Pico de likes | Típico | Melhor uso |
|---------|-------------|--------|-----------|
| REEL (vídeo) | 198.452 | 3k–15k | Paradoxos, dados chocantes, narrativas |
| IMAGE | 27.959 | 200–800 | Afirmações diretas, perguntas, momentos pessoais |
| CAROUSEL_ALBUM | 4.101 | 150–600 | Conteúdo educativo estruturado, listas, CTAs longas |

**Insight crítico:** Reels dominam alcance. Carrosséis dominam geração de leads via CTA (comentários mais altos proporcionalmente).

---

## 9. Posts âncora (ground truth canônico de tom)

Estes 3 posts são a referência primária para avaliar tom em qualquer judge_prompt.

### Âncora #1 — Hook paradoxo + ambiente (198k likes)
```
Talento é bom. Mas no ambiente errado, ele morre.

Você pode ter disciplina, visão e execução.
Mas se estiver cercada por gente que só reclama, nem tenta nada novo ou joga pequeno, você desacelera.

[...]

- Ambientes colaborativos aumentam a performance em até 50%;
- Redes de apoio aceleram crescimento em até 3x (Journal of Applied Psychology);
- Empresas com times fortes têm até 21% mais lucratividade (Gallup).

[...]

Você não cresce acima do ambiente que você tolera.
```

### Âncora #2 — Negação + lista estruturada (28k likes)
```
Você não precisa ser o herói com o extintor sempre na mão.

[...]

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

Crescer é fazer melhor com menos dependência de você.

Qual tarefa você ainda não conseguiu tirar da sua mão? Comenta aqui.
```

### Âncora #3 — Dado chocante + urgência IA (13k likes)
```
Você está ignorando o óbvio.

A China já começou a substituir policiais de trânsito por robôs com inteligência artificial.

[...]

Os números já não deixam margem para debate. Empresas que adotam IA podem reduzir custos operacionais em até 30%, segundo a McKinsey. A automação aumenta produtividade em até 40% em operações repetitivas.

E mais de 70% das empresas globais já usam IA em algum nível.

Isso não é tendência. É padrão competitivo.

[...]

Ou você usa tecnologia para crescer. Ou vai competir com quem usa (e não tenho medo de afirmar que vai perder).
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
