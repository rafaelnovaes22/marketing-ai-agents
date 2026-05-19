// Wave 3 RED — Caller-aware handoff contract
// Testes FALHAM (RED) até Wave 4 adicionar DesignCarrossel.toHandoffPayload().
//
// Por que falha: DesignCarrossel só tem toManifest() (output técnico).
// Falta um handoff payload específico para downstream consumers que diferencie
// billing por caller (composability ADR-004-DES + lifecycle composability section):
//   - caller='social-media-agent': billable_to='composer', amount embedded em carrossel completo
//   - caller='client_direct': billable_to='client_direct', amount=precoFinal() (R$ 15 ou R$ 20)
//   - caller='founder_direct': billable_to='internal', amount=0 (uso interno Acme)

import { describe, expect, it } from 'vitest';
import { Slide } from '../../../src/domain/carrossel/Slide.js';
import { DesignCarrossel } from '../../../src/domain/designer/DesignCarrossel.js';
import { DesignBriefing, type Caller } from '../../../src/domain/designer/DesignBriefing.js';
import {
  BrandComplianceReport,
  type SlideComplianceEntry
} from '../../../src/domain/designer/BrandComplianceReport.js';

const makeBriefing = (caller: Caller, numSlides = 5) =>
  DesignBriefing.create({
    tema: 'tema teste handoff contract designer agent',
    numSlides,
    dominantMode: 'dark',
    caller,
    tenantId: 'acme-internal'
  });

const makeSlide = (order: number, brandScore = 0.995) =>
  Slide.create({
    order,
    role: order === 1 ? 'hook' : order === 5 ? 'cta' : 'point',
    visualBrief: `Slide ${order} visual brief`
  }).comImageUrl(
    `https://fake-cdn.local/slide-${order}.png`,
    brandScore,
    'imagen_4'
  );

const makeReport = (numSlides: number): BrandComplianceReport => {
  const entries: SlideComplianceEntry[] = Array.from(
    { length: numSlides },
    (_, i) => ({
      slideOrder: i + 1,
      brandScore: 0.995,
      decision: 'accept',
      retryCount: 0,
      providerUsed: 'imagen_4',
      fallbackTriggered: false,
      issues: []
    })
  );
  return new BrandComplianceReport(entries, 0.99);
};

const makeCarrossel = (caller: Caller, numSlides = 5): DesignCarrossel => {
  const briefing = makeBriefing(caller, numSlides);
  const slides = Array.from({ length: numSlides }, (_, i) => makeSlide(i + 1));
  return DesignCarrossel.assemble({
    id: 'des_test_001',
    briefing,
    slides,
    report: makeReport(numSlides),
    totalLatencyMs: 12000,
    totalCostBrl: 1.5
  });
};

describe('Wave 3 RED — DesignCarrossel.toHandoffPayload() (composability)', () => {
  it('caller=client_direct → billable_to=client_direct + billing_amount=R$ 20 (standard 7 slides)', () => {
    const carrossel = makeCarrossel('client_direct', 7);

    // RED: toHandoffPayload() não existe ainda
    const handoff = (
      carrossel as unknown as { toHandoffPayload: () => Record<string, unknown> }
    ).toHandoffPayload();

    expect(handoff).toBeDefined();
    expect(handoff.carrossel_id).toBe('des_test_001');
    expect(handoff.billable_to).toBe('client_direct');
    expect(handoff.billing_amount_brl).toBe(20.0);
    expect(handoff.caller).toBe('client_direct');
  });

  it('caller=client_direct + 5 slides (economic) → billing_amount=R$ 15', () => {
    const carrossel = makeCarrossel('client_direct', 5);

    const handoff = (
      carrossel as unknown as { toHandoffPayload: () => Record<string, unknown> }
    ).toHandoffPayload();

    expect(handoff.billing_amount_brl).toBe(15.0);
    expect((handoff as { variant: string }).variant).toBe('economic');
  });

  it('caller=social-media-agent → billable_to=composer + billing_amount=0 (cobrado no nível do composer)', () => {
    const carrossel = makeCarrossel('social-media-agent', 7);

    const handoff = (
      carrossel as unknown as { toHandoffPayload: () => Record<string, unknown> }
    ).toHandoffPayload();

    expect(handoff.billable_to).toBe('composer');
    // Quando chamado por composer, design não cobra separadamente
    expect(handoff.billing_amount_brl).toBe(0);
    expect(handoff.caller).toBe('social-media-agent');
  });

  it('caller=founder_direct → billable_to=internal + billing_amount=0', () => {
    const carrossel = makeCarrossel('founder_direct', 7);

    const handoff = (
      carrossel as unknown as { toHandoffPayload: () => Record<string, unknown> }
    ).toHandoffPayload();

    expect(handoff.billable_to).toBe('internal');
    expect(handoff.billing_amount_brl).toBe(0);
  });

  it('handoff inclui manifest técnico embarcado (reuso de toManifest)', () => {
    const carrossel = makeCarrossel('client_direct', 7);

    const handoff = (
      carrossel as unknown as { toHandoffPayload: () => Record<string, unknown> }
    ).toHandoffPayload();

    expect(handoff.manifest).toBeDefined();
    const manifest = handoff.manifest as { slides: unknown[]; status: string };
    expect(Array.isArray(manifest.slides)).toBe(true);
    expect(manifest.slides.length).toBe(7);
    expect(manifest.status).toBe('completed');
  });

  it('handoff é JSON-safe (JSON.stringify sem erro)', () => {
    const carrossel = makeCarrossel('client_direct', 7);

    const handoff = (
      carrossel as unknown as { toHandoffPayload: () => unknown }
    ).toHandoffPayload();

    expect(() => JSON.stringify(handoff)).not.toThrow();
  });

  it('handoff inclui created_at_iso para downstream tracking', () => {
    const carrossel = makeCarrossel('client_direct', 7);

    const handoff = (
      carrossel as unknown as { toHandoffPayload: () => Record<string, unknown> }
    ).toHandoffPayload();

    expect(handoff.created_at_iso).toBeDefined();
    expect(typeof handoff.created_at_iso).toBe('string');
    expect(handoff.created_at_iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
