# Decisions — Social Media Agent (ADRs locais)

> ADRs específicos deste SKU. Decisões globais do projeto ficam em `docs/forge/decisions.md` raiz (a criar quando aparecerem). Convenção de IDs: **ADR-NNN-DS** (DS = Acme Social).

---

## ADR-001-DS — Slides padrão: 4-5 (não 5-7)

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C3 (Unit Economics)

### Contexto

Spec inicial previa 5-7 slides padrão (consistente com benchmarks de the CEO). Diagnóstico preliminar estimou custo em R$ 3,20 (com 5 slides Imagen 4 + 2 Ideogram + copywriting + validação + infra), ligeiramente acima do limite C3 de R$ 3,00 (25% do preço R$ 12).

Auditoria refinada (`unit-economics.md`) recalculou em R$ 1,85 — bem abaixo do limite, com folga de 38%. **Tecnicamente C3 não bloqueia** mais.

### Decisão

Mesmo assim, **manter 4-5 slides como padrão**, com 6-7 como upsell pago (R$ 16).

### Motivação

1. **Previsibilidade de tempo:** 4-5 slides cabem confortavelmente em SLA de 8 min. 6-7 slides exigem ~10s adicionais por imagem.
2. **Cliente decide quando precisa:** upsell explícito força o cliente a justificar valor adicional (anti-bloat).
3. **Espaço para fallback Ideogram:** se 1 dos 5 slides precisar de Ideogram, custo sobe pouco; com 7 slides + múltiplos Ideogram, custo pode aproximar limite.
4. **Margem de erro com câmbio USD/BRL:** se USD subir, manter padrão menor preserva folga em C3.

### Consequências

- ✅ Outcome contratual ajustado: "4-5 slides default; 6-7 sob demanda (upsell)"
- ✅ Pricing structure clara: R$ 12 padrão, R$ 16 upsell
- ✅ Margem 76-87% em todos os cenários
- ⚠️ the CEO style benchmarks geralmente são 7 slides — pode haver pushback "muito curto"
- ✅ Mitigação: upsell é facilmente acessível (1 clique)

### Re-examinar

Após 90 dias em AUTONOMOUS:
- Taxa de upsell > 40% → revisar default (talvez 6 vire padrão)
- Taxa de upsell < 10% → manter

---

## ADR-002-DS — Adapter pattern para LLM/image-gen/social-publisher

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C7 (Portability)

### Contexto

Stack atual: Claude Sonnet 4.6 + Imagen 4 + Ideogram v2 + Zernio + Langfuse. Forge C7 exige domain layer sem acoplamento a SDK específico.

### Decisão

Implementar 5 interfaces (`LLMProvider`, `ImageGenProvider`, `BrandValidator`, `SocialPublisher`, `Observability`) em `src/domain/ports/`, com implementações em `src/infrastructure/adapters/`.

### Motivação

1. **Trocar provider = trocar adapter:** se Anthropic subir preço 50%, migrar para OpenAI ou Mistral toca apenas `infrastructure/adapters/llm/`.
2. **Testes isolados:** domain testado com fakes (zero custo de API em CI).
3. **Multi-provider futuro:** rotear briefings premium para Opus 4.6 e padrão para Sonnet 4.6 é uma linha de configuração.
4. **Alinhamento com C7 do master-prompt:** mecanicamente auditável por `@artifact-architect`.

### Consequências

- ✅ Domain `src/domain/carrossel/` ZERO imports de SDKs (auditável via `npm test:domain`)
- ✅ CI roda testes domain em <2s (sem network)
- ⚠️ Boilerplate inicial: ~30 LOC extras por adapter para definir interface
- ✅ Vale o trade-off — economiza dias de refactor em troca de provider

### Re-examinar

Apenas se mudarmos stack core (raríssimo).

---

## ADR-003-DS — Twitter usa modo thread (não single tweet)

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C2 (Outcome contratual) + C7 (Portability)

### Contexto

Twitter (X) limita posts a 280 caracteres. Carrosséis nativamente não existem — usuários compartilham via "threads" (sequência de tweets encadeados) ou "Twitter Cards" (1 imagem por tweet).

### Decisão

Para a rede Twitter, output será **thread** com:
- Tweet 1: hook + 1ª imagem (até 280 chars)
- Tweets 2-N: 1 imagem por tweet com legenda curta (≤200 chars)
- Tweet final: CTA + link

Total: N+1 tweets (onde N = slides).

### Motivação

1. **Engagement superior:** threads ficam ~3x mais tempo no feed que tweets isolados.
2. **Compatível com algoritmo do X:** threads recebem boost de retenção.
3. **Reusa as N imagens já geradas:** nenhum custo adicional vs publicar nas outras redes.

### Consequências

- ✅ Adapter `lib/social-publishers/twitter-adapter.ts` específico (não cabe no padrão Zernio único)
- ✅ Output Twitter inclui campo `thread_tweets: string[]` em vez de `caption: string`
- ⚠️ Twitter API v2 tem rate limit menor que outras redes → queue + retry
- ✅ Documentado em `templates/master-prompt.md` para Claude Code roteador entender

### Re-examinar

Se Twitter mudar para suportar carrosséis nativamente (ex: feature paga).

---

## ADR-004-DS — Brand Validator não bloqueia em 96-99%

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C3 (Unit Economics) + C4 (Verifiable Evaluation)

### Contexto

Brand validator (Claude Sonnet 4.6 vision) compara cada slide com `brand_guide.yaml`. Score 100% = perfeito. Mas perfeição absoluta é rara em IA generativa — variações sutis de cor (ex: #2563EB vs #2664EC) podem reduzir score sem comprometer reconhecimento humano.

Refazer imagem = +R$ 0,21 (Imagen 4 + validation novamente).

### Decisão

Política em 3 níveis:

- **≥ 99%:** aceita sem ação
- **96-98%:** aceita com `warning` logado, segue publicação
- **< 96%:** refaz 1 vez automaticamente; se ainda < 96%, **flag para human review** em ASSISTED, **fallback Ideogram** em SHADOW

### Motivação

1. **Custo controlado:** refazer toda vez explode unit economics.
2. **Qualidade ainda alta:** 96% brand é imperceptível para humano em 90% dos casos.
3. **Aprendizado:** warnings agregados (Mixpanel) mostram padrões — usar para tunar prompt de imagem.
4. **Safety net no SHADOW:** humano revisa 10% das execuções; brand <96% sempre vai pro 10%.

### Consequências

- ✅ Custo mantido em R$ 1,85 médio
- ✅ Brand consistency efetiva ≥ 97% (cliente percebe como 100%)
- ⚠️ Alguns brand purists podem questionar 96%
- ✅ Mitigação: dashboard mostra brand score por execução para auditoria

### Re-examinar

Se brand <96% rate > 15% em 30 dias.

---

## Princípios para futuros ADRs

- **Numeração:** ADR-NNN-DS sequencial
- **Status:** Proposto | Aceito | Rejeitado | Substituído por ADR-XXX-DS
- **Estrutura:** Contexto → Decisão → Motivação → Consequências → Re-examinar
- **Quando criar:** mudança arquitetural OU trade-off significativo (não toda decisão trivial)

## Próximo passo

→ Implementar Wave 1 do plan.md
→ Criar testes RED **antes** do build (Gate G6 Forge-10)
→ ADR-005-DS quando surgir (provável: como lidar com retries em Anthropic 529 — overloaded)
