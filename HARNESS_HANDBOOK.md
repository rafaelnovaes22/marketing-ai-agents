# Harness Handbook — marketing-ai-agents (Novais Digital Social)

> Gerado por /handbook em 2026-07-23. Commit base: 72878c0.
> Regra de uso: leia L1; desça para L2/L3 só quando a tarefa exigir. Âncoras ⚠️ FROZEN precisam de verificação antes do uso.

## L1 — Visão do sistema

SaaS de agentes de marketing (7 SKUs planejados; 3 implementados: social-media, copywriter, designer) que gera carrosséis, landings, e-mails e ads via Claude + Imagen/Ideogram, valida brand/voz por LLM-as-judge e publica em 4 redes sociais. Arquitetura hexagonal (domain/application/infrastructure) + LangGraph para orquestração + LangSmith para tracing.

- **Arquitetura**: `src/domain` (entidades + ports, zero SDK) · `src/application` (use cases) · `src/infrastructure` (adapters Claude/OpenAI/Imagen/Ideogram/Zernio/Twitter/LangSmith + CompositionRoot) · `src/orchestration` (grafo LangGraph) · `src/eval` (harness de avaliação offline) · `scripts/` (calibração/benchmark).
- **Modelo de execução**: `createProductionSocialMediaPipeline()` → `runSocialMediaOrchestrator` (startTrace) → node `generate_carrossel` (copy LLM + imagens + brand check) → [`design_validation` opcional] → node `publish_multi_network` (4 redes) → endTrace.
- **Estágios**: E1 Inicialização/Composição · E2 Trigger/Validação de input · E3 Roteamento do grafo · E4 Geração de copy (LLM) · E5 Geração/validação de imagens · E6 Gates de qualidade · E7 Publicação/Terminação · T1 Observabilidade · T2 Resiliência LLM · T3 Avaliação offline.
- **Fluxo de dados global**: briefing (input do chamador) → state do grafo LangGraph (memória) → traces no LangSmith → outputs retornados ao chamador. Persistência Postgres/Prisma declarada em `prisma/schema.prisma` mas ainda NÃO ligada ao código (ver Não resolvido).

## L2 — Estágios

### E1: Inicialização e Composição
- **Propósito**: instanciar adapters reais a partir do `.env` e montar deps dos use cases (DI manual, sem container).
- **Gatilho**: chamada a `createProductionSocialMediaPipeline()` / `createSocialMediaDeps()`.
- **Input/Output**: env vars (ANTHROPIC_API_KEY, LANGSMITH_*, GOOGLE_CLOUD_PROJECT_ID, IDEOGRAM_API_KEY, ZERNIO_API_KEY, TWITTER_*) / `SocialMediaOrchestratorDeps` + grafo compilado.
- **Estados que lê/escreve**: lê `process.env`, `prompts/social-media-agent/system-prompts/brand_voice_ceo.md`, `brand/novais-brand-guide.yaml` (via loader); escreve `systemPromptByTom: Map`.
- **Depende de**: nada (raiz).
- **Unidades**: createSocialMediaDeps, createProductionSocialMediaPipeline, buildNovaisBrandGuide, loadSystemPrompts, BrandGuideLoader.

### E2: Trigger e Validação de input
- **Propósito**: fail-fast no boundary — todo grafo exige `tenantId`/`traceContext`/`mode` válidos; value objects do domain validam briefings.
- **Gatilho**: antes de `graph.invoke()` e nos construtores/factories do domain.
- **Input/Output**: input bruto do chamador / `BaseGraphStateInput` validado ou exceção Zod.
- **Estados que lê/escreve**: nenhum persistente; produz o state inicial do grafo.
- **Depende de**: E1 (traceContext vem de `startTrace`).
- **Unidades**: BaseGraphState/validateBaseInput, CopywriterBriefing.create, Framework, OutputType.

### E3: Roteamento do grafo (LangGraph)
- **Propósito**: encadear os nodes do social-media-agent com edge condicional para validação de design.
- **Gatilho**: `runSocialMediaOrchestrator(graph, deps, input)`.
- **Input/Output**: `RunSocialMediaInput {tenantId, mode, briefing}` / `RunSocialMediaOutput {carrossel, designReport, publications, traceId}`.
- **Estados que lê/escreve**: `SocialMediaState` (chaves `briefing`, `carrossel`, `designReport`, `publications`, `error`).
- **Depende de**: E1, E2; delega para E4/E5/E7; T1 para spans.
- **Unidades**: createSocialMediaOrchestrator, runSocialMediaOrchestrator, runGenerateCarrosselNode, runDesignValidationNode, runPublishNode.

### E4: Geração de copy (LLM)
- **Propósito**: gerar slides+captions (social) ou landing/email_sequence/ad_set (copywriter) via 1 chamada Claude com system prompt composto, parse de bloco ```json e loops de re-roll.
- **Gatilho**: node `generate_carrossel` ou chamada direta a `GenerateCopywriterOutputUseCase.execute`.
- **Input/Output**: briefing + prompts / `CopyOutput` ou payload `Landing|EmailSequence|AdSet`.
- **Estados que lê/escreve**: lê `systemPromptByTom/ByFramework/ByOutputType`; escreve `carrossel`/`CopywriterOutput` (imutáveis).
- **Depende de**: E1 (prompts), T2 (ResilientLLMProvider), T1 (spans), E6 (voice check no loop externo).
- **Unidades**: GenerateCarrosselUseCase.execute/gerarCopy, GenerateCopywriterOutputUseCase.execute/callLLM/parseLLMJson/materializePayload, ClaudeAdapter.generate, OpenAIAdapter.

### E5: Geração e validação de imagens
- **Propósito**: gerar imagem por slide (Imagen 4 primário, Ideogram v2 para texto literal), com retry same-provider + fallback cross-provider + partial recovery.
- **Gatilho**: dentro de `GenerateCarrosselUseCase` (passo 3) ou `DesignCarrosselUseCase.execute` (node `design_validation` / client_direct).
- **Input/Output**: `SlideDesignSpec[]` / `Slide[]` com imageUrl+brandScore, `DesignCarrossel` com `BrandComplianceReport`.
- **Estados que lê/escreve**: lê `BrandGuide` (cores, fonte, tolerâncias); escreve slides e report; sinaliza `costExceeded`.
- **Depende de**: E1 (adapters), E6 (BrandValidator por tentativa), T1.
- **Unidades**: GenerateCarrosselUseCase.gerarImagens, DesignCarrosselUseCase.execute/decideImageProvider/generateAllSlides/generateOneSlideWithRetry/generateAndValidate, ImagenAdapter, IdeogramAdapter, Slide.precisaIdeogram.

### E6: Gates de qualidade (brand, voz, diversidade)
- **Propósito**: LLM-as-judge de brand compliance (vision), voz (score 0..1 com thresholds 0.6/0.75) e diversidade de ads (1−cosine médio).
- **Gatilho**: por slide gerado (brand); landing completa (voz); AdSet de 5 variações (diversidade).
- **Input/Output**: imagem base64 / texto / vetores → `{score, decision, issues}`.
- **Estados que lê/escreve**: lê `BrandGuide.tolerance` e `judgePromptByTom`; decisões alimentam retries de E4/E5.
- **Depende de**: E4/E5 (chamadores), T2/T1.
- **Unidades**: BrandValidatorAdapter.validate, ClaudeVoiceValidator.validate/decide, DiversityCheckUseCase, OpenAIEmbeddingsAdapter.embed, BrandGuide.decisaoBrandScore, Carrossel.outcomeAlcancado.

### E7: Publicação multi-rede e Terminação
- **Propósito**: publicar carrossel aprovado nas 4 redes (Zernio: LI/IG/FB; Twitter: thread) e encerrar o trace com métricas.
- **Gatilho**: node `publish_multi_network`; bloqueia se `outcomeAlcancado()` falso.
- **Input/Output**: `Carrossel` completo + redes / `PublishResult[]` (nunca lança por rede — status `failed` por item).
- **Estados que lê/escreve**: lê `carrossel.caption`/slides; escreve `publications` no state e `endTrace` no LangSmith.
- **Depende de**: E5/E6 (outcome), T1.
- **Unidades**: PublishMultiNetworkUseCase.execute/escolherPublisher, ZernioAdapter.publish, TwitterAdapter.publish, Caption.paraRede, RedeSocial.usaModoThread.

### T1: Observabilidade (transversal)
- **Propósito**: trace raiz por execução + spans aninhados por node/chamada, com custo BRL nos metadados.
- **Gatilho**: todo use case/node; suprimido quando `parentTrace` é fornecido (P3).
- **Estados que lê/escreve**: `activeRuns: Map<traceId, RunTree>` (LangSmithAdapter.ts:51).
- **Unidades**: LangSmithAdapter.startTrace/span/endTrace, port Observability.

### T2: Resiliência LLM (transversal)
- **Propósito**: retry exponencial (429/529/5xx), circuit breaker de 529s e fallback opcional em torno de qualquer LLMProvider.
- **Estados que lê/escreve**: `consecutive529s[]` e `breakerOpenedAt` (instance-level).
- **Unidades**: ResilientLLMProvider.executeWithResilience/computeBackoff/record529/isBreakerOpen.

### T3: Avaliação offline e Calibração (transversal)
- **Propósito**: rodar eval-suite por SKU (`npm run eval <sku>`) com target LLM + judge, agregação de métricas e relatório em `evals/{sku}/runs/`; scripts de calibração do BrandValidator.
- **Gatilho**: CLI/CI (workflows em `.github/workflows/`).
- **Estados que lê/escreve**: lê `prompts/{sku}/v*/system.md` e `evals/{sku}/cases/*.md`; escreve `evals/{sku}/runs/*.md` e `brand/calibration-set/runs/`.
- **Unidades**: runner.ts (main/buildLLM), PromptLoader, CaseLoader, EvalRunner, JudgeRunner, ReportWriter, scripts de calibração/benchmark.

## L3 — Unidades

### createSocialMediaDeps
- **Âncora**: `src/infrastructure/composition/CompositionRoot.ts:108`
- **Comportamento**: instancia LangSmith, Claude (+ResilientLLMProvider sem fallback), Imagen/Ideogram, BrandValidator, Zernio/Twitter e os 3 use cases; lança se env obrigatória faltar (`requireEnv`, :42).
- **Estados**: lê `process.env`; monta `systemPromptByTom`.

### createProductionSocialMediaPipeline
- **Âncora**: `src/infrastructure/composition/CompositionRoot.ts:172`
- **Comportamento**: deps + grafo compilado; expõe `run(input)` para produção/SHADOW.

### buildNovaisBrandGuide
- **Âncora**: `src/infrastructure/composition/CompositionRoot.ts:50`
- **Comportamento**: BrandGuide hardcoded single-tenant (cores, Inter, tolerância 99/96/96).

### loadSystemPrompts
- **Âncora**: `src/infrastructure/composition/CompositionRoot.ts:84`
- **Comportamento**: lê `prompts/social-media-agent/system-prompts/brand_voice_ceo.md` para o Map de toms; prompt ausente é silencioso (falha só na 1ª execução real).

### BrandGuideLoader
- **Âncora**: `src/infrastructure/brand/BrandGuideLoader.ts:45` (`fromYamlFile`), `:51` (`fromYamlString`)
- **Comportamento**: carrega `brand/novais-brand-guide.yaml` como BrandGuide (alternativa ao hardcoded).

### BaseGraphState / validateBaseInput
- **Âncora**: `src/orchestration/state/BaseGraphState.ts:26` (Annotation), `:46` (schema Zod), `:88` (`validateBaseInput`)
- **Comportamento**: impõe `tenantId`/`traceContext`/`mode` em todo grafo; `validateBaseInput` lança ZodError antes de `graph.invoke()` (C8 fail-fast).

### createSocialMediaOrchestrator
- **Âncora**: `src/orchestration/social-media/SocialMediaOrchestrator.ts:113`
- **Comportamento**: monta grafo START→generate_carrossel→(condicional `enableDesignValidation`)→design_validation→publish_multi_network→END e compila.

### runSocialMediaOrchestrator
- **Âncora**: `src/orchestration/social-media/SocialMediaOrchestrator.ts:260`
- **Comportamento**: startTrace → invoke → endTrace (com erro em catch); devolve carrossel/designReport/publications/traceId.
- **Casos excepcionais**: exceção do grafo fecha o trace com `error` e re-lança.

### Nodes do grafo
- **Âncora**: `src/orchestration/social-media/SocialMediaOrchestrator.ts:140` (`runGenerateCarrosselNode`), `:173` (`runDesignValidationNode`), `:216` (`runPublishNode`)
- **Comportamento**: cada node abre 1 span no trace do grafo e delega ao use case; design/publish gravam `error` no state se `carrossel` ausente.

### GenerateCarrosselUseCase.execute
- **Âncora**: `src/application/social-media-agent/GenerateCarrosselUseCase.ts:58`
- **Comportamento**: cria entidade Carrossel → copy LLM → imagens em paralelo → Caption → `comOutputs` → checa `outcomeAlcancado`; suprime trace próprio se `parentTrace` (P3).
- **Casos excepcionais**: cast `as never` em tom/redePrincipal (:79-80) — reconstrução por factory pendente.

### GenerateCarrosselUseCase.gerarCopy
- **Âncora**: `src/application/social-media-agent/GenerateCarrosselUseCase.ts:139`
- **Comportamento**: system prompt do tom + user prompt com schema JSON; extrai bloco ```json por regex (:183) e faz `JSON.parse` sem re-roll.
- **Casos excepcionais**: lança se tom não registrado no Map (:144).

### GenerateCarrosselUseCase.gerarImagens
- **Âncora**: `src/application/social-media-agent/GenerateCarrosselUseCase.ts:188`
- **Comportamento**: por slide, escolhe provider via `Slide.precisaIdeogram()`, gera imagem 1080x1080 e valida brand; sem `imageBase64` assume score 1.0 (validação skipped).

### GenerateCopywriterOutputUseCase.execute
- **Âncora**: `src/application/copywriter-agent/GenerateCopywriterOutputUseCase.ts:101`
- **Comportamento**: loop externo de voice re-roll (só landing, max 1) contendo loop interno de block re-roll (max 2) para falhas de schema/parse; monta CopywriterOutput imutável.
- **Casos excepcionais**: esgotou re-rolls → propaga último erro; status `failed` gravado antes do endTrace com erro (:236-243).

### GenerateCopywriterOutputUseCase.callLLM / materializePayload
- **Âncora**: `src/application/copywriter-agent/GenerateCopywriterOutputUseCase.ts:246` (callLLM), `:317` (materializePayload), `:311` (parseLLMJson)
- **Comportamento**: concatena prompts tom+framework+output com `---`; materializa branch `landing|email_sequence|ad_set` via factories do domain (que validam schema).

### ClaudeAdapter
- **Âncora**: `src/infrastructure/adapters/llm/ClaudeAdapter.ts:38` (generate), `:85` (generateWithVision), `:159` (calcCustoBrl)
- **Comportamento**: SDK Anthropic confinado aqui; model default `claude-sonnet-4-6`; cache_control ephemeral no system; custo BRL calculado com preços hardcoded (USD_TO_BRL=5.3).

### OpenAIAdapter
- **Âncora**: `src/infrastructure/adapters/llm/OpenAIAdapter.ts:58`
- **Comportamento**: LLMProvider alternativo (usado pelo eval runner quando model é `gpt-*`/`o*`).

### DesignCarrosselUseCase.execute
- **Âncora**: `src/application/designer-agent/DesignCarrosselUseCase.ts:72`
- **Comportamento**: valida specs×numSlides, gera todos os slides em chunks (`concurrencyLimit` default 7), monta `BrandComplianceReport` e `DesignCarrossel`; cost cap (T5.5) é sinal pós-voo (`cost_cap_exceeded` span, :131), não aborta.

### DesignCarrosselUseCase.decideImageProvider
- **Âncora**: `src/application/designer-agent/DesignCarrosselUseCase.ts:186`
- **Comportamento**: Ideogram se `requiresLiteralText`, overlay numérico (`/^\d+%?$/`) ou overlay ≥4 palavras; senão Imagen 4.

### DesignCarrosselUseCase.generateOneSlideWithRetry
- **Âncora**: `src/application/designer-agent/DesignCarrosselUseCase.ts:286`
- **Comportamento**: attempt 1 → retry same-provider → fallback cross-provider; abaixo do threshold final vira degraded (não lança).

### DesignCarrosselUseCase.generateAllSlides (partial recovery)
- **Âncora**: `src/application/designer-agent/DesignCarrosselUseCase.ts:201`
- **Comportamento**: `Promise.allSettled` por chunk; rejection vira stub (score 0, retryCount 2) + span `slide_generation_failed_{order}` para que o agregado fique `degraded` sem perder os demais.

### ImagenAdapter / IdeogramAdapter
- **Âncora**: `src/infrastructure/adapters/image-gen/ImagenAdapter.ts:38` (generate), `:74` (injetarBrandNoPrompt); `src/infrastructure/adapters/image-gen/IdeogramAdapter.ts:33` (generate)
- **Comportamento**: providers `imagen_4` e `ideogram_v2`; Imagen injeta cores/fonte da brand no prompt.

### Slide
- **Âncora**: `src/domain/carrossel/Slide.ts:58` (precisaIdeogram), `:64` (comImageUrl), `:80` (brandPassou)
- **Comportamento**: regra de roteamento de provider e imutabilidade do slide com score.

### BrandValidatorAdapter.validate
- **Âncora**: `src/infrastructure/adapters/brand/BrandValidatorAdapter.ts:33`
- **Comportamento**: LLM-as-judge com vision (`generateWithVision`) contra o BrandGuide; system prompt em `:88`.

### ClaudeVoiceValidator
- **Âncora**: `src/infrastructure/adapters/voice/ClaudeVoiceValidator.ts:37` (validate), `:89` (decide)
- **Comportamento**: juiz de voz por tom (judge prompt por Map); decisão: `reroll` < 0.6 ≤ `accept_with_warning` < 0.75 ≤ `accept`.
- **Casos excepcionais**: lança se judge prompt ausente ou score não-numérico.

### DiversityCheckUseCase
- **Âncora**: `src/application/copywriter-agent/DiversityCheckUseCase.ts:39` (execute), `:106` (cosineSimilarity), `:125` (computePairwiseCosine)
- **Comportamento**: 1 chamada de embeddings para os 5 primary_text; diversityScore = 1 − similaridade média dos 10 pares; exige exatamente 5 variações.

### OpenAIEmbeddingsAdapter.embed
- **Âncora**: `src/infrastructure/adapters/embeddings/OpenAIEmbeddingsAdapter.ts:48`
- **Comportamento**: embeddings batch via API OpenAI com custo/latência no output.

### Gates do domain
- **Âncora**: `src/domain/carrossel/BrandGuide.ts:60` (decisaoBrandScore), `src/domain/carrossel/Carrossel.ts:120` (outcomeAlcancado), `src/domain/designer/BrandComplianceReport.ts:48` (isDegraded)
- **Comportamento**: thresholds contratuais (brand ≥99% exact match; warning ≥96%) e outcome que libera publicação.

### PublishMultiNetworkUseCase.execute
- **Âncora**: `src/application/social-media-agent/PublishMultiNetworkUseCase.ts:29` (execute), `:90` (escolherPublisher)
- **Comportamento**: recusa publicar sem outcome/caption; por rede, escolhe Twitter (thread) ou Zernio e publica em paralelo; caption ausente para uma rede vira `failed` por item, sem exceção.

### ZernioAdapter.publish / TwitterAdapter.publish
- **Âncora**: `src/infrastructure/adapters/social-publishers/ZernioAdapter.ts:36`; `src/infrastructure/adapters/social-publishers/TwitterAdapter.ts:38`
- **Comportamento**: publicação LI/IG/FB (Zernio) e thread no Twitter; `supportsRede` em `ZernioAdapter.ts:32` / `TwitterAdapter.ts:34`.

### Caption / RedeSocial
- **Âncora**: `src/domain/carrossel/Caption.ts:27` (paraRede), `:36` (validar); `src/domain/carrossel/RedeSocial.ts:33` (usaModoThread)
- **Comportamento**: caption por rede (Twitter = string[]) e regra de roteamento thread.

### LangSmithAdapter
- **Âncora**: `src/infrastructure/adapters/observability/LangSmithAdapter.ts:68` (startTrace), `:108` (span), `:171` (endTrace)
- **Comportamento**: RunTree raiz por trace + createChild por span; custo BRL nos metadados; `activeRuns` Map interno (:51).

### ResilientLLMProvider
- **Âncora**: `src/infrastructure/adapters/llm/ResilientLLMProvider.ts:104` (executeWithResilience), `:170` (computeBackoff), `:177` (record529), `:194` (isBreakerOpen)
- **Comportamento**: retry com backoff+jitter em 429/529/5xx (max 3); breaker abre com 3×529 em 60s e roteia para fallback por 60s (half-open depois); sem fallback configurado, breaker aberto lança.

### Eval CLI (runner.ts)
- **Âncora**: `src/eval/runner.ts:82` (main), `:59` (buildLLM), `:36` (parseArgs)
- **Comportamento**: `npm run eval <sku> [--subset --dry-run --judge-model --target-model --threshold --timeout]`; escolhe Claude ou OpenAI pelo nome do model; exit 1 em fail/error.

### PromptLoader / CaseLoader
- **Âncora**: `src/eval/PromptLoader.ts:12` (load), `:38` (detectLatestVersion); `src/eval/CaseLoader.ts:23` (loadCases), `:73` (applySubset)
- **Comportamento**: autodetecta última versão em `prompts/{sku}/v*/system.md` (hash do prompt); carrega cases `.md` com frontmatter validado por Zod (`src/eval/types.ts:16`).

### EvalRunner
- **Âncora**: `src/eval/EvalRunner.ts:32` (run), `:54` (runOne), `:164` (aggregate), `:151` (withTimeout)
- **Comportamento**: chunks de `maxConcurrency` (default 5), timeout 120s por case, agrega pass-rate por categoria/source_mode/critical_path + latências P50/P95/P99.

### JudgeRunner
- **Âncora**: `src/eval/JudgeRunner.ts:39` (judge), `:53` (judgeExactMatch), `:79` (judgeSemanticMatch), `:117` (judgeLLMAsJudge)
- **Comportamento**: 3 critérios de pass (exact/semantic/LLM-as-judge) conforme `criterio_pass` do case.

### ReportWriter
- **Âncora**: `src/eval/ReportWriter.ts:22` (build), `:57` (persist)
- **Comportamento**: renderiza e grava `evals/{sku}/runs/{data}-eval-{hash}.md`.

### Scripts de calibração e benchmark
- **Âncora**: `scripts/run-brand-calibration.ts:1` (gate: concordância ≥90% e MAE ≤5pp), `scripts/generate-calibration-set.ts:1`, `scripts/seed-calibration-ratings.ts:1`, `scripts/benchmark-llm.ts:1`
- **Comportamento**: calibração humano×BrandValidator sobre `brand/calibration-set/` + CSV de ratings; benchmark de LLMs.

## Registro de estados compartilhados

| Estado | Onde vive | Escrito por | Lido por |
|---|---|---|---|
| `SocialMediaState` (briefing, carrossel, designReport, publications, error) | memória do grafo LangGraph | nodes (`SocialMediaOrchestrator.ts:140/173/216`) | nodes seguintes + `runSocialMediaOrchestrator:260` |
| `activeRuns: Map<traceId, RunTree>` | `LangSmithAdapter.ts:51` | `startTrace:68` | `span:108`, `endTrace:171` |
| Breaker (`consecutive529s`, `breakerOpenedAt`) | `ResilientLLMProvider.ts:64-65` | `record529:177`, `recordSuccess:189` | `isBreakerOpen:194` |
| `systemPromptByTom/ByFramework/ByOutputType` (Maps) | memória, montados no boot | `CompositionRoot.ts:84` (tom) | `gerarCopy:139`, `callLLM:246` |
| `brand/calibration-ratings.csv` + `brand/calibration-set/` | filesystem | `scripts/seed-calibration-ratings.ts` | `scripts/run-brand-calibration.ts` |
| `evals/{sku}/runs/*.md` | filesystem | `ReportWriter.persist:57` | humanos/CI |
| Postgres (Carrossel, Execution, Publication) | `prisma/schema.prisma` | ⚠️ ninguém (não ligado ao código) | ⚠️ ninguém |

## Mapa comportamento → código

- **Adicionar/alterar rede social suportada**: `src/domain/carrossel/RedeSocial.ts:4`, `Caption.ts:27`, `PublishMultiNetworkUseCase.ts:90`, adapters em `src/infrastructure/adapters/social-publishers/`
- **Mudar quando o pipeline usa Ideogram vs Imagen**: `src/domain/carrossel/Slide.ts:58`, `src/application/designer-agent/DesignCarrosselUseCase.ts:186`
- **Ajustar retry/fallback de imagem por slide**: `DesignCarrosselUseCase.ts:286` (política), `:201` (partial recovery)
- **Ajustar retry/circuit breaker de LLM**: `src/infrastructure/adapters/llm/ResilientLLMProvider.ts:104-214` (config em `:18`)
- **Mudar thresholds de brand (99/96)**: `CompositionRoot.ts:77` (produção hardcoded), `brand/novais-brand-guide.yaml` + `BrandGuideLoader.ts:45`, decisão em `BrandGuide.ts:60`
- **Mudar thresholds de voz (0.6/0.75)**: `src/infrastructure/adapters/voice/ClaudeVoiceValidator.ts:13-14,89`
- **Mudar loops de re-roll do copywriter (block=2, voice=1)**: `GenerateCopywriterOutputUseCase.ts:25-26,140-221`
- **Trocar/adicionar modelo LLM ou preço BRL**: `ClaudeAdapter.ts:12-35,159`, `OpenAIAdapter.ts:58`, seleção no eval em `src/eval/runner.ts:59`
- **Adicionar tom/framework/output-type novo**: arquivos em `prompts/*/system-prompts/`, registro em `CompositionRoot.ts:84`, value objects `Tom.ts:4`, `Framework.ts:4`, `OutputType.ts:4`, prompts compostos em `GenerateCopywriterOutputUseCase.ts:246`
- **Adicionar node/rota no grafo do social-media**: `SocialMediaOrchestrator.ts:113-136` (edges), state em `:58`
- **Adicionar eval case ou mudar critério de pass**: `evals/{sku}/cases/*.md`, schema `src/eval/types.ts:16`, `JudgeRunner.ts:39`
- **Investigar traces/custos no LangSmith**: `LangSmithAdapter.ts:68-171`, spans nomeados nos use cases (`copy_generation`, `image_gen_slide_*`, `brand_validation_*`, `publish_*`, `cost_cap_exceeded`)
- **Rodar/ajustar calibração do BrandValidator**: `scripts/run-brand-calibration.ts:1` (gates :31-32)

## Não coberto / Não resolvido

- **Prisma declarado, não ligado**: `prisma/schema.prisma` define Carrossel/Execution/Publication, mas nenhum arquivo em `src/` importa `@prisma/client` — persistência ainda não implementada.
- **Copywriter-agent sem wiring de produção**: `GenerateCopywriterOutputUseCase`, `DiversityCheckUseCase`, `ClaudeVoiceValidator` e `OpenAIEmbeddingsAdapter` não são instanciados no `CompositionRoot.ts` (só via testes/fakes).
- **`npm run test:e2e` (Playwright)**: sem `playwright.config` nem testes e2e no repo.
- **Fallback "Mistral" citado em comentário** (`ResilientLLMProvider.ts:5`): nenhum MistralAdapter existe; produção instancia `ResilientLLMProvider` sem fallback (`CompositionRoot.ts:119`).
- **Cast `as never`** em `GenerateCarrosselUseCase.ts:79-80` (tom/redePrincipal): factory de reconstrução pendente.
- **Fora dos estágios (dados/infra do foundry, não runtime)**: `brand_extraction/`, `AS_IS_TO_BE/`, `documentacao/`, `references/`, `templates/`, `hooks/` (shell hooks do Claude Code), `docs/foundry/`, `evals/*/cases/` (dados), `.claude/`.
