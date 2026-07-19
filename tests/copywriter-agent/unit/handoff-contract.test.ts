// Wave 3 RED — T4.4 Handoff Contract
// Testes FALHAM (RED) até Wave 4 implementar CopywriterOutput.toHandoffPayload().
// Contrato de serialização para Designer Agent e Webflow publisher.
//
// Por que falha: CopywriterOutput não tem método toHandoffPayload().
// Wave 4 deve implementar esse método e o tipo HandoffPayload.

import { describe, expect, it } from 'vitest';
import { AdSet } from '../../../src/domain/copywriter/AdSet.js';
import { CopywriterBriefing } from '../../../src/domain/copywriter/CopywriterBriefing.js';
import { CopywriterOutput } from '../../../src/domain/copywriter/CopywriterOutput.js';
import {
  EmailSequence,
  type Email
} from '../../../src/domain/copywriter/EmailSequence.js';
import { Framework } from '../../../src/domain/copywriter/Framework.js';
import { Landing, type LandingSection } from '../../../src/domain/copywriter/Landing.js';
import { OutputType } from '../../../src/domain/copywriter/OutputType.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeBriefing = (outputType = 'landing', framework = 'pas') =>
  CopywriterBriefing.create({
    tenantId: 'novais-digital',
    outputType: OutputType.create(outputType),
    framework: Framework.create(framework),
    tomSlug: 'brand_voice_ceo',
    product: 'Novais Digital Foundry',
    audience: 'Founders B2B SaaS',
    goal: 'Inscrição na waitlist',
    context: 'Lançamento de curso intensivo de 14 dias com 7 agentes IA para marketing.'
  });

const makeSections = (): LandingSection[] => [
  { kind: 'problem', body: 'Problema descrito.' },
  { kind: 'agitation', body: 'Custo de não resolver.' },
  { kind: 'solution', body: 'Solução proposta.' },
  { kind: 'social_proof', body: 'Cases.', bullets: ['A', 'B', 'C'] },
  { kind: 'objections', body: 'Objeções.', bullets: ['x', 'y'] },
  { kind: 'final_cta', body: 'Comece agora.' }
];

const makeLandingOutput = () =>
  CopywriterOutput.novo('cw_test_001', makeBriefing()).comPayload(
    Landing.create({
      schemaVersion: '1.0.0',
      hero: { headline: 'Headline', subheadline: 'Sub', cta: 'Quero' },
      sections: makeSections(),
      ctas: [],
      wordCount: 1750,
      isUpsell: false
    })
  );

const makeEmails = (n: number): Email[] =>
  Array.from({ length: n }, (_, i) => ({
    position: i + 1,
    subject: `S${i + 1}`,
    previewText: 'preview',
    body: 'corpo '.repeat(80),
    cta: 'Clique',
    sendOffsetHours: i === 0 ? 0 : 24,
    referencesPrevious: i > 0
  }));

const makeEmailOutput = () =>
  CopywriterOutput.novo('cw_test_002', makeBriefing('email_sequence', 'soap_opera')).comPayload(
    EmailSequence.create({
      schemaVersion: '1.0.0',
      emails: makeEmails(3),
      totalWordCount: 1500
    })
  );

const makeAdSetOutput = () =>
  CopywriterOutput.novo('cw_test_003', makeBriefing('ad_set', 'pas')).comPayload(
    AdSet.create({
      schemaVersion: '1.0.0',
      variations: [
        { angle: 'pain', headline: 'Feed vazio?', primaryText: 'Sem resultado.', description: 'Saiba' },
        { angle: 'aspiration', headline: 'Vire referência', primaryText: 'Pipeline em 14 dias.', description: 'Ver' },
        { angle: 'fomo', headline: 'Últimas vagas', primaryText: 'Fecha em 48h.', description: 'Reserve' },
        { angle: 'authority', headline: '300+ founders', primaryText: '50 cases.', description: 'Saber' },
        { angle: 'social_proof', headline: 'João dobrou', primaryText: 'Dobrei pipeline.', description: 'Cases' }
      ]
    })
  );

// ─── Testes RED (T4.4) ───────────────────────────────────────────────────────

describe('Wave 3 RED — T4.4 CopywriterOutput.toHandoffPayload()', () => {
  it('landing: handoff contém campos obrigatórios (output_id, output_type, schema_version, tenant_id, briefing_hash, created_at_iso, payload, price_brl, outcome_achieved)', () => {
    const output = makeLandingOutput();

    // RED: toHandoffPayload() não existe ainda — falha com TypeError
    const handoff = (output as unknown as { toHandoffPayload: () => unknown }).toHandoffPayload();

    expect(handoff).toBeDefined();
    expect((handoff as Record<string, unknown>).output_id).toBe(output.id);
    expect((handoff as Record<string, unknown>).output_type).toBe('landing');
    expect((handoff as Record<string, unknown>).schema_version).toBe('1.0.0');
    expect((handoff as Record<string, unknown>).tenant_id).toBe('novais-digital');
    expect((handoff as Record<string, unknown>).briefing_hash).toMatch(/^brf_[0-9a-f]+$/);
    expect((handoff as Record<string, unknown>).created_at_iso).toBeDefined();
    expect((handoff as Record<string, unknown>).price_brl).toBe(80.0);
    expect((handoff as Record<string, unknown>).outcome_achieved).toBe(true);
  });

  it('landing: payload no handoff contém hero, sections e ctas', () => {
    const output = makeLandingOutput();

    const handoff = (output as unknown as { toHandoffPayload: () => Record<string, unknown> }).toHandoffPayload();
    const payload = handoff.payload as Record<string, unknown>;

    expect(payload).toBeDefined();
    expect(payload.hero).toBeDefined();
    expect(Array.isArray(payload.sections)).toBe(true);
    expect((payload.sections as unknown[]).length).toBeGreaterThanOrEqual(6);
  });

  it('email_sequence: handoff output_type correto e payload contém emails', () => {
    const output = makeEmailOutput();

    const handoff = (output as unknown as { toHandoffPayload: () => Record<string, unknown> }).toHandoffPayload();

    expect((handoff as Record<string, unknown>).output_type).toBe('email_sequence');
    const payload = handoff.payload as Record<string, unknown>;
    expect(Array.isArray(payload.emails)).toBe(true);
  });

  it('ad_set: handoff output_type correto e payload contém variations', () => {
    const output = makeAdSetOutput();

    const handoff = (output as unknown as { toHandoffPayload: () => Record<string, unknown> }).toHandoffPayload();

    expect((handoff as Record<string, unknown>).output_type).toBe('ad_set');
    const payload = handoff.payload as Record<string, unknown>;
    expect(Array.isArray(payload.variations)).toBe(true);
    expect((payload.variations as unknown[]).length).toBe(5);
  });

  it('output em status pending não pode gerar handoff (lança erro)', () => {
    const output = CopywriterOutput.novo('cw_pending', makeBriefing());

    // output pending → handoff deve falhar
    expect(() =>
      (output as unknown as { toHandoffPayload: () => unknown }).toHandoffPayload()
    ).toThrow(/pending|não completado|status/i);
  });

  it('handoff é serializável para JSON (JSON.stringify sem erro)', () => {
    const output = makeLandingOutput();

    const handoff = (output as unknown as { toHandoffPayload: () => unknown }).toHandoffPayload();
    expect(() => JSON.stringify(handoff)).not.toThrow();
  });
});
