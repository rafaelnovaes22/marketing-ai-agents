# Eval Runner — Handoff Etapa 1 → Etapa 2

> **Status:** ✅ Etapa 1 entregue | ⏳ Aguardando autorização Etapa 2 (chamadas reais à API)
> **Data:** 2026-05-14 (D3 do roadmap)
> **Forge command:** `/acme:eval` (.claude/commands/acme/eval.md)

---

## ✅ O que Etapa 1 entregou

### 1. Runner modular em `src/eval/`

| Arquivo | Responsabilidade |
|---------|------------------|
| [types.ts](../src/eval/types.ts) | Schemas Zod (`CaseFrontmatter`, `PassCriterion`, `SourceMode`) + shapes de output (`CaseResult`, `AggregateMetrics`, `RunReport`) |
| [CaseLoader.ts](../src/eval/CaseLoader.ts) | Carrega `evals/{sku}/cases/*.md` com frontmatter YAML; ignora `_*.md`; suporta subsets `critical_path`, `category=x`, `source_mode=x`, `case_id=x` |
| [PromptLoader.ts](../src/eval/PromptLoader.ts) | Autodetecta maior versão semver em `prompts/{sku}/v*.*.*/system.md`, calcula `prompt_hash` (SHA-256 truncado a 16 hex) |
| [JudgeRunner.ts](../src/eval/JudgeRunner.ts) | 3 critérios: `exact_match` (literal), `semantic_match` (cosine via EmbeddingsProvider), `llm_as_judge` (Sonnet com JSON estruturado) |
| [EvalRunner.ts](../src/eval/EvalRunner.ts) | Orquestra cases × prompt × LLM × judge com `max_concurrency` chunked; agrega `byCategory`, `bySourceMode`, `byCriticalPath`, percentis de latência |
| [ReportWriter.ts](../src/eval/ReportWriter.ts) | Persiste `evals/{sku}/runs/{YYYY-MM-DD-HH-mm}-eval-{hash}.md` no formato canônico Forge |
| [runner.ts](../src/eval/runner.ts) | CLI: `npm run eval <sku> [--subset=... --dry-run --judge-model=... --threshold=...]` |

### 2. Migração inicial — `social-media-agent`

- **8 cases** migrados de [docs/forge/sku/social-media-agent/eval-cases.md](../docs/forge/sku/social-media-agent/eval-cases.md) para [evals/social-media-agent/cases/](social-media-agent/cases/)
- **14 cases adiados** documentados em [_DEFERRED.md](social-media-agent/cases/_DEFERRED.md) — exigem `EvalRunnerPipeline` (Wave 5) porque dependem de inspeção de metadados de pipeline (custo medido, retry_count, brand validator em imagem, cache hit ratio, mock externo)
- **Prompt versionado** em [prompts/social-media-agent/v0.1.0/system.md](../prompts/social-media-agent/v0.1.0/system.md) (cópia de `system-prompts/brand_voice_ceo.md`)
- **Hash inicial:** `b7051d342aceeb5c` (calculado a partir do prompt v0.1.0)

### 3. Cobertura de testes (sem custo de API)

| Test file | Cenários | Resultado |
|-----------|----------|:---------:|
| [runner-e2e.test.ts](../tests/eval/runner-e2e.test.ts) | PromptLoader detecta v0.1.0; CaseLoader carrega 8 cases reais + filtros; EvalRunner agrega métricas; ReportWriter persiste markdown; dry-run não invoca LLMs | ✅ 7/7 |

### 4. Smoke CLI dry-run

```bash
npm run eval:social-media -- --dry-run
```

Saída registrada:
```
[eval] artifact=social-media-agent subset=all dry_run=true
[eval] prompt v0.1.0 hash=b7051d342aceeb5c
[eval] 8 case(s) carregados
[eval] status=pass pass_rate=1.000
[eval] report=evals/social-media-agent/runs/...eval-b7051d342aceeb5c.md
[eval] total_cost_brl=R$ 0.0000
```

(Report dry-run foi removido após verificação para não poluir histórico real.)

---

## ⚠️ Limitações conhecidas (assumidas para Etapa 1)

### Runner v0 é **text-only** — não substitui gate canônico de SHADOW

O runner v0 invoca `system_prompt + user_input` → output textual → judge LLM. **Não** invoca `GenerateCarrosselUseCase` completo. Consequências:

- 14 dos 22 cases originais (incluindo 3 de 5 critical_path) ficam **adiados** — eles dependem de inspeção de:
  - `retry_count` no trace (cases 15, 16)
  - `decideImageProvider` retornado (case 5)
  - `cost_per_image` no trace (cases 11, 12, 21)
  - SLA medido (cases 13, 14)
  - Mock externo Zernio (case 20)
  - Tom drift flag (case 17)
  - Cache hit ratio (case 19)
- **Pass rate dos 8 cases v0 ≠ gate canônico C4** (Constitution exige ≥30 cases por outcome_category). Reporte como *amostra de plumbing*, não como decisão de promoção.

### Mono-prompt: roteamento por tom não é coberto

O runner carrega 1 system prompt (v0.1.0 = brand_voice_ceo). O `case-002` (tom executivo_b2b) vai expor o gap — não há composição dinâmica de tom no runner v0. Resultado esperado em Etapa 2: case-002 vai falhar ou ter score baixo (informação útil, não bug).

**Solução planejada:** PromptComposer em Wave 4/5 que recebe input.tom e seleciona/compõe prompt.

### Caminho do report depende de zona horária do sistema

`ranAt` usa `new Date().toISOString().slice(0,16)` → UTC. Funciona, mas em logs locais pode confundir. Aceitável para v0.

---

## 🚀 Etapa 2 — Pré-requisitos para rodar contra API real

### 1. Configurar `.env`

```bash
cp .env.example .env
# Editar .env e preencher:
#   ANTHROPIC_API_KEY=sk-ant-...   (obrigatório — target e judge)
#   OPENAI_API_KEY=sk-...          (não necessário para social-media v0;
#                                   ficará obrigatório quando copywriter
#                                   rodar diversity check)
```

> **NÃO commite** `.env` — está no `.gitignore`.

### 2. Estimativa de custo

| Componente | Tokens médios por case | Custo USD (Sonnet 4.6) | × 8 cases |
|------------|------------------------|------------------------|-----------|
| Target LLM (geração) | ~3.000 in + 1.500 out | ~$0.031 | ~$0.25 |
| Judge LLM (Sonnet) | ~1.500 in + 200 out | ~$0.008 | ~$0.06 |
| **Total estimado** |  |  | **~$0.30 (R$ 1,60)** |

> Cache hit reduz input cost em ~70% após a 1ª chamada (mesmo system prompt). Estimativa real provavelmente **~$0.15–0.20**.

### 3. Comando de execução

```bash
# Rodada completa (8 cases, ~30-60s):
npm run eval:social-media

# Apenas critical path (2 cases, ~10s):
npm run eval:social-media -- --subset=critical_path

# Apenas categoria específica:
npm run eval:social-media -- --subset=category=tom_brand_voice_ceo

# Override de threshold (default 0.85):
npm run eval:social-media -- --threshold=0.7

# Override de judge model:
npm run eval:social-media -- --judge-model=claude-haiku-4-5-20251001
```

### 4. Output esperado

- Arquivo persistido em `evals/social-media-agent/runs/{date}-eval-b7051d342aceeb5c.md`
- Console: status (pass/fail/partial), pass_rate, custo total
- Exit code 0 se pass; 1 se fail; 2 se erro

---

## 📋 Checklist Etapa 2 (você executa)

- [ ] Configurar `ANTHROPIC_API_KEY` em `.env` (Acme Anthropic console)
- [ ] Decidir threshold (recomendação: 0.7 para v0 — só 8 cases, sinal frágil)
- [ ] Rodar `npm run eval:social-media -- --subset=critical_path` (cheap smoke, ~$0.05)
- [ ] Inspecionar report gerado em `evals/social-media-agent/runs/`
- [ ] Se OK, rodar suite completa (`npm run eval:social-media`)
- [ ] Decidir próximo passo:
  - Pass rate ≥ 0.7 → migrar para copywriter-agent + designer-agent
  - Pass rate < 0.7 → iterar no system prompt v0.1.1, registrar diff em decisions.md

---

## 🔄 Próximo passo após Etapa 2 (D4-D5)

1. **Replicar para copywriter-agent**: migrar 22 cases de [docs/forge/sku/copywriter-agent/eval-cases.md](../docs/forge/sku/copywriter-agent/eval-cases.md), versionar prompts em `prompts/copywriter-agent/v0.1.0/`, rodar eval real (~$0.40 estimado).
2. **Replicar para designer-agent**: migrar 26 cases de [docs/forge/sku/designer-agent/eval-cases.md](../docs/forge/sku/designer-agent/eval-cases.md) — atenção: maioria dos cases do designer depende de inspeção de imagem, vai produzir muitos cases adiados.
3. **Wave 5 do social-media**: implementar `EvalRunnerPipeline` para cobrir os 14 cases adiados (Zernio mock, retry inspection, brand validator em fixture de imagem). Aí sim, gate canônico de SHADOW.
4. **Promotion SHADOW** dos 3 SKUs P0 — quando eval runner + pipeline cobrir ≥85% dos cases canônicos, dispara `/acme:promote --to=shadow`.
