// Smoke test — Wave 1
// Valida que domain entities funcionam isoladamente (sem deps externas).
// É o ÚNICO teste de Wave 1; Wave 2 expande para use cases; Wave 3 é TDD red.

import { describe, expect, it } from 'vitest';
import { BrandGuide } from '../../../src/domain/carrossel/BrandGuide.js';
import { Caption } from '../../../src/domain/carrossel/Caption.js';
import { Carrossel } from '../../../src/domain/carrossel/Carrossel.js';
import { RedeSocial } from '../../../src/domain/carrossel/RedeSocial.js';
import { Slide } from '../../../src/domain/carrossel/Slide.js';
import { Tom } from '../../../src/domain/carrossel/Tom.js';

describe('Wave 1 — Domain smoke tests', () => {
  describe('Tom', () => {
    it('aceita brand_voice_ceo', () => {
      const tom = Tom.founderVoice();
      expect(tom.value).toBe('brand_voice_ceo');
    });

    it('rejeita tom inválido', () => {
      expect(() => Tom.create('shakespeare')).toThrow(/Tom inválido/);
    });
  });

  describe('RedeSocial', () => {
    it('Twitter usa modo thread (ADR-003-DS)', () => {
      const twitter = RedeSocial.create('twitter');
      expect(twitter.usaModoThread()).toBe(true);
      expect(twitter.limiteCaracteres()).toBe(280);
    });

    it('LinkedIn não usa thread', () => {
      const linkedin = RedeSocial.create('linkedin');
      expect(linkedin.usaModoThread()).toBe(false);
      expect(linkedin.limiteCaracteres()).toBe(3000);
    });

    it('todas() retorna as 4 redes suportadas', () => {
      expect(RedeSocial.todas()).toHaveLength(4);
    });
  });

  describe('Slide', () => {
    it('detecta necessidade de Ideogram para texto longo', () => {
      const slide = Slide.create({
        order: 1,
        role: 'hook',
        textOverlay: 'O fracasso é um evento e não uma pessoa',
        visualBrief: 'Background dark com gradient azul'
      });
      expect(slide.precisaIdeogram()).toBe(true);
    });

    it('Imagen 4 para texto curto ou sem texto', () => {
      const slide = Slide.create({
        order: 2,
        role: 'context',
        visualBrief: 'Pessoa em pé olhando para horizonte urbano'
      });
      expect(slide.precisaIdeogram()).toBe(false);
    });

    it('rejeita order fora de 1-7', () => {
      expect(() =>
        Slide.create({ order: 0, role: 'hook', visualBrief: 'x' })
      ).toThrow();
      expect(() =>
        Slide.create({ order: 8, role: 'cta', visualBrief: 'x' })
      ).toThrow();
    });
  });

  describe('Caption', () => {
    it('valida limites de caracteres por rede', () => {
      const cap = Caption.create({
        linkedin: 'Texto válido para LinkedIn',
        twitter: ['Primeiro tweet do thread', 'Segundo tweet do thread']
      });
      const validacao = cap.validar();
      expect(validacao.ok).toBe(true);
    });

    it('rejeita tweet acima de 280 chars', () => {
      const cap = Caption.create({
        twitter: ['x'.repeat(300), 'tweet ok']
      });
      const validacao = cap.validar();
      expect(validacao.ok).toBe(false);
      expect(validacao.erros[0]).toMatch(/Tweet 1 excede 280/);
    });

    it('rejeita Twitter sem thread (precisa ≥ 2 tweets)', () => {
      const cap = Caption.create({ twitter: ['só um tweet'] });
      const validacao = cap.validar();
      expect(validacao.ok).toBe(false);
    });
  });

  describe('BrandGuide', () => {
    it('decisão baseada em score (ADR-004-DS)', () => {
      const brand = new BrandGuide(
        '1.0.0',
        'Novais Digital',
        'tagline',
        {
          primary: {
            navy_deep: '#0A1628',
            royal_blue: '#2563EB',
            cyan_accent: '#5EEAD4',
            white: '#FFFFFF'
          },
          secondary: {
            off_white: '#F5F7FA',
            text_secondary: '#6B7280',
            card_bg_dark: '#0F1B2D'
          },
          status: { badge_red: '#DC2626', badge_green: '#10B981' }
        },
        {
          headings: { family: 'Inter', weights: [800] },
          body: { family: 'Inter', weights: [400] },
          logo: { family: 'Inter', weight: 700 }
        },
        {
          exact_match_required: 99,
          warning_threshold: 96,
          rejection_threshold: 96
        },
        {}
      );

      expect(brand.decisaoBrandScore(1.0)).toBe('accept');
      expect(brand.decisaoBrandScore(0.97)).toBe('accept_with_warning');
      expect(brand.decisaoBrandScore(0.95)).toBe('retry');
    });
  });

  describe('Carrossel (aggregate root)', () => {
    it('rejeita briefing curto demais', () => {
      expect(() =>
        Carrossel.novo({
          id: 'c1',
          tenantId: 'novais-digital',
          briefingText: 'curto',
          tom: Tom.founderVoice(),
          redePrincipal: RedeSocial.create('linkedin'),
          slidesDesejados: 5,
          isUpsell: false
        })
      ).toThrow(/Briefing muito curto/);
    });

    it('rejeita 6 slides sem upsell (ADR-001-DS)', () => {
      expect(() =>
        Carrossel.novo({
          id: 'c1',
          tenantId: 'novais-digital',
          briefingText:
            'Carrossel sobre IA generativa para indústria B2B com tom the CEO',
          tom: Tom.founderVoice(),
          redePrincipal: RedeSocial.create('linkedin'),
          slidesDesejados: 6,
          isUpsell: false
        })
      ).toThrow(/Padrão aceita 4-5/);
    });

    it('aceita 6 slides com upsell', () => {
      const c = Carrossel.novo({
        id: 'c1',
        tenantId: 'novais-digital',
        briefingText:
          'Carrossel sobre IA generativa para indústria B2B com tom the CEO',
        tom: Tom.founderVoice(),
        redePrincipal: RedeSocial.create('linkedin'),
        slidesDesejados: 6,
        isUpsell: true
      });
      expect(c.status).toBe('pending');
      expect(c.precoFinal()).toBe(16.0);
    });

    it('preço padrão R$ 12 (4-5 slides)', () => {
      const c = Carrossel.novo({
        id: 'c1',
        tenantId: 'novais-digital',
        briefingText:
          'Carrossel sobre IA generativa para indústria B2B com tom the CEO',
        tom: Tom.founderVoice(),
        redePrincipal: RedeSocial.create('linkedin'),
        slidesDesejados: 5,
        isUpsell: false
      });
      expect(c.precoFinal()).toBe(12.0);
    });
  });
});
