// CLI: `npm run clientmemory:bootstrap -- <tenantId> [--sku=copywriter-agent] [--force]`
// (ADR-007-PROJ)
//
// Semeia docs/clients/{tenantId}/agent-soul.md + agent-memory.md a partir do
// diagnostic.md do SKU. Recusa sobrescrever sem --force.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildBootstrapArtifacts } from '../src/clientmemory/bootstrap.js';

interface Args {
  tenantId: string;
  sku: string;
  diagnosticPath: string;
  clientsRoot: string;
  force: boolean;
}

function parseArgs(argv: string[]): Args {
  const [, , tenantId, ...rest] = argv;
  if (!tenantId || tenantId.startsWith('--')) {
    throw new Error(
      'Uso: npm run clientmemory:bootstrap -- <tenantId> [--sku=copywriter-agent] [--diagnostic=<path>] [--force]'
    );
  }
  let sku = 'copywriter-agent';
  let diagnosticPath = '';
  let clientsRoot = join('docs', 'clients');
  let force = false;
  for (const f of rest) {
    if (f === '--force') force = true;
    else if (f.startsWith('--sku=')) sku = f.slice(6);
    else if (f.startsWith('--diagnostic=')) diagnosticPath = f.slice(13);
    else if (f.startsWith('--clients-root=')) clientsRoot = f.slice(15);
  }
  if (!diagnosticPath) {
    diagnosticPath = join('docs', 'forge', 'sku', sku, 'diagnostic.md');
  }
  return { tenantId, sku, diagnosticPath, clientsRoot, force };
}

function main(): number {
  const args = parseArgs(process.argv);
  const diagnosticMd = readFileSync(resolve(args.diagnosticPath), 'utf-8');
  const date = new Date().toISOString().slice(0, 10);

  const { soul, memory } = buildBootstrapArtifacts({
    tenantId: args.tenantId,
    sku: args.sku,
    diagnosticMd,
    date
  });

  const dir = resolve(args.clientsRoot, args.tenantId);
  const soulPath = join(dir, 'agent-soul.md');
  const memoryPath = join(dir, 'agent-memory.md');

  if (!args.force && (existsSync(soulPath) || existsSync(memoryPath))) {
    throw new Error(
      `Arquivos já existem em ${dir}. Use --force para sobrescrever (CUIDADO: perde memória curada).`
    );
  }

  mkdirSync(dir, { recursive: true });
  writeFileSync(soulPath, soul, 'utf-8');
  writeFileSync(memoryPath, memory, 'utf-8');

  console.log(`[bootstrap] cliente=${args.tenantId} sku=${args.sku}`);
  console.log(`[bootstrap] soul=${soulPath}`);
  console.log(`[bootstrap] memory=${memoryPath}`);
  console.log('[bootstrap] fatos seed nascem confidence:local (não injetados até confirmação).');
  return 0;
}

try {
  process.exit(main());
} catch (err) {
  console.error(`[bootstrap] ERRO: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
