// Use Case: orquestra geração de output do copywriter-agent.
// Entrada: CopywriterBriefing (já validada no domain). Saída: CopywriterOutput.
// Reuse total dos ports existentes (LLMProvider + Observability).

import { AdSet, type AdAngle, type AdVariation } from '../../domain/copywriter/AdSet.js';
import {
  CopywriterBriefing,
  type CopywriterBriefingInput
} from '../../domain/copywriter/CopywriterBriefing.js';
import { CopywriterOutput } from '../../domain/copywriter/CopywriterOutput.js';
import { EmailSequence, type Email } from '../../domain/copywriter/EmailSequence.js';
import { Framework } from '../../domain/copywriter/Framework.js';
import {
  Landing,
  type LandingHero,
  type LandingSection
} from '../../domain/copywriter/Landing.js';
import { OutputType } from '../../domain/copywriter/OutputType.js';
import type { ClientMemory } from '../../domain/ports/ClientMemory.js';
import type { LLMProvider } from '../../domain/ports/LLMProvider.js';
import type { Observability } from '../../domain/ports/Observability.js';
import type { TraceContext } from '../../domain/ports/Observability.js';
import type { VoiceValidator } from '../../domain/ports/VoiceValidator.js';

const SCHEMA_VERSION = '1.0.0';

const MAX_RE_ROLLS = 2; // T2.7 — máximo de re-rolls de bloco após attempt original
const MAX_VOICE_RE_ROLLS = 1; // T4.3 — após 1 re-roll de voz, esgota (total 2 tentativas)

export interface GenerateCopywriterInput {
  tenantId: string;
  outputType: string;
  framework: string;
  tomSlug: string;
  product: string;
  audience: string;
  goal: string;
  context: string;
  isUpsell: boolean;
  mode: 'shadow' | 'assisted' | 'autonomous';
}

export interface GenerateCopywriterDeps {
  llm: LLMProvider;
  observability: Observability;
  /**
   * Map (tomSlug → markdown). Reuso de prompts/social-media-agent/system-prompts/{tom}.md
   * para tom; injetado pelo composer para evitar I/O em application/.
   */
  systemPromptByTom: Map<string, string>;
  /**
   * Map (frameworkSlug → markdown). prompts/copywriter-agent/system-prompts/framework-{slug}.md
   */
  systemPromptByFramework: Map<string, string>;
  /**
   * Map (outputTypeSlug → markdown). prompts/copywriter-agent/system-prompts/output-{slug}.md
   */
  systemPromptByOutputType: Map<string, string>;
  /**
   * T4.3 — Voice validator opcional. Quando presente, é invocado APENAS para
   * outputs do tipo `landing` (Tipo A). Se decisão = `reroll`, o use case
   * tenta uma nova geração (max MAX_VOICE_RE_ROLLS).
   */
  voiceValidator?: VoiceValidator;
  /**
   * ADR-007-PROJ — Self-harness runtime. Quando presente, carrega a memória
   * aprendida do cliente (`docs/clients/{tenantId}/`) e injeta no system prompt.
   * Opcional: ausente ⇒ comportamento idêntico ao anterior (zero impacto).
   */
  clientMemory?: ClientMemory;
}

/**
 * Estrutura intermediária do JSON devolvido pelo Claude.
 * Cada tipo (landing | email_sequence | ad_set) preenche apenas o branch correto.
 */
interface LLMCopyResult {
  landing?: {
    hero: LandingHero;
    sections: LandingSection[];
    ctas: string[];
    word_count: number;
  };
  email_sequence?: {
    emails: Array<{
      position: number;
      subject: string;
      preview_text: string;
      body: string;
      cta: string;
      send_offset_hours: number;
      references_previous: boolean;
    }>;
    total_word_count: number;
  };
  ad_set?: {
    variations: Array<{
      angle: AdAngle;
      headline: string;
      primary_text: string;
      description: string;
    }>;
  };
}

export class GenerateCopywriterOutputUseCase {
  constructor(private readonly deps: GenerateCopywriterDeps) {}

  async execute(input: GenerateCopywriterInput): Promise<CopywriterOutput> {
    // 1. Reconstroi value objects do domain.
    const briefingInput: CopywriterBriefingInput = {
      tenantId: input.tenantId,
      outputType: OutputType.create(input.outputType),
      framework: Framework.create(input.framework),
      tomSlug: input.tomSlug,
      product: input.product,
      audience: input.audience,
      goal: input.goal,
      context: input.context,
      isUpsell: input.isUpsell
    };
    const briefing = CopywriterBriefing.create(briefingInput);
    const output = CopywriterOutput.novo(this.generateId(), briefing);

    const traceContext = this.deps.observability.startTrace({
      tenantId: input.tenantId,
      sku: 'copywriter-agent',
      mode: input.mode,
      metadata: {
        output_type: briefing.outputType.value,
        framework: briefing.framework.value,
        tom: briefing.tomSlug,
        is_upsell: briefing.isUpsell,
        briefing_hash: briefing.briefingHash()
      }
    });

    try {
      // ADR-007-PROJ — carrega memória do cliente UMA vez (antes dos re-rolls)
      // e injeta no system prompt de todas as gerações desta execução.
      const clientMemoryFragment = await this.loadClientMemoryFragment(
        input.tenantId,
        traceContext
      );

      // T2.7 + T4.3 — Loop externo: voice re-roll (apenas para landing).
      // Loop interno: block re-roll (schema/parse failures).
      let payload: Landing | EmailSequence | AdSet | undefined;
      let lastError: Error | undefined;
      let voiceAccepted = false;
      const needsVoiceCheck =
        briefing.outputType.value === 'landing' &&
        this.deps.voiceValidator !== undefined;

      for (
        let voiceAttempt = 0;
        voiceAttempt <= MAX_VOICE_RE_ROLLS;
        voiceAttempt++
      ) {
        // ─── Block re-roll loop (T2.7) ────────────────────────────────
        let attemptPayload: Landing | EmailSequence | AdSet | undefined;
        for (let attempt = 0; attempt <= MAX_RE_ROLLS; attempt++) {
          const spanName =
            attempt === 0 ? 'copy_generation' : 'copy_generation_re_roll_block';
          try {
            const llmResult = await this.deps.observability.span(
              traceContext,
              {
                name: spanName,
                input: {
                  output_type: briefing.outputType.value,
                  framework: briefing.framework.value,
                  attempt,
                  voice_attempt: voiceAttempt
                },
                startTime: new Date()
              },
              async () => this.callLLM(briefing, clientMemoryFragment)
            );

            attemptPayload = this.materializePayload(
              briefing.outputType,
              llmResult
            );
            break; // sucesso interno
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
          }
        }

        if (!attemptPayload) {
          // Block re-roll esgotado — propaga o último erro de schema/parse.
          throw lastError ?? new Error('Falha em gerar copy após re-rolls');
        }

        payload = attemptPayload;

        // ─── Voice check (T4.3) — apenas para landing ──────────────────
        if (!needsVoiceCheck || !this.deps.voiceValidator) {
          voiceAccepted = true;
          break;
        }

        const voiceText = this.buildVoiceTextFromLanding(payload as Landing);
        const voice = this.deps.voiceValidator;
        const voiceResult = await this.deps.observability.span(
          traceContext,
          {
            name: 'voice_validation',
            input: {
              unit_kind: 'full_landing',
              tom: briefing.tomSlug,
              voice_attempt: voiceAttempt
            },
            startTime: new Date()
          },
          async () =>
            voice.validate({
              tomSlug: briefing.tomSlug,
              unitKind: 'full_landing',
              text: voiceText
            })
        );

        if (voiceResult.decision !== 'reroll') {
          voiceAccepted = true;
          break;
        }

        lastError = new Error(
          `Voz fora do tom (score=${voiceResult.score.toFixed(
            2
          )}) após attempt ${voiceAttempt + 1}`
        );
        // Loop externo continua → nova geração com correção implícita.
      }

      if (!voiceAccepted || !payload) {
        throw lastError ?? new Error('Voice validation falhou após re-rolls');
      }

      const completed = output.comPayload(payload);

      await this.deps.observability.endTrace(traceContext, {
        outcome_achieved: completed.outcomeAlcancado(),
        output_id: completed.id
      });

      return completed;
    } catch (err) {
      const failed = output.comStatus('failed');
      await this.deps.observability.endTrace(
        traceContext,
        { output_id: failed.id },
        err instanceof Error ? err : new Error(String(err))
      );
      throw err;
    }
  }

  /**
   * ADR-007-PROJ — Carrega memória do cliente e devolve o fragment a injetar.
   * Instrumentado (C6): span `client_memory_load` registra quantos fatos foram
   * injetados e se há soul. Degrada para '' quando não há adapter ou diretório.
   */
  private async loadClientMemoryFragment(
    tenantId: string,
    traceContext: TraceContext
  ): Promise<string> {
    const clientMemory = this.deps.clientMemory;
    if (!clientMemory) return '';

    const metadata: Record<string, unknown> = {};
    return this.deps.observability.span(
      traceContext,
      {
        name: 'client_memory_load',
        input: { tenant_id: tenantId },
        metadata,
        startTime: new Date()
      },
      async () => {
        const snapshot = await clientMemory.load(tenantId);
        const fragment = snapshot.promptFragment;
        metadata.client_facts_injected = (fragment.match(/^- \[/gm) ?? []).length;
        metadata.client_soul_present = snapshot.soul !== null;
        return fragment;
      }
    );
  }

  private async callLLM(
    briefing: CopywriterBriefing,
    clientMemoryFragment = ''
  ): Promise<LLMCopyResult> {
    const tomPrompt = this.deps.systemPromptByTom.get(briefing.tomSlug);
    if (!tomPrompt) {
      throw new Error(`System prompt de tom não encontrado: ${briefing.tomSlug}`);
    }
    const frameworkPrompt = this.deps.systemPromptByFramework.get(
      briefing.framework.promptSlug()
    );
    if (!frameworkPrompt) {
      throw new Error(
        `System prompt de framework não encontrado: ${briefing.framework.value}`
      );
    }
    const outputPrompt = this.deps.systemPromptByOutputType.get(
      briefing.outputType.promptSlug()
    );
    if (!outputPrompt) {
      throw new Error(
        `System prompt de output não encontrado: ${briefing.outputType.value}`
      );
    }

    // Memória do cliente entra por ÚLTIMO: mantém tom/framework/output (estáticos)
    // como prefixo estável e cacheável; só o sufixo varia por cliente (ADR-007-PROJ).
    const systemPrompt = [tomPrompt, frameworkPrompt, outputPrompt, clientMemoryFragment]
      .filter((block) => block && block.trim().length > 0)
      .join('\n\n---\n\n');
    const userPrompt = this.buildUserPrompt(briefing);

    const response = await this.deps.llm.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      maxTokens: 4096,
      temperature: 0.7,
      cacheControl: true,
      metadata: {
        sku: 'copywriter-agent',
        output_type: briefing.outputType.value,
        framework: briefing.framework.value
      }
    });

    return this.parseLLMJson(response.text);
  }

  private buildUserPrompt(briefing: CopywriterBriefing): string {
    return [
      '# Briefing',
      '',
      `- Produto: ${briefing.product}`,
      `- Público: ${briefing.audience}`,
      `- Objetivo: ${briefing.goal}`,
      `- Contexto: ${briefing.context}`,
      `- Output type: ${briefing.outputType.value}`,
      `- Framework: ${briefing.framework.value}`,
      `- Tom: ${briefing.tomSlug}`,
      `- Upsell: ${briefing.isUpsell ? 'sim (volume estendido)' : 'não'}`,
      '',
      '# Output esperado',
      '',
      'Retorne UM bloco JSON dentro de ```json ... ```',
      `cobrindo a chave "${briefing.outputType.value}" no schema canônico v${SCHEMA_VERSION}.`
    ].join('\n');
  }

  private parseLLMJson(raw: string): LLMCopyResult {
    const match = raw.match(/```json\n([\s\S]*?)\n```/);
    const json = match ? match[1] : raw;
    return JSON.parse(json) as LLMCopyResult;
  }

  private materializePayload(
    outputType: OutputType,
    result: LLMCopyResult
  ): Landing | EmailSequence | AdSet {
    if (outputType.value === 'landing') {
      if (!result.landing) {
        throw new Error('LLM não retornou payload landing');
      }
      return Landing.create({
        schemaVersion: SCHEMA_VERSION,
        hero: result.landing.hero,
        sections: result.landing.sections,
        ctas: result.landing.ctas,
        wordCount: result.landing.word_count,
        isUpsell: false
      });
    }
    if (outputType.value === 'email_sequence') {
      if (!result.email_sequence) {
        throw new Error('LLM não retornou payload email_sequence');
      }
      const emails: Email[] = result.email_sequence.emails.map((e) => ({
        position: e.position,
        subject: e.subject,
        previewText: e.preview_text,
        body: e.body,
        cta: e.cta,
        sendOffsetHours: e.send_offset_hours,
        referencesPrevious: e.references_previous
      }));
      return EmailSequence.create({
        schemaVersion: SCHEMA_VERSION,
        emails,
        totalWordCount: result.email_sequence.total_word_count
      });
    }
    if (outputType.value === 'ad_set') {
      if (!result.ad_set) {
        throw new Error('LLM não retornou payload ad_set');
      }
      const variations: AdVariation[] = result.ad_set.variations.map((v) => ({
        angle: v.angle,
        headline: v.headline,
        primaryText: v.primary_text,
        description: v.description
      }));
      return AdSet.create({ schemaVersion: SCHEMA_VERSION, variations });
    }
    throw new Error(`OutputType não suportado: ${outputType.value}`);
  }

  private generateId(): string {
    return `cw_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Concatena conteúdo textual da landing para entrada do VoiceValidator (T4.3).
   * Hero (3 campos) + cada section.body + ctas — texto plano único.
   */
  private buildVoiceTextFromLanding(landing: Landing): string {
    const parts: string[] = [
      landing.hero.headline,
      landing.hero.subheadline,
      landing.hero.cta,
      ...landing.sections.map((s) => s.body),
      ...landing.ctas
    ];
    return parts.filter((p) => p && p.length > 0).join('\n\n');
  }
}
