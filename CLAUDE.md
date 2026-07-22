# Novais Digital Social — Guia para Claude Code

> **Projeto consumidor do agent-governance-framework v0.12.0+.**
> Trabalho aqui é **OPERAR** o pipeline Foundry para construir 7 agentes IA de marketing digital em 14 dias.

---

## 🎯 Contexto: o que é o Novais Digital Social?

Novais Digital Social é um SaaS² (SaaS de agentes) que entrega marketing digital autônomo:
- **7 agentes especializados** (social media, copywriter, designer, tráfego, vídeo, estrategista, atendimento DM)
- **4 redes sociais** (LinkedIn, Instagram, Facebook, Twitter) com 3 posts/semana = 52 posts/mês
- **Operação 100% autônoma** — 0 pessoas operacionais, apenas 1 Eng AI manutenção + founder estratégia
- **Stack consolidado** — Anthropic (Claude) + Google Vertex AI (Imagen 4 + Veo 3) + Meta + **LangGraph (orchestration runtime) + LangSmith (tracing)** [ver [ADR-005-PROJ](./docs/foundry/decisions/ADR-005-PROJ-orchestration-runtime.md) e [ADR-006-PROJ](./docs/foundry/decisions/ADR-006-PROJ-tracing-substitution.md)]

**Números-chave (projeção com dados sintéticos — exercício de planejamento, sem cliente real):**
- Investimento Ano 1: R$ 441.490
- Retorno projetado: R$ 1.343.110
- ROI Ano 1: 204% | Payback: 4 meses | ROI Ano 2: 450%

Veja [`documentacao/EXECUTIVE_SUMMARY_NOVAIS.md`](./documentacao/EXECUTIVE_SUMMARY_NOVAIS.md) para síntese de 1 página.

---

## 🧭 Antes de qualquer ação: carregue o master prompt

Este é um **projeto consumidor agentic_saas + ai_enabled=true**. Antes de operar, **leia integralmente**:

📖 [`templates/master-prompt.md`](./templates/master-prompt.md)

Esse documento é a referência canônica de operação. Ele:
1. Detecta `project_type` e `ai_enabled` lendo [`docs/foundry/project.json`](./docs/foundry/project.json)
2. Adapta interpretação de C1-C8 para este projeto
3. Roteia slash commands `/novais-digital:*` por tipo
4. Invoca os 10 Guardians corretos
5. Padroniza output em 5 seções (Diagnóstico → Rota → Riscos → Próximo passo → Outputs)

---

## 🛡️ Constitution (canônica do foundry)

[`./.claude/CONSTITUTION.md`](./.claude/CONSTITUTION.md) é **cópia canônica** do agent-governance-framework. **Não editar localmente** — mudanças exigem ADR no foundry upstream.

Os 8 princípios C1-C8 aplicam-se com **interpretação local**:

| Princípio | Como aplica aqui |
|-----------|------------------|
| **C1** Diagnose-first | Toda capability nova começa com `/novais-digital:diagnose` antes de spec/code |
| **C2** Outcome contratual | Cada um dos 7 SKUs tem outcome verificável em `project.json` (ex: "carrossel publicado em ≤8min") |
| **C3** Unit economics | Custo de tokens + imagem ≤ 25% do preço por outcome (auditado por `@unit-economist`) |
| **C4** Verifiable evaluation | Eval-suite LLM com 20+ casos por SKU; lifecycle SHADOW→ASSISTED→AUTONOMOUS |
| **C5** ADR | Toda decisão arquitetural em `docs/foundry/decisions.md` raiz + detalhes em `docs/foundry/decisions/ADR-NNN-PROJ-*.md` |
| **C6** Observability | **LangSmith** obrigatório (ai_enabled=true, ADR-006-PROJ — substitui Langfuse) — traces de prompt/output/cost por execução |
| **C7** Portability | Adapter pattern: Claude/Imagen/Veo isolados em `src/infrastructure/adapters/`. **Exceção declarada (ADR-005-PROJ):** `src/orchestration/` acopla a LangGraph |
| **C8** Tenant context | Single-tenant fase 1 (Novais Digital própria); multi-tenant planejado fase 2. `BaseGraphState` impõe `tenantId` no boundary |

---

## 🚀 Como começar (cheatsheet)

### Wizard interativo
```bash
bash scripts/foundry start
```

### Validar instalação
```bash
bash scripts/foundry doctor
```

### Versão atual
```bash
bash scripts/foundry version
```

### Primeiro agente (recomendado começar por aqui)
```bash
/novais-digital:diagnose social-media-agent
```

---

## 🗺️ Os 7 SKUs (declarados em `docs/foundry/project.json`)

| # | SKU | Outcome | Preço | SLA | Prioridade |
|---|-----|---------|-------|-----|:----------:|
| 1 | `social-media-agent` | Carrossel publicado em 4 redes | R$ 12 | 8 min | P0 |
| 2 | `copywriter-agent` | Landing/email/ads entregue | R$ 80 | 15 min | P0 |
| 3 | `designer-agent` | Design carrossel brand 99%+ | R$ 20 | 20 min | P0 |
| 4 | `trafego-agent` | Campanha Meta publicada | R$ 50 | 5 min | P1 |
| 5 | `video-editor-agent` | Vídeo curto pronto | R$ 30 | 10 min | P1 |
| 6 | `estrategista-agent` | Diagnóstico de funil | R$ 100 | 2 min | P2 |
| 7 | `atendimento-dm-agent` | Lead qualificado DM | R$ 5 | <10s | P2 |

**Ordem de implementação:** P0 (semana 1) → P1 (semana 2 início) → P2 (semana 2 fim).

---

## 📂 Estrutura do repo (depois da adoção do Foundry)

```
Novais_Social/
├── .claude/                       ← canônico do foundry (não editar)
│   ├── CONSTITUTION.md
│   ├── settings.json
│   ├── settings.local.json        ← per-dev (gitignored)
│   ├── agents/                    ← 10 Guardians
│   ├── commands/novais-digital/           ← 15 slash commands
│   └── skills/                    ← 9 skills L0/L1/L2
├── docs/foundry/
│   ├── project.json               ← declaração consumidor (7 SKUs)
│   ├── manifest.json              ← inventário local
│   ├── decisions.md               ← ADRs locais (a criar conforme decisões aparecem)
│   └── sku/                       ← specs dos 7 SKUs (a criar via /novais-digital:spec)
│       ├── social-media-agent/
│       ├── copywriter-agent/
│       └── ... (5 outros)
├── hooks/                         ← 10 hooks (incluindo friendly-errors)
├── templates/                     ← cópia canônica do foundry (inclui master-prompt.md)
├── scripts/
│   ├── foundry                      ← CLI wrapper
│   └── foundry-doctor.sh            ← validação
├── documentacao/                  ← docs de negócio (executive summary, AS IS/TO BE, etc.)
└── CLAUDE.md                      ← este arquivo
```

---

## 🎯 Roadmap dos 14 dias

### Semana 1 — Foundation + 5 agentes P0/P1 em SHADOW

| Dia | Atividade |
|:---:|-----------|
| **D1** | Setup completo (Foundry adotado ✅ feito hoje) + diagnose dos 7 agentes em paralelo |
| **D2** | Specs P0 (social, copy, designer) + ADRs iniciais |
| **D3** | Eval-cases dos 5 agentes (100+ no total) |
| **D4** | Implementação SHADOW: social-media-agent + copywriter-agent |
| **D5** | Implementação SHADOW: designer-agent |
| **D6** | Implementação SHADOW: atendimento-dm-agent (24/7) |
| **D7** | Implementação SHADOW: trafego-agent |

### Semana 2 — Promoção + 2 agentes restantes + integração

| Dia | Atividade |
|:---:|-----------|
| **D8** | Eval-suite roda nos 5 agentes; promotion SHADOW→ASSISTED |
| **D9-10** | Implementação SHADOW: video-editor-agent (Veo 3) |
| **D11-12** | Implementação SHADOW: estrategista-agent (Mixpanel) |
| **D13** | Integração inter-agentes (Tool Use cross-agent) + tests E2E |
| **D14** | Monthly audit DeepAgent + handover + documentação |

**Fim D14:** 7 agentes em ASSISTED + audit pass + sistema completo.

Detalhes em [`documentacao/PLANO_AGENTES_SOCIAL.md`](./documentacao/PLANO_AGENTES_SOCIAL.md).

---

## ⚠️ Operações que exigem confirmação humana

Mesmo nos limites do `.claude/settings.json`, **sempre** confirme antes de:

- Mudar `docs/foundry/project.json` (afeta interpretação C1-C8)
- Promover qualquer SKU para ASSISTED ou AUTONOMOUS (envolve cobrança real)
- Editar `.claude/CONSTITUTION.md` (não permitido localmente — exige PR no foundry)
- Modificar `templates/master-prompt.md` (canônico — exige PR no foundry)
- Aprovar `acceptance-report.md` ou `unit-economics.md`
- Push para `master` (preferir branch + PR)

---

## 🔗 Documentos de referência

### Foundry upstream
- [`templates/master-prompt.md`](./templates/master-prompt.md) — operação universal
- [`.claude/CONSTITUTION.md`](./.claude/CONSTITUTION.md) — 8 princípios

### Negócio (este projeto)
- [`documentacao/EXECUTIVE_SUMMARY_NOVAIS.md`](./documentacao/EXECUTIVE_SUMMARY_NOVAIS.md) — síntese executiva
- [`documentacao/AS_IS_TO_BE_NOVAIS.md`](./documentacao/AS_IS_TO_BE_NOVAIS.md) — 17 slides
- [`documentacao/PLANO_AGENTES_SOCIAL.md`](./documentacao/PLANO_AGENTES_SOCIAL.md) — plano técnico completo
- [`documentacao/BRAND_GUIDE.md`](./documentacao/BRAND_GUIDE.md) — identidade visual extraída

### Onboarding
- [`HELLO.md`](./HELLO.md) — landing adaptativo *(criar copiando do foundry se quiser)*
- [`QUICKSTART_VIBE.md`](./QUICKSTART_VIBE.md) — para founder vibecodando *(idem)*
- [`QUICKSTART_DEV.md`](./QUICKSTART_DEV.md) — para dev *(idem)*

---

## 🎯 Próximo passo concreto

**Para começar a construir o primeiro agente (Social Media Agent), execute:**

```bash
/novais-digital:diagnose social-media-agent --outcome="gerar carrossel publicável em 8 min no tom the CEO"
```

Isso vai:
1. Invocar `@po-guardian` para validar outcome
2. Criar `docs/foundry/sku/social-media-agent/diagnostic.md`
3. Sinalizar próximo passo (provavelmente `/novais-digital:spec --type=platform-sku`)

---

**Validação rápida que o Foundry está funcionando aqui:**

```bash
bash scripts/foundry version
# Esperado: Foundry v0.12.0, fase Foundry-12 Fase 2 consumida

bash scripts/foundry mode vibe
# (ou dev/agent — define preferência local em .foundry-mode)
```

### ⚠️ Sobre `bash scripts/foundry doctor` em projetos consumidores

O `foundry-doctor.sh` foi desenvolvido para validar o **repo canônico** do agent-governance-framework.
Rodá-lo aqui (consumidor) produz **warnings/fails esperados**:

- ⚠️ ~65 warnings "artefato órfão" — porque o manifest local não duplica artefatos canônicos (intencional)
- ❌ 2 fails sobre `reviewer/` — porque consumidor não tem essa pasta (intencional; reviewer roda no upstream)

**Não tente "corrigir" esses warnings.** O Foundry funciona corretamente apesar deles. Validação real do consumidor:

1. ✅ `bash scripts/foundry version` retorna 0.12.0
2. ✅ `docs/foundry/project.json` válido (JSON parse)
3. ✅ Master prompt detecta `project_type=agentic_saas` + `ai_enabled=true` ao iniciar
4. ✅ Slash commands `/novais-digital:*` disponíveis (.claude/commands/novais-digital/)
5. ✅ Guardians invocáveis via @nome (.claude/agents/)

Melhoria futura no foundry: criar `foundry-doctor --consumer` que aplica regras diferentes.
