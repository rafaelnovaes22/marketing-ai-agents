# Decisions — Copywriter Agent (ADRs locais)

> ADRs específicos deste SKU. Decisões globais do projeto ficam em `docs/foundry/decisions.md` raiz (a criar quando aparecerem). Convenção de IDs: **ADR-NNN-CW** (CW = Copywriter).

---

## ADR-001-CW — Landing padrão 1.500-2.000 palavras + upsell 2.500-3.500 (+R$ 30)

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C2 (Outcome contratual) + C3 (Unit Economics)

### Contexto

Landing pages de conversão variam enormemente em comprimento. Benchmarks de mercado mostram:
- Landings B2B SaaS curtas: 800-1.200 palavras
- Landings padrão: 1.500-2.000 palavras
- Landings longas (lançamentos high-ticket, the CEO style): 2.500-4.000 palavras

Audit do `@unit-economist` mostrou:
- Custo Tipo A com 1.800 palavras: R$ 4,75 (conservador, ~6% do preço R$ 80) — folga 76% sobre C3
- Custo extrapolado para 3.000 palavras: ~R$ 7,40 (~9% do preço)
- Custo para 4.000 palavras sem upsell: R$ 10,20 — margem cai a 87% e zona de alerta começa em piores cenários combinados (cache 50% + USD +20% + 3 re-rolls = R$ 14,80)

### Decisão

**Default em 1.500-2.000 palavras** (range que cobre 80% dos casos B2B SaaS comuns).

**Upsell explícito para 2.500-3.500 palavras** com preço **R$ 110** (+R$ 30 sobre R$ 80 base).

Validação automática:
- Briefing com `word_count_target > 2.200` exige `upsell_confirmed: true` no schema
- Schema valida `word_count_target ≤ 3.500` (hard cap)
- Trace marca `upsell_flag: true` em todas as landings com mais de 2.200 palavras

### Motivação

1. **Previsibilidade de unit economics:** padrão menor mantém custo P95 longe da zona de alerta.
2. **Previsibilidade de SLA:** 2.000 palavras cabem em ~12min, 3.000+ pode aproximar do limite de 900s.
3. **Cliente decide quando precisa:** upsell explícito força justificativa de valor (anti-bloat, mesma lógica do ADR-001-DS).
4. **Margem sólida no upsell:** R$ 110 − R$ 7,40 ≈ 93% margem (vs 94% do padrão) — mantém saúde econômica.
5. **Validação de demanda real:** upsell adoption rate é métrica clara — se < 5% em 30 dias, simplifica catálogo; se > 40%, repensar default.

### Consequências

- ✅ Outcome contratual ajustado: "Landing 1.500-2.000 palavras default; 2.500-3.500 sob demanda (upsell)"
- ✅ Pricing structure clara: R$ 80 padrão, R$ 110 upsell
- ✅ Margem 93-96% em todos os cenários
- ✅ Schema Zod garante validação automática de range
- ⚠️ Cliente que pede landing "completa" sem entender ranges pode achar 1.800 palavras curto
- ✅ Mitigação: briefing intake explica diferenças entre default e upsell ANTES de chamar Opus

### Re-examinar

Após 90 dias em AUTONOMOUS:
- Taxa de upsell > 40% → revisar default (talvez subir para 2.500 padrão)
- Taxa de upsell < 5% → considerar remover upsell e ajustar default

---

## ADR-002-CW — Adapter pattern para LLM + Embeddings (fallback Mistral declarado)

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C7 (Portability)

### Contexto

Stack default: Claude Opus 4.6 (geração) + Claude Sonnet 4.6 (LLM-as-judge tom) + OpenAI text-embedding-3-small (diversity check Tipo C). Anthropic Opus é peça única crítica — preço alto + risco de 529 (overloaded) em horários de pico.

Foundry C7 exige domain layer sem acoplamento a SDK específico. Adicionalmente, ADR-002-DS do social-media-agent já estabeleceu o padrão de adapter — este ADR confirma e estende para copywriter especificamente.

### Decisão

Implementar 4 interfaces em `src/domain/ports/`:

1. `LLMProvider` — com implementações `ClaudeAdapter` (default, Opus 4.6), `MistralAdapter` (fallback declarado, Mistral Large), `SonnetJudgeAdapter` (LLM-as-judge especializado)
2. `EmbeddingsProvider` — com implementações `OpenAIEmbeddingsAdapter` (default, text-embedding-3-small) e `VoyageAdapter` (fallback)
3. `SchemaValidator` — Zod por baixo, mas interface estável
4. `Observability` — Langfuse por baixo

**Fallback automático:** circuit breaker abre após 3× 529 consecutivos (≤ 60s) → roteia próxima chamada para Mistral Large. Trace marca `provider_used: "mistral"` e `fallback_reason: "anthropic_overloaded"`.

### Motivação

1. **Trocar provider = trocar adapter:** se Anthropic subir preço 50%, migrar custo significativo do Tipo A para Mistral toca apenas `infrastructure/adapters/llm/`.
2. **Testes isolados:** domain testado com fakes (zero custo de API em CI).
3. **Resiliência contra 529:** Anthropic Opus 4.6 historicamente teve picos de overload — fallback automático mantém SLA mesmo durante incidentes upstream.
4. **Multi-provider futuro:** rotear Tipo C (ads, mais curto/menos exigente) para Mistral Large permanentemente economiza ~R$ 0,35 por bateria — habilitado pela arquitetura.
5. **Alinhamento mecânico com C7:** auditável por `@artifact-architect` via lint custom (`domain/copy/**` não pode importar `@anthropic-ai/sdk` nem `openai`).

### Consequências

- ✅ Domain `src/domain/copy/` ZERO imports de SDKs (auditável via `npm test:domain`)
- ✅ CI roda testes domain em <2s (sem network)
- ✅ Circuit breaker reduz SLA violations causadas por 529 upstream
- ⚠️ Boilerplate inicial: ~30 LOC extras por adapter
- ⚠️ Mistral Large produz outputs com qualidade ligeiramente menor que Opus — threshold de tone_score em fallback baixado para ≥ 6 (vs ≥ 7 default)
- ✅ Vale o trade-off — economiza dias de refactor em troca de provider + protege SLA

### Re-examinar

Apenas se mudarmos stack core (raríssimo). Possível otimização futura (não bloqueante): após 90 dias em AUTONOMOUS, avaliar mover Tipo C permanentemente para Mistral Large (economia ~R$ 0,35/bateria sem perda perceptível de qualidade).

---

## ADR-003-CW — Contrato JSON versionado para output (handoff multi-agente)

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C2 (Outcome contratual) + C7 (Portability)

### Contexto

Copywriter Agent é upstream em pipelines multi-agente:

```
Copywriter Agent → Designer Agent (gera hero visual da landing)
                → Webflow Publisher (publica landing)
                → Flodesk Publisher (publica email sequence)
                → Meta Publisher (publica ad set)
```

Output em texto livre quebraria handoff. Output JSON sem versionamento quebraria downstream toda vez que evoluímos schema.

### Decisão

Toda saída do Copywriter Agent é JSON estruturado validado por Zod, com **`schema_version` semver em cada artefato**:

```typescript
type LandingOutput = {
  schema_version: "1.0.0";
  sku_id: "copywriter-agent";
  generated_at: string; // ISO 8601
  output_type: "landing";
  framework_used: "PAS" | "AIDA" | "4Ps" | "StoryBrand";
  voice_used: string;
  content: {
    hero: { headline: string; subheadline: string; cta: string };
    problem: string;
    agitation: string;
    solution: string;
    social_proof: SocialProof[];
    objections: Objection[];
    final_cta: { text: string; url_placeholder: string };
  };
  metadata: {
    word_count: number;
    tone_score: number;
    cost_brl: number;
    latency_ms: number;
    cache_hit_ratio: number;
    re_roll_count: Record<string, number>;
  };
};
```

**Regras de versionamento:**

- **PATCH (1.0.X):** adicionar campo opcional, melhorar descrição — backward compatible
- **MINOR (1.X.0):** adicionar campo obrigatório com default sensato — backward compatible com migration helper
- **MAJOR (X.0.0):** remover/renomear campo, mudar tipo — breaking change, exige comunicação com consumers downstream com 14 dias de antecedência

**Matriz de compatibilidade** mantida em `docs/foundry/sku/copywriter-agent/handoff-contract.md`:

```
Producer schema_version → Consumer schema_version supported
  1.0.x                  → Designer Agent ≥ 1.0.0, Webflow Publisher ≥ 1.0.0
  1.1.x                  → Designer Agent ≥ 1.0.0 (forward compat), Webflow ≥ 1.0.0
  2.0.x                  → Designer Agent ≥ 2.0.0, Webflow Publisher ≥ 2.0.0
```

### Motivação

1. **Handoff seguro:** Designer Agent / Webflow Publisher consomem JSON com garantia de schema.
2. **Evolução sem quebra:** versionamento explícito permite acrescentar features sem coordenar releases.
3. **Auditoria de qualidade:** `tone_score`, `cost_brl`, `re_roll_count` em metadata habilitam dashboards e alarmes.
4. **Eval-suite alinhada:** Zod schema é a single source of truth — eval cases validam contra mesmo schema que produção usa.
5. **Migração de Mistral preserva schema:** mesmo se LLM provider mudar, output ainda passa pelo mesmo Zod — domain estável.

### Consequências

- ✅ Output sempre validado antes de devolver (Zod fail → re-roll de bloco específico)
- ✅ Designer Agent recebe estrutura previsível para mapear hero → imagem
- ✅ Dashboards consomem metadata diretamente — sem parser custom
- ⚠️ Mudança de schema exige comunicação coordenada (overhead organizacional)
- ⚠️ JSON é mais verboso que markdown — output tokens ligeiramente maiores (~10%)
- ✅ Mitigação: output token overhead já contabilizado no unit-economics.md

### Re-examinar

- Se algum consumer downstream sofrer com mudanças frequentes de MINOR, considerar política mais conservadora
- Se schema 1.0.0 ficar estável por 6+ meses, ratificar como GA e considerar lock para multi-tenant fase 2

---

## ADR-004-CW — 5 frameworks suportados inicialmente (lista canônica)

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C2 (Outcome contratual) + C4 (Verifiable Evaluation)

### Contexto

Universo de frameworks de copywriting é vasto (PAS, AIDA, 4Ps, BAB, FAB, QUEST, StoryBrand, Soap Opera, Hero's Journey, etc.). Suportar todos seria:
- Impossível de validar com eval-suite robusto (cada framework precisa de prompt de juiz dedicado)
- Custo de prompt engineering proibitivo na janela de 14 dias
- Risco de "quase-suporte" — frameworks sem qualidade verificável diluem o outcome contratual

Founder aprovou: **5 frameworks suportados** como lista canônica inicial.

### Decisão

**Lista canônica de frameworks suportados (v1.0.0):**

| # | Framework | Output_type compatível | Default em |
|---|-----------|------------------------|------------|
| 1 | **PAS** (Problem-Agitation-Solution) | landing | landing (default) |
| 2 | **AIDA** (Attention-Interest-Desire-Action) | landing | — |
| 3 | **4Ps** (Promise-Picture-Proof-Push) | landing | — |
| 4 | **StoryBrand** (7 elementos) | landing | — |
| 5 | **Soap Opera Sequence** | email_sequence | email_sequence (default) |

**Frameworks adicionais para email_sequence** (sub-variantes de Soap Opera mas considerados nominalmente):
- **Welcome Series** (subtipo)
- **Re-engagement Sequence** (subtipo)

**Framework canônico para ad_set:**
- **Tree-of-Thought** com 5 ângulos canônicos (pain, aspiração, FOMO, autoridade, prova social)

**Validação no briefing intake:** schema rejeita combinações inválidas (e.g., `framework: "soap_opera" + output_type: "ad_set"` → reject com sugestão do correto). Ver Case 24 do eval-cases.md.

### Motivação

1. **Eval-suite tractável:** 5 frameworks × prompts de juiz dedicados = manutenção viável.
2. **Prompt engineering focado:** cada framework tem template estrutural canônico em `frameworks/{landing,email,ads}/{name}.md`.
3. **Comunicação clara com cliente:** "esses 5 frameworks são os que entregamos com qualidade verificável."
4. **Roadmap claro para expansão:** adicionar framework = 1 template + 1 prompt de juiz + 4-6 eval cases novos — bem definido.
5. **Anti-feature creep:** rejeitar frameworks sem demanda real evita inflar superfície sem ROI.

### Consequências

- ✅ Eval-suite cobre 100% dos frameworks suportados (mín. 4 cases por framework principal)
- ✅ Briefing intake rejeita frameworks fora da lista (Case 24)
- ✅ Documentação de marketing pode listar os 5 frameworks como benefício
- ⚠️ Cliente que pede "BAB" ou "FAB" será educado a usar PAS ou AIDA (próximos analogamente)
- ⚠️ Expansão futura exige bump MINOR de schema + comunicação

### Re-examinar

Após 90 dias em AUTONOMOUS:
- Se ≥ 10% dos briefings rejeitados pedem framework específico fora da lista → considerar adicionar
- Adicionar framework novo segue checklist: (a) template estrutural canônico; (b) prompt de juiz dedicado; (c) 4+ eval cases; (d) `@po-guardian` aprova outcome verificável; (e) bump MINOR do schema

---

## Princípios para futuros ADRs

- **Numeração:** ADR-NNN-CW sequencial
- **Status:** Proposto | Aceito | Rejeitado | Substituído por ADR-XXX-CW
- **Estrutura:** Contexto → Decisão → Motivação → Consequências → Re-examinar
- **Quando criar:** mudança arquitetural OU trade-off significativo (não toda decisão trivial)
- **Cross-SKU:** decisões que afetam mais de 1 SKU vão para `docs/foundry/decisions.md` raiz com prefixo `ADR-NNN-DS` (Novais Digital Social geral)

## Próximo passo

→ Implementar Wave 1 do plan.md
→ Criar testes RED **antes** do build (Gate G6 Foundry-10)
→ Criar `frameworks/{landing,email,ads}/{name}.md` (templates estruturais) durante Wave 1
→ ADR-005-CW provável quando surgir: política de retry em landing extendida (re-roll de bloco vs re-roll completo)
→ ADR-006-CW provável: estratégia multi-tenant para voice exemplars (fase 2)
