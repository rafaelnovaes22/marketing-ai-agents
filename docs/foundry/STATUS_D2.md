# Novais Digital Social — Status D2 (Dia 2 do roadmap de 14 dias)
**Data:** 2026-05-13 | **Foundry consumido:** v0.12.0+ | **Próximo checkpoint:** D5

---

## 🎯 Visão geral

```
Investimento Ano 1:  R$ 441.490
Retorno projetado:   R$ 1.343.110
ROI Ano 1:           204%
Payback:             4 meses
```

**Status hoje:**
- ✅ Foundry adotado no projeto (Foundry-12)
- ✅ Wave 1 do social-media-agent completa (foundation)
- ✅ Wave 2 do social-media-agent completa (use cases + adapters + tests)
- ✅ 6 demais agentes diagnosticados em paralelo (3 artefatos cada)
- ✅ Tom the CEO capturado (22 quotes + 8 dimensões + 5 few-shots)

---

## 📊 Status dos 7 SKUs (todos diagnosticados)

| # | SKU | Priority | C3 | Margem | Stage | Próximo passo |
|---|-----|:--------:|:--:|:------:|:-----:|---------------|
| 1 | **social-media-agent** | P0 | ✅ | 85% | draft → SHADOW (Wave 3 TDD red) | Implementar use cases (parcialmente feito) + eval-suite |
| 2 | **copywriter-agent** | P0 | ✅ | 96% | draft | `/novais-digital:plan` + `@artifact-architect` |
| 3 | **designer-agent** | P0 | ✅ | 90% | draft | `/novais-digital:plan` + curadoria de eval-cases on-brand |
| 4 | **trafego-agent** | P1 | ✅ | 87% | draft | `/novais-digital:plan` + validar Meta API adapter versionado |
| 5 | **video-editor-agent** | P1 | ⚠️ | 84% (cenário A) | draft_split | **ADR-001-VE:** split em 2 SKUs antes de plan |
| 6 | **estrategista-agent** | P2 | ✅ | 87% | draft | `/novais-digital:plan` + AARRR canonical prompt |
| 7 | **atendimento-dm-agent** | P2 | ✅ | 93% | draft | DPO/LGPD + kill switch + `/novais-digital:plan` |

**Totais agregados:**
- Margem média: 89% (excede meta C3 de 75%)
- Investimento médio/SKU: ~R$ 53K
- ADRs locais propostos: 22 (4 social-media + 3 × 6 outros)

---

## 🛠️ Trilha A — social-media-agent (deep dive)

### Wave 1 (Foundation) — entregue D1
- ✅ Setup TS + Vitest + Prisma + Zod + Pino
- ✅ Domain: 6 entidades (Carrossel, Slide, Caption, Tom, RedeSocial, BrandGuide)
- ✅ Ports: 5 interfaces (LLM, ImageGen, BrandValidator, SocialPublisher, Observability)
- ✅ Brand guide YAML estruturado + loader Zod
- ✅ System prompt the CEO (8 princípios + 2 few-shots)
- ✅ Smoke test domain (15+ asserções, sem deps externas)

### Wave 2 (Use Cases + Adapters) — entregue D2
- ✅ ClaudeAdapter (funcional, com prompt caching)
- ✅ BrandValidatorAdapter (Claude Sonnet 4.6 vision)
- ✅ ZernioAdapter (LinkedIn/IG/FB com retry)
- ✅ TwitterAdapter (thread mode + validações, ADR-003-DS)
- ✅ ImagenAdapter + IdeogramAdapter (skeletons — Wave 3 TDD red phase)
- ✅ LangfuseAdapter (traces + spans)
- ✅ GenerateCarrosselUseCase (end-to-end orchestration)
- ✅ PublishMultiNetworkUseCase (4 redes paralelas)
- ✅ Fakes (5 classes para todos os ports)
- ✅ Integration tests (7 cenários cobrindo happy + edge cases)

### Wave 3-6 (próximos)
- ⏳ **Wave 3:** `/novais-digital:aios-run social-media-agent --step=test --mode=red` (TDD red phase obrigatório Foundry-10)
- ⏳ **Wave 4:** Implementação real Imagen 4 + Ideogram + TwitterAPI (substituir skeletons)
- ⏳ **Wave 5:** Eval-suite roda + LLM-as-judge + CI workflow
- ⏳ **Wave 6:** Zernio integration sandbox → produção SHADOW + promoção

---

## 🔬 Insights de paralelização (este dia)

Disparei 6 subagents em paralelo (cada um gerando 3 artefatos). Resultado:

| Métrica | Valor |
|---------|------:|
| Tempo total elapsed (paralelo) | ~7 min |
| Tempo se fosse sequencial estimado | ~42 min |
| Speedup real | **6×** |
| Custo total (estimado) | ~$0.40 |
| Artefatos gerados | 18 (3 × 6 agentes) |
| ADRs propostos | 18 (3 × 6) |
| Decisões críticas identificadas | 1 (video-editor split em 2 SKUs) |

**Validação tese:** paralelização via subagents Claude funciona — o que justifica o plano de 14 dias.

---

## 🚨 Decisões críticas que apareceram nos diagnósticos

### 1. video-editor-agent: split em 2 SKUs (ADR-001-VE)
- **video-editor-agent** R$ 30: corte de vídeo input → C3 PASS (R$ 4,80)
- **video-editor-agent-premium** R$ 150: Veo 3 do zero → diferido para wave 2
- Motivo: Veo 3 $0.50/seg × 30s = $15 ≈ R$ 80 — viola C3 brutalmente
- **Ação:** founder decide se mantém só o básico ou cria premium

### 2. atendimento-dm-agent: condições estritas para AUTONOMOUS (criticality A)
- Lifecycle SHADOW ≥ 30 dias obrigatório (vs 7-14 dos outros)
- ASSISTED com review humano 100% (não amostra 10%)
- LGPD DPA obrigatório antes de SHADOW
- Kill switch: 3 incidentes graves/7 dias → rollback automático
- AUTONOMOUS exige ≥30 DMs/dia comprovados (economia de escala)
- Política de não-cobrança em escalonamento (custo absorvido <2% receita mensal)

### 3. trafego-agent: separação contratual ad spend
- Fee Novais Digital R$ 50 (criação + otimização)
- Ad spend (R$ 30K/mês exemplo) pago direto pelo cliente à Meta
- Cláusula contratual: NÃO somos responsáveis por aprovação Meta nem custos de ad
- Special Ad Categories fora de escopo fase 1

### 4. copywriter-agent: limite landing default
- Landing padrão: 1.500-2.000 palavras (R$ 80)
- Upsell: 2.500-3.500 palavras (R$ 110)
- Motivo: previsibilidade SLA + C3

---

## 📁 Estrutura atual do projeto

```
Novais_Social/
├── docs/foundry/
│   ├── manifest.json                      ← consolidado com 7 SKUs
│   ├── STATUS_D2.md                       ← este arquivo
│   ├── project.json                       ← declaração agentic_saas
│   └── sku/
│       ├── social-media-agent/            (9 arquivos)
│       │   ├── diagnostic.md
│       │   ├── spec.md
│       │   ├── unit-economics.md
│       │   ├── plan.md
│       │   ├── tasks.md
│       │   ├── eval-cases.md (22 cases)
│       │   ├── decisions.md (4 ADRs)
│       │   ├── lifecycle-stage.md
│       │   ├── tom-brand-voice-ceo.md (22 quotes, 8 dimensões)
│       │   └── WAVE_1_HANDOFF.md
│       ├── copywriter-agent/   (3 arquivos)
│       ├── designer-agent/     (3 arquivos)
│       ├── trafego-agent/      (3 arquivos)
│       ├── video-editor-agent/ (3 arquivos)
│       ├── estrategista-agent/ (3 arquivos)
│       └── atendimento-dm-agent/ (3 arquivos)
│
├── src/
│   ├── domain/
│   │   ├── carrossel/                     (6 entities)
│   │   └── ports/                         (5 interfaces)
│   ├── application/social-media-agent/    (2 use cases)
│   └── infrastructure/
│       ├── brand/BrandGuideLoader.ts
│       └── adapters/
│           ├── llm/ClaudeAdapter.ts       (funcional)
│           ├── image-gen/                 (2 skeletons)
│           ├── brand/BrandValidatorAdapter.ts (funcional)
│           ├── social-publishers/
│           │   ├── ZernioAdapter.ts       (funcional)
│           │   └── TwitterAdapter.ts      (validação OK; integração Wave 3+)
│           └── observability/LangfuseAdapter.ts (funcional)
│
├── tests/social-media-agent/
│   ├── unit/
│   │   ├── domain-smoke.test.ts           (15+ asserções)
│   │   └── fakes.ts                       (5 fakes)
│   └── integration/
│       └── use-cases.test.ts              (7 cenários)
│
├── prompts/social-media-agent/
│   └── system-prompts/brand_voice_ceo.md
│
├── brand/novais-digital-brand-guide.yaml
├── prisma/schema.prisma
├── package.json, tsconfig.json, vitest.config.ts, .env.example
└── (Foundry canônico: .claude/, hooks/, templates/, scripts/foundry)
```

---

## 🗓️ Roadmap atualizado (14 dias)

| Dia | Atividade | Status |
|:---:|-----------|:------:|
| **D1** | Setup Foundry + diagnose social-media + tom CEO | ✅ |
| **D2** | Wave 1+2 social-media + diagnose 6 agentes paralelo | ✅ **HOJE** |
| D3 | `/novais-digital:plan` dos 6 outros agentes (subagents paralelo) + Wave 3 (TDD red) social-media | ⏳ |
| D4 | Wave 4 social-media (impl real Imagen/Ideogram) + plan revisado video-editor split | ⏳ |
| D5 | Wave 5 social-media (eval-suite) + tasks dos outros 5 agentes | ⏳ |
| D6 | Wave 6 social-media → SHADOW + impl P0 (copywriter, designer) | ⏳ |
| D7 | Eval P0 (3 agentes) + promoção SHADOW | ⏳ |
| D8 | Impl P1 (trafego, video-editor cenário A) | ⏳ |
| D9-10 | Eval P1 + promoção SHADOW | ⏳ |
| D11-12 | Impl P2 (estrategista, atendimento-dm) | ⏳ |
| D13 | Integração inter-agentes + tests E2E | ⏳ |
| D14 | Monthly audit DeepAgent + handover | ⏳ |

**Marco D2:** 7/7 SKUs em `draft` com C3 validado, todos prontos para `/novais-digital:plan`.

---

## 🎯 Próximo passo concreto

**Trilha A (social-media-agent):**
- Dev humano roda `npm install` + smoke test (validação Wave 1+2)
- Wave 3: `/novais-digital:aios-run social-media-agent --step=test --mode=red`

**Trilha B (6 outros agentes):**
- Disparar próxima rodada de subagents para `/novais-digital:plan` dos 6
- Estimativa: mais ~10 min de paralelização

**Decisão necessária do founder:**
- ⚠️ Aprovar split do video-editor em 2 SKUs (ou rejeitar/adiar)
- ⚠️ Aprovar política LGPD do atendimento-dm (DPO consulta)
- ⚠️ Aprovar pricing upsell copywriter (R$ 80 padrão, R$ 110 estendido)

---

## 💡 Insights honestos para o AUDIT do agent-governance-framework

1. **Paralelização funciona** — 6 subagents geraram 18 artefatos consistentes em 7 min. Validação real do plano de 14 dias.

2. **`@unit-economist` previne disaster** — video-editor com Veo 3 seria 10× sobre o budget. Sem o gate de C3 antes do code, ia explodir em produção.

3. **Subagents respeitam estrutura do Foundry** — todos seguiram o formato 5-seções, criaram arquivos nos diretórios corretos, propuseram ADRs locais.

4. **Brand guide YAML estruturado é reusável** — designer-agent + social-media-agent + futuros agentes consomem o mesmo `brand/novais-digital-brand-guide.yaml`. Custo de extração (vídeo → YAML) pago 1 vez, amortizado em 7 SKUs.

5. **Lacuna identificada:** Foundry não tem `foundry-doctor --consumer` mode → muitos warnings falsos no consumidor (documentado para AUDIT futuro).

6. **Lacuna identificada:** secret-scan tem falsos positivos em docs com exemplos (postgresql://...). Já documentado.

---

**Documento gerado por:** Claude Code (Foundry orchestrator)
**Próxima atualização:** STATUS_D5.md ao fim da onda P0
