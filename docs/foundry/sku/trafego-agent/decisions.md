# Decisions — Gestor de Tráfego Agent (ADRs locais)

> ADRs específicos deste SKU. Decisões globais do projeto ficam em `docs/foundry/decisions.md` raiz. Convenção de IDs: **ADR-NNN-TF** (TF = Tráfego).

---

## ADR-001-TF — Multi-armed bandit: epsilon-greedy (não Thompson Sampling)

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C3 (Unit Economics) + C7 (Portability)

### Contexto

Novais Digital precisa de algoritmo de bandit para realocação dinâmica de budget entre variantes de ad (3-5 por campanha) a cada 4h. Candidatos:

- **Epsilon-greedy:** explora ε% do tempo, explora (1-ε)% no winner atual. Parâmetro único.
- **Thompson Sampling:** amostragem bayesiana de distribuição beta(α, β) por variante. Exige conhecimento de priors.
- **UCB1 (Upper Confidence Bound):** balança exploração via desvio padrão. Mais sensível a outliers.

Volume típico das campanhas Novais Digital varia de **8-100 conversões/dia** (mix de baixo e médio volume).

### Decisão

Usar **epsilon-greedy com ε=0.1** como implementação default da `BanditStrategy` port. Permitir trocar para Thompson em fase futura via DI.

### Motivação

1. **Previsibilidade:** comportamento é determinístico dado seed + dados. Auditável em eval-cases (Cases 6-10).
2. **Parâmetro único (ε):** fácil de explicar ao cliente e calibrar manualmente se necessário.
3. **Robustez em low volume:** Thompson tem alta variância quando α+β < 30; epsilon-greedy degrada gracefully (apenas explora mais).
4. **Custo computacional baixo:** TS puro, sem dependência de PRNG bayesiano nem inferência. Permite mover bandit do Sonnet LLM para código TS em fase 2 (otimização #3 do unit-economics.md).
5. **C7 preservado:** `BanditStrategy` é port; `EpsilonGreedyStrategy` é uma implementação. Trocar = criar `ThompsonStrategy` (mesma interface).

### Consequências

- ✅ Bandit convergência testável em dataset sintético determinístico (Cases 6-10)
- ✅ Sem dependência matemática complexa (sem `mathjs` ou similar)
- ⚠️ Thompson teoricamente "melhor" em alguns cenários — perdemos esse ganho marginal
- ✅ Mitigação: re-examinar após 90 dias em AUTONOMOUS com dados reais

### Re-examinar

Se métricas em AUTONOMOUS mostrarem regret > 15% (vs ótimo teórico) por 30 dias consecutivos, implementar `ThompsonStrategy` como ADR-006-TF.

---

## ADR-002-TF — Retry policy em rejeição Meta: 2 tentativas + escalonamento + SKU não cobra

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C2 (Outcome contratual) + C3 (Unit Economics)

### Contexto

Meta Ads policy review rejeita ~5-10% dos ads em 1ª submissão (texto sensível, claims, criativo borderline). Possibilidades de tratamento:

- **A:** Não retentar — entregar parcial e cobrar.
- **B:** Retry infinito — pode explodir custo e nunca convergir.
- **C:** Retry limitado com escalonamento humano + política de cobrança definida.

### Decisão

Implementar política C com parâmetros explícitos:

1. **Tentativa 1:** criativo original (Designer Agent) + copy original (Copywriter Agent).
2. **Rejeição → Tentativa 2:** solicitar criativo alternativo (Designer com variação de prompt) + copy alternativo (Copywriter com tom suavizado).
3. **2ª rejeição → escalonamento:**
   - Slack #ops com payload completo (campaign_id, ad_id, motivo Meta, criativo, copy)
   - SKU marca `skip_billing=true` (não cobra cliente esta campanha)
   - Entrega o que tem (campanha + ads aprovados, se houver)
   - Audit trail completo em Langfuse

4. **Appeal manual:** se humano submeter appeal e for aceito posteriormente, cobrança manual via review (ADR-006-TF pode formalizar fluxo).

### Motivação

1. **Outcome contratual honesto (C2):** cliente não paga por campanha incompleta.
2. **Custo limitado (C3):** máximo 2 retries por campanha (~+R$ 1,00 absorvido pela Novais Digital em <2% dos casos).
3. **Sinal para melhoria de prompt:** rejeições agregadas alimentam tuning do Designer/Copywriter.
4. **Compliance e relacionamento Meta:** retries infinitos podem disparar policy flag na conta.

### Consequências

- ✅ Risco econômico aceitável: ~2% das campanhas absorvem ~R$ 1,80 cada = ~R$ 0,036 por campanha em média (já no buffer de C3)
- ✅ Eval Case 12 valida no-charge corretamente
- ⚠️ Cliente pode questionar "por que não tentou 3 vezes?" — comunicação clara no runbook
- ✅ Mitigação: dashboard mostra `rejection_rate` por mês para transparência

### Re-examinar

Se rejection rate > 20% em 30 dias → revisitar prompt do Designer/Copywriter ou adicionar pre-flight compliance LLM check antes de submeter.

---

## ADR-003-TF — Meta Marketing API adapter versionado (v19/v20) com feature flag

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C7 (Portability)

### Contexto

Meta Marketing API depreca versões a cada 18-24 meses (v17 → v18 → v19 → v20 no ciclo recente). Endpoints, parâmetros e enums mudam (ex: `objective: CONVERSIONS` → `objective: OUTCOME_LEADS`). Breaking changes durante operação ativa podem **paralisar o SKU por dias**.

### Decisão

Adapter Meta implementado com **versionamento explícito por arquivo**:

```
src/infrastructure/adapters/ads-platforms/
├── meta-adapter-v19.ts     ← corrente
├── meta-adapter-v20.ts     ← preparado quando Meta lançar
└── meta-adapter.ts          ← alias controlado por config (feature flag)
```

Feature flag `META_API_VERSION=v19|v20` em config controla qual implementação o alias resolve. Testes E2E rodam contra ambas durante janelas de migração.

### Motivação

1. **Mitigação contratual:** quando Meta lança v20 com deprecation timeline (ex: 6 meses), Novais Digital tem janela controlada para migrar.
2. **Zero downtime na migração:** alias resolve em runtime; rollback é mudança de env var.
3. **Testes A/B de comportamento:** durante migração, podemos rodar 10% do tráfego em v20 e comparar métricas (success rate, latência) antes de cutover.
4. **C7 puro:** application e domain não conhecem versão; recebem `AdsPlatformProvider` via DI.

### Consequências

- ✅ Auditável mecanicamente: lint custom valida que `meta-adapter-vXX.ts` não vaza para `domain/`
- ✅ Documentação Meta consultada por versão (não inventar endpoints — link oficial em cada arquivo)
- ⚠️ Boilerplate: cada nova versão exige reimplementação dos métodos da interface (~200 LOC)
- ✅ Vale o trade-off: alternativa é refactor grande sob pressão de deprecation

### Re-examinar

A cada release major Meta (~12 meses). Avaliar se vale manter versões antigas após depreciação Meta forçar cutover.

### Honestidade técnica

> NÃO inventar endpoints Meta que não existem. Toda chamada documentada em `docs/foundry/sku/trafego-agent/meta-api-endpoints.md` (a criar na Wave 1) com link para developer docs oficiais por versão.

---

## ADR-004-TF — Separação contratual: SKU fee vs ad spend (cliente paga Meta direto) (NOVO)

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C2 (Outcome contratual) + C3 (Unit Economics) + Comercial

### Contexto

Cliente B2B/B2C que contrata gestor de tráfego humano historicamente paga:
- **Fee de gestão:** R$ 8-15k/mês (CLT ou agência) OU 10-20% do ad spend
- **Ad spend:** R$ 10-100k/mês direto ao Meta via cartão próprio

Novais Digital Social precisa decidir como cobrar:

- **A:** Cobrar % sobre ad spend (alinhado a agências) — incentivo perverso a aumentar spend.
- **B:** Fee fixo por campanha publicada + bandit cycle, **ad spend SEPARADO** debitado direto Meta.
- **C:** Hybrid (fixo + variável).

### Decisão

Modelo **B** explícito:

- **Novais Digital cobra R$ 50** por campanha publicada + ciclos de bandit (até 30 dias de vida da campanha).
- **Ad spend** (budget dos ads) é **separado**, debitado **direto do cartão Meta do cliente** vinculado ao Business Manager dele.
- Novais Digital **NUNCA** intermedia ad spend (não recebe, não repassa).
- Contrato deve **visualmente separar** os dois itens (linha 1: SKU fee; linha 2: ad spend visível no Meta Business Manager do cliente).
- Comunicação ao cliente em runbook ops + onboarding.

### Motivação

1. **Sem incentivo perverso:** Novais Digital não ganha mais cobrando mais ad spend → otimização honesta.
2. **Transparência total:** cliente vê ad spend no painel Meta dele — Novais Digital não tem como inflar.
3. **Compliance fiscal/tributária:** Novais Digital não atua como intermediário financeiro (evita Sefaz/Receita Federal classificar como instituição de pagamento).
4. **Escala sem caixa preso:** Novais Digital não precisa de capital de giro para pagar Meta antes de cobrar cliente.
5. **Alinhado a unit-economics.md (Seção 5):** C3 calcula apenas custos Novais Digital, não inclui ad spend.

### Consequências

- ✅ Margem 87% sobre fee SKU clara e auditável
- ✅ Modelo escalável sem caixa preso
- ⚠️ Cliente precisa configurar cartão próprio no Meta — onboarding adicional (~10min)
- ⚠️ Possível confusão inicial ("achei que R$ 50 incluísse o anúncio") — risco mitigável com comunicação explícita
- ✅ Comunicação no contrato + email de onboarding + dashboard separa visualmente

### Validações de evento

- Comunicação ao cliente PRECISA constar em:
  - Página de pricing pública
  - Email de onboarding pré-primeira campanha
  - Dashboard (linha "SKU fee" vs "Ad spend Meta (separado)")
  - Cláusula contratual explícita

### Re-examinar

Após 6 meses em AUTONOMOUS:
- Taxa de churn por confusão > 5% → revisitar copy de comunicação
- Demanda significativa por "modelo full-service" (Novais Digital intermedia ad spend) → avaliar criar SKU separado com modelo C (hybrid) e estrutura legal apropriada

---

## ADR-005-TF — Special Ad Categories OUT-OF-SCOPE fase 1 (NOVO)

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C2 (Outcome contratual) + Compliance/Legal

### Contexto

Meta classifica certas verticais como **Special Ad Categories** com regras de targeting restritas e revisão manual obrigatória:

- **Housing** (imobiliário, financiamento imobiliário)
- **Credit** (crédito, empréstimos, cartões de crédito)
- **Employment** (vagas, recrutamento, headhunting)
- **Social Issues, Elections or Politics** (política, eleições, advocacy)

Essas categorias:
- Bloqueiam Lookalike, Custom Audiences detalhadas, segmentação por CEP exata, etc.
- Exigem identidade fiscal verificada (advertiser identity confirmation)
- Têm revisão manual mais lenta (24-72h vs minutos)
- Risco de não-compliance pode disparar `account_disabled` permanente
- Brasil tem regulamentações próprias (LGPD, CMN para crédito, TSE para política)

### Decisão

**Special Ad Categories estão FORA do escopo do trafego-agent na fase 1.**

Pre-flight compliance check (`PreflightComplianceCheck` no `CreateCampaignUseCase`) bloqueia briefings com:

- Keywords detectáveis: "imóvel", "financiamento", "empréstimo", "crédito", "cartão de crédito", "vaga de emprego", "recrutamento", "política", "candidato", "eleição", "campanha eleitoral", etc.
- Pixel events associados (ex: `MortgageApplication`, `JobApplication`)
- Verticais declaradas pelo cliente no onboarding

Cliente recebe mensagem explícita: *"Esta categoria (Special Ad Category) requer humano no loop por compliance Meta. Indisponível na fase 1 da Novais Digital."*

### Motivação

1. **Compliance Meta:** automação irrestrita em Special Ad Categories pode disparar `policy_violation` → account banimento.
2. **Compliance LGPD/regulatórios BR:** crédito (CMN), política (TSE), trabalho (CLT) têm regras específicas que LLM não conhece com confiança.
3. **Outcome contratual honesto (C2):** prometemos "campanha publicada em ≤5min" — Special Ad Categories quebram esse SLA por revisão manual Meta.
4. **Foco produto:** 80% do mercado SaaS B2B/B2C não está nessas categorias.

### Consequências

- ✅ Pre-flight check (Case 19 eval) bloqueia antes de gastar tokens Opus
- ✅ Cliente recebe rejeição rápida e explícita (não experiência ruim de espera)
- ⚠️ ICP exclui clientes desses verticais (imobiliárias, fintechs de crédito, RH, campanhas políticas)
- ✅ Mitigação: documentado em pricing page + onboarding; ICP fit explícito no diagnóstico

### Implementação

`PreflightComplianceCheck`:

```typescript
function checkSpecialAdCategory(briefing: CampaignBriefing): ComplianceResult {
  const keywords = SPECIAL_AD_CATEGORIES_KEYWORDS; // arquivo curado
  const pixelEvents = SPECIAL_AD_CATEGORIES_PIXEL_EVENTS;
  // detecta match → retorna { allowed: false, reason: 'SPECIAL_AD_CATEGORY_OUT_OF_SCOPE' }
}
```

Lista de keywords curada manualmente (não LLM) para previsibilidade. Atualizada quando regulamentação muda.

### Re-examinar

Fase 2 (Q3 2026+): considerar criar SKU separado `trafego-agent-regulated` com:
- Humano no loop obrigatório
- SLA diferente (24-72h, não 5min)
- Pricing maior (~R$ 200) refletindo overhead compliance
- Parceria com advogado/compliance officer terceirizado

---

## Princípios para futuros ADRs

- **Numeração:** ADR-NNN-TF sequencial
- **Status:** Proposto | Aceito | Rejeitado | Substituído por ADR-XXX-TF
- **Estrutura:** Contexto → Decisão → Motivação → Consequências → Re-examinar
- **Quando criar:** mudança arquitetural OU trade-off significativo OU política comercial/compliance

## Possíveis ADRs futuros (não bloqueantes hoje)

- **ADR-006-TF:** Fluxo formal de appeal manual após rejeição dupla (Case 13)
- **ADR-007-TF:** Migração bandit de Sonnet LLM para TS puro (otimização unit-economics #3) — quando dados de produção justificarem
- **ADR-008-TF:** Renovação automática de campanhas após 14 dias (cobrança extra)
- **ADR-009-TF:** Suporte a TikTok Ads + Google Ads (fase 2) — novo `AdsPlatformProvider` adapter

## Próximo passo

→ Implementar Wave 1 do plan.md (T1.1 lead time Meta BM IMEDIATO)
→ Criar testes RED **antes** do build (Gate G6 Foundry-10)
→ Validar legal/compliance ADR-004-TF + ADR-005-TF antes de Wave 6 (`/novais-digital:promote`)
