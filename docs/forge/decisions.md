# Acme Social — Decisões Executivas (ADRs Globais do Projeto)

> ADRs específicos do **projeto** (não de SKU individual). Convenção: `ADR-NNN-PROJ`.
> ADRs locais de SKU ficam em `docs/forge/sku/<nome>/decisions.md`.

---

## ADR-001-PROJ — Video Editor: split em 2 SKUs (corte vs premium)

**Status:** ✅ Aceito 2026-05-13 — aprovado pelo founder
**Princípios relacionados:** C2 (Outcome contratual) + C3 (Unit Economics)
**Substitui:** ADR-001-VE local (eleva para escopo de projeto)

### Contexto

Diagnóstico do `video-editor-agent` revelou trade-off severo de C3:
- **Cenário A — cortar vídeo input longo:** custo R$ 4,80 ≤ R$ 7,50 (limite 25% × R$ 30) ✅
- **Cenário B — gerar vídeo do zero com Veo 3 (30s):** custo R$ 80,71 vs limite R$ 7,50 ❌ (10× sobre o budget)

Manter os dois cenários sob um único SKU R$ 30 violaria C3 brutalmente OU forçaria preço artificialmente alto sem clareza para o cliente.

### Decisão

Separar em **2 SKUs distintos**:

| SKU | Preço | Caso de uso | Status |
|-----|------:|-------------|:------:|
| `video-editor-agent` | R$ 30 | Cortar vídeo longo input (Reels/TikTok a partir de live/podcast) | ✅ Ativo wave 1 |
| `video-editor-agent-premium` | R$ 150 | Gerar vídeo do zero via Veo 3 | ⏸️ Diferido para wave 2 |

### Motivação

1. **Honestidade contratual:** cliente entende exatamente o que está comprando
2. **C3 preservado:** ambos SKUs com margem > 75%
3. **Validação faseada:** wave 1 valida cenário comum (corte) antes de Veo 3 (caro)
4. **Aprendizado de mercado:** Veo 3 está em early access — preços podem cair 30-50% em 6 meses

### Consequências

- ✅ Cenário A entra na wave 1 do roadmap de 14 dias (sem mudança de plano)
- ✅ Cenário B fica explicitamente fora de escopo até decisão de wave 2
- ⚠️ Cliente pode perguntar "por que não Veo 3?" — script de venda precisa ter resposta
- ⚠️ Marketing precisa não prometer "geração de vídeo a partir de texto" na fase 1

### Re-examinar

90 dias após AUTONOMOUS do cenário A:
- Se demanda por "vídeo do zero" > 20% das consultas → priorizar premium
- Se Veo 3 baixar para ≤$0,20/segundo → revisar economia
- Se Runway Gen-4.5 emparelhar com Veo 3 em qualidade → fallback adapter

---

## ADR-002-PROJ — Copywriter pricing aprovado (R$ 80 padrão + R$ 110 upsell)

**Status:** ✅ Aceito 2026-05-13 — aprovado pelo founder
**Princípios relacionados:** C2 + C3
**Substitui:** ADR-001-CW local (eleva para escopo de projeto)

### Contexto

Subagent que diagnosticou o `copywriter-agent` propôs estrutura de pricing:
- Padrão R$ 80: landing page 1.500-2.000 palavras OU email sequence 3-5 OU 5 ad variations
- Upsell R$ 110: landing page estendida 2.500-3.500 palavras

C3 passa em ambos com margem 93-96%.

### Decisão

✅ **Pricing aprovado conforme proposto:**
- `copywriter-agent` outcome padrão: R$ 80
- Upsell explícito (landing estendida): R$ 110
- Cliente precisa ativar upsell conscientemente (não default automático)

### Motivação

1. **C3 passa com folga (96% margem padrão / 93% upsell)** — sustentável
2. **Mercado:** copywriter pleno cobra R$ 150-300 por landing. Nosso pricing é 50-70% abaixo
3. **Upsell elimina disputa contratual** sobre "tamanho do entregue"
4. **Alinha com social-media (R$ 12 → R$ 16 upsell)** — padrão de upsell explícito no projeto

### Consequências

- ✅ Landing CMS (Webflow) e email platform (Flodesk) aceitam outputs por API
- ✅ Pricing alinhado com plano de receita Ano 1 (R$ 980K incremental)
- ⚠️ Se cliente pedir 4.000+ palavras: criar upsell premium (wave 2, ADR futuro)

### Re-examinar

60 dias após AUTONOMOUS:
- Taxa de upsell > 50% → considerar elevar padrão para R$ 100
- Taxa de upsell < 5% → manter ou simplificar para preço único

---

## ADR-003-PROJ — Atendimento DM: SHADOW interno-only até resolver LGPD

**Status:** ⚠️ Aceito com restrição 2026-05-13 — sem DPO/consultoria jurídica disponível
**Princípios relacionados:** C2 + C4 + C8 (Tenant context) + LGPD/Lei 13.709/2018
**Substitui:** ADR-003-DM local (eleva para escopo de projeto, com modificação)

### Contexto

Subagent diagnosticou `atendimento-dm-agent` (criticality A) e identificou como obrigatório:
- DPA (Data Processing Agreement) LGPD antes de SHADOW
- DPO designado ou consultoria jurídica
- Retenção de transcrições 90 dias
- Direito de esquecimento + opt-in explícito

**Founder informou:** *"Não temos DPO nem consultoria jurídica disponível agora."*

Isso é um bloqueador real. Sem mitigação, o SKU **não pode** atender clientes externos legalmente.

### Decisão

**Adoção em 3 fases com gates LGPD progressivos:**

**Fase 1 — SHADOW interno-only (wave 1)**
- Dados processados: **APENAS DMs internos da Acme** (rede pessoal do founder + staff que opt-in explicitamente assinaram)
- **Zero dados de terceiros não-consentidos**
- Retenção: 30 dias (não 90)
- Lifecycle: `draft → SHADOW (interno) → BLOCKED para ASSISTED externo`
- Custo: R$ 0 (não cobra de ninguém)

**Fase 2 — Resolução de LGPD (pré-wave 2)**
Antes de qualquer dado de cliente externo, OBRIGATÓRIO:
- [ ] Contratar consultoria LGPD pontual (~R$ 3-5K, ~2 semanas) OU
- [ ] Contratar DPO part-time (~R$ 2-3K/mês) OU
- [ ] Founder se certificar em DPO oficialmente (curso ANPD, ~40h)
- [ ] DPA template criado e revisado juridicamente
- [ ] Política de privacidade publicada
- [ ] Mecanismo de opt-in e direito de esquecimento implementado e testado
- [ ] ANPD report registrado se aplicável (volume > 1.000 titulares)

**Fase 3 — ASSISTED → AUTONOMOUS externo (wave 3+, condicional)**
- Apenas após Fase 2 completa
- Cliente externo só com DPA assinado entre Acme e tenant
- Auditoria mensal LGPD obrigatória

### Motivação

1. **Não podemos parar o SKU completamente** — atendimento DM é valor real
2. **SHADOW interno é seguro juridicamente** — dado interno do operador, não de terceiros
3. **Validação técnica continua** — refinamos prompts, eval, integrações antes de qualquer cliente
4. **Honestidade > velocidade** — não vamos arriscar multa LGPD (até 2% receita ou R$ 50M) por pressa
5. **Custo de inação:** ~R$ 0 (DM agente é P2, não bloqueia outros SKUs)

### Consequências

- ✅ Wave 1 prossegue normalmente para os outros 6 SKUs
- ✅ atendimento-dm-agent entra em SHADOW interno e gera dados de validação técnica
- ⚠️ Receita projetada do dm-agent (R$ 5 × 30 DMs/dia × 30 dias = R$ 4.500/mês/tenant) **NÃO entra** no ano 1
- ⚠️ Marketing não pode anunciar "atendimento 24/7 com IA" até Fase 2 resolvida
- ⚠️ ROI Ano 1 do projeto reduz marginalmente (DM era ~5% da receita projetada)
- ✅ Risco de multa LGPD → zero

### Pendência crítica (a resolver pelo founder)

📌 **Decisão a tomar até wave 2 (Mês 2):**
Escolher uma das 3 opções de mitigação LGPD:
1. **Consultoria pontual** — R$ 3-5K, 2-3 semanas → recomendado se Acme ainda não tem volume
2. **DPO part-time** — R$ 2-3K/mês → recomendado se planeja escalar multi-tenant rápido
3. **Founder se certifica** — 40h estudo + R$ 1-2K curso → recomendado se Acme é pequena e founder quer ownership

### Re-examinar

A cada review mensal:
- Volume de DMs internos atingiu 30+/dia? (gate AUTONOMOUS condicional ainda em ADR-001-DM)
- Fase 2 LGPD resolvida?
- Se sim para ambos → considerar promoção para ASSISTED externo (com DPA template)

### Risco aceito

- Receita perdida de DM agent durante 2-3 meses (estimativa R$ 9-13K)
- Trade-off OK: muito menor que risco de multa LGPD (R$ 50M cap)

---

## ADR-005-PROJ — Orchestration Runtime: LangGraph (1ª classe)

**Status:** ✅ Aceito 2026-05-14 — aprovado pelo founder
**Princípios relacionados:** C5 (ADR) + **C7 (Portability — exceção declarada)** + C8 (Tenant context)
**Detalhe completo:** [decisions/ADR-005-PROJ-orchestration-runtime.md](./decisions/ADR-005-PROJ-orchestration-runtime.md)

### Resumo

Adoção de `@langchain/langgraph` como orchestration runtime canônico para os 7 SKUs. Aplicação atual (`src/application/{sku}/`) preservada como tier inferior — grafos coordenam, use cases executam. Nova pasta `src/orchestration/`.

**Motivações (3 hipóteses confirmadas):**
1. Runtime único para consistência operacional cross-SKU
2. LangSmith debug visual em produção (ADR-006-PROJ)
3. Antecipar complexidade dos SKUs stateful (`atendimento-dm`, `estrategista`)

**Padrões obrigatórios:**
- P1 — Nodes invocam LLM **somente** via `LLMProvider` port (proibido `@langchain/anthropic` direto)
- P2 — `BaseGraphState` obrigatório com `tenantId` + `traceContext` validados no boundary (C8)
- P3 — Spans: LangGraph emite span do node; use cases internos suprimem spans próprios quando rodam com `parentTrace`
- P4 — Composição via DI manual (factory functions com `deps` explícitas)

**Trade-offs assumidos:**
- ✅ Padrão unificado + state/checkpoint + human-in-the-loop nativo
- ⚠️ C7 violado conscientemente na orchestration layer (não há adapter swap)
- ⚠️ Bundle +40-60MB
- ⚠️ Eval runner text-only fica desalinhado com produção até `EvalRunnerGraph` (Wave 5)

---

## ADR-006-PROJ — Tracing Substitution: LangSmith substitui Langfuse

**Status:** ✅ Aceito 2026-05-14 — aprovado pelo founder
**Princípios relacionados:** C6 (Observability) — **divergência consciente do schema canônico**
**Depende de:** ADR-005-PROJ
**Detalhe completo:** [decisions/ADR-006-PROJ-tracing-substitution.md](./decisions/ADR-006-PROJ-tracing-substitution.md)

### Resumo

Substituir `LangfuseAdapter` por `LangSmithAdapter` como implementação do port `Observability`. Caminho A escolhido entre 3 opções (A=substituir, B=dual, C=ignorar nativo) — debug visual nativo de LangGraph era 1 das 3 motivações para adotar o framework.

**Mudanças:**
- Novo: `src/infrastructure/adapters/observability/LangSmithAdapter.ts`
- Deletar: `LangfuseAdapter.ts` (founder confirmou)
- `project.json`: `llm_trace_provider` muda para `"langsmith"`
- `package.json`: remover `langfuse`, adicionar `@langchain/core`
- `.env.example`: substituir `LANGFUSE_*` por `LANGSMITH_API_KEY` + `LANGSMITH_PROJECT`

**Pré-Shadow:** decisão tomada antes de ter traces históricos a migrar — momento ideal.

**Divergência com Forge canônico:** PR upstream em `agent-governance-framework` propondo `llm_trace_provider: langsmith | langfuse | dual` no schema v1.1. Enquanto não merja, este ADR serve como waiver local.

---

## ADR-007-PROJ — Runtime Self-Harness: agentes aprendem com cada cliente

**Status:** ✅ Aceito 2026-06-19 — aprovado pelo founder (3 SKUs implementados)
**Princípios relacionados:** C5, C6, C7, C8, C1, C4
**Depende de:** ADR-006-PROJ (LangSmith traces)
**Detalhe completo:** [decisions/ADR-007-PROJ-runtime-self-harness.md](./decisions/ADR-007-PROJ-runtime-self-harness.md)

### Resumo

O loop self-harness existente (Forge-20) aprende com **sessões de dev do Claude Code**, não com clientes em runtime. Esta decisão cria um **loop runtime** em `src/`, reutilizável entre SKUs. Iniciado no copywriter e estendido aos **3 SKUs implementados** (copywriter, social-media, designer).

**Peças:**
- Porta `ClientMemory` + adapter `FileClientMemory` (lê `docs/clients/{tenantId}/`, formato `§`).
- Injeção por modalidade: texto (copywriter, social-media) como último bloco do system prompt (cache-friendly); designer como diretrizes visuais compactas no prompt de cada slide. Span `client_memory_load` (C6) em todos.
- Lógica pura de seleção de fatos no domínio (`factSelection.ts`), sem import `application → infrastructure` (C7).
- Captura de feedback humano em ASSISTED (`FeedbackEvent` + `RecordClientFeedbackUseCase`) → snapshot consumível pelo `learning-curator`.
- Bootstrap do `diagnostic.md` → soul + memory (`npm run clientmemory:bootstrap`).

**Sinais escolhidos:** bootstrap do diagnóstico (C1) + edições/aprovações humanas em ASSISTED. Sinais automáticos de qualidade **deferidos**.

**Gating (C4):** injeta só fatos `confidence ≥ shadow`; soul sempre injetado; fatos `local` são audit trail. **C8:** `tenantId` é dado/path, nunca ramificação.

---

## ADR-004-PROJ — Pendências críticas (não-decisões, mas registro)

**Status:** 📋 Registro 2026-05-13

### Pendências que ainda exigem decisão do founder

1. **DPO/LGPD para atendimento-dm-agent** (ADR-003-PROJ) — escolher opção até wave 2
2. **Veo 3 economics revisão** (ADR-001-PROJ) — re-examinar em 90 dias
3. **Multi-tenant fase 2** — quando lançar como SaaS para outros founders? Stack já está preparado mas exige:
   - Brand guides por tenant
   - Multi-tenancy no schema Prisma (já preparado com `tenant_id`)
   - Rate limit + custo cap por tenant
   - Onboarding flow
4. **Audit mensal DeepAgent** — primeiro audit programado para D14 (2026-05-27) — quem revisa?

### Convenção

Sempre que founder fizer uma decisão executiva que afete múltiplos SKUs, criar ADR-NNN-PROJ aqui.
Decisões técnicas locais (afetam 1 SKU) ficam em `docs/forge/sku/<nome>/decisions.md`.
