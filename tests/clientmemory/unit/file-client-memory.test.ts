// Testes peça A — FileClientMemory: parser §, builder de fragment, isolamento por tenant.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FileClientMemory,
  parseClientFacts,
  serializeFact
} from '../../../src/infrastructure/adapters/memory/FileClientMemory.js';
import type { ClientFact } from '../../../src/domain/ports/ClientMemory.js';

// ─── parser § (puro) ──────────────────────────────────────────────────────────

describe('parseClientFacts', () => {
  it('parseia fatos bem formados e associa à seção corrente', () => {
    const md = [
      '# Agent Memory',
      '',
      '## § integration_quirks',
      '§ [confidence:shadow] [2026-05-18] [run:gh-1234] Webhook chega duplicado — dedup por id',
      '',
      '## § pitfalls',
      '§ [confidence:assisted] [2026-05-20] [run:gh-1350] Deploy quebra sem PORT no env'
    ].join('\n');

    const facts = parseClientFacts(md);
    expect(facts).toHaveLength(2);
    expect(facts[0]).toMatchObject({
      section: 'integration_quirks',
      confidence: 'shadow',
      date: '2026-05-18',
      runId: 'gh-1234'
    });
    expect(facts[1].section).toBe('pitfalls');
    expect(facts[1].confidence).toBe('assisted');
  });

  it('é tolerante a CRLF', () => {
    const md = '## § tech_constraints\r\n§ [confidence:local] [2026-06-01] [run:local] Node 20+\r\n';
    const facts = parseClientFacts(md);
    expect(facts).toHaveLength(1);
    expect(facts[0].text).toBe('Node 20+');
  });

  it('marca obsolete quando o texto contém [OBSOLETO]', () => {
    const md = '§ [confidence:shadow] [2026-05-18] [run:gh-1] [OBSOLETO] padrão antigo';
    const [fact] = parseClientFacts(md);
    expect(fact.obsolete).toBe(true);
  });

  it('ignora linhas malformadas (sem run, confidence inválido, genéricas)', () => {
    const md = [
      '§ [] [] [run:] O projeto usa TypeScript',
      '§ [confidence:invalido] [2026-05-18] [run:gh-1] confidence inexistente',
      'texto qualquer não-fato',
      '§ [confidence:shadow] [2026-05-18] [run:gh-9] fato válido'
    ].join('\n');
    const facts = parseClientFacts(md);
    expect(facts).toHaveLength(1);
    expect(facts[0].runId).toBe('gh-9');
  });

  it('round-trip: serializeFact → parseClientFacts preserva o fato', () => {
    const fact: ClientFact = {
      section: 'confirmed_patterns',
      confidence: 'autonomous',
      date: '2026-05-25',
      runId: 'gh-1500',
      text: 'Retry com backoff cobre 99% dos transientes'
    };
    const [parsed] = parseClientFacts(`## § confirmed_patterns\n${serializeFact(fact)}`);
    expect(parsed).toMatchObject({ ...fact, obsolete: false });
  });
});

// ─── load() + buildFragment ───────────────────────────────────────────────────

describe('FileClientMemory.load', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'clientmem-'));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function seed(tenantId: string, files: { soul?: string; memory?: string }): void {
    const dir = join(root, tenantId);
    mkdirSync(dir, { recursive: true });
    if (files.soul !== undefined) writeFileSync(join(dir, 'agent-soul.md'), files.soul);
    if (files.memory !== undefined) writeFileSync(join(dir, 'agent-memory.md'), files.memory);
  }

  it('cliente sem diretório → snapshot vazio (degradação graciosa)', async () => {
    const mem = new FileClientMemory({ root });
    const snap = await mem.load('inexistente');
    expect(snap.soul).toBeNull();
    expect(snap.facts).toHaveLength(0);
    expect(snap.promptFragment).toBe('');
  });

  it('injeta o soul sempre, mesmo sem fatos', async () => {
    seed('cliente-a', { soul: 'Você é o copywriter da Cliente A. Tom direto.' });
    const mem = new FileClientMemory({ root });
    const snap = await mem.load('cliente-a');
    expect(snap.soul).toContain('Cliente A');
    expect(snap.promptFragment).toContain('Identidade');
    expect(snap.promptFragment).toContain('Cliente A');
  });

  it('piso de injeção shadow: fatos local NÃO entram no fragment, mas são parseados', async () => {
    seed('cliente-b', {
      memory: [
        '## § tech_constraints',
        '§ [confidence:local] [2026-06-01] [run:local] fato local não confirmado',
        '§ [confidence:shadow] [2026-06-02] [run:gh-2] fato confirmado em shadow'
      ].join('\n')
    });
    const mem = new FileClientMemory({ root });
    const snap = await mem.load('cliente-b');
    expect(snap.facts).toHaveLength(2); // ambos parseados
    expect(snap.promptFragment).toContain('fato confirmado em shadow');
    expect(snap.promptFragment).not.toContain('não confirmado'); // local filtrado
  });

  it('exclui fatos [OBSOLETO] do fragment', async () => {
    seed('cliente-c', {
      memory: [
        '## § pitfalls',
        '§ [confidence:assisted] [2026-06-01] [run:gh-1] [OBSOLETO] padrão velho',
        '§ [confidence:assisted] [2026-06-02] [run:gh-2] padrão atual'
      ].join('\n')
    });
    const snap = await new FileClientMemory({ root }).load('cliente-c');
    expect(snap.promptFragment).toContain('padrão atual');
    expect(snap.promptFragment).not.toContain('padrão velho');
  });

  it('respeita maxFacts (orçamento de contexto)', async () => {
    const lines = ['## § confirmed_patterns'];
    for (let i = 0; i < 30; i++) {
      lines.push(`§ [confidence:shadow] [2026-06-0${(i % 9) + 1}] [run:gh-${i}] fato numero ${i}`);
    }
    seed('cliente-d', { memory: lines.join('\n') });
    const snap = await new FileClientMemory({ root, maxFacts: 5 }).load('cliente-d');
    const injectedCount = (snap.promptFragment.match(/^- \[/gm) ?? []).length;
    expect(injectedCount).toBe(5);
  });

  it('ISOLAMENTO C8: cliente A nunca vê fatos do cliente B', async () => {
    seed('cliente-a', {
      memory: '## § pitfalls\n§ [confidence:shadow] [2026-06-01] [run:gh-1] segredo do A'
    });
    seed('cliente-b', {
      memory: '## § pitfalls\n§ [confidence:shadow] [2026-06-01] [run:gh-2] segredo do B'
    });
    const mem = new FileClientMemory({ root });
    const snapA = await mem.load('cliente-a');
    expect(snapA.promptFragment).toContain('segredo do A');
    expect(snapA.promptFragment).not.toContain('segredo do B');
  });
});

// ─── appendFact (writer) ──────────────────────────────────────────────────────

describe('FileClientMemory.appendFact', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'clientmem-w-'));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('cria arquivo+diretório quando ausente e o fato vira recuperável no load', async () => {
    const mem = new FileClientMemory({ root, injectionFloor: 'shadow' });
    await mem.appendFact('novo-cliente', {
      section: 'integration_quirks',
      confidence: 'assisted',
      date: '2026-06-19',
      runId: 'gh-77',
      text: 'API responde 202 antes de processar'
    });
    const snap = await mem.load('novo-cliente');
    expect(snap.facts).toHaveLength(1);
    expect(snap.promptFragment).toContain('API responde 202');
  });

  it('append idempotente acumula múltiplos fatos na mesma seção', async () => {
    const mem = new FileClientMemory({ root });
    const base = { section: 'pitfalls' as const, confidence: 'shadow' as const, date: '2026-06-19', runId: 'gh-1' };
    await mem.appendFact('c', { ...base, text: 'fato 1' });
    await mem.appendFact('c', { ...base, text: 'fato 2' });
    const snap = await mem.load('c');
    expect(snap.facts).toHaveLength(2);
  });
});
