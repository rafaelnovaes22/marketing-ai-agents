// Integration tests — DiversityCheckUseCase + cosine util.

import { describe, expect, it } from 'vitest';
import {
  DiversityCheckUseCase,
  cosineSimilarity,
  computePairwiseCosine
} from '../../../src/application/copywriter-agent/DiversityCheckUseCase.js';
import { AdSet, type AdVariation } from '../../../src/domain/copywriter/AdSet.js';
import { DeterministicEmbeddings, FakeObservability } from '../unit/fakes.js';

const baseVariations: AdVariation[] = [
  { angle: 'pain', headline: 'Feed vazio?', primaryText: 'TEXT_PAIN', description: 's' },
  { angle: 'aspiration', headline: 'Vire ref', primaryText: 'TEXT_ASP', description: 's' },
  { angle: 'fomo', headline: 'Últimas vagas', primaryText: 'TEXT_FOMO', description: 's' },
  { angle: 'authority', headline: '300+', primaryText: 'TEXT_AUTH', description: 's' },
  { angle: 'social_proof', headline: 'João dobrou', primaryText: 'TEXT_SOC', description: 's' }
];

const seedAdSet = () =>
  AdSet.create({ schemaVersion: '1.0.0', variations: baseVariations });

describe('cosineSimilarity (pure)', () => {
  it('vetores ortogonais → similarity 0', () => {
    expect(cosineSimilarity([1, 0, 0, 0], [0, 1, 0, 0])).toBeCloseTo(0, 6);
  });

  it('vetores idênticos → similarity 1', () => {
    expect(cosineSimilarity([0.5, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5])).toBeCloseTo(1, 6);
  });

  it('vetores opostos → similarity -1', () => {
    expect(cosineSimilarity([1, 0, 0, 0], [-1, 0, 0, 0])).toBeCloseTo(-1, 6);
  });

  it('dimensões diferentes → erro', () => {
    expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow(/dimensões diferentes/);
  });

  it('vetor zero → similarity 0 (não NaN)', () => {
    expect(cosineSimilarity([0, 0, 0, 0], [1, 0, 0, 0])).toBe(0);
  });
});

describe('computePairwiseCosine', () => {
  it('para 5 vetores produz 10 pares (C(5,2))', () => {
    const vectors = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
      [1, 1, 0, 0]
    ];
    const pairs = computePairwiseCosine(vectors);
    expect(pairs).toHaveLength(10);
    expect(pairs[0]).toEqual({ a: 0, b: 1, similarity: 0 });
  });
});

describe('DiversityCheckUseCase', () => {
  it('5 vetores ortogonais → diversityScore=1, AdSet aprova diversidade', async () => {
    const embeddings = new DeterministicEmbeddings(
      new Map([
        ['TEXT_PAIN', [1, 0, 0, 0]],
        ['TEXT_ASP', [0, 1, 0, 0]],
        ['TEXT_FOMO', [0, 0, 1, 0]],
        ['TEXT_AUTH', [0, 0, 0, 1]],
        ['TEXT_SOC', [0.707, 0.707, 0, 0]]
      ])
    );
    const obs = new FakeObservability();
    const useCase = new DiversityCheckUseCase({ embeddings, observability: obs });

    const result = await useCase.execute({
      adSet: seedAdSet(),
      tenantId: 'novais-digital'
    });

    expect(result.diversityScore).toBeGreaterThan(0.7);
    expect(result.pairwiseSimilarity).toHaveLength(10);
    expect(result.adSetWithScore.diversidadeOk()).toBe(true);
    expect(embeddings.calls).toHaveLength(1);
    expect(embeddings.calls[0].texts).toHaveLength(5);
  });

  it('5 vetores idênticos → diversityScore=0, AdSet reprova diversidade', async () => {
    const v = [1, 0, 0, 0];
    const embeddings = new DeterministicEmbeddings(
      new Map([
        ['TEXT_PAIN', v],
        ['TEXT_ASP', v],
        ['TEXT_FOMO', v],
        ['TEXT_AUTH', v],
        ['TEXT_SOC', v]
      ])
    );
    const useCase = new DiversityCheckUseCase({
      embeddings,
      observability: new FakeObservability()
    });

    const result = await useCase.execute({
      adSet: seedAdSet(),
      tenantId: 'novais-digital'
    });

    expect(result.diversityScore).toBeCloseTo(0, 5);
    expect(result.adSetWithScore.diversidadeOk()).toBe(false);
  });

  it('span é registrado quando parentTrace é fornecido', async () => {
    const embeddings = new DeterministicEmbeddings(
      new Map([
        ['TEXT_PAIN', [1, 0, 0, 0]],
        ['TEXT_ASP', [0, 1, 0, 0]],
        ['TEXT_FOMO', [0, 0, 1, 0]],
        ['TEXT_AUTH', [0, 0, 0, 1]],
        ['TEXT_SOC', [0.5, 0.5, 0.5, 0.5]]
      ])
    );
    const obs = new FakeObservability();
    const parent = obs.startTrace({
      tenantId: 'novais-digital',
      sku: 'copywriter-agent',
      mode: 'shadow'
    });

    const useCase = new DiversityCheckUseCase({ embeddings, observability: obs });
    await useCase.execute({
      adSet: seedAdSet(),
      tenantId: 'novais-digital',
      parentTrace: parent
    });

    expect(obs.spans.some((s) => s.span.name === 'diversity_check_embeddings')).toBe(true);
  });
});
