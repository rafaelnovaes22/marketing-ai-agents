---
sku_id: designer-agent
sku_version: 0.1.0
project_type: agentic_saas
ai_enabled: true
diagnose_date: 2026-05-13
diagnose_command: "/acme:diagnose designer-agent"
po_guardian_status: pending_review
priority: P0
target_implementation_week: 2
---

# Diagnóstico — Designer Agent

## 1. Problema do cliente

**Quem:** Founders B2B/B2C e times de marketing que precisam manter **identidade visual consistente** em alto volume (≥30 designs/mês) sem manter um designer in-house dedicado.

**Dor concreta:**
- Designer pleno custa **R$ 6.000–12.000/mês** + benefícios + ferramentas Adobe (R$ 800/mês).
- Tempo médio para um carrossel de 7 slides on-brand feito manualmente: **3-5 horas** (briefing + layout + tipografia + ajuste de cores + revisão).
- Brand consistency degrada após o 30º design por fadiga humana — paleta sai do trilho, tipografia mistura pesos, espaçamento perde rigor (queda observada de 95%→78% em 60 dias sem audit).
- Re-design por feedback custa 1-2h extras por slide; em 7 slides isso é meio dia perdido.
- Variabilidade entre designers (freelancers) destrói memória visual da marca.

**Quanto a dor custa:** R$ 6-12k/mês fixos + R$ 200-400/carrossel quando terceirizado em rush + custo invisível de brand erosion (queda de reconhecimento, CAC sobe).

**Como medimos resolução:** carrossel completo (7 slides JPG 1080×1080) **brand-validated ≥ 99%** entregue em ≤20 min, custo ≤ 25% do preço de venda (R$ 5,00 sobre R$ 20,00).

## 2. Outcome contratual (C2)

**Promessa em uma frase:**
> "Entregar um carrossel de design completo (7 slides JPG 1080×1080) seguindo o brand Acme com score ≥99% no validator multimodal, em ≤20 minutos, pronto para o social-media-agent (ou cliente direto) acoplar caption e publicar."

**Exemplos verificáveis:**

✅ **Positivo 1:** Briefing recebido do social-media-agent ("7 slides sobre governança de IA, dark mode dominante, cyan_accent nos números") → 7 slides gerados (5 via Imagen 4 + 2 via Ideogram para slides com texto destacado) → brand score 99.3% → 17m48s. Conta como sucesso.

✅ **Positivo 2:** Briefing direto do founder ("carrossel de lançamento, 5 slides econômicos, sem upsell") → 5 slides Imagen 4 + 0 Ideogram → brand score 99.7% → 12m20s. Conta como sucesso.

✅ **Positivo 3:** Re-roll automático: slide 3 sai com 96% brand → validator dispara retry → segunda tentativa 99.4% → ainda dentro do SLA → 19m02s. Conta como sucesso.

❌ **Negativo 1:** "Faz um design legal sobre IA" → REJEITA antes de gastar tokens (exige briefing mínimo: tema, número de slides, tom visual dominante dark/light).

❌ **Negativo 2:** 7 slides bonitos, brand score 96% (não chegou ao threshold 99%) → NÃO conta como sucesso, dispara política do ADR-004-DS (já existente) — re-roll obrigatório do slide problemático.

❌ **Negativo 3:** 7 slides com brand 99.5% entregues em 22min → NÃO conta (SLA violado), trace marcado `sla_violated=true`.

❌ **Negativo 4:** Designer Agent recebe pedido para gerar vídeo curto → REJEITA (escopo: vídeo é do `video-editor-agent`, sinaliza para o orquestrador).

## 3. ICP fit

**Cabe no ICP?** ✅ Sim. Acme Social posicionado como SaaS² para founders e times que precisam de **alto volume de design on-brand sem time interno**.

**Não cabe (escopo declarado fora):**
- Logos, identidades visuais completas (one-shot creative, não recorrente — escopo de agência humana).
- Vídeos animados (responsabilidade do `video-editor-agent`).
- Print/material físico (não há gate de prepress nem CMYK na pipeline).
- Brand novo sem `brand_guide.yaml` estruturado (designer não cria identidade, ele aplica).
- Multi-tenant em fase 1 (brand_guide hard-coded para Acme; multi-tenant na wave 2).

## 4. Hipóteses a validar (Week 2 SHADOW)

1. **Brand consistency 99%+ é atingível com Imagen 4 + brand_guide.yaml + Sonnet 4.6 vision validator?**
   Hipótese: sim para 70-80% dos slides com Imagen 4 (composições, fundos, ilustrações). Slides com texto literal grande (hero quotes, CTA) caem para 60% no Imagen → fallback Ideogram v2 cobre os 20-30% restantes.

2. **Split estratégico Imagen 4 (5 slides) × Ideogram v2 (2 slides) por carrossel está calibrado?**
   Hipótese: sim. Slides 1 (hook com headline grande) e 4-5 (CTA com texto) usam Ideogram; slides 2, 3, 6, 7 (visual-heavy) usam Imagen 4. Variável por briefing.

3. **Brand validator (Claude Sonnet 4.6 vision) é preciso o suficiente para gate 99%?**
   Hipótese: sim, com prompt estruturado baseado em `validator_rules` do YAML + 30+ eval-cases curados com humano-rating. Risco: validator pode ser permissivo demais sem calibração — precisamos de auditoria humana de 10% do output em SHADOW.

4. **Re-roll médio fica em ≤ 15% dos slides (custo amortizado controlável)?**
   Hipótese: sim após semana 1 de tuning de prompt. Threshold de rejection `< 96%` (do brand_guide.yaml) preserva qualidade sem explodir custo.

5. **SLA 20 minutos é factível com 7 imagens + 7 validações + 1-2 retries esperados?**
   Hipótese: sim com paralelização (7 imagens geradas em paralelo, ~3min). Validação multimodal serial: 7 × ~20s = ~2.5min. Buffer de re-roll: 5min. Total ~10-15min em caso típico.

## 5. Riscos identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| Brand validator permissivo (aceita slides 95% como 99%) | 🔴 Alta | Quebra promessa contratual | Calibração obrigatória SHADOW: 10% sample com revisão humana; ajuste do prompt do validator até concordância ≥90% |
| Imagen 4 rejeita prompt com hex específico (#0A1628) | 🟡 Média | Atrasa entrega | Prompt engineering: descrição perceptual ("deep navy almost black") + fallback Ideogram |
| Ideogram v2 não respeita Inter (tipografia obrigatória) | 🟡 Média | Brand score cai | Pós-processamento: overlay de texto via Canvas API quando Ideogram falha; ADR-002-DES |
| Re-roll explode custo em 30%+ dos slides | 🟡 Média | C3 estourado | Telemetria de retry-rate por slide-type; tuning iterativo; ADR-001-DES define threshold |
| Designer recebe briefing fora de escopo (vídeo, logo) | 🟢 Baixa | Latência por rejeição | Schema validation no input (tipo=carrossel obrigatório) |
| Custo Vertex Imagen 4 sobe para $0.06/img | 🟡 Média | C3 fica apertado (folga reduz) | Multi-provider via adapter (C7): trocar para FLUX ou DALL-E 3 sem tocar domain |

## 6. Restrições conhecidas

- **Single-tenant fase 1 (C8):** brand_guide.yaml hard-coded para Acme. Multi-tenant via `brand_guides/{tenant_id}.yaml` entra na wave 2.
- **Stack Google + Ideogram + Anthropic** (definido em `project.json`): trocas exigem ADR.
- **Saída exclusiva carrossel** na v0.1.0. Stories, banners, posts únicos entram em versões futuras com novos outcome_units.
- **Brand guide já existe** em `brand/acme-brand-guide.yaml` (extração validada do site oficial Acme, confidence: high). O agente CONSUMEmais não cria/edita.
- **Threshold de brand é POLÍTICA EXPLÍCITA** em `brand/acme-brand-guide.yaml` (`tolerance.exact_match_required: 99`). Foi decisão do founder. Mudança exige ADR-001-DES.

## 7. Sinergia com outros agentes

- **Recebe briefings do `social-media-agent`** (caso comum em produção): social-media decompõe carrossel completo → delega design ao designer-agent → recebe imagens prontas → adiciona caption + publica via Zernio.
- **Pode ser invocado direto pelo cliente** (caso de uso secundário): cliente quer só o design (sem caption/publicação) — preço cheio R$ 20.
- **Não invoca outros agentes** na v0.1.0 (sem dependências out-going).

## 8. Próximo passo

→ `/acme:spec --type=platform-sku designer-agent`
→ Invocar `@unit-economist` para auditar C3 (preço R$ 20, limite R$ 5).
→ Curar 30+ eval-cases de carrossel on-brand para SHADOW (referenciar `examples_on_brand` do YAML).
→ Sincronizar contrato de input/output com `social-media-agent` (handoff de briefing).

---

**Aprovação pendente:** `@po-guardian` revisar outcome contratual + ICP fit + escopo (carrossel-only v0.1.0).
