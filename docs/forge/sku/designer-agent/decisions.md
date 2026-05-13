# Decisions — Designer Agent (ADRs locais)

> ADRs específicos do `designer-agent`. Convenção de IDs: **ADR-NNN-DES** (DES = Designer). ADRs do social-media-agent usam sufixo **-DS**.
> Decisões globais do projeto vão em `docs/forge/decisions.md` raiz (quando aparecerem).

---

## ADR-001-DES — Threshold brand 99% como hard gate contratual

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C2 (Outcome contratual) + C4 (Verifiable evaluation)

### Contexto

O `brand/acme-brand-guide.yaml` declara explicitamente:
```yaml
tolerance:
  exact_match_required: 99
```

Foi decisão **direta do founder** (não derivada de benchmark de mercado). A justificativa estratégica é que **brand consistency é o principal moat do Acme Social** vs concorrência genérica (Canva AI, Adobe Firefly), portanto qualquer slide off-brand é defeito.

Alternativas consideradas:
- **95%** (mais permissivo, comum em SaaS de design IA) — rejeitado: erode moat
- **99% como média** (não individual) — rejeitado: 1 slide ruim destrói carrossel inteiro
- **97% com 2 retries automáticos** — rejeitado: explode unit economics

### Decisão

**Threshold ≥99 individual por slide.** Não é média ponderada; não é meta agregada. Cada slide do carrossel é avaliado isoladamente e precisa atingir ≥99 no `BrandValidatorAdapter`.

**Variante econômica** (5 slides @ R$15) tem o **mesmo gate** — qualidade não negociada para preço menor.

### Motivação

1. **Moat:** brand consistency 99% é diferencial visível mesmo para olho não-treinado em volume (≥30 designs/mês).
2. **Promessa contratual literal:** spec.md §1.1 cita "score ≥99% no validator multimodal".
3. **Mecanicamente auditável:** validator + cross-judge + calibration-set tornam o gate falsifiable (C4).
4. **Reflete política do brand_guide.yaml** que já é fonte canônica.

### Consequências

- ✅ Outcome contratual cristalino: qualquer slide <99 dispara retry ou degraded flag
- ✅ Re-roll rate estimado em 15% (suportado pelo unit-economics — R$ 2,03 vs limite R$ 5,00)
- ⚠️ Em SHADOW, calibração validator × humano precisa atingir ≥90% concordância **antes** de aceitar este threshold como real
- ⚠️ Custo de retry pode subir se calibração for permissiva demais (validator aprova slides que humano rejeitaria)

### Re-examinar

- Trimestralmente, ou se concordância humano × validator cair <85%
- Se brand_guide.yaml for atualizado (versão major do guide)
- Se cliente externo (multi-tenant fase 2) exigir threshold diferente

---

## ADR-002-DES — Strategy de roteamento Imagen 4 × Ideogram v2 por `requires_literal_text`

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C7 (Portability) + C2 (Outcome contratual)

### Contexto

Imagen 4 (Google Vertex) é estado-da-arte em fotorrealismo e composição visual, **mas é fraco em texto literal grande** (headlines, números hero, CTAs) — frequentemente gera glyphs distorcidos ou typos.

Ideogram v2 é especializado em texto renderizado corretamente em imagens, **mas mais fraco em fotorrealismo** e variedade composicional.

Cenário típico de carrossel Acme (7 slides):
- ~5 slides visual-heavy (composições, ilustrações, fundos) → Imagen 4 ideal
- ~2 slides com texto literal grande (hook headline, hero number, CTA) → Ideogram v2 ideal

### Decisão

Implementar `SlidePlannerService.decideProvider(slide: Slide): ImageProvider` com lógica:

```typescript
function decideProvider(slide: Slide): ImageProvider {
  if (slide.requires_literal_text === true) return 'ideogram';
  if (slide.text_word_count >= 15) return 'ideogram';
  if (slide.has_hero_number) return 'ideogram';   // ex: "73%", "R$ 1M"
  return 'imagen-4'; // ~70% dos casos
}
```

Briefing do upstream caller pode incluir `slides[].requires_literal_text: bool` para override explícito.

### Motivação

1. **Qualidade contratual:** evita brand <99 por glyph distorcido (Imagen) ou ilustração pobre (Ideogram).
2. **Unit economics:** Imagen ($0.04) é 2x mais caro que Ideogram ($0.02); usar Ideogram só onde necessário não desperdiça budget.
3. **Adapter pattern preservado (C7):** ambos providers atrás da mesma interface `ImageGenerator`; trocar Imagen por FLUX = trocar 1 arquivo.

### Consequências

- ✅ Split observado target: 70% Imagen / 30% Ideogram (5/2 em carrossel padrão)
- ✅ Cost médio R$ 1,27 em geração (vs ~R$ 1,49 se tudo Imagen)
- ⚠️ Se Imagen melhorar drasticamente em texto (Google atualiza modelo), revisitar — pode eliminar Ideogram
- ⚠️ Estilo visual pode divergir entre Imagen e Ideogram em mesmo carrossel — mitigação: prompt engineering compartilhado (mesmas keywords de paleta/composição) + Case 14 da eval-suite valida

### Re-examinar

- Trimestralmente
- Se Google lançar Imagen 5 (provável Q3 2026)
- Se Ideogram subir preço >50%

---

## ADR-003-DES — Política de retry: 1 re-roll mesmo provider + 1 fallback cross-provider

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C3 (Unit economics) + C4 (Verifiable evaluation) + C2 (Outcome)

### Contexto

Brand score <99 em um slide pode ter 3 causas:
1. **Variação estocástica** do gerador (seed ruim, randomness) — corrige com re-roll mesmo provider
2. **Limitação estrutural do provider** (Imagen ruim em texto, Ideogram ruim em fotorrealismo) — corrige com cross-provider
3. **Briefing problemático** (ex: requer cor fora da paleta Acme) — não corrige; degrade gracefully

Re-rolls custam:
- 1 retry mesmo provider: +$0.04 (Imagen) ou +$0.02 (Ideogram) + 1 validação ($0.005)
- 1 retry cross-provider: idem +1 imagem custo
- Cada retry adiciona ~3s ao SLA

### Decisão

**Política em 3 níveis:**

1. **Brand ≥99:** aceita imediatamente, segue para output.
2. **Brand <99 (primeira tentativa):** dispara `re-roll mesmo provider` com prompt ligeiramente ajustado (mais ênfase no brand). Se segunda tentativa ≥99: aceita.
3. **Brand <99 (segunda tentativa):** dispara `fallback cross-provider`:
   - Slide originalmente Imagen → tenta Ideogram (e vice-versa)
   - Se cross-provider ≥99: aceita com `provider_fallback: imagen→ideogram` no manifest
4. **Brand <99 (terceira tentativa, cross-provider falha):** marca slide `degraded: true` no manifest, gera alerta Slack `#design`, mas **NÃO falha o carrossel inteiro** — outros slides OK seguem.

Limite hard: **2 retries por slide** (3 gerações totais).

### Motivação

1. **Custo controlado:** worst case retry budget por slide = $0.04 + $0.04 + $0.02 ≈ $0.10 = R$ 0,53. Para 1 slide degradado num carrossel típico (15% rate), amortizado em R$ 0,24 — comporta no unit-economics R$ 2,03 com folga.
2. **SLA preservado:** 2 retries × 3s ≈ 6s adicionais por slide problemático; paralelização mantém SLA total ≤20min.
3. **Cross-provider corrige limitação estrutural:** se Imagen falha texto, Ideogram resolve (e vice-versa).
4. **Degraded gracefully:** carrossel não falha por 1 slide ruim — alinha com C2 (entrega N-1 slides bons é melhor que 0).

### Consequências

- ✅ Re-roll rate target ≤15%, alarme ≥25%, hard fail ≥40%
- ✅ Provider fallback rate target ≤5%, alarme ≥10%
- ✅ Degraded slide rate target ≤1%, alarme ≥3%
- ⚠️ Estilo cross-provider pode parecer "estrangeiro" no carrossel — Case 14 da eval-suite + human review 10% sample em SHADOW detectam
- ⚠️ Em SHADOW, calibrar prompt do re-roll (ênfase em "Acme brand strict palette + Inter typography")

### Re-examinar

- Se re-roll rate observado >30% em 30 dias → tunar prompt de geração inicial (atacar causa raiz, não sintoma)
- Se provider_fallback rate >15% → considerar adicionar 3º provider (FLUX, DALL-E)
- Se degraded slide rate >5% → revisar threshold 99% (ADR-001-DES)

---

## ADR-004-DES — Designer-agent é composable (pode ser chamado por outros agentes OU direto)

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C2 (Outcome) + C7 (Portability) + C8 (Tenant context)

### Contexto

No roadmap dos 7 agentes, o `social-media-agent` (R$ 12) decompõe um carrossel completo (design + caption + publicação 4 redes) e historicamente faria tudo internamente. Mas com a chegada do `designer-agent` (R$ 20 standalone), há sobreposição:

- **Cenário A:** cliente quer só design (sem caption, sem publicação) — paga R$ 20 ao designer-agent.
- **Cenário B:** social-media-agent precisa de 4-5 slides on-brand para acoplar caption + publicar — historicamente gerava in-house, mas pode delegar ao designer-agent (composição de agentes).

Sem decisão clara, surgem 2 anti-patterns possíveis:
1. **Duplicação:** social-media-agent reimplementa geração+validação de imagens, ignorando designer-agent → fragmenta brand validation, dificulta calibração centralizada.
2. **Acoplamento forte:** social-media-agent depende de banco de dados do designer-agent, breaking C7.

### Decisão

`designer-agent` é **composable** com interface pública estável:

1. **Entry point único:** `DesignCarrosselUseCase.execute({ briefing, caller, tenant_id })`
2. **Contrato Zod versionado:** `DesignBriefing` schema com `briefing_version` (semver). Mudanças quebradoras bumam major.
3. **Output stateless:** `CarrosselManifest` retornado contém tudo necessário (S3 URLs, brand scores, retry counts, costs) — caller decide o que fazer.
4. **Caller declarado:** `caller: 'social-media-agent' | 'client_direct' | 'video-editor-agent' | ...` para telemetria + pricing differentiation.
5. **In-process call preferido em fase 1** (mesmo monolito TS): zero overhead de rede, transação compartilhada.
6. **API HTTP exposta em fase 2** (multi-tenant): mesma interface via REST/gRPC.

**Pricing por caller:**
- `caller=client_direct`: cobra R$ 20 (carrossel padrão) ou R$ 15 (econômica) do cliente.
- `caller=social-media-agent`: NÃO cobra design separado; custo do designer-agent vira **insumo** do social-media-agent (que cobra R$ 12 do cliente final, incluindo publicação). Internamente, billing rastreia ambos via `caller_chain` em Langfuse.

### Motivação

1. **Brand consistency centralizada:** UM `BrandValidatorAdapter`, UM calibration-set, UM gate 99% — independente de quem chama.
2. **Unit economics correto:** social-media-agent não paga R$ 20 internamente (que estouraria seu C3); usa designer-agent como insumo (~R$ 2 de custo direto).
3. **C7 preservado:** trocar Imagen por FLUX afeta tanto social-media quanto designer via mesmo adapter — zero refactor.
4. **Telemetria rica:** `caller_chain` em Langfuse permite ver fluxo `social-media → designer → imagen` em 1 trace.
5. **Reuso máximo:** evita 2 implementações de orchestração de carrossel.

### Consequências

- ✅ Wave 2 do social-media-agent **deveria** ser refatorada para delegar ao designer-agent (em fase 1.1, após designer estabilizar em SHADOW)
- ✅ Em fase 1.0 inicial, social-media-agent mantém implementação own enquanto designer-agent ainda está em draft/SHADOW (sem regressão)
- ✅ Multi-tenant fase 2: mesmo entry point recebe `tenant_id` → roteia para brand_guide correto
- ✅ Novos agentes (video-editor-agent, copywriter-agent) podem chamar designer-agent para gerar thumbnails / hero images
- ⚠️ Risco de boundary creep: definir explicitamente o que designer **não faz** (sem captions, sem publicação — escopo negativo da spec.md §1.1)
- ⚠️ Versionamento do schema `DesignBriefing` é responsabilidade do designer-agent; quebrar callers existentes exige migration plan

### Re-examinar

- Após designer-agent em AUTONOMOUS, decidir se social-media-agent deprecia geração interna em favor de delegação
- Quando 3º agente (video-editor) tentar consumir designer-agent — validar se contrato cobre o caso
- Multi-tenant fase 2: confirmar que `tenant_id` propaga corretamente em toda chain

---

## Princípios para futuros ADRs (designer-agent)

- **Numeração:** ADR-NNN-DES sequencial (DES = Designer, vs DS = Acme Social geral)
- **Status:** Proposto | Aceito | Rejeitado | Substituído por ADR-XXX-DES
- **Estrutura:** Contexto → Decisão → Motivação → Consequências → Re-examinar
- **Quando criar:** mudança arquitetural OU trade-off significativo (não toda decisão trivial)

## Próximo passo

→ Implementar Wave 1 do `plan.md` (Foundation com REUSO) **após Wave 2 do social-media-agent estabilizar**
→ Iniciar curadoria 50 imagens (DES-T4.1) em paralelo
→ ADR-005-DES quando surgir (provável: política de versionamento do `DesignBriefing` schema)
→ ADR-006-DES quando surgir (provável: estratégia de cache de slides "template" — otimização do unit-economics §6)
