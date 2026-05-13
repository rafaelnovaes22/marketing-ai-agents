---
sku_id: video-editor-agent
sku_version: 0.1.0
project_type: agentic_saas
ai_enabled: true
diagnose_date: 2026-05-13
diagnose_command: "/acme:diagnose video-editor-agent"
po_guardian_status: pending_review
priority: P1
target_implementation_week: 9
---

# Diagnóstico — Video Editor Agent

## 1. Problema do cliente

**Quem:** Founders B2B/B2C que fazem livestreams, palestras, podcasts ou que precisam de vídeos curtos (Reels/TikTok/Shorts) recorrentes para distribuição multi-plataforma e multi-idioma.

**Dor concreta:**
- Edição manual de 1 vídeo curto (30-90s) a partir de um vídeo longo leva **4-8 horas** (transcrição → seleção de cortes → edição → legendagem → renderização em 3 aspect ratios).
- **Legendagem multi-idioma** (5 idiomas: PT-BR, EN-US, ES, FR, IT) feita manualmente custa R$ 200-500 por vídeo (terceirização).
- Time de editor de vídeo + motion designer: **R$ 8.000-15.000/mês** para 20-30 vídeos curtos/mês (R$ 400-750 por vídeo).
- **Time-to-publish lento** mata relevância (vídeo de palestra publicado 1 semana depois = engajamento -70%).
- Falta de consistência: cortes inconsistentes entre vídeos, brand off em lower-thirds, legendas desincronizadas.

**Quanto a dor custa:** R$ 8-15K/mês operacional + R$ 200-500/vídeo em traduções + custo de oportunidade (lives que nunca viraram clips = audiência perdida em 4 redes).

**Como medimos resolução:** vídeo curto (30-90s) pronto-publicar em 3 aspect ratios (9:16, 1:1, 16:9) com legendas em 5 idiomas (SRT + hardcoded), entregue em ≤10 min, custo ≤25% do preço.

## 2. Outcome contratual (C2)

**Promessa em uma frase:**
> "Entregar 1 vídeo curto (30-90s) pronto-publicar em 3 aspect ratios (9:16, 1:1, 16:9) com legendas em 5 idiomas (PT-BR, EN-US, ES, FR, IT) — gerados via cortes inteligentes de input longo ou geração nova (Veo 3) — em ≤10 min."

**Cenários de uso suportados:**
- **Cenário A (PRIMÁRIO):** Founder envia vídeo longo (palestra, live, podcast — até 2h) → agente transcreve, seleciona melhores cortes (3-5 clips) e gera shorts. **Cobertura: ~80% dos casos.**
- **Cenário B (PREMIUM):** Founder envia briefing textual → Veo 3 gera vídeo do zero (com áudio nativo). **Custa caro — exige SKU premium separado (R$ 150) — ver ADR-001-VE.**

**Exemplos verificáveis:**

✅ **Positivo 1 (Cenário A):** Live de 1h da the CEO sobre growth → agente seleciona 3 melhores momentos, gera 3 clips de 45-60s em 9:16 + 1:1 + 16:9 com legendas PT/EN/ES/FR/IT, 8m42s.

✅ **Positivo 2 (Cenário A):** Podcast de 35min (B2B SaaS) → 4 clips de 30-60s + legendas + lower-third com nome do convidado, 9m18s.

✅ **Positivo 3 (Cenário B premium):** Briefing "depoimento empresarial 30s sobre produto X" → Veo 3 gera vídeo 30s com áudio nativo + legendas em 5 idiomas, 7m20s. **Preço: R$ 150 (SKU premium).**

❌ **Negativo 1:** "Faz um vídeo legal" → REJEITA (outcome vago — exige input mínimo: vídeo-fonte OU briefing estruturado).

❌ **Negativo 2:** Vídeo entregue em 9m mas só em 1 aspect ratio (faltam 1:1 e 16:9) — NÃO conta.

❌ **Negativo 3:** Vídeo entregue em 12m com todos os outputs — NÃO conta (SLA violado).

❌ **Negativo 4:** Cenário B (Veo 3) cobrado a R$ 30 — NÃO permitido (re-pricing — encaminhar para SKU premium R$ 150).

## 3. ICP fit

**Cabe no ICP?** ✅ Sim — Acme Social posicionado como SaaS² para founders B2B/B2C com presença em vídeo recorrente. Video-editor é P1 porque depende do P0 (social-media-agent) já estar operando para distribuir os clips.

**Não cabe:**
- Editores que precisam de finishing cinematográfico (color grading complexo, VFX, mixagem multi-pista).
- Vídeos longos completos (esse SKU só entrega clips curtos 30-90s, não documentários nem cursos).
- Branded podcasts com edição autoral artística.

## 4. Hipóteses a validar (Week 9 SHADOW)

1. **ElevenLabs Scribe v2 atinge ≥95% de acurácia em PT-BR para transcrição de input longo (até 2h)?**
   Hipótese: sim — Scribe v2 é state-of-art em PT-BR, suporta 99 idiomas com speaker diarization.

2. **Claude Sonnet 4.6 é capaz de selecionar cortes "publicáveis" (hook + payoff em 30-90s) com score humano ≥7/10?**
   Hipótese: sim, com prompt-engineering + few-shot examples de cortes virais curados. Risco médio: pode selecionar momentos sem hook claro.

3. **Veo 3 gera vídeo 30s consistente com áudio nativo (sem artefatos)?**
   Hipótese: sim, mas com custo proibitivo para o SKU R$ 30 padrão. Veo 3 deve ficar reservado para SKU premium R$ 150.

4. **Custo médio por vídeo no Cenário A (corte de input longo) cabe em R$ 7,50 (25% de R$ 30)?**
   Hipótese: sim — Scribe v2 ($0.024/min × 60min = $1.44 ≈ R$ 7,60) é o maior componente. Pode ficar tight com vídeos >1h. Provável ADR de cap de duração input.

5. **FFmpeg local consegue renderizar 3 aspect ratios + hardcoded captions em ≤2min por clip?**
   Hipótese: sim, com Lambda + GPU spot ou self-hosted server pequeno.

## 5. Riscos identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| **C3 violation no Cenário B (Veo 3 do zero)** | 🔴 Alta | Bloqueia AUTONOMOUS | ADR-001-VE: split em 2 SKUs (R$ 30 corte / R$ 150 premium Veo 3) |
| **Veo 3 quota limit / waitlist** | 🔴 Alta | Bloqueia Cenário B | Fallback: Runway Gen-4.5 ($0.05/s, 10× mais barato) — ver ADR-002-VE |
| **Input >2h (custo Scribe v2 escala linear)** | 🟡 Média | Custo viola C3 | Cap de duração input em 90min; cobrar adicional acima |
| **ElevenLabs Scribe acurácia <90% em PT-BR coloquial** | 🟡 Média | Legendas ruins | Fallback Google Speech-to-Text v2 ($0.016/min); revisão LLM-as-judge |
| **Tradução automática perde nuance (gírias PT-BR)** | 🟡 Média | Legendas inadequadas em EN/ES | Claude Sonnet 4.6 traduz com contexto + glossário por tenant |
| **FFmpeg infra (renderização) lenta para 3 ratios** | 🟢 Baixa | SLA violado | Queue + GPU instances dedicadas; cache de renderização |
| **Veo 3 gera conteúdo off-brand (sem brand_guide)** | 🟡 Média | Inutilizável | Brand validation Sonnet 4.6 vision pós-Veo (igual social-media-agent) |
| **Câmbio USD/BRL sobe** | 🟡 Média | Margem reduz | Hedge ou repasse via re-pricing trimestral |

## 6. Restrições conhecidas

- **Single-tenant fase 1** (C8): Acme própria como cliente único.
- **5 idiomas iniciais** (C7): PT-BR (master), EN-US, ES, FR, IT. Outros idiomas (DE, JA, ZH) entram em wave 2.
- **Duração output:** 30-90s apenas (não suportamos vídeos longos completos neste SKU).
- **Duração input máximo:** 2h hard cap (acima exige negociação).
- **Aspect ratios fixos:** 9:16, 1:1, 16:9 (sem custom).
- **Stack Veo 3 + Scribe v2 + Sonnet 4.6 + FFmpeg** (definido em project.json); trocas exigem ADR.
- **Cenário B (Veo 3 generation)** NÃO é coberto pelo preço base R$ 30 — é SKU premium separado.

## 7. Próximo passo

→ `/acme:spec --type=platform-sku video-editor-agent`
→ Invocar `@unit-economist` para auditar C3 ANTES de plan — atenção especial ao trade-off Cenário A vs B.
→ Criar **ADR-001-VE** para split de SKUs (padrão R$ 30 vs premium R$ 150).
→ Validar com Founder se aceita ofertar apenas Cenário A inicialmente (Cenário B fica para wave 2).

---

**Aprovação pendente:** `@po-guardian` revisar outcome contratual + decisão de split de SKUs.
