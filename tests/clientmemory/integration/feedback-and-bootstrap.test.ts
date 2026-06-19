// Testes peças C+D — captura de feedback (snapshot consumível pelo curator) e
// bootstrap do diagnóstico → agent-soul/agent-memory válidos.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FeedbackEvent } from '../../../src/domain/clientmemory/FeedbackEvent.js';
import { RecordClientFeedbackUseCase } from '../../../src/application/clientmemory/RecordClientFeedbackUseCase.js';
import { buildBootstrapArtifacts } from '../../../src/clientmemory/bootstrap.js';
import {
  FileClientMemory,
  parseClientFacts
} from '../../../src/infrastructure/adapters/memory/FileClientMemory.js';

// ─── C: FeedbackEvent (domain) ────────────────────────────────────────────────

describe('FeedbackEvent', () => {
  const base = {
    tenantId: 'cliente-x',
    sku: 'copywriter-agent',
    traceId: 'ls-1',
    outputType: 'landing',
    mode: 'assisted' as const
  };

  it('exige editSummary quando verdict=edited', () => {
    expect(() => FeedbackEvent.create({ ...base, verdict: 'edited' })).toThrow(/editSummary/);
  });

  it('exige traceId (rastreabilidade C6)', () => {
    expect(() =>
      FeedbackEvent.create({ ...base, traceId: '', verdict: 'approved' })
    ).toThrow(/traceId/);
  });

  it('mapeia modo→confidence e verdict→seção', () => {
    const approved = FeedbackEvent.create({ ...base, verdict: 'approved' });
    expect(approved.confidence()).toBe('assisted');
    expect(approved.section()).toBe('confirmed_patterns');

    const edited = FeedbackEvent.create({ ...base, verdict: 'edited', editSummary: 'encurtou hero' });
    expect(edited.section()).toBe('pitfalls');
    expect(edited.candidateFactText()).toContain('encurtou hero');
  });
});

// ─── C: RecordClientFeedbackUseCase ───────────────────────────────────────────

describe('RecordClientFeedbackUseCase', () => {
  let root: string;
  const fixedNow = () => new Date('2026-06-19T15:30:00.000Z');

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'learnings-'));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('grava snapshot com frontmatter consumível pelo curator (is_internal:false, client_id)', () => {
    const event = FeedbackEvent.create({
      tenantId: 'acme-internal-copywriter-001',
      sku: 'copywriter-agent',
      traceId: 'ls-abc',
      outputType: 'landing',
      mode: 'assisted',
      verdict: 'edited',
      editSummary: 'Trocou jargão "sinergia" por linguagem direta',
      originalLength: 1820,
      finalLength: 1600
    });

    const useCase = new RecordClientFeedbackUseCase({ snapshotsRoot: root, now: fixedNow });
    const { snapshotPath, factLine } = useCase.execute(event);

    const content = readFileSync(snapshotPath, 'utf-8');
    expect(content).toContain('is_internal: false');
    expect(content).toContain('client_id: acme-internal-copywriter-001');
    expect(content).toContain('confidence: assisted');
    expect(content).toContain('source_trace_id: ls-abc');
    expect(content).toContain('proposed_memory_update: true');
    // o fato candidato vai na seção pitfalls (edição) + na sugestão
    expect(content).toContain('## Pitfalls encontrados');
    expect(factLine).toMatch(/^§ \[confidence:assisted\] \[2026-06-19\] \[run:ls-abc\]/);
    expect(content).toContain(factLine);
    // arquivo sob o mês correto
    expect(snapshotPath).toContain(join(root, '2026-06'));
  });

  it('NÃO grava conteúdo bruto do output (LGPD) — só a lição e deltas', () => {
    const event = FeedbackEvent.create({
      tenantId: 'cliente-y',
      sku: 'copywriter-agent',
      traceId: 'ls-2',
      outputType: 'email_sequence',
      mode: 'assisted',
      verdict: 'edited',
      editSummary: 'Removeu CPF de exemplo do corpo do email',
      originalLength: 900,
      finalLength: 880
    });
    const useCase = new RecordClientFeedbackUseCase({ snapshotsRoot: root, now: fixedNow });
    const { snapshotPath } = useCase.execute(event);
    const content = readFileSync(snapshotPath, 'utf-8');
    expect(content).toContain('900 → 880 chars'); // métrica, não conteúdo
  });

  it('o factLine emitido é parseável pelo mesmo parser do agent-memory', () => {
    const event = FeedbackEvent.create({
      tenantId: 'cliente-z',
      sku: 'copywriter-agent',
      traceId: 'ls-3',
      outputType: 'landing',
      mode: 'assisted',
      verdict: 'approved'
    });
    const { factLine } = new RecordClientFeedbackUseCase({ snapshotsRoot: root, now: fixedNow }).execute(event);
    const [fact] = parseClientFacts(`## § confirmed_patterns\n${factLine}`);
    expect(fact).toMatchObject({ confidence: 'assisted', runId: 'ls-3', section: 'confirmed_patterns' });
  });
});

// ─── D: bootstrap ─────────────────────────────────────────────────────────────

const DIAGNOSTIC_FIXTURE = `---
sku_id: copywriter-agent
priority: P0
---

# Diagnóstico

## 2. Outcome contratual (C2)

**Promessa em uma frase:**
> "Entregar 1 entregável de copy no tom solicitado em ≤15 min."

## 6. Restrições conhecidas

- **Single-tenant fase 1** (C8): apenas Acme própria.
- **Português brasileiro como primeira língua** (C7): inglês entra na wave 3.
- **Stack Claude Opus 4.6**: troca de modelo exige ADR.

## 7. Próximo passo
`;

describe('buildBootstrapArtifacts', () => {
  it('extrai promessa e restrições para o soul', () => {
    const { soul } = buildBootstrapArtifacts({
      tenantId: 'cliente-boot',
      sku: 'copywriter-agent',
      diagnosticMd: DIAGNOSTIC_FIXTURE,
      date: '2026-06-19'
    });
    expect(soul).toContain('Outcome contratual');
    expect(soul).toContain('≤15 min');
    expect(soul).toContain('Single-tenant fase 1');
    expect(soul).toContain('Stack Claude Opus 4.6');
  });

  it('gera memory com fatos seed confidence:local parseáveis', () => {
    const { memory } = buildBootstrapArtifacts({
      tenantId: 'cliente-boot',
      sku: 'copywriter-agent',
      diagnosticMd: DIAGNOSTIC_FIXTURE,
      date: '2026-06-19'
    });
    const facts = parseClientFacts(memory);
    expect(facts.length).toBeGreaterThanOrEqual(3);
    expect(facts.every((f) => f.confidence === 'local')).toBe(true);
    expect(facts.every((f) => f.runId === 'bootstrap')).toBe(true);
  });

  it('integração: soul bootstrapado é injetado; fatos local NÃO (piso shadow)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'boot-clients-'));
    try {
      const { soul, memory } = buildBootstrapArtifacts({
        tenantId: 'cliente-boot',
        sku: 'copywriter-agent',
        diagnosticMd: DIAGNOSTIC_FIXTURE,
        date: '2026-06-19'
      });
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const dir = join(root, 'cliente-boot');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'agent-soul.md'), soul);
      writeFileSync(join(dir, 'agent-memory.md'), memory);

      const snap = await new FileClientMemory({ root }).load('cliente-boot');
      expect(snap.promptFragment).toContain('≤15 min'); // soul injetado
      expect(snap.facts.length).toBeGreaterThanOrEqual(3); // fatos parseados
      // fatos local não entram no fragment (piso shadow)
      expect(snap.promptFragment).not.toContain('[local]');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
