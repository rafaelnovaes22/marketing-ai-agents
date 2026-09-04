// Smoke do entrypoint deployável: /health 200 + /skus lista os 7 SKUs canônicos.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { startServer } from '../../src/server.js';

let server: Server;
let base: string;

beforeAll(async () => {
  server = startServer(0);
  await new Promise<void>((resolve) => server.on('listening', () => resolve()));
  const addr = server.address() as AddressInfo;
  base = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('smoke: entrypoint /health', () => {
  it('GET /health retorna ok', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok' });
  });

  it('GET /skus lista os 7 SKUs canônicos', async () => {
    const res = await fetch(`${base}/skus`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number; skus: Array<{ id: string; stage: string }> };
    expect(body.count).toBe(7);
    expect(body.skus.map((s) => s.id)).toEqual([
      'social-media-agent',
      'copywriter-agent',
      'designer-agent',
      'trafego-agent',
      'video-editor-agent',
      'estrategista-agent',
      'atendimento-dm-agent'
    ]);
  });
});
