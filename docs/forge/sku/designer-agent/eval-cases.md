---
sku_id: designer-agent
eval_date: 2026-05-13
total_cases: 26
authored_by: "@eval-engineer (Guardian)"
judge_model: claude-sonnet-4.6
secondary_judge_model: claude-opus-4.6  # cross-validation independente
pass_threshold: 0.88
critical_path_cases: [1, 5, 10, 14, 20, 24]
calibration_set_size: 50
human_validator_agreement_target: 0.90
---

# Eval Cases — Designer Agent

> 26 casos focando em **brand consistency multi-dimensional** (cores, tipografia, composição, cantos), edge cases adversariais e composabilidade com social-media-agent.
>
> Pass rate alvo: ≥88% (≥23 de 26) para promover a SHADOW.
> Critical_path: 6 cases que devem passar 100% (6/6).

## Filosofia de eval (diferente de social-media-agent)

O designer-agent é avaliado **apenas em qualidade visual on-brand** — não em tom, copy ou estrutura narrativa. Portanto a eval-suite é **mais focada e mais estrita** em 4 dimensões:

| Dimensão | Peso | O que mede |
|----------|:----:|------------|
| **Cores** | 30% | Apenas paleta `colors.primary` + `colors.secondary` do YAML, sem deriva (#2563EB vs #2664EC = pass; #3070FF = fail) |
| **Tipografia** | 25% | Apenas Inter (ou fallbacks listados); pesos Bold/Regular conforme função |
| **Composição** | 25% | `alignment: center`, `whitespace: generous`, ausência de elementos floating sem grid |
| **Cantos** | 20% | Bordas arredondadas conforme `composition.border_radius`, sem clipping |

**Score agregado:** weighted_sum(4 dimensões) → 0-100. Gate ≥99 individual por slide.

## Cross-validation (defesa contra viés de juiz único)

Cada output é avaliado **2x**:
1. `BrandValidatorAdapter` em produção (Sonnet 4.6 vision) — pontua 0-100 por dimensão.
2. Juiz secundário independente (Opus 4.6 vision com prompt diferente) — re-pontua as mesmas 4 dimensões.

**Pass condicional:** ambos juízes ≥99 OR delta ≤2pp.

## Como rodar

```bash
npm run eval designer-agent
```

Output: `reports/eval-designer-agent-{date}.md` com:
- Score por case por dimensão
- Cross-judge agreement
- Calibration drift vs human_calibration_set
- Aggregate metrics

---

## Case 1 — Carrossel padrão 7 slides (briefing do social-media-agent) ⭐ critical_path

**Input:**
```json
{
  "tema": "governança de IA B2B",
  "num_slides": 7,
  "dominant_mode": "dark",
  "caller": "social-media-agent",
  "tenant_id": "acme"
}
```

**Expected:** 7 slides JPG 1080×1080, ~5 Imagen + ~2 Ideogram, brand score individual ≥99 em todos.

**Pass se:** All 7 slides brand ≥99 AND tempo ≤ 1200s AND cross-judge delta ≤2pp.

---

## Case 2 — Variante econômica 5 slides (cliente direto)

**Input:**
```json
{
  "tema": "lançamento produto SaaS",
  "num_slides": 5,
  "variant": "economic",
  "caller": "client_direct"
}
```

**Expected:** 5 slides, custo ≤ R$ 1,56, todos ≥99 brand.

**Pass se:** N_slides == 5 AND cost ≤ R$ 1,80 AND all brand ≥99.

---

## Case 3 — Brand cores estrito (dimensão Cores)

**Input:** Briefing com `brand_strictness: high`.

**Expected:** Cores extraídas via vision pertencem APENAS a `{#0A1628, #2563EB, #5EEAD4, #FFFFFF, #F5F7FA}` (tolerância delta_E ≤2).

**Pass se:** Dimensão "Cores" ≥99 em todos slides AND zero pixels fora da paleta (≥1% de pixels).

---

## Case 4 — Brand tipografia estrito (dimensão Tipografia)

**Input:** Briefing com texto literal grande (força Ideogram).

**Expected:** Texto renderizado em Inter (Bold para headlines, Regular para body). Detectado por vision.

**Pass se:** Dimensão "Tipografia" ≥99 em todos slides AND zero fontes não-Inter detectadas.

---

## Case 5 — Slide com hero number (Ideogram fallback) ⭐ critical_path

**Input:**
```json
{
  "tema": "Pesquisa: 73% das empresas IA terão ROI negativo",
  "num_slides": 5,
  "deve_destacar_numero": "73%"
}
```

**Expected:** Slide com "73%" gigante e legível. `SlidePlannerService.decideProvider()` retorna `ideogram` para esse slide.

**Pass se:** Provider == 'ideogram' AND "73%" legível por OCR AND brand ≥99.

---

## Case 6 — Composição centralizada (dimensão Composição)

**Input:** Briefing default.

**Expected:** Todos os slides centralized alignment + generous whitespace ≥25% borders.

**Pass se:** Dimensão "Composição" ≥99 (vision detecta centro de massa próximo do centro geométrico).

---

## Case 7 — Cantos arredondados (dimensão Cantos)

**Input:** Briefing default.

**Expected:** Border radius conforme YAML em containers/cards; zero clipping de elementos.

**Pass se:** Dimensão "Cantos" ≥99 (vision detecta consistência de border radius).

---

## Case 8 — Briefing dark mode dominante

**Input:** `dominant_mode: "dark"`

**Expected:** Background predominante `#0A1628` (deep navy) em ≥70% da área de cada slide.

**Pass se:** Pixel histogram mostra ≥70% em cor primária dark.

---

## Case 9 — Briefing light mode dominante

**Input:** `dominant_mode: "light"`

**Expected:** Background predominante `#FFFFFF` ou `#F5F7FA`.

**Pass se:** Pixel histogram mostra ≥70% em cor primária light.

---

## Case 10 — Briefing vago (rejeita amigavelmente) ⭐ critical_path

**Input:**
```json
{ "tema": "faz um design legal sobre IA" }
```

**Expected:** Sistema **REJEITA** antes de gastar tokens. Mensagem pede: `num_slides`, `dominant_mode`, opcionalmente `caller`.

**Pass se:** Zero tokens Imagen/Ideogram consumidos AND mensagem inclui os 2 campos obrigatórios.

---

## Case 11 — Briefing fora de escopo (vídeo)

**Input:**
```json
{ "tema": "vídeo curto sobre lançamento", "tipo": "video" }
```

**Expected:** Sistema rejeita explicando que escopo é carrossel; sugere `video-editor-agent`.

**Pass se:** Sistema marca `out_of_scope: true` AND sugere agente correto.

---

## Case 12 — Briefing com >7 slides (rejeita upsell não-suportado)

**Input:** `num_slides: 10`

**Expected:** Rejeita (v0.1.0 só 5-7); aponta para ADR futuro.

**Pass se:** Sistema retorna erro estruturado AND zero imagens geradas.

---

## Case 13 — Brand violation detectada → re-roll (ADR-003-DES)

**Input:** Forçar Imagen a gerar imagem off-brand (prompt menos específico).

**Expected:** Brand validator detecta <99% em slide N → re-roll automático 1x mesmo provider → segunda tentativa ≥99.

**Pass se:** `retry_count[N] == 1` AND final brand[N] ≥99.

---

## Case 14 — Brand violation persistente → fallback cross-provider ⭐ critical_path

**Input:** Forçar 2 falhas consecutivas no Imagen.

**Expected:** Após 1 re-roll mesmo provider (falha), sistema chama Ideogram como fallback. Se Ideogram passa, marca `provider_fallback: imagen→ideogram`.

**Pass se:** Slide final brand ≥99 AND `provider_used == 'ideogram'` AND `fallback_reason logged`.

---

## Case 15 — Brand violation total → degraded output

**Input:** Mock ambos providers retornando <96% repetidamente.

**Expected:** Sistema entrega manifest com `degraded: true` no slide problemático + alerta `#design`. NÃO falha o carrossel inteiro.

**Pass se:** Slides OK entregues normalmente AND slide problemático marcado `degraded: true` AND Slack alerta disparado.

---

## Case 16 — Adversarial: brand "quase certo" mas off em detalhe sutil

**Input:** Slide com 95% pixels on-brand mas headline em fonte Roboto (não Inter).

**Expected:** Validator detecta tipografia errada → dimensão "Tipografia" cai para <99 → re-roll.

**Pass se:** Validator NÃO aceita esse slide (detecta o detalhe sutil) AND human_calibration_set confirma rejeição.

---

## Case 17 — Adversarial: cor borderline (#2664EC vs #2563EB)

**Input:** Mock Imagen retorna `#2664EC` (delta_E ≈ 1.4 do canonical #2563EB).

**Expected:** Validator aceita (dentro de tolerância perceptual delta_E ≤2).

**Pass se:** Slide aceita com warning logado mas brand ≥99.

---

## Case 18 — Adversarial: cor borderline maior (#3070FF)

**Input:** Mock Imagen retorna `#3070FF` (delta_E ≈ 8 do canonical).

**Expected:** Validator rejeita (fora da tolerância).

**Pass se:** Slide rejeitado AND re-roll disparado.

---

## Case 19 — Paralelização: 7 slides concorrentes sem rate-limit

**Input:** Briefing padrão 7 slides.

**Expected:** Promise.allSettled gera 7 imagens em paralelo, tempo total ~= max(tempos individuais) + overhead validação.

**Pass se:** Tempo total ≤ 1.5x tempo do slide mais lento (eficiência paralela ≥66%).

---

## Case 20 — SLA borderline (20 min limit) ⭐ critical_path

**Input:** Briefing complexo com 7 slides + 2 retries esperados.

**Expected:** Tempo total ≤ 1200s.

**Pass se:** `total_seconds ≤ 1200`.

---

## Case 21 — SLA violation (timeout)

**Input:** Forçar 4+ retries.

**Expected:** Sistema retorna após 1200s com `sla_violated: true`. Não continua queimando tokens.

**Pass se:** Total ≤ 1220s (margem 20s shutdown) AND `sla_violated == true`.

---

## Case 22 — Composability: chamado por social-media-agent

**Input:** Caller `social-media-agent`, briefing repassado.

**Expected:** Output manifest em formato consumível pelo social-media; sem caption embutida (designer não escreve copy).

**Pass se:** Manifest tem `slides[]` com S3 URLs AND zero campos de caption/text overlay.

---

## Case 23 — Composability: chamado direto pelo cliente

**Input:** Caller `client_direct`, mesmo briefing.

**Expected:** Output idêntico estruturalmente; cobra preço cheio R$ 20.

**Pass se:** Manifest formato consistente AND `price_brl == 20`.

---

## Case 24 — Cross-judge agreement ≥85% ⭐ critical_path

**Input:** 10 carrosséis aleatórios da eval-suite.

**Expected:** `BrandValidatorAdapter` e juiz secundário concordam em ≥85% dos slides (delta ≤2pp).

**Pass se:** Agreement rate ≥ 0.85.

---

## Case 25 — Human calibration drift

**Input:** Re-rodar `BrandValidatorAdapter` no `brand/calibration-set/` (50 imagens humanas).

**Expected:** Concordância ≥90% (delta ≤3pp em score agregado).

**Pass se:** Agreement rate ≥ 0.90 vs human ratings.

> Este case roda **mensalmente** (não a cada eval-suite) para detectar drift do validator ao longo do tempo.

---

## Case 26 — Cost guardrail

**Input:** Briefing 7 slides padrão.

**Expected:** Trace_cost ≤ R$ 3,00 (limite alarme; limite C3 = R$ 5,00).

**Pass se:** `cost_total_brl ≤ 3.00`.

---

## Agregados esperados

| Métrica | Target |
|---------|:------:|
| Pass rate geral | ≥ 88% (≥ 23/26) |
| Pass rate critical_path (6 cases) | 100% (6/6) |
| Brand consistency individual (média) | ≥ 99,3% |
| Brand consistency individual (P5) | ≥ 99,0% (todos slides ≥99) |
| Concordância humano × validator | ≥ 90% |
| Cross-judge agreement | ≥ 85% |
| Tempo médio | ≤ 17 min |
| Custo médio | ≤ R$ 2,10 |
| Re-roll rate | ≤ 15% (target) / ≤ 25% (alarme) |

## Calibração contínua (DES-T4.x)

**Brand calibration-set** (`brand/calibration-set/`):
- 50 imagens iniciais (Wave 4)
- 20 on-brand confirmadas humanamente (≥99)
- 15 borderline (96-98) — testar tolerância do validator
- 15 off-brand confirmadas (<96) — testar rejeição

**Procedimento mensal:**
1. Re-rodar validator no calibration-set
2. Comparar com ratings humanos
3. Se concordância <90% por 2 ciclos seguidos: abrir ADR de drift + tunar prompt
4. Adicionar 10 novas imagens / mês (incluindo casos adversariais surgidos em produção)

## Cases adversariais — princípio

Cases 16–18 são **deliberadamente sutis** para evitar que o validator vire um classificador binário ingênuo. O design quer um validator que **enxerga detalhes** como humano enxergaria, não um pattern matcher de paleta.

Padrão adversarial para futuras evoluções:
- Cor canônica mas saturação ligeiramente off
- Tipografia correta mas kerning errado
- Composição centralized mas com elemento "fora do grid"
- Border radius certo mas inconsistente entre cards

## Versionamento

Eval cases versionados em git. Adicionar/remover case = bump PATCH do SKU.

**Próxima evolução (v0.2.0):** adicionar cases 27–34 cobrindo multi-tenant (brand_guide por tenant_id), formatos extras (stories 1080×1920, banner 1200×630).

## Próximo passo

→ Implementar runner em `src/eval/designer-agent.runner.ts`
→ CI workflow `forge-eval` rodando este arquivo diariamente
→ Iniciar curadoria das 50 imagens calibração (DES-T4.1) em paralelo com Wave 1
