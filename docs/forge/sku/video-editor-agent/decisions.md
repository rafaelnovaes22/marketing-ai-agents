# Decisions — Video Editor Agent (ADRs locais)

> ADRs específicos deste SKU. Convenção de IDs: **ADR-NNN-VE** (VE = Video Editor).
> Decisões globais do projeto ficam em `docs/forge/decisions.md` raiz.

---

## ADR-001-VE — Split de SKUs: video-editor-agent (R$ 30) vs video-editor-agent-premium (R$ 150)

**Status:** ✅ Aceito 2026-05-13 — **APROVADO PELO FOUNDER**
**Princípio relacionado:** C3 (Unit Economics) + C2 (Outcome contratual)
**Commit de referência:** (a registrar no merge desta tasks-tree)
**Decisão executiva:** Founder aprovou em 2026-05-13 (sessão de revisão de unit-economics)

### Contexto

Diagnóstico inicial identificou 2 cenários de uso radicalmente diferentes em economia:

- **Cenário A** (corte de vídeo input longo): custo R$ 4,80, preço R$ 30, **margem 84%** ✅
- **Cenário B** (geração nova via Veo 3): custo R$ 79+, preço R$ 30, **margem -163%** ❌

`@unit-economist` documentou em `unit-economics.md`: mesmo cobrando R$ 150 no Cenário B, custo de R$ 79 representa 53% do preço (viola regra dos 25%).

### Decisão

**Split em 2 SKUs:**

1. **`video-editor-agent`** — R$ 30 — Cenário A apenas (corte de input). **APROVADO PARA IMPLEMENTAÇÃO IMEDIATA (wave 1).**
2. **`video-editor-agent-premium`** — R$ 150 — Cenário B (Veo 3 geração nova). **DIFERIDO para wave 2 do consumer** (ver `out-of-scope.md`).

Esta tasks-tree (plan/tasks/eval/lifecycle) cobre **APENAS o SKU base R$ 30**.

### Motivação

1. **Honestidade C3:** Veo 3 a $0.50/seg é proibitivo no preço base. Forçar no SKU R$ 30 violaria C3 em 10×.
2. **Speed-to-market:** Cenário A é viável e lucrativo HOJE. Não bloquear por Cenário B premium.
3. **Veo 3 está em beta:** preços podem cair em 3-6 meses. Re-avaliar então.
4. **Customer segmentation:** clientes que precisam Veo 3 são premium (B2B com budget alto) — diferente do ICP padrão.

### Consequências

- ✅ Wave 1 implementa apenas adapters de transcrição + FFmpeg + LLM (sem Veo 3 / Runway)
- ✅ Lint rule custom bloqueia qualquer import de `video-gen/*` durante esta wave (Gate G6+)
- ✅ Arquitetura preservada para evolução: domain/application já compatíveis com adapters futuros
- ✅ Founder pode anunciar R$ 30 SKU com clareza ("corte de vídeo IA")
- ⚠️ Clientes que pedem Cenário B recebem mensagem clara: "produto em desenvolvimento, wave 2"
- ✅ `out-of-scope.md` documenta diferimento com critérios de re-ativação

### Re-examinar

**2026-08-13** (3 meses após split):
- Reavaliar pricing Veo 3 (beta → GA pode mudar economics)
- Avaliar demanda real do Cenário B (quantos clientes pediram?)
- Decidir: implementar `video-editor-agent-premium`, manter diferido ou cancelar

---

## ADR-002-VE — Veo 3 primary + Runway Gen-4.5 fallback (APENAS para premium futuro)

**Status:** ✅ Aceito 2026-05-13 — **NÃO APLICÁVEL nesta wave** (referência futura)
**Princípio relacionado:** C7 (Portability)

### Contexto

Quando `video-editor-agent-premium` for ativado (wave 2 consumer), precisará de provider de geração de vídeo. Opções avaliadas:

- **Veo 3** (Google Vertex AI): $0.50/seg, áudio nativo (USP competitiva), beta com waitlist
- **Runway Gen-4.5:** $0.05/seg (10× mais barato), sem áudio nativo, mais estável

### Decisão

**No SKU premium (futuro):**
- **Veo 3** = provider primário quando áudio nativo é requisito explícito
- **Runway Gen-4.5** = fallback ativado se:
  - Veo 3 retorna `quota_exceeded`
  - Veo 3 falha de geração (artefatos visuais)
  - Cliente aceita "sem áudio nativo" para economizar

**Nesta wave (R$ 30):** **NENHUM dos dois é usado.** Adapters não criados.

### Motivação

1. **Veo 3 áudio nativo é diferencial** (Runway exige adicionar áudio em pós) → justifica preço premium
2. **Runway 10× mais barato** salva margem em fallback
3. **Multi-provider C7** garante portabilidade — não dependemos de waitlist Veo 3

### Consequências

- ⏳ Aplicável apenas após ADR-001-VE re-examinar (2026-08)
- ⏳ Adapters `video-gen/veo3-adapter.ts` e `video-gen/runway-adapter.ts` ficam em backlog
- ⏳ Domain layer já comporta extensão (UseCase `GenerateVideoFromBriefingUseCase` previsto mas não implementado)

### Re-examinar

Junto com ADR-001-VE em 2026-08.

---

## ADR-003-VE — Legendas: SRT separado para todos + hardcoded apenas na 9:16

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C2 (Outcome contratual) + UX

### Contexto

TikTok/Reels/Shorts (formato 9:16) exigem legendas queimadas no vídeo — não suportam SRT nativo no upload. Feed Instagram (1:1) e YouTube (16:9) suportam SRT nativamente.

Hardcode em todos os formatos = 3× custo FFmpeg + perde editabilidade.

### Decisão

- **SRT separado** entregue para todos os 3 aspect ratios em 5 idiomas (PT, EN, ES, FR, IT) = **15 arquivos SRT por execução**
- **Hardcoded (queimado)** apenas na versão 9:16 em **PT-BR** (idioma principal de publicação)
- Cliente pode opcionalmente solicitar hardcoded em outros idiomas via flag (custo adicional FFmpeg pass)

### Motivação

1. **Cobertura nativa por plataforma:** Reels/TikTok precisam hardcode; outras suportam SRT
2. **Editabilidade:** SRT permite ajuste manual sem re-render
3. **Custo FFmpeg controlado:** hardcode pass adicional = +R$ 0,07/clip — não vale por default
4. **Multi-idioma SRT:** cliente pode publicar mesma versão em mercados diferentes apenas trocando SRT

### Consequências

- ✅ Output: 3 MP4s + 15 SRTs (3 ratios × 5 idiomas)
- ✅ Versão 9:16 PT-BR pronta para publicação direta TikTok/Reels
- ✅ Custo FFmpeg médio R$ 0,20 (apenas 1 hardcode pass)
- ⚠️ Cliente precisa entender estrutura de outputs — documentar em runbook

### Re-examinar

Se TikTok/Reels passarem a suportar SRT nativo OU se demanda forte por hardcoded multi-idioma surgir.

---

## ADR-004-VE — Cap de input em 90 minutos (proteção C3)

**Status:** ✅ Aceito 2026-05-13 — **NOVO (criado neste plan)**
**Princípio relacionado:** C3 (Unit Economics)

### Contexto

`unit-economics.md` Seção 5 identificou: vídeo de 120min faz ElevenLabs Scribe v2 sozinho custar **R$ 15,26** (120 × $0.024 × R$ 5,30) — viola C3 mesmo no preço R$ 30 (limite R$ 7,50).

Sem proteção mecânica, cliente pode enviar vídeo de 2-3h e quebrar economia do SKU.

### Decisão

**Hard cap de 90 minutos de input.**

- Circuit breaker na camada application (`VideoCutterUseCase`) rejeita inputs >90min ANTES de chamar Scribe
- Mensagem ao cliente: "Vídeo excede limite de 90min. Sugestões: (1) trim manual da parte mais relevante, (2) split em 2 entregas separadas, (3) contate para orçamento custom B2B"
- Alerta Slack `#ops` quando cap é acionado (para monitorar demanda real)

### Motivação

1. **Proteção C3 mecânica:** não depende de boa-fé do cliente
2. **90min cobre 95% dos casos** (palestras típicas 30-60min, podcasts 45-90min)
3. **2h hard cap não era suficiente** — a math do Scribe linear quebra acima de 90min
4. **Trim manual é opção viável** — cliente extrai 60min relevantes de palestra 2h

### Consequências

- ✅ Custo Scribe máximo: 90 × $0.024 = $2.16 = R$ 11,45
  - ⚠️ AINDA viola C3 (R$ 7,50)! → ver Mitigação adicional abaixo
- ✅ Mitigação adicional: **fallback Google STT v2** ($0.016/min) reduz para R$ 7,63 a 90min — borderline OK
- ✅ OU acionar surcharge linear R$ 0,40/min acima de 60min (cobrança extra)

### Mitigação refinada

Decisão pragmática: **cap em 60min para preço R$ 30 padrão**; **60-90min com surcharge R$ 0,40/min** (cliente paga R$ 30 + R$ 12 = R$ 42 para 90min).

> Spec atualizado: cap operacional 60min default; até 90min com surcharge automático; >90min rejeita.

### Re-examinar

Se:
- ElevenLabs Scribe baixar preço >30% → revisar cap
- Whisper self-hosted ficar competitivo em PT-BR → trocar provider e expandir cap

---

## ADR-005-VE — video-editor-agent-premium é SKU separado, não evolução deste

**Status:** ✅ Aceito 2026-05-13 — **NOVO (formaliza diferimento)**
**Princípio relacionado:** C2 + C3 + governança

### Contexto

Tentação natural seria implementar Cenário B (Veo 3) como feature flag no mesmo SKU, ativando sob demanda. ADR-001-VE rejeitou isso por motivos econômicos. Esta ADR formaliza a **separação como SKU distinto**.

### Decisão

`video-editor-agent-premium` será SKU **separado** com:
- Próprio `docs/forge/sku/video-editor-agent-premium/` (não criado nesta wave)
- Próprio `project.json` SKU entry com `priority: P3` (futuro)
- Próprio outcome contratual, eval-suite, unit-economics
- Próprio lifecycle (draft → SHADOW → ASSISTED → AUTONOMOUS independente)
- Compartilha código: domain layer + alguns use cases via packages internos (DRY)

### Motivação

1. **Governança clara:** cada SKU tem ciclo de vida próprio, evita "feature creep"
2. **Pricing isolado:** alterar preço premium não afeta SKU base
3. **Eval isolada:** cases de Cenário B não diluem pass rate do Cenário A
4. **Audit mensal separado:** DeepAgent revisa cada SKU isoladamente
5. **Anti-vazamento:** lint rule custom impede import cruzado durante wave 1

### Consequências

- ✅ Esta wave NÃO cria pasta `docs/forge/sku/video-editor-agent-premium/`
- ✅ `out-of-scope.md` documenta diferimento com critérios de ativação
- ✅ Quando ativar (≥2026-08), criar pasta completa com diagnose/spec/plan/tasks próprios
- ✅ Compartilhamento de código via `src/shared/video/` (refactor futuro)
- ⚠️ Comunicação ao mercado: 2 SKUs distintos no pricing page

### Re-examinar

Trigger de ativação (qualquer um):
- Demanda explícita ≥10 clientes pedindo Cenário B
- Veo 3 preço cair ≥50% (≤$0.25/seg)
- Cenário A em AUTONOMOUS estável ≥30 dias
- Avaliação dedicada @unit-economist re-aprovar economics

---

## Princípios para futuros ADRs (sufixo VE)

- **Numeração:** ADR-NNN-VE sequencial
- **Status:** Proposto | Aceito | Rejeitado | Substituído por ADR-XXX-VE
- **Estrutura:** Contexto → Decisão → Motivação → Consequências → Re-examinar
- **Quando criar:** mudança arquitetural OU trade-off econômico OU constraint de C1-C8

## Próximo passo

→ Implementar Wave 1 do plan.md (ElevenLabs Scribe adapter + FFmpeg layer)
→ Garantir lint rule no-veo3 ativa antes de qualquer commit em Wave 2 (ADR-001-VE/ADR-005-VE enforcement)
→ ADR-006-VE provável: política de retry para ElevenLabs 503 (rate limit)
