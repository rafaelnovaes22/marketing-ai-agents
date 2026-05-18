# PATTERNS — Padrões reais da the CEO (corpus 10 posts)

> Destilação de padrões observados no [corpus](./posts/) — 10 posts coletados
> do LinkedIn da the CEO (2021–2026). Os padrões abaixo **priorizam
> os 3 posts de 2026** (era `2026_codigo_ceo`), que representam o tom
> atual. Os 6 posts mais antigos servem como contexto histórico.
>
> **Como usar:** este documento é insumo para (a) refator do prompt
> [`prompts/social-media-agent/system-prompts/brand_voice_ceo.md`](../../prompts/social-media-agent/system-prompts/brand_voice_ceo.md)
> e (b) criação de eval-cases novos em [`evals/social-media-agent/cases/`](../../evals/social-media-agent/cases/).
> Cada seção cita exemplos literais com referência a `posts/NN-slug.md`.

---

## 1. Macro-estrutura do post (2026)

Os posts da era atual seguem uma estrutura previsível em **7 blocos**:

```
[BLOCO 1] Hook — frase-título + 1ª linha que repete a tese (1 sentença)
[BLOCO 2] Desenvolvimento curto — 3-7 parágrafos de 1-3 linhas cada,
          construindo a tese por escalada
[BLOCO 3] Cabeçalho intermediário — H2/H3 com mais tese ("Marketing nunca
          foi vaidade. Sempre foi sobrevivência.")
[BLOCO 4] "Vamos aos fatos:" — bullets com estatística + fonte entre
          parênteses                                              ◆ obrigatório
[BLOCO 5] Caso real / "Vejo isso com frequência" — anedota empresarial
          curta, sem nomes próprios                                 △ frequente
[BLOCO 6] Contraste binário — fórmula "X sem Y é Z / Y sem X é W"  ◆ obrigatório
[BLOCO 7] CTA pergunta retórica + hashtags temáticas (2-4)         ◆ obrigatório
```

◆ obrigatório nos 3 posts de 2026 | △ frequente mas opcional

**Exemplo completo** ([`01-marketing-nao-salva`](./posts/01-marketing-nao-salva-2026-02-12.md)):

- B1 Hook: *"Marketing não salva empresa desorganizada."*
- B2 Desenv: *"Essa é uma verdade dura, mas necessária. / E o mercado de 2026 vai deixar isso ainda mais evidente. / Empresas não quebram só por falta de caixa."*
- B3 H2: *"Marketing nunca foi vaidade. Sempre foi sobrevivência."*
- B4 Fatos: *"Empresas que investem consistentemente em marca crescem até 2x mais (Bain & Company). / Marcas com presença forte têm margens até 60% maiores (McKinsey)."*
- B5 Caso: *(implícito — "O pequeno empresário corta marketing para 'economizar'. Depois corta equipe. Depois corta margem.")*
- B6 Contraste: *"Visibilidade sem método é custo. Método sem visibilidade é irrelevante."*
- B7 CTA: *"Você vai aprender do jeito caro ou do jeito inteligente?"* + `#Escala #Autoridade #Performance`

**Posts antigos (2021-2025)** seguem estrutura mais frouxa — frequentemente
faltam B6 (contraste binário) e B7 fica diluído. Ver [`05-retailtechs`](./posts/05-retailtechs-2024-07-24.md)
(zero hashtags, CTA suave) e [`10-receitas-previsiveis`](./posts/10-receitas-previsiveis-2021-04-08.md)
(estrutura de tutorial enumerado, não de "tese-fatos-contraste").

---

## 2. Hook — a primeira linha

O hook é **a tese reduzida a 1 frase declarativa**. Quatro padrões observados:

### 2.1. Frase-tese punitiva (modo dominante 2026)

Afirmação seca, sem rodeios, que cria desconforto:

- *"Marketing não salva empresa desorganizada."* ([01](./posts/01-marketing-nao-salva-2026-02-12.md))
- *"Seu problema é excesso de centralização."* ([02](./posts/02-centralizacao-2026-02-09.md))

### 2.2. Pergunta retórica de provocação

Pergunta cujo "sim ingênuo" é o erro que ela vai desmontar:

- *"Você tem dom pra vendas? Ou nunca aprendeu a vender?"* ([03](./posts/03-vendas-dom-2026-02-05.md))
- *"2021: o ano das inovações bilionárias?"* ([09](./posts/09-inovacoes-bilionarias-2021-04-14.md))

> ⚠ **Atenção ao prompt atual**: o prompt em vigor proíbe "pergunta retórica
> genérica de abertura". A regra está parcialmente errada — pergunta retórica
> **provocativa** (não genérica) é padrão recorrente. A proibição deve
> escopar para **perguntas vagas de auto-ajuda** ("Você já se perguntou qual
> é o seu propósito?"), não para perguntas-tese.

### 2.3. Narrativa-cenário (estudo de caso)

Abertura "Imagine X..." quando o post vai dissecar um caso famoso:

- *"Imagine investir milhões em uma empresa que promete criar aplicativos em minutos usando IA, mas entrega... equipes humanas mal pagas codificando cada linha."* ([04](./posts/04-builder-ai-2025-06-25.md))

### 2.4. Definição didática (era educativa, hoje raro)

- *"O termo retailtech vem da união das palavras retail (varejo) e technology (tecnologia)..."* ([05](./posts/05-retailtechs-2024-07-24.md))

> ⚠ Padrão obsoleto — não usar em conteúdos de 2026.

---

## 3. Fontes de autoridade

A CEO **sempre nomeia a fonte** quando cita estatística. Nunca diz "estudos
mostram que..." vagamente. Sempre `(McKinsey)`, `(HBR)`, `(Bain)`.

### 3.1. Fontes recorrentes (frequência no corpus)

| Fonte | Posts | Tipo |
|---|---|---|
| **McKinsey** | 1, 2, 4 | Consultoria global — autoridade B2B |
| **Harvard Business Review** | 1, 2, 3 | Acadêmica premium |
| **Bain & Company** | 1 | Consultoria global |
| **Gallup** | 2 | Pesquisa de gestão |
| **Gong.io** | 3 | Sales tech específico |
| **Salesforce** | 3 | Plataforma B2B |
| **Forbes** | 6 | Mídia de negócios |
| **CB Insights** | 9 | Inteligência VC |
| **BIS** (Banco de Compensações Internacionais) | 8, 9 | Macro-financeira |
| **Distrito Dataminer** | 5, 8, 9 | Mercado BR de startups |
| **FNCP** | 7 | Setorial |

### 3.2. Fórmula de citação (padrão)

```
[Estatística com %] + (Fonte).
```

Exemplos literais:

- *"Empresas que investem consistentemente em marca crescem até 2x mais no longo prazo do que as focadas só em performance (Bain & Company)."* ([01](./posts/01-marketing-nao-salva-2026-02-12.md))
- *"67% das vendas são perdidas não por preço, mas por falha de condução da conversa (Gong.io)."* ([03](./posts/03-vendas-dom-2026-02-05.md))
- *"Empresas excessivamente dependentes do fundador crescem até 60% mais devagar do que negócios com liderança distribuída (McKinsey)."* ([02](./posts/02-centralizacao-2026-02-09.md))

**Regra observada:** sempre 3 estatísticas no bloco "Vamos aos fatos:", quase
sempre com **% ou múltiplo** ("2x mais", "até 60%", "67%"). Nunca números
absolutos sem contexto comparativo.

---

## 4. Contraste binário

Recurso retórico mais característico — aparece em **todos os 3 posts de
2026**. Fórmulas observadas:

### 4.1. "X sem Y é Z" (estrutura mais frequente)

Dois polos invalidam-se mutuamente, ponto-de-virada lógico:

- *"Visibilidade sem método é custo. / Método sem visibilidade é irrelevante."* ([01](./posts/01-marketing-nao-salva-2026-02-12.md))
- *"Sem método, o tráfego encarece. / Sem margem, o lucro evapora. / Sem gestão, o negócio não escala."* ([01](./posts/01-marketing-nao-salva-2026-02-12.md))

### 4.2. "Não é X. É Y."

Nega o senso comum e propõe substituição:

- *"Não é falta de esforço. É modelo errado de gestão."* ([02](./posts/02-centralizacao-2026-02-09.md))
- *"Não é sobre falar mais. / É sobre ouvir melhor."* ([03](./posts/03-vendas-dom-2026-02-05.md))
- *"Não é sobre faturar mais. / É sobre sustentar margem."* ([01](./posts/01-marketing-nao-salva-2026-02-12.md))
- *"Centralização excessiva não é virtude. É risco."* ([02](./posts/02-centralizacao-2026-02-09.md))

### 4.3. "Antes era X. Agora é Y."

Marca a virada temporal/mercado:

- *"Antes, a lógica era: 'Marketing quando sobrar dinheiro.' / Agora, a realidade é: 'Estrutura primeiro. Crescimento depois.'"* ([01](./posts/01-marketing-nao-salva-2026-02-12.md))

### 4.4. "Quem A, B. Quem C, D."

Construção paralela de consequências:

- *"Quem não souber vender valor, vai competir por preço. / Quem competir por preço, vai trabalhar dobrado para ganhar metade."* ([03](./posts/03-vendas-dom-2026-02-05.md))

**Regra de uso:** colocar o contraste **próximo ao final** (B6), como
ponte para o CTA. Não usar mais de 2 contrastes por post (cansa).

---

## 5. Vocabulário-assinatura (corrigido por era)

> ⚠ **O prompt atual lista vocabulário do "CEO livro" (2018-2020)**:
> *execução, caminho, propósito, sonho, fazer acontecer, chegar, status quo,
> estudar*. Esse vocabulário **NÃO aparece nos posts de 2026**. O Código
> CEO migrou para um léxico de gestão/operação. **Importante atualizar.**

### 5.1. Vocabulário 2026 (Código CEO — usar)

Contagem aproximada nos posts 1-3:

- **escala / escalável / escalar** — 11 ocorrências
- **estrutura / estruturar / estruturado** — 9
- **margem / sustentar margem** — 6
- **processo / processos claros** — 5
- **método / sem método** — 5
- **decisão de CEO** — 2 (mas é frase-assinatura)
- **autonomia** — 3
- **gargalo** — 3
- **postura** — 3
- **valor / vender valor** — 4
- **amadorismo / "2026 não perdoa amadorismo"** — 1 (mas é hook-marca)
- **presença / construir presença** — 4
- **sobrevivência** — 2
- **mercado não tem dó / não perdoa** — 2

### 5.2. Vocabulário 2021 (era educativa — evitar em conteúdo novo)

*low touch economy, aporte, capital de risco, healthtechs, edtechs,
omnichannel, retailtech, jornada do consumidor, cross-selling, up-selling*

Esses termos sobrevivem em conteúdos técnicos-explicativos mas não no
"Código CEO" provocativo.

### 5.3. Frases-marca (literais)

Frases que ela usa em mais de um post — assinaturas:

- *"Vejo isso com frequência."* (intro de caso real)
- *"Vamos aos fatos."* / *"Vamos aos fatos, não às crenças."* (intro de bullets com fonte)
- *"O mercado não perdoa amadorismo."* / *"O mercado não tem dó."*
- *"Estrutura primeiro. Crescimento depois."*
- *"X não é opcional."* (CTA — ver §6)

---

## 6. CTA — taxonomia das aberturas

Três padrões de fechamento observados:

### 6.1. Pergunta retórica-cobrança (mais punchy)

A pergunta cuja resposta **acusa** o leitor:

- *"Você vai aprender do jeito caro ou do jeito inteligente?"* ([01](./posts/01-marketing-nao-salva-2026-02-12.md))
- *"Entendeu onde eu quero chegar?"* ([01](./posts/01-marketing-nao-salva-2026-02-12.md), pré-bullets)

### 6.2. Mantra de obrigatoriedade

Afirmação seca que reduz o assunto a "isto não é negociável":

- *"Vender não é opcional."* ([03](./posts/03-vendas-dom-2026-02-05.md))
- *"Negócio saudável não pede herói. Pede sistema."* ([02](./posts/02-centralizacao-2026-02-09.md))

### 6.3. Comando direto / imperativo (era educativa, raro em 2026)

- *"Coloque as estratégias realmente em prática..."* ([10](./posts/10-receitas-previsiveis-2021-04-08.md))
- *"Transforme a rejeição em um trampolim para o sucesso."* ([06](./posts/06-lidar-com-nao-2024-06-05.md))

### 6.4. Anti-padrão observado

A CEO **nunca** termina com:

- "Compartilha esse post se você concorda" — pedido fraco
- "Comenta aí o que achou" — vazio
- "Marca um amigo" — formato Instagram pop, não combina

Em [02](./posts/02-centralizacao-2026-02-09.md) há plug do produto
("Código CEO"), mas o post termina com mantra, não com pitch.

---

## 7. Hashtags — **regra crítica**

> ⚠ **Maior anti-padrão do prompt atual:** o prompt em vigor instrui usar
> `#DesistirNãoÉOpção` como hashtag final obrigatória. **Nenhum dos 10 posts
> reais usa essa hashtag.** É um padrão herdado do livro/marca pessoal antiga
> que não aparece no Código CEO 2026.

### 7.1. Tabela post→hashtags reais

| Post | Hashtags |
|---|---|
| [01 Marketing](./posts/01-marketing-nao-salva-2026-02-12.md) | `#Escala #Autoridade #Performance` |
| [02 Centralização](./posts/02-centralizacao-2026-02-09.md) | `#liderança #escala #gestãodenegócios` |
| [03 Vendas](./posts/03-vendas-dom-2026-02-05.md) | `#codigoceo #vendas #escala #negocios` |
| [04 Builder.ai](./posts/04-builder-ai-2025-06-25.md) | `#Buider #Colapso #vendas #negócios` |
| [05 Retailtechs](./posts/05-retailtechs-2024-07-24.md) | *(nenhuma)* |
| [06 "Não"](./posts/06-lidar-com-nao-2024-06-05.md) | *(nenhuma)* |
| [07 Contrabando](./posts/07-contrabando-nao-2021-11-16.md) | `#contrabandonao #publi` |
| [08-09-10] (2021) | *(nenhuma)* |

### 7.2. Regras destiladas

1. **Quantidade:** 2-4 hashtags (média = 3,2 nos posts com hashtag)
2. **Tema:** sempre **temáticas ao conteúdo do post**, nunca decorativas
3. **`#codigoceo`** aparece quando há plug do produto homônimo —
   funciona como tag de campanha, não como assinatura genérica
4. **Capitalização:** mista — `#Escala #Autoridade` (CapCase) em 01,
   `#liderança` (lowercase com acento) em 02. Sem regra rígida.
5. **NÃO usar:** `#DesistirNãoÉOpção` (não aparece no corpus 2026)

### 7.3. Vocabulário de hashtags do corpus

`#Escala #Autoridade #Performance #liderança #escala #gestãodenegócios
#codigoceo #vendas #escala #negocios #vendas #negócios`

(Note repetição de `#escala`/`#vendas` entre posts — núcleo recorrente.)

---

## 8. Tom emocional

Quatro qualidades observáveis:

### 8.1. Confrontativo-respeitoso

Acusa um comportamento, não a pessoa. *"O pequeno empresário corta marketing
para 'economizar'."* ([01](./posts/01-marketing-nao-salva-2026-02-12.md))
— ataca a decisão, não o empresário.

### 8.2. Dados + convicção (não apela só ao emocional)

Sempre que faz afirmação forte, ancora em estatística + fonte (§3). Isso
é o que separa CEO de coach genérico.

### 8.3. "Verdade dura mas necessária"

Frase literal em [01](./posts/01-marketing-nao-salva-2026-02-12.md) — assume
papel de quem diz o que ninguém quer ouvir. Variantes: *"O mercado não tem dó"*,
*"2026 não perdoa amadorismo"*.

### 8.4. Proximidade (1ª pessoa + "Vejo com frequência")

- *"Vejo isso com frequência. Um empreendedor competente, inteligente, visionário, mas que aprova tudo..."* ([02](./posts/02-centralizacao-2026-02-09.md))
- *"Eu mesma, inclusive, enfrentei diversos 'nãos'... Quem nunca ouviu a história de quando eu perdi R$280 mil reais investindo em uma loja..."* ([06](./posts/06-lidar-com-nao-2024-06-05.md))

Quando assume vulnerabilidade, sempre é **prólogo de virada** (perdeu →
aprendeu), nunca lamentação isolada.

---

## 9. Proibições observadas

Coisas que ela **NÃO faz** nos 10 posts:

| Anti-padrão | Por quê |
|---|---|
| Clichês motivacionais vazios ("Acredite nos seus sonhos") | Substituídos por imperativos concretos ancorados em dados |
| Otimismo sem fundamento ("Tudo vai dar certo") | Sempre traz % de quem dá certo e % de quem não dá |
| Polarização política/ideológica | Único post político é [07](./posts/07-contrabando-nao-2021-11-16.md) — `#publi` de campanha cívica não-partidária |
| Jargão técnico sem tradução | Termos VC (LTV, CAC, runway) raros e sempre contextualizados |
| Promessa de enriquecimento rápido | Plug do produto ([02](./posts/02-centralizacao-2026-02-09.md)) é discreto, foco na **estrutura** |
| "Marca um amigo" / "Compartilha se concorda" | Nunca aparecem |
| Auto-elogio direto ("Sou a melhor em X") | Autoridade é via cases de mercado, não currículo |
| Emojis ornamentais (😎🚀✨) | Únicos emojis observados: 🔹 e ✔ como bullets estruturais em [04](./posts/04-builder-ai-2025-06-25.md) |

---

## 10. Anti-padrões do prompt atual

Divergências concretas entre [`prompts/social-media-agent/system-prompts/brand_voice_ceo.md`](../../prompts/social-media-agent/system-prompts/brand_voice_ceo.md)
e os posts reais — **lista direta de input para próxima refatoração**:

### 10.1. Hashtag fixa `#DesistirNãoÉOpção` (linha 13, 88, 99, 154, 168, 175)

- **Prompt diz:** usar como **última hashtag** sempre, depois das setoriais
- **Realidade:** **0 ocorrências** em 10 posts. Hashtags são temáticas e
  variam por tema (§7.1). `#codigoceo` quando há plug de produto.
- **Correção:** remover obrigatoriedade. Hashtag-assinatura é **opcional e
  rara**. Defaultar para 2-4 hashtags temáticas extraídas do tema do briefing.

### 10.2. "Pergunta retórica de abertura proibida" (linha 72, 98)

- **Prompt diz:** "Abre com afirmação polêmica ou contraintuitiva (não
  pergunta retórica)" e proíbe "pergunta retórica genérica de abertura"
- **Realidade:** [03](./posts/03-vendas-dom-2026-02-05.md) abre com pergunta
  retórica provocativa ("Você tem dom pra vendas?"). Pergunta-tese é padrão
  válido (§2.2).
- **Correção:** escopar a proibição para **perguntas vagas de auto-ajuda**
  ("Você já se perguntou qual é o seu propósito?"), permitindo
  **perguntas-tese provocativas** (resposta esperada = a tese do post).

### 10.3. Vocabulário-assinatura desatualizado (linhas 40-50)

- **Prompt lista:** *execução, caminho, propósito, sonho, fazer acontecer,
  chegar, status quo, estudar*
- **Realidade 2026:** *escala, estrutura, margem, processo, método, decisão
  de CEO, autonomia, gargalo, postura, presença, sobrevivência, mercado não
  perdoa* (§5.1)
- **Correção:** substituir a lista pelo vocabulário 2026. Manter alguma
  redundância com livro antigo (*propósito, valor*) mas remover *sonho,
  fazer acontecer, chegar* (não aparecem no corpus).

### 10.4. Mensagem central obsoleta (linha 13)

- **Prompt diz:** "Mensagem central: 'O caminho mais curto entre dois pontos
  se chama execução'"
- **Realidade:** **0 ocorrências** dessa frase no corpus. Frase-marca atual
  é *"Estrutura primeiro. Crescimento depois."* (§5.3)
- **Correção:** atualizar mensagem central — ou remover, e deixar o prompt
  derivar do tema do briefing.

### 10.5. Estrutura "história pessoal curta no slide 2" (linha 73, 108-110)

- **Prompt diz:** "Justifica com história pessoal curta (1-2 linhas)" no
  slide 2 de credibilidade
- **Realidade:** história pessoal curta **não aparece** em [01](./posts/01-marketing-nao-salva-2026-02-12.md)
  nem [02](./posts/02-centralizacao-2026-02-09.md). Aparece como **caso real
  anonimizado** (§1 B5), não como "minha história". Quando é pessoal
  ([06](./posts/06-lidar-com-nao-2024-06-05.md): "perdi R$280 mil"), serve a
  prólogo de virada, não a credibilidade preventiva.
- **Correção:** trocar "história pessoal" por "caso real anonimizado de
  mercado" + tornar opcional o slide pessoal (só quando há virada concreta).

### 10.6. Falta o bloco "Vamos aos fatos: bullets com fonte"

- **Prompt não menciona:** o bloco de bullets com estatística + fonte é
  **o recurso mais característico** dos posts 2026 (§3) e está ausente do
  prompt
- **Correção:** adicionar bloco obrigatório "Dados + fonte" no carrossel —
  3 bullets de estatística com fonte nomeada, padrão `[%] (Fonte)`. Pode
  virar 1 slide do carrossel ou aparecer só na caption.

### 10.7. Pronome "você" como regra absoluta (linhas 62-67)

- **Prompt diz:** nunca usar "a gente" / "nós"
- **Realidade:** posts antigos ([07](./posts/07-contrabando-nao-2021-11-16.md),
  [08](./posts/08-tecnologia-contramao-2021-05-18.md)) misturam "você" com
  "nós/a gente" ocasionalmente. Em 2026, "você" é fortemente dominante mas
  não absoluto ("Crescemos com adaptabilidade" aparece eventualmente).
- **Correção:** manter "você" como dominante (90%+), mas permitir
  "nós/a gente" em contextos coletivos (Brasil, empreendedores como
  classe). Não absoluto.

### 10.8. Few-shot examples sintéticos no prompt (linhas 126-168)

- **Prompt usa:** 2 exemplos gerados sinteticamente (IA industrial B2B +
  SaaS early-stage)
- **Realidade:** ambos os exemplos terminam com `#DesistirNãoÉOpção` —
  reforçando o anti-padrão (10.1). Estilo é coerente mas calibrado pelo
  próprio prompt errado.
- **Correção:** substituir 1 ou 2 exemplos sintéticos por **trechos curtos
  reais** do corpus (posts 1-3), citando a fonte (`posts/01-...`). Manter
  pelo menos 1 sintético para mostrar adaptação a tema novo.

---

## Resumo das correções prioritárias

Em ordem de impacto na refatoração futura:

1. ⭐⭐⭐ **Hashtags** (§7, anti-padrão 10.1) — remover fixa, tornar temática
2. ⭐⭐⭐ **Adicionar bloco "Vamos aos fatos: bullets com fonte"** (§3, anti-padrão 10.6)
3. ⭐⭐⭐ **Atualizar vocabulário-assinatura** (§5, anti-padrão 10.3)
4. ⭐⭐ **Adicionar contraste binário ao final, antes do CTA** (§4)
5. ⭐⭐ **Trocar "história pessoal" por "caso real anonimizado"** (§1, anti-padrão 10.5)
6. ⭐⭐ **Refinar proibição de pergunta retórica** (§2, anti-padrão 10.2)
7. ⭐ **Atualizar mensagem central** (anti-padrão 10.4)
8. ⭐ **Substituir 1 few-shot sintético por trecho real** (anti-padrão 10.8)
9. ⭐ **Relaxar pronome "você" para dominante mas não absoluto** (anti-padrão 10.7)
