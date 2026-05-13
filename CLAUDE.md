# Acme Social — Guia para Claude Code

> **Projeto consumidor do agent-governance-framework v0.12.0+.**
> Trabalho aqui é **OPERAR** o pipeline Forge para construir 7 agentes IA de marketing digital em 14 dias.

---

## 🎯 Contexto: o que é o Acme Social?

Acme Social é um SaaS² (SaaS de agentes) que entrega marketing digital autônomo:
- **7 agentes especializados** (social media, copywriter, designer, tráfego, vídeo, estrategista, atendimento DM)
- **4 redes sociais** (LinkedIn, Instagram, Facebook, Twitter) com 3 posts/semana = 52 posts/mês
- **Operação 100% autônoma** — 0 pessoas operacionais, apenas 1 Eng AI manutenção + founder estratégia
- **Stack consolidado** — Anthropic (Claude) + Google Vertex AI (Imagen 4 + Veo 3) + Meta

**Números-chave:**
- Investimento Ano 1: R$ 441.490
- Retorno projetado: R$ 1.343.110
- ROI Ano 1: 204% | Payback: 4 meses | ROI Ano 2: 450%

Veja [`documentacao/EXECUTIVE_SUMMARY_ACME.md`](./documentacao/EXECUTIVE_SUMMARY_ACME.md) para síntese de 1 página.

---

## 🧭 Antes de qualquer ação: carregue o master prompt

Este é um **projeto consumidor agentic_saas + ai_enabled=true**. Antes de operar, **leia integralmente**:

📖 [`templates/master-prompt.md`](./templates/master-prompt.md)

Esse documento é a referência canônica de operação. Ele:
1. Detecta `project_type` e `ai_enabled` lendo [`docs/forge/project.json`](./docs/forge/project.json)
2. Adapta interpretação de C1-C8 para este projeto
3. Roteia slash commands `/acme:*` por tipo
4. Invoca os 10 Guardians corretos
5. Padroniza output em 5 seções (Diagnóstico → Rota → Riscos → Próximo passo → Outputs)

---

## 🛡️ Constitution (canônica do forge)

[`./.claude/CONSTITUTION.md`](./.claude/CONSTITUTION.md) é **cópia canônica** do agent-governance-framework. **Não editar localmente** — mudanças exigem ADR no forge upstream.

Os 8 princípios C1-C8 aplicam-se com **interpretação local**:

| Princípio | Como aplica aqui |
|-----------|------------------|
| **C1** Diagnose-first | Toda capability nova começa com `/acme:diagnose` antes de spec/code |
| **C2** Outcome contratual | Cada um dos 7 SKUs tem outcome verificável em `project.json` (ex: "carrossel publicado em ≤8min") |
| **C3** Unit economics | Custo de tokens + imagem ≤ 25% do preço por outcome (auditado por `@unit-economist`) |
| **C4** Verifiable evaluation | Eval-suite LLM com 20+ casos por SKU; lifecycle SHADOW→ASSISTED→AUTONOMOUS |
| **C5** ADR | Toda decisão arquitetural em `docs/forge/decisions.md` (Fxx-DS) |
| **C6** Observability | Langfuse obrigatório (ai_enabled=true) — traces de prompt/output/cost por execução |
| **C7** Portability | Adapter pattern: Claude/Imagen/Veo isolados em `lib/<provider>-adapter/` |
| **C8** Tenant context | Single-tenant fase 1 (Acme própria); multi-tenant planejado fase 2 |

---

## 🚀 Como começar (cheatsheet)

### Wizard interativo
```bash
bash scripts/forge start
```

### Validar instalação
```bash
bash scripts/forge doctor
```

### Versão atual
```bash
bash scripts/forge version
```

### Primeiro agente (recomendado começar por aqui)
```bash
/acme:diagnose social-media-agent
```

---

## 🗺️ Os 7 SKUs (declarados em `docs/forge/project.json`)

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

## 📂 Estrutura do repo (depois da adoção do Forge)

```
Acme_Social/
├── .claude/                       ← canônico do forge (não editar)
│   ├── CONSTITUTION.md
│   ├── settings.json
│   ├── settings.local.json        ← per-dev (gitignored)
│   ├── agents/                    ← 10 Guardians
│   ├── commands/acme/           ← 15 slash commands
│   └── skills/                    ← 9 skills L0/L1/L2
├── docs/forge/
│   ├── project.json               ← declaração consumidor (7 SKUs)
│   ├── manifest.json              ← inventário local
│   ├── decisions.md               ← ADRs locais (a criar conforme decisões aparecem)
│   └── sku/                       ← specs dos 7 SKUs (a criar via /acme:spec)
│       ├── social-media-agent/
│       ├── copywriter-agent/
│       └── ... (5 outros)
├── hooks/                         ← 10 hooks (incluindo friendly-errors)
├── templates/                     ← cópia canônica do forge (inclui master-prompt.md)
├── scripts/
│   ├── forge                      ← CLI wrapper
│   └── forge-doctor.sh            ← validação
├── documentacao/                  ← docs de negócio (executive summary, AS IS/TO BE, etc.)
├── brand_extraction/              ← artefatos brutos do vídeo de brand
├── AS_IS_TO_BE/                   ← PDF da apresentação executiva
└── CLAUDE.md                      ← este arquivo
```

---

## 🎯 Roadmap dos 14 dias

### Semana 1 — Foundation + 5 agentes P0/P1 em SHADOW

| Dia | Atividade |
|:---:|-----------|
| **D1** | Setup completo (Forge adotado ✅ feito hoje) + diagnose dos 7 agentes em paralelo |
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

Detalhes em [`documentacao/PLANO_AGENTES_DANTUIA_SOCIAL.md`](./documentacao/PLANO_AGENTES_DANTUIA_SOCIAL.md).

---

## ⚠️ Operações que exigem confirmação humana

Mesmo nos limites do `.claude/settings.json`, **sempre** confirme antes de:

- Mudar `docs/forge/project.json` (afeta interpretação C1-C8)
- Promover qualquer SKU para ASSISTED ou AUTONOMOUS (envolve cobrança real)
- Editar `.claude/CONSTITUTION.md` (não permitido localmente — exige PR no forge)
- Modificar `templates/master-prompt.md` (canônico — exige PR no forge)
- Aprovar `acceptance-report.md` ou `unit-economics.md`
- Push para `master` (preferir branch + PR)

---

## 🔗 Documentos de referência

### Forge upstream
- [`templates/master-prompt.md`](./templates/master-prompt.md) — operação universal
- [`.claude/CONSTITUTION.md`](./.claude/CONSTITUTION.md) — 8 princípios

### Negócio (este projeto)
- [`documentacao/EXECUTIVE_SUMMARY_ACME.md`](./documentacao/EXECUTIVE_SUMMARY_ACME.md) — síntese executiva
- [`documentacao/AS_IS_TO_BE_ACME.md`](./documentacao/AS_IS_TO_BE_ACME.md) — 17 slides
- [`documentacao/PLANO_AGENTES_DANTUIA_SOCIAL.md`](./documentacao/PLANO_AGENTES_DANTUIA_SOCIAL.md) — plano técnico completo
- [`documentacao/BRAND_GUIDE_DANTUIA.md`](./documentacao/BRAND_GUIDE_DANTUIA.md) — identidade visual extraída

### Onboarding
- [`HELLO.md`](./HELLO.md) — landing adaptativo *(criar copiando do forge se quiser)*
- [`QUICKSTART_VIBE.md`](./QUICKSTART_VIBE.md) — para founder vibecodando *(idem)*
- [`QUICKSTART_DEV.md`](./QUICKSTART_DEV.md) — para dev *(idem)*

---

## 🎯 Próximo passo concreto

**Para começar a construir o primeiro agente (Social Media Agent), execute:**

```bash
/acme:diagnose social-media-agent --outcome="gerar carrossel publicável em 8 min no tom the CEO"
```

Isso vai:
1. Invocar `@po-guardian` para validar outcome
2. Criar `docs/forge/sku/social-media-agent/diagnostic.md`
3. Sinalizar próximo passo (provavelmente `/acme:spec --type=platform-sku`)

---

**Validação rápida que o Forge está funcionando aqui:**

```bash
bash scripts/forge version
# Esperado: Forge v0.12.0, fase Forge-12 Fase 2 consumida

bash scripts/forge mode vibe
# (ou dev/agent — define preferência local em .forge-mode)
```

### ⚠️ Sobre `bash scripts/forge doctor` em projetos consumidores

O `forge-doctor.sh` foi desenvolvido para validar o **repo canônico** do agent-governance-framework.
Rodá-lo aqui (consumidor) produz **warnings/fails esperados**:

- ⚠️ ~65 warnings "artefato órfão" — porque o manifest local não duplica artefatos canônicos (intencional)
- ❌ 2 fails sobre `reviewer/` — porque consumidor não tem essa pasta (intencional; reviewer roda no upstream)

**Não tente "corrigir" esses warnings.** O Forge funciona corretamente apesar deles. Validação real do consumidor:

1. ✅ `bash scripts/forge version` retorna 0.12.0
2. ✅ `docs/forge/project.json` válido (JSON parse)
3. ✅ Master prompt detecta `project_type=agentic_saas` + `ai_enabled=true` ao iniciar
4. ✅ Slash commands `/acme:*` disponíveis (.claude/commands/acme/)
5. ✅ Guardians invocáveis via @nome (.claude/agents/)

Melhoria futura no forge: criar `forge-doctor --consumer` que aplica regras diferentes.
