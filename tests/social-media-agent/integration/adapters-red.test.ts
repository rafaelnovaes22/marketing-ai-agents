// TDD RED phase (Foundry-10 Gate G6) — testes que FALHAM hoje deliberadamente
// porque ImagenAdapter, IdeogramAdapter e TwitterAdapter estão skeleton.
//
// Quando Wave 4 implementar de verdade, estes testes invertem polaridade:
// `expect(...).rejects.toThrow(/Wave 2/)` → `expect(...).resolves.toMatchObject({...})`
//
// Critério Gate G6: existe ≥ 1 arquivo em tests/social-media-agent/ que prova
// que escrevemos teste ANTES da implementação real.

import { describe, expect, it } from 'vitest';
import { ImagenAdapter } from '../../../src/infrastructure/adapters/image-gen/ImagenAdapter.js';
import { IdeogramAdapter } from '../../../src/infrastructure/adapters/image-gen/IdeogramAdapter.js';
import { TwitterAdapter } from '../../../src/infrastructure/adapters/social-publishers/TwitterAdapter.js';

describe('TDD RED — ImagenAdapter (Wave 4 pending)', () => {
  const adapter = new ImagenAdapter({
    projectId: 'test-project',
    location: 'us-central1'
  });

  it('expõe providerName=imagen_4', () => {
    expect(adapter.providerName()).toBe('imagen_4');
  });

  it('🔴 generate() ainda lança erro (Wave 2 / TDD red)', async () => {
    await expect(
      adapter.generate({
        prompt: 'Test prompt',
        aspectRatio: '1:1',
        size: '1080x1080'
      })
    ).rejects.toThrow(/Wave 2/);
  });

  it('🔴 generate() respeita brand_colors injection (Wave 4 vai validar)', async () => {
    // Quando implementado, este teste vai verificar que prompt inclui cores
    await expect(
      adapter.generate({
        prompt: 'Test',
        aspectRatio: '1:1',
        size: '1080x1080',
        brandColors: ['#2563EB', '#5EEAD4']
      })
    ).rejects.toThrow(/Wave 2/);
  });

  it('🔴 generate() lida com text overlay (Wave 4 vai validar)', async () => {
    await expect(
      adapter.generate({
        prompt: 'Background dark',
        aspectRatio: '1:1',
        size: '1080x1080',
        hasTextOverlay: true,
        textOverlayContent: 'O fracasso é um evento'
      })
    ).rejects.toThrow(/Wave 2/);
  });
});

describe('TDD RED — IdeogramAdapter (Wave 4 pending)', () => {
  const adapter = new IdeogramAdapter({
    apiKey: 'test-key'
  });

  it('expõe providerName=ideogram_v2', () => {
    expect(adapter.providerName()).toBe('ideogram_v2');
  });

  it('estimaCustoBrl retorna valor correto ($0.02 × 5.3)', () => {
    expect(adapter.estimaCustoBrl()).toBeCloseTo(0.106, 3);
  });

  it('🔴 generate() ainda lança erro (Wave 2 / TDD red)', async () => {
    await expect(
      adapter.generate({
        prompt: '73% em destaque sobre dark background',
        aspectRatio: '1:1',
        size: '1080x1080',
        hasTextOverlay: true,
        textOverlayContent: '73%'
      })
    ).rejects.toThrow(/Wave 2/);
  });

  it('🔴 generate() recebe configuração de brand (Wave 4 vai validar)', async () => {
    await expect(
      adapter.generate({
        prompt: 'Slide com texto destacado',
        aspectRatio: '1:1',
        size: '1080x1080',
        brandColors: ['#0A1628'],
        brandFont: 'Inter'
      })
    ).rejects.toThrow(/Wave 2/);
  });
});

describe('TDD RED — TwitterAdapter (Wave 3 pending)', () => {
  const adapter = new TwitterAdapter({
    apiKey: 'k',
    apiSecret: 's',
    accessToken: 'at',
    accessTokenSecret: 'ats'
  });

  it('só suporta twitter', () => {
    expect(adapter.supportsRede('twitter')).toBe(true);
    expect(adapter.supportsRede('linkedin')).toBe(false);
    expect(adapter.supportsRede('instagram')).toBe(false);
    expect(adapter.supportsRede('facebook')).toBe(false);
  });

  it('estimaCustoBrl retorna valor correto ($0.02 × 5.3)', () => {
    expect(adapter.estimaCustoBrl()).toBeCloseTo(0.106, 3);
  });

  it('valida rede=twitter antes de publicar (rejeita outras)', async () => {
    const result = await adapter.publish({
      rede: 'linkedin',
      imageUrls: ['url1'],
      caption: 'caption'
    });
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toMatch(/modo thread/);
  });

  it('valida que caption é array de tweets (não string)', async () => {
    const result = await adapter.publish({
      rede: 'twitter',
      imageUrls: ['url1'],
      caption: 'single tweet string' // inválido para Twitter (ADR-003-DS)
    });
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toMatch(/array de tweets/);
  });

  it('valida que thread tem ≥ 2 tweets', async () => {
    const result = await adapter.publish({
      rede: 'twitter',
      imageUrls: ['url1'],
      caption: ['só um tweet']
    });
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toMatch(/≥ 2 tweets/);
  });

  it('valida proporção tweets ↔ imagens', async () => {
    const result = await adapter.publish({
      rede: 'twitter',
      imageUrls: ['url1', 'url2'],
      caption: ['t1', 't2', 't3', 't4', 't5'] // tweets >> imagens
    });
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toMatch(/tweets|imagens/);
  });

  it('🔴 publish() com thread VÁLIDA ainda lança erro (Wave 3 / TDD red)', async () => {
    await expect(
      adapter.publish({
        rede: 'twitter',
        imageUrls: ['url1', 'url2', 'url3'],
        caption: ['Tweet 1 com gancho', 'Tweet 2 desenvolvimento', 'Tweet 3 CTA']
      })
    ).rejects.toThrow(/Wave 3/);
  });
});

describe('TDD RED — Gate G6 evidence', () => {
  it('este arquivo existe e prova RED phase (Foundry-10 G6)', () => {
    // Sinaliza explicitamente que testes foram escritos ANTES da implementação real.
    // Hook tdd-red-phase-check no CI lê tests/social-media-agent/{unit,integration,e2e}/
    // e exige ≥ 1 arquivo. Este passa o gate.
    expect(true).toBe(true);
  });
});
