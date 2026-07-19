# Prompts Visuais para Claude Design (Stitch)
## Executive Summary Novais Digital — Apresentação Board
**Versão:** 3.0 | **Stack:** Claude + Google + Meta | **Operação 100% Autônoma** | **Data:** 2026-05-13

---

## 🎨 DESIGN SYSTEM — Novais Digital

> **Use este bloco como base para `create_design_system_from_design_md` ou aplique em todos os slides.**

### Brand Identity
```yaml
brand: Novais Digital
tagline: "Você foca na empresa. A gente cuida em te dar resultado."
logo_wordmark: "D.ANTIA"

colors:
  primary_dark: "#0A1628"     # Background principal (hero, footer)
  primary_blue: "#2563EB"     # Destaques, links, ênfase
  accent_cyan: "#5EEAD4"      # Subtítulos em destaque
  white: "#FFFFFF"            # Texto sobre dark
  off_white: "#F5F7FA"        # Background seções claras
  text_secondary: "#6B7280"   # Texto descritivo
  badge_red: "#DC2626"        # Urgência/BETA
  badge_green: "#10B981"      # Conformidade/sucesso
  card_bg: "#0F1B2D"          # Cards sobre dark

typography:
  headings: "Inter Bold / Manrope ExtraBold"
  body: "Inter Regular"
  letterspacing_logo: "0.05em"
  
visual_language:
  mode: "Alternância dark/light entre slides"
  corners: "Rounded (cards 12px, buttons pill 999px)"
  dividers: "Angular V-cut entre seções dark/light"
  effects: "Radial glow sutil em backgrounds dark"
  icons: "Outline, monocromático azul, 24-32px"
  composition: "Center-aligned, generous whitespace"
  
cta_button:
  shape: "pill rounded"
  gradient: "linear-gradient(90deg, #2563EB → #5EEAD4)"
  text_color: "#FFFFFF"
  icon: "arrow-right →"
```

---

## 📐 ESTRUTURA DO DECK — 8 Slides

| # | Slide | Modo | Foco |
|---|-------|:----:|------|
| 1 | Capa | Dark | Impacto inicial |
| 2 | O Desafio | Dark | Contexto |
| 3 | Comparativo AS IS / TO BE | Light | Números |
| 4 | Investimento × Retorno | Dark | ROI |
| 5 | Os 7 Agentes | Light | Solução |
| 6 | Roadmap | Dark | Plano |
| 7 | Análise de Risco | Light | Confiança |
| 8 | Decisão | Dark | CTA |

---

## 🖼️ SLIDE 1 — CAPA

### Prompt Stitch

```
Crie um slide de capa de apresentação executiva no modo DARK seguindo este briefing:

LAYOUT:
- Background: gradiente radial sutil partindo do centro (#0A1628 → #0F1B2D nas bordas)
- Glow effects azuis sutis nas laterais (efeito de luz emanando)
- Composição centralizada, muito whitespace

HEADER (topo esquerdo):
- Logo wordmark "D.ANTIA" em branco, letter-spacing 0.05em, peso geometric sans-serif
- Tamanho: 24px

CENTRO (hero principal):
- Badge pill no topo: "BETA · Plano Estratégico Confidencial"
  - Background: rgba(220, 38, 38, 0.1) com border vermelha sutil
  - Texto: #DC2626

- Título principal (Inter ExtraBold, 72px):
  "Novais Digital Social"
  - Cor: #FFFFFF

- Subtítulo gigante (Inter Bold, 56px, line-height 1.1):
  "Da Operação Manual aos Agentes de IA"
  - "Manual" em #FFFFFF
  - "Agentes de IA" em #5EEAD4 (ciano destaque)

- Tagline (Inter Regular, 20px, cor #6B7280):
  "Plano de Transformação com ROI Comprovado"

CARDS DE MÉTRICAS (4 cards horizontais embaixo):
Cada card com:
- Background: rgba(15, 27, 45, 0.6) com border sutil rgba(255,255,255,0.1)
- Rounded corners 16px
- Padding 24px
- Conteúdo:
  Card 1: "52 posts/mês" + "em 4 redes sociais"
  Card 2: "R$ 441.490" + "Investimento Ano 1"
  Card 3: "R$ 1.343.110" + "Retorno Projetado"
  Card 4: "204%" + "ROI Ano 1"

Stack badge no topo direito (pill pequeno):
- "Powered by Claude + Google Vertex AI"
- Background rgba(94, 234, 212, 0.1), texto #5EEAD4, 11px
- Números em #FFFFFF Bold 36px
- Labels em #6B7280 Regular 14px

FOOTER:
- Texto pequeno (#6B7280, 12px): "Apresentado em 2026-05-13 · Confidencial"
```

---

## 🖼️ SLIDE 2 — O DESAFIO

### Prompt Stitch

```
Crie um slide de contexto no modo DARK:

LAYOUT:
- Background: #0A1628 com glow radial discreto
- Layout: split 60/40 (esquerda texto, direita visual)

LADO ESQUERDO:
- Tag superior (pill): "+ O DESAFIO"
  - Background rgba(94, 234, 212, 0.1), texto #5EEAD4, uppercase 12px
  
- Título (Inter Bold, 48px):
  "O custo invisível da operação manual."
  - "operação manual" em #5EEAD4

- Parágrafo (Inter Regular, 18px, line-height 1.6, #FFFFFF):
  "Manter presença consistente em 4 redes sociais (LinkedIn, Instagram, Facebook, Twitter), com 3 postagens semanais por rede — 52 posts/mês — exige hoje 5-6 profissionais e R$ 861.000/ano, sem possibilidade de escala sem dobrar a folha."

- Bullet points abaixo (com ícones outline azuis #2563EB):
  ⚠️ Brand consistency de apenas ~70%
  ⚠️ Carrossel leva 5 horas para ser produzido
  ⚠️ Atendimento DM limitado ao horário comercial
  ⚠️ A/B testing manual: máximo 1-2 variantes

LADO DIREITO (visual):
- Ilustração estilizada: 4 ícones de redes sociais em cards rounded
  (LinkedIn, Instagram, Facebook, Twitter)
- Cada ícone em outline branco com glow sutil
- Cards conectados por linhas finas com gradiente azul→ciano
- Em cima: número grande "52" em #5EEAD4 (96px Bold) com label "posts/mês"
- Embaixo do conjunto: "× 12 meses = 624 posts/ano"
```

---

## 🖼️ SLIDE 3 — COMPARATIVO AS IS / TO BE

### Prompt Stitch

```
Crie um slide comparativo no modo LIGHT:

LAYOUT:
- Background: #F5F7FA
- Header dark navy (#0A1628) com logo "D.ANTIA" branco
- Conteúdo center-aligned

TÍTULO PRINCIPAL (centro topo, Inter Bold 56px, #0A1628):
"AS IS vs TO BE"
- "vs" menor em #6B7280

SUBTÍTULO (Inter Regular 20px, #6B7280):
"O retrato da transformação em números"

TABELA COMPARATIVA (centro da tela):
Layout de 3 colunas com header:
| Métrica | 🔴 AS IS (Manual) | 🟢 TO BE (Agentes IA) |

Estilo da tabela:
- Cabeçalho: background #0A1628, texto #FFFFFF, padding 20px
- Linhas alternadas: #FFFFFF e #F5F7FA
- Borda inferior em cada linha: 1px solid rgba(0,0,0,0.05)
- Rounded corners 12px no container

Linhas (deixar bem espaçadas, 32px padding vertical):
1. Custo Anual           | R$ 861.000          | R$ 441.490 (-49%)
2. Custo por Post        | R$ 1.380            | R$ 245 (-82%)
3. Tempo de Carrossel    | 5 horas             | 20 minutos (-93%)
4. Atendimento DM        | 8h/dia              | 24/7 (+200%)
5. Brand Consistency     | ~70%                | 99%+ (+41%)
6. Capacidade            | 52 posts (teto)     | 200+ (baseline)
7. Headcount Operacional | 5-6 pessoas         | 0 pessoas (-100%)
8. Fornecedores IA       | 8-10                | 3 (Anthropic+Google+Meta)

DESTAQUE:
- Coluna AS IS: números em #DC2626 com ícone ▼
- Coluna TO BE: números em #10B981 com ícone ▲

CARD FINAL (embaixo da tabela, full width):
- Background: gradiente #2563EB → #5EEAD4
- Texto branco grande (Inter ExtraBold 36px):
  "Mesmo custo. 3x mais capacidade. Brand 99% consistente."
- Padding 32px, rounded 16px
```

---

## 🖼️ SLIDE 4 — INVESTIMENTO × RETORNO

### Prompt Stitch

```
Crie um slide de ROI no modo DARK:

LAYOUT:
- Background: #0A1628 com glow azul sutil
- Composição em 2 colunas

HEADER (centro topo):
- Tag pill: "+ ROI ANO 1"
- Título (Inter Bold 56px branco):
  "R$ 1 investido = R$ 3,04 de retorno"

COLUNA ESQUERDA — INVESTIMENTO (largura 40%):
- Título de seção (Inter SemiBold 16px uppercase, #6B7280):
  "INVESTIMENTO ANO 1"
- Número gigante (Inter Black 72px, #FFFFFF):
  "R$ 441.490"
- Breakdown em mini-cards verticais (background rgba(15,27,45,0.6)):
  • Setup one-time:           R$ 59.890
  • Software (12 meses):      R$ 201.600 (Claude+Google)
  • Manutenção AI (1 Eng):    R$ 180.000
  
COLUNA DIREITA — RETORNO (largura 60%):
- Título de seção (uppercase 16px, #5EEAD4):
  "GANHOS PROJETADOS"
- Número gigante (Inter Black 72px, #5EEAD4):
  "R$ 1.343.110"
- Stacked bar chart visual mostrando as 4 fontes:
  📊 Receita incremental:  R$ 980.000 (73%) — barra #5EEAD4
  📊 Retenção (-churn):    R$ 144.000 (11%) — barra #2563EB
  📊 Economia direta:      R$ 111.110 (8%)  — barra #10B981
  📊 Otimização tráfego:   R$ 108.000 (8%)  — barra #F7B801

DESTAQUE INFERIOR (full width):
Card grande com background gradiente #2563EB → #5EEAD4, rounded 20px:
- Lucro líquido Ano 1: "R$ 901.620" (Inter Black 56px branco)
- 3 indicadores em linha:
  🎯 ROI Ano 1: 204%
  ⏱️ Payback: 4 meses
  📈 ROI Ano 2: 450%
- Cada indicador com label uppercase pequena + número grande
```

---

## 🖼️ SLIDE 5 — OS 7 AGENTES

### Prompt Stitch

```
Crie um slide de produto no modo LIGHT:

LAYOUT:
- Background: #FFFFFF
- Composição em grid

HEADER:
- Tag pill (#F5F7FA com texto #2563EB): "+ A SOLUÇÃO"
- Título (Inter Bold 48px, #0A1628):
  "7 agentes especializados."
- Subtítulo (#6B7280):
  "Cada um substitui um workflow manual completo."

GRID 3x3 (com último centralizado ou layout 4+3):
7 cards de agentes, cada um com:
- Background: #F5F7FA, rounded 16px, padding 24px, hover effect
- Border-left 4px com cor diferenciada por agente
- Ícone outline 32px em #2563EB no topo
- Nome do agente (Inter Bold 20px, #0A1628)
- Output esperado (Inter Regular 14px, #6B7280)
- Badge de tempo no canto superior direito:
  Background #5EEAD4, texto #0A1628, pill, font 12px Bold

Conteúdo dos 7 cards:

CARD 1 — 📱 Social Media
  Output: "Carrossel + caption tom the CEO"
  Stack: "Claude Sonnet + Imagen 4"
  Badge: "8 min"
  Border-left: #2563EB

CARD 2 — ✍️ Copywriter
  Output: "Landing page + email + ads"
  Stack: "Claude Opus"
  Badge: "15 min"
  Border-left: #5EEAD4

CARD 3 — 🎨 Designer
  Output: "Carrossel com brand guide 99%"
  Stack: "Imagen 4 + Ideogram fallback"
  Badge: "20 min"
  Border-left: #10B981

CARD 4 — 🎯 Gestor de Tráfego
  Output: "Campanha Meta + otimização IA"
  Stack: "Claude + Meta Ads API"
  Badge: "5 min"
  Border-left: #F7B801

CARD 5 — 🎬 Editor de Vídeo
  Output: "Cortes + legendas em 5 idiomas"
  Stack: "Veo 3 + ElevenLabs"
  Badge: "10 min"
  Border-left: #DC2626

CARD 6 — 📊 Estrategista
  Output: "Diagnóstico de funil + ações"
  Stack: "Claude Opus + Mixpanel"
  Badge: "2 min"
  Border-left: #8B5CF6

CARD 7 — 💬 Atendimento DM
  Output: "Qualificação + handoff CRM"
  Stack: "Claude Haiku"
  Badge: "<10s"
  Border-left: #06B6D4

Adicionar texto "Stack" em cada card abaixo do output:
- Font 11px uppercase
- Cor #6B7280
- Background pill #F5F7FA

Footer do slide:
Mini-stat em texto pequeno:
"Trabalham 24/7 · Brand consistency 99%+ · Custo marginal próximo de zero"
```

---

## 🖼️ SLIDE 6 — ROADMAP

### Prompt Stitch

```
Crie um slide de timeline no modo DARK:

LAYOUT:
- Background: #0A1628
- Timeline horizontal centralizada

HEADER:
- Tag pill cyan: "+ ROADMAP"
- Título branco (Inter Bold 48px):
  "20 semanas até a operação completa."

TIMELINE HORIZONTAL (centro):
Linha horizontal com 3 marcos numerados (1, 2, 3) e pontos conectores
- Linha: gradiente #2563EB → #5EEAD4
- Marcos: círculos preenchidos com número branco, 48px diâmetro

3 CARDS de fase (alinhados sob a timeline):

CARD FASE 1 (P0) — Esquerda:
  Background: rgba(37, 99, 235, 0.1), border #2563EB
  Período: "Semanas 1-8"
  Título: "P0 — Core Agents"
  Investimento: "R$ 165.000"
  Bullets:
    ✓ Social Media (Claude + Imagen 4)
    ✓ Copywriter (Claude Opus)
    ✓ Designer (Imagen 4 + Ideogram)
  Entrega: "52 posts/mês em 4 redes"
  Tag final: "PRIORITY"

CARD FASE 2 (P1) — Centro:
  Background: rgba(94, 234, 212, 0.1), border #5EEAD4
  Período: "Semanas 9-14"
  Título: "P1 — Advanced Automation"
  Investimento: "R$ 155.000"
  Bullets:
    ✓ Gestor de Tráfego (Meta API)
    ✓ Editor de Vídeo (Veo 3 ⭐)
  Entrega: "+30% ROAS, 5 vídeos/semana"

CARD FASE 3 (P2) — Direita:
  Background: rgba(16, 185, 129, 0.1), border #10B981
  Período: "Semanas 15-20"
  Título: "P2 — Intelligence Layer"
  Investimento: "R$ 121.490"
  Bullets:
    ✓ Estrategista (Claude + Mixpanel)
    ✓ Atendimento DM 24/7 (Haiku)
  Entrega: "Operação 100% autônoma"

CHECKPOINTS (barra inferior):
- Sem 4: "Primeiro post 100% automatizado"
- Sem 8: "Go/No-go P1"
- Sem 14: "Dados de ROI parcial"
- Sem 20: "Sistema completo em produção"
```

---

## 🖼️ SLIDE 7 — ANÁLISE DE RISCO

### Prompt Stitch

```
Crie um slide de risco no modo LIGHT:

LAYOUT:
- Background: #F5F7FA
- Composição: título centralizado + 3 cenários lado a lado + insight

HEADER:
- Tag pill: "+ ANÁLISE DE RISCO"
- Título (Inter Bold 48px, #0A1628):
  "Mesmo no pior cenário, o projeto se paga."

3 CARDS lado a lado (cenários):

CARD 1 — PESSIMISTA (esquerda):
  Background #FFFFFF, border-top 4px #DC2626, rounded 16px
  Header pequeno (#DC2626 uppercase): "PESSIMISTA"
  Subtítulo: "50% dos ganhos projetados"
  Métricas (lista vertical):
    Lucro Ano 1: R$ 230.065
    ROI: 52%
    Payback: 8 meses
  Footer destaque: "✓ ROI positivo já no Ano 1"
  Footer cor: #6B7280

CARD 2 — REALISTA (centro, destacado):
  Background gradiente sutil #2563EB → #5EEAD4 (10% opacidade)
  Border-top 4px #2563EB
  Tag superior: "CENÁRIO BASE" (pill, #2563EB)
  Header (#2563EB uppercase Bold): "REALISTA"
  Subtítulo: "100% projetado"
  Métricas:
    Lucro Ano 1: R$ 901.620
    ROI: 204%
    Payback: 4 meses
  Footer: "✓ Cenário esperado conservadoramente"

CARD 3 — OTIMISTA (direita):
  Background #FFFFFF, border-top 4px #10B981
  Header (#10B981 uppercase): "OTIMISTA"
  Subtítulo: "130% dos ganhos"
  Métricas:
    Lucro Ano 1: R$ 1.304.553
    ROI: 295%
    Payback: 3 meses
  Footer: "✓ Aceleração de receita comprovada"

BANNER INFERIOR (full width, destaque):
Background: #0A1628
Texto branco (Inter Bold 28px):
"O custo de NÃO agir: R$ 1.970.000 em 12 meses"
Subtexto cinza (#6B7280):
"Salários +15% YoY + receita não capturada + custo de oportunidade"
```

---

## 🖼️ SLIDE 8 — DECISÃO

### Prompt Stitch

```
Crie um slide de fechamento/CTA no modo DARK:

LAYOUT:
- Background: #0A1628 com glow centralizado
- Composição: máximo impacto visual centralizado

HEADER (topo):
- Tag pill cyan: "+ A DECISÃO"

TÍTULO CENTRAL (gigantesco, Inter Black 80px, branco):
"Iniciar a Fase 1."
- "Fase 1" em gradient text (#2563EB → #5EEAD4)

SUBTÍTULO (Inter Regular 24px, #6B7280):
"R$ 165.000 nos primeiros 3 meses. Resultado validável em 8 semanas."

CHECKLIST (centro, max-width 600px):
"Decisões necessárias esta semana:"
- ☐ Aprovação do orçamento Ano 1: R$ 441.490
- ☐ Aprovar stack: Anthropic + Google Cloud + Meta
- ☐ Autorização para contratar 1 Engenheiro AI Senior
- ☐ Confirmar operação 100% autônoma (0 pessoas operacionais)
- ☐ Definir kick-off (alvo: 20/05/2026)

Cada checkbox: outline branco 24px, texto branco 18px
Espaçamento: 16px entre itens

CTA BUTTON (centro, pill grande):
- Background: gradient #2563EB → #5EEAD4
- Texto branco (Inter SemiBold 18px): "Aprovar e iniciar →"
- Padding 20px × 40px
- Border-radius 999px
- Shadow sutil
- Subtítulo abaixo (#6B7280 14px): "Sem compromisso · Resposta em até 24h"

FOOTER:
- Logo "D.ANTIA" branco pequeno (lado esquerdo)
- Texto pequeno (#6B7280): "Você foca na empresa. A gente cuida em te dar resultado."
```

---

## 🛠️ FLUXO DE EXECUÇÃO NO STITCH

### Passo 1 — Criar Design System

Use a ferramenta `create_design_system_from_design_md` apontando para este arquivo OU para o `BRAND_GUIDE_DANTUIA.md`.

```
Input:
  - Nome do design system: "Novais Digital Brand 2026"
  - Markdown: cole o bloco "DESIGN SYSTEM — Novais Digital" acima
```

### Passo 2 — Criar Projeto

```
mcp__stitch__create_project
  Nome: "Novais Digital Executive Summary - Board 2026-05"
  Tipo: Presentation deck
  Design system: "Novais Digital Brand 2026"
```

### Passo 3 — Gerar Cada Slide

Para cada um dos 8 slides:
```
mcp__stitch__generate_screen_from_text
  Project: "Novais Digital Executive Summary - Board 2026-05"
  Screen name: "Slide X — [Nome]"
  Prompt: [colar o prompt completo de cada slide acima]
  Design system: "Novais Digital Brand 2026"
```

### Passo 4 — Refinamento

Para ajustes finos use:
```
mcp__stitch__edit_screens
  Screen ID: [id do slide]
  Instructions: "Ajuste X / Y"

mcp__stitch__generate_variants
  Screen ID: [id]
  Variants: 3
```

---

## 📋 CHECKLIST DE QUALIDADE

Antes de aprovar cada slide, validar:

- [ ] Cores exatas do brand guide aplicadas
- [ ] Logo "D.ANTIA" presente (não "Novais Digital" ou "NOVAIS DIGITAL")
- [ ] Tipografia geometric sans-serif (Inter/Manrope)
- [ ] Cantos arredondados em todos os elementos
- [ ] Alternância dark/light respeitada
- [ ] Espaçamento generoso (lots of whitespace)
- [ ] Números destacados em peso Black/ExtraBold
- [ ] Gradientes #2563EB → #5EEAD4 em CTAs
- [ ] Tom de voz da copy: direto, confiante, "você/a gente"
- [ ] Glow sutil em backgrounds dark

---

## 💡 VARIAÇÕES OPCIONAIS

Se quiser gerar versões alternativas, peça ao Stitch:

1. **Versão "Investor Pitch"** — mais agressiva em números, menos texto
2. **Versão "Time Interno"** — mais detalhes operacionais
3. **Versão "1-pager Print"** — todos os 8 slides em 1 página A4 landscape

---

**Documento pronto para uso no Claude Design (Stitch)**
**Próximo passo:** Executar os prompts em sequência ou solicitar geração via `mcp__stitch__*`
