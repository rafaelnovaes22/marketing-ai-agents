// Smoke test — Wave 1 (copywriter-agent)
// Valida domain entities isoladamente (sem deps externas, sem mock de LLM).
// Cobertura alvo: ≥85% domain (Tier B).

import { describe, expect, it } from 'vitest';
import { AdSet, type AdVariation } from '../../../src/domain/copywriter/AdSet.js';
import { CopywriterBriefing } from '../../../src/domain/copywriter/CopywriterBriefing.js';
import { CopywriterOutput } from '../../../src/domain/copywriter/CopywriterOutput.js';
import {
  EmailSequence,
  type Email
} from '../../../src/domain/copywriter/EmailSequence.js';
import { Framework } from '../../../src/domain/copywriter/Framework.js';
import { Landing, type LandingSection } from '../../../src/domain/copywriter/Landing.js';
import { OutputType } from '../../../src/domain/copywriter/OutputType.js';

const seedSections = (): LandingSection[] => [
  { kind: 'problem', body: 'Problema descrito.' },
  { kind: 'agitation', body: 'Custo de não resolver.' },
  { kind: 'solution', body: 'Solução proposta.' },
  {
    kind: 'social_proof',
    body: 'Cases.',
    bullets: ['Cliente A', 'Cliente B', 'Cliente C']
  },
  {
    kind: 'objections',
    body: 'Resposta às objeções.',
    bullets: ['Caro? Veja ROI.', 'Tempo? 8 min.']
  },
  { kind: 'final_cta', body: 'Comece agora.' }
];

const seedHero = () => ({
  headline: 'Headline contundente',
  subheadline: 'Subheadline que estende',
  cta: 'Quero começar'
});

const seedBriefing = (overrides: Partial<{
  outputType: string;
  framework: string;
  isUpsell: boolean;
  context: string;
}> = {}): CopywriterBriefing =>
  CopywriterBriefing.create({
    tenantId: 'novais-digital',
    outputType: OutputType.create(overrides.outputType ?? 'landing'),
    framework: Framework.create(overrides.framework ?? 'pas'),
    tomSlug: 'brand_voice_ceo',
    product: 'Novais Digital Foundry',
    audience: 'Founders B2B',
    goal: 'Inscrição na waitlist',
    context:
      overrides.context ??
      'Lançamento de curso intensivo de 14 dias com 7 agentes IA para marketing.',
    isUpsell: overrides.isUpsell ?? false
  });

describe('Wave 1 — copywriter-agent domain smoke', () => {
  describe('OutputType', () => {
    it('aceita os 3 valores canônicos', () => {
      expect(OutputType.landing().value).toBe('landing');
      expect(OutputType.emailSequence().value).toBe('email_sequence');
      expect(OutputType.adSet().value).toBe('ad_set');
    });

    it('rejeita valor inválido', () => {
      expect(() => OutputType.create('blogpost')).toThrow(/OutputType inválido/);
    });

    it('SLA contratual = 900s (spec.md)', () => {
      expect(OutputType.landing().slaSeconds()).toBe(900);
    });
  });

  describe('Framework', () => {
    it('5 frameworks canônicos (ADR-004-CW)', () => {
      ['pas', 'aida', '4ps', 'storybrand', 'soap_opera'].forEach((v) => {
        expect(Framework.create(v).value).toBe(v);
      });
    });

    it('rejeita framework inválido', () => {
      expect(() => Framework.create('hero_journey')).toThrow(/Framework inválido/);
    });

    it('soap_opera é compatível apenas com email_sequence', () => {
      const f = Framework.soapOpera();
      expect(f.compativelCom('email_sequence')).toBe(true);
      expect(f.compativelCom('landing')).toBe(false);
      expect(f.compativelCom('ad_set')).toBe(false);
    });

    it('pas compatível com landing e ad_set, não com email_sequence', () => {
      const f = Framework.pas();
      expect(f.compativelCom('landing')).toBe(true);
      expect(f.compativelCom('ad_set')).toBe(true);
      expect(f.compativelCom('email_sequence')).toBe(false);
    });

    it('promptSlug converte _ em - para resolver arquivo', () => {
      expect(Framework.soapOpera().promptSlug()).toBe('soap-opera');
      expect(Framework.pas().promptSlug()).toBe('pas');
    });
  });

  describe('Landing', () => {
    it('aceita landing válida com 6 seções obrigatórias', () => {
      const landing = Landing.create({
        schemaVersion: '1.0.0',
        hero: seedHero(),
        sections: seedSections(),
        ctas: ['CTA secundário'],
        wordCount: 1750,
        isUpsell: false
      });
      expect(landing.volumeOk()).toBe(true);
      expect(landing.precoFinal()).toBe(80.0);
    });

    it('rejeita schemaVersion mal-formado (ADR-003-CW)', () => {
      expect(() =>
        Landing.create({
          schemaVersion: 'v1',
          hero: seedHero(),
          sections: seedSections(),
          ctas: [],
          wordCount: 1750,
          isUpsell: false
        })
      ).toThrow(/schemaVersion inválido/);
    });

    it('rejeita landing sem 1 das 6 seções obrigatórias', () => {
      const sections = seedSections().filter((s) => s.kind !== 'final_cta');
      expect(() =>
        Landing.create({
          schemaVersion: '1.0.0',
          hero: seedHero(),
          sections,
          ctas: [],
          wordCount: 1700,
          isUpsell: false
        })
      ).toThrow(/seções obrigatórias/);
    });

    it('rejeita social_proof com < 3 bullets', () => {
      const sections = seedSections().map((s) =>
        s.kind === 'social_proof' ? { ...s, bullets: ['só um'] } : s
      );
      expect(() =>
        Landing.create({
          schemaVersion: '1.0.0',
          hero: seedHero(),
          sections,
          ctas: [],
          wordCount: 1700,
          isUpsell: false
        })
      ).toThrow(/social_proof exige ≥ 3/);
    });

    it('volumeOk diferente para upsell (2.500-3.500 palavras)', () => {
      const landing = Landing.create({
        schemaVersion: '1.0.0',
        hero: seedHero(),
        sections: seedSections(),
        ctas: [],
        wordCount: 3000,
        isUpsell: true
      });
      expect(landing.volumeOk()).toBe(true);
      expect(landing.precoFinal()).toBe(110.0);
    });

    it('volumeOk=false para landing com palavras fora do range', () => {
      const landing = Landing.create({
        schemaVersion: '1.0.0',
        hero: seedHero(),
        sections: seedSections(),
        ctas: [],
        wordCount: 500,
        isUpsell: false
      });
      expect(landing.volumeOk()).toBe(false);
    });
  });

  describe('EmailSequence', () => {
    const seedEmails = (n: number): Email[] =>
      Array.from({ length: n }, (_, i) => ({
        position: i + 1,
        subject: `Subject ${i + 1}`,
        previewText: 'preview',
        body: 'corpo do email com várias palavras de exemplo'.repeat(10),
        cta: 'Clique aqui',
        sendOffsetHours: i === 0 ? 0 : 24,
        referencesPrevious: i > 0
      }));

    it('aceita sequência válida de 4 emails', () => {
      const seq = EmailSequence.create({
        schemaVersion: '1.0.0',
        emails: seedEmails(4),
        totalWordCount: 1600
      });
      expect(seq.emails).toHaveLength(4);
      expect(seq.volumeOk()).toBe(true);
      expect(seq.temConectividadeNarrativa()).toBe(true);
    });

    it('rejeita sequência com 2 emails (mínimo 3)', () => {
      expect(() =>
        EmailSequence.create({
          schemaVersion: '1.0.0',
          emails: seedEmails(2),
          totalWordCount: 800
        })
      ).toThrow(/aceita 3-5 emails/);
    });

    it('rejeita posições não-contínuas', () => {
      const emails = seedEmails(3).map((e, i) => ({
        ...e,
        position: i === 1 ? 4 : e.position
      }));
      expect(() =>
        EmailSequence.create({
          schemaVersion: '1.0.0',
          emails,
          totalWordCount: 1500
        })
      ).toThrow(/Posições devem ser contínuas/);
    });

    it('detecta ausência de conectividade narrativa', () => {
      const emails = seedEmails(4).map((e) => ({
        ...e,
        referencesPrevious: false
      }));
      const seq = EmailSequence.create({
        schemaVersion: '1.0.0',
        emails,
        totalWordCount: 1500
      });
      expect(seq.temConectividadeNarrativa()).toBe(false);
    });
  });

  describe('AdSet', () => {
    const seedVariations = (): AdVariation[] => [
      {
        angle: 'pain',
        headline: 'Cansado de feed vazio?',
        primaryText: 'Você posta há meses e o engajamento não decola.',
        description: 'Comece grátis'
      },
      {
        angle: 'aspiration',
        headline: 'Vire referência em B2B',
        primaryText: 'Conteúdo que vira pipeline. Em 14 dias seu feed muda.',
        description: 'Saiba mais'
      },
      {
        angle: 'fomo',
        headline: 'Últimas 12 vagas',
        primaryText: 'Turma fecha em 48h. Próxima só em janeiro.',
        description: 'Reserve agora'
      },
      {
        angle: 'authority',
        headline: '+300 founders já entraram',
        primaryText: 'Método validado em 50 cases B2B brasileiros.',
        description: 'Conhecer'
      },
      {
        angle: 'social_proof',
        headline: 'João dobrou pipeline',
        primaryText: '"Em 30 dias dobrei meu pipeline de leads B2B." João, CTO.',
        description: 'Ver cases'
      }
    ];

    it('aceita ad set válido com 5 ângulos distintos', () => {
      const ads = AdSet.create({
        schemaVersion: '1.0.0',
        variations: seedVariations()
      });
      expect(ads.variations).toHaveLength(5);
      expect(ads.diversidadeOk()).toBe(false); // sem score ainda
      const comScore = ads.comDiversityScore(0.55);
      expect(comScore.diversidadeOk()).toBe(true);
    });

    it('rejeita ad set com 4 variações', () => {
      expect(() =>
        AdSet.create({
          schemaVersion: '1.0.0',
          variations: seedVariations().slice(0, 4)
        })
      ).toThrow(/exatamente 5 variações/);
    });

    it('rejeita ângulos duplicados', () => {
      const variations = seedVariations();
      variations[1] = { ...variations[1], angle: 'pain' };
      expect(() =>
        AdSet.create({ schemaVersion: '1.0.0', variations })
      ).toThrow(/ângulos distintos/);
    });

    it('rejeita headline acima de 40 chars (limite Meta)', () => {
      const variations = seedVariations();
      variations[0] = {
        ...variations[0],
        headline: 'x'.repeat(60)
      };
      expect(() =>
        AdSet.create({ schemaVersion: '1.0.0', variations })
      ).toThrow(/Headline.*excede 40/);
    });

    it('diversidade abaixo de 0,45 falha', () => {
      const ads = AdSet.create({
        schemaVersion: '1.0.0',
        variations: seedVariations()
      }).comDiversityScore(0.3);
      expect(ads.diversidadeOk()).toBe(false);
    });
  });

  describe('CopywriterBriefing', () => {
    it('aceita briefing válido (landing + pas)', () => {
      const b = seedBriefing();
      expect(b.outputType.value).toBe('landing');
      expect(b.framework.value).toBe('pas');
      expect(b.briefingHash()).toMatch(/^brf_[0-9a-f]+$/);
    });

    it('rejeita framework incompatível (soap_opera + landing)', () => {
      expect(() =>
        seedBriefing({ framework: 'soap_opera' })
      ).toThrow(/incompatível/);
    });

    it('rejeita context < 40 chars', () => {
      expect(() =>
        seedBriefing({ context: 'curto demais' })
      ).toThrow(/context com ≥ 40/);
    });

    it('rejeita upsell em ad_set (apenas landing aceita upsell)', () => {
      expect(() =>
        seedBriefing({ outputType: 'ad_set', framework: 'pas', isUpsell: true })
      ).toThrow(/Upsell.*landing/);
    });

    it('briefingHash é determinístico', () => {
      expect(seedBriefing().briefingHash()).toBe(seedBriefing().briefingHash());
    });
  });

  describe('CopywriterOutput (aggregate root)', () => {
    it('novo() inicia em pending sem payload', () => {
      const out = CopywriterOutput.novo('cw_1', seedBriefing());
      expect(out.status).toBe('pending');
      expect(out.payload).toBeNull();
      expect(out.outcomeAlcancado()).toBe(false);
    });

    it('comPayload(Landing) → completed + outcome ok', () => {
      const out = CopywriterOutput.novo('cw_1', seedBriefing()).comPayload(
        Landing.create({
          schemaVersion: '1.0.0',
          hero: seedHero(),
          sections: seedSections(),
          ctas: [],
          wordCount: 1750,
          isUpsell: false
        })
      );
      expect(out.status).toBe('completed');
      expect(out.outcomeAlcancado()).toBe(true);
    });

    it('comPayload com tipo errado lança erro', () => {
      const out = CopywriterOutput.novo('cw_1', seedBriefing());
      const wrongPayload = AdSet.create({
        schemaVersion: '1.0.0',
        variations: [
          {
            angle: 'pain',
            headline: 'h',
            primaryText: 'p',
            description: 'd'
          },
          {
            angle: 'aspiration',
            headline: 'h',
            primaryText: 'p',
            description: 'd'
          },
          { angle: 'fomo', headline: 'h', primaryText: 'p', description: 'd' },
          {
            angle: 'authority',
            headline: 'h',
            primaryText: 'p',
            description: 'd'
          },
          {
            angle: 'social_proof',
            headline: 'h',
            primaryText: 'p',
            description: 'd'
          }
        ]
      });
      expect(() => out.comPayload(wrongPayload)).toThrow(
        /Payload esperado: Landing/
      );
    });

    it('preço de upsell na landing reflete no aggregate', () => {
      const briefing = seedBriefing({ isUpsell: true });
      const out = CopywriterOutput.novo('cw_2', briefing).comPayload(
        Landing.create({
          schemaVersion: '1.0.0',
          hero: seedHero(),
          sections: seedSections(),
          ctas: [],
          wordCount: 3000,
          isUpsell: true
        })
      );
      expect(out.precoFinal()).toBe(110.0);
    });
  });
});
