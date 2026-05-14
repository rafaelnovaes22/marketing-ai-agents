# Eval cases adiados — full-pipeline runner necessário

> Estes 14 cases do `docs/forge/sku/social-media-agent/eval-cases.md` **não** são
> avaliáveis pelo runner v0 (text-only: prompt → output → judge textual).
>
> Eles dependem de inspeção de pipeline (custo medido, retry_count, brand
> validator em imagem real, mock de Zernio, cache hit ratio) e exigem um runner
> integration-style que invoca `GenerateCarrosselUseCase` com fakes
> instrumentados.
>
> **Plano de retomada:** Wave 5 do social-media-agent — `EvalRunnerPipeline`
> (separado deste `EvalRunner` text-only) que carrega `criterio_pass: pipeline_metric`
> e lê assertions sobre trace metadata.

| ID | Categoria | Por que adiado | Critical path |
|----|-----------|----------------|:-------------:|
| case-003 | brand_consistency_cores | depende de inspeção de imagem real (cores fora da paleta) | — |
| case-004 | brand_consistency_tipografia | depende de Claude vision inspecionando imagem | — |
| case-005 | image_provider_routing | depende de inspeção do `decideImageProvider` retornado | ⭐ |
| case-011 | pricing_upsell | depende de contagem real de slides + custo medido | — |
| case-012 | pricing_upsell | depende de contagem real de slides + custo medido | — |
| case-013 | sla | depende de medição de latência ponta-a-ponta | — |
| case-014 | sla | depende de medição de latência + flag `sla_violated` no trace | — |
| case-015 | brand_retry | depende de `retry_count` no trace | ⭐ |
| case-016 | brand_acceptance | depende de `retry_count == 0` + warning logged | — |
| case-017 | tom_drift | depende de `flagged_for_human_review` em metadata | — |
| case-018 | multi_tenant | skip_in_phase_1 (single-tenant Acme própria) | — |
| case-019 | cache_performance | depende de `cache_creation_input_tokens` ratio | — |
| case-020 | publisher_retry | depende de mock externo Zernio + trace `pending_manual` | ⭐ |
| case-021 | batch_economy | depende de inspeção de custo por imagem | — |

## Cobertura crítica perdida

Dos 5 critical_path originais [1, 5, 10, 15, 20]:
- ✅ case-001 migrado
- ❌ case-005 adiado (image provider routing)
- ✅ case-010 migrado
- ❌ case-015 adiado (brand retry)
- ❌ case-020 adiado (Zernio retry)

**Implicação:** o pass rate do runner v0 **não substitui** o gate 4 de SHADOW.
Quando Wave 5 entregar `EvalRunnerPipeline`, os 3 critical_path adiados precisam
ser exercidos antes de promover para SHADOW.

## Reduce-coverage acceptable em Etapa 1?

Sim, mas **com nota explícita no report**: o gate de SHADOW exige cobertura ≥85%
nos 22 cases originais (ou em um conjunto ≥30 cases canônico do Constitution C4).
Os 8 cases v0 são amostra para validar o pipeline, NÃO o gate canônico.
