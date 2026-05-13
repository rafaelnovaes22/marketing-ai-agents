// Smoke tests — Wave 1 designer-agent
// Cobre entities puras + lógica de decisão de provider + política de retry threshold.

import { describe, expect, it } from 'vitest';
import { DesignBriefing } from '../../../src/domain/designer/DesignBriefing.js';
import { DesignCarrossel } from '../../../src/domain/designer/DesignCarrossel.js';
import { BrandComplianceReport } from '../../../src/domain/designer/BrandComplianceReport.js';
import { Slide } from '../../../src/domain/carrossel/Slide.js';

describe('Wave 1 — Designer Agent domain smoke', () => {
  describe('DesignBriefing', () => {
    it('aceita briefing standard de 7 slides', () => {
      const b = DesignBriefing.create({
        tema: 'governança de IA B2B',
        numSlides: 7,
        dominantMode: 'dark',
        caller: 'social-media-agent',
        tenantId: 'acme-internal'
      });
      expect(b.variant).toBe('standard');
      expect(b.precoFinal()).toBe(20.0);
      expect(b.slaSeconds()).toBe(1200);
      expect(b.brandStrictness).toBe(0.99);
    });

    it('infere variant=economic para 5 slides', () => {
      const b = DesignBriefing.create({
        tema: 'lançamento produto SaaS',
        numSlides: 5,
        dominantMode: 'light',
        caller: 'client_direct',
        tenantId: 't1'
      });
      expect(b.variant).toBe('economic');
      expect(b.precoFinal()).toBe(15.0);
    });

    it('rejeita briefing com tema curto demais', () => {
      expect(() =>
        DesignBriefing.create({
          tema: 'curto',
          numSlides: 7,
          dominantMode: 'dark',
          caller: 'client_direct',
          tenantId: 't1'
        })
      ).toThrow(/Briefing inválido/);
    });

    it('rejeita numSlides fora de 5-7 (v0.1.0)', () => {
      expect(() =>
        DesignBriefing.create({
          tema: 'briefing válido com texto suficiente',
          numSlides: 10,
          dominantMode: 'dark',
          caller: 'client_direct',
          tenantId: 't1'
        })
      ).toThrow(/numSlides inválido/);
    });

    it('rejeita tenantId vazio (C8)', () => {
      expect(() =>
        DesignBriefing.create({
          tema: 'briefing válido com texto suficiente',
          numSlides: 5,
          dominantMode: 'dark',
          caller: 'client_direct',
          tenantId: ''
        })
      ).toThrow(/tenantId obrigatório/);
    });

    it('rejeita brandStrictness fora de [0.9, 1.0]', () => {
      expect(() =>
        DesignBriefing.create({
          tema: 'briefing válido com texto suficiente',
          numSlides: 7,
          dominantMode: 'dark',
          caller: 'client_direct',
          tenantId: 't1',
          brandStrictness: 0.5
        })
      ).toThrow(/brandStrictness/);
    });
  });

  describe('BrandComplianceReport', () => {
    const baseEntry = (order: number, score: number, retry = 0) => ({
      slideOrder: order,
      brandScore: score,
      decision: (score >= 0.99
        ? 'accept'
        : score >= 0.96
          ? 'accept_with_warning'
          : 'retry') as 'accept' | 'accept_with_warning' | 'retry',
      retryCount: retry,
      providerUsed: 'imagen_4' as const,
      fallbackTriggered: false,
      issues: []
    });

    it('gate individual: todos ≥99 → todosPassaram=true', () => {
      const report = new BrandComplianceReport(
        [baseEntry(1, 0.991), baseEntry(2, 0.997), baseEntry(3, 0.99)],
        0.99
      );
      expect(report.todosPassaram()).toBe(true);
      expect(report.isDegraded()).toBe(false);
    });

    it('gate individual: 1 abaixo → todosPassaram=false (NÃO usa média)', () => {
      const report = new BrandComplianceReport(
        [baseEntry(1, 1.0), baseEntry(2, 1.0), baseEntry(3, 0.98)],
        0.99
      );
      // Média seria 0.993 (passaria); gate hard reprova
      expect(report.todosPassaram()).toBe(false);
      expect(report.scoreMedio()).toBeGreaterThan(0.99);
    });

    it('isDegraded=true quando slide falhou após ≥1 retry', () => {
      const report = new BrandComplianceReport(
        [baseEntry(1, 0.97, 1), baseEntry(2, 0.99)],
        0.99
      );
      expect(report.isDegraded()).toBe(true);
    });

    it('providerSplit conta corretamente Imagen vs Ideogram', () => {
      const report = new BrandComplianceReport(
        [
          { ...baseEntry(1, 0.99), providerUsed: 'imagen_4' as const },
          { ...baseEntry(2, 0.99), providerUsed: 'ideogram_v2' as const },
          { ...baseEntry(3, 0.99), providerUsed: 'imagen_4' as const }
        ],
        0.99
      );
      const split = report.providerSplit();
      expect(split.imagen).toBe(2);
      expect(split.ideogram).toBe(1);
    });
  });

  describe('DesignCarrossel aggregate', () => {
    const mkSlide = (order: number, score: number) =>
      Slide.create({
        order,
        role: order === 1 ? 'hook' : order === 5 ? 'cta' : 'point',
        visualBrief: `slide ${order}`,
        textOverlay: 'overlay'
      }).comImageUrl(
        `https://fake.local/${order}.png`,
        score,
        'imagen_4'
      );

    const briefingReal = DesignBriefing.create({
      tema: 'briefing válido com texto suficiente',
      numSlides: 5,
      dominantMode: 'dark',
      caller: 'client_direct',
      tenantId: 'acme-internal'
    });

    it('outcomeAlcancado=true quando todos slides passam e SLA ok', () => {
      const slides = [1, 2, 3, 4, 5].map((o) => mkSlide(o, 0.995));
      const report = new BrandComplianceReport(
        slides.map((s) => ({
          slideOrder: s.order,
          brandScore: s.brandScore!,
          decision: 'accept' as const,
          retryCount: 0,
          providerUsed: 'imagen_4' as const,
          fallbackTriggered: false,
          issues: []
        })),
        0.99
      );
      const c = DesignCarrossel.assemble({
        id: 'des_1',
        briefing: briefingReal,
        slides,
        report,
        totalLatencyMs: 600_000, // 10 min — ok
        totalCostBrl: 1.5
      });
      expect(c.outcomeAlcancado()).toBe(true);
      expect(c.status).toBe('completed');
    });

    it('status=failed quando algum slide abaixo do gate sem retries', () => {
      const slides = [
        mkSlide(1, 0.995),
        mkSlide(2, 0.95),
        mkSlide(3, 0.995),
        mkSlide(4, 0.99),
        mkSlide(5, 0.992)
      ];
      const report = new BrandComplianceReport(
        slides.map((s) => ({
          slideOrder: s.order,
          brandScore: s.brandScore!,
          decision:
            s.brandScore! >= 0.99
              ? ('accept' as const)
              : ('retry' as const),
          retryCount: 0,
          providerUsed: 'imagen_4' as const,
          fallbackTriggered: false,
          issues: []
        })),
        0.99
      );
      const c = DesignCarrossel.assemble({
        id: 'des_2',
        briefing: briefingReal,
        slides,
        report,
        totalLatencyMs: 500_000,
        totalCostBrl: 1.5
      });
      expect(c.status).toBe('failed');
      expect(c.outcomeAlcancado()).toBe(false);
    });

    it('sla_violated=true quando latência > 20min', () => {
      const slides = [1, 2, 3, 4, 5].map((o) => mkSlide(o, 0.995));
      const report = new BrandComplianceReport(
        slides.map((s) => ({
          slideOrder: s.order,
          brandScore: s.brandScore!,
          decision: 'accept' as const,
          retryCount: 0,
          providerUsed: 'imagen_4' as const,
          fallbackTriggered: false,
          issues: []
        })),
        0.99
      );
      const c = DesignCarrossel.assemble({
        id: 'des_3',
        briefing: briefingReal,
        slides,
        report,
        totalLatencyMs: 1_300_000, // 21:40 min — viola
        totalCostBrl: 2.0
      });
      expect(c.slaViolated()).toBe(true);
      expect(c.outcomeAlcancado()).toBe(false);
    });

    it('rejeita mismatch entre numSlides e slides.length', () => {
      const slides = [mkSlide(1, 0.99), mkSlide(2, 0.99)];
      const report = new BrandComplianceReport(
        [
          {
            slideOrder: 1,
            brandScore: 0.99,
            decision: 'accept' as const,
            retryCount: 0,
            providerUsed: 'imagen_4' as const,
            fallbackTriggered: false,
            issues: []
          },
          {
            slideOrder: 2,
            brandScore: 0.99,
            decision: 'accept' as const,
            retryCount: 0,
            providerUsed: 'imagen_4' as const,
            fallbackTriggered: false,
            issues: []
          }
        ],
        0.99
      );
      expect(() =>
        DesignCarrossel.assemble({
          id: 'des_4',
          briefing: briefingReal, // espera 5 slides
          slides,
          report,
          totalLatencyMs: 1000,
          totalCostBrl: 0.5
        })
      ).toThrow(/Quantidade de slides/);
    });

    it('toManifest() retorna estrutura serializável', () => {
      const slides = [1, 2, 3, 4, 5].map((o) => mkSlide(o, 0.995));
      const report = new BrandComplianceReport(
        slides.map((s) => ({
          slideOrder: s.order,
          brandScore: s.brandScore!,
          decision: 'accept' as const,
          retryCount: 0,
          providerUsed: 'imagen_4' as const,
          fallbackTriggered: false,
          issues: []
        })),
        0.99
      );
      const c = DesignCarrossel.assemble({
        id: 'des_5',
        briefing: briefingReal,
        slides,
        report,
        totalLatencyMs: 800_000,
        totalCostBrl: 2.02
      });
      const manifest = c.toManifest();
      expect(manifest.id).toBe('des_5');
      expect(manifest.slides).toHaveLength(5);
      expect(manifest.brand_score_avg).toBeGreaterThan(0.99);
      expect(manifest.sla_violated).toBe(false);
      expect(manifest.provider_split.imagen).toBe(5);
    });
  });
});
