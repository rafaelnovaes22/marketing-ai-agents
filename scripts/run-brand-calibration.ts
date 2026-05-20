#!/usr/bin/env tsx
// Run: roda BrandValidatorAdapter nas 50 imagens curadas e mede concordância
// humano × validator. Emite relatório markdown em brand/calibration-set/runs/.
//
// Gate inquebrantável (lifecycle-stage.md gate 5):
//   concordância ≥ 90% E MAE ≤ 5pp → exit 0 (libera Wave 4 → 5)
//   senão → exit 1 (precisa tunar prompt — DES-T4.4/T4.5)
//
// Uso:
//   npm run brand:calibration:run
//   tsx --env-file=.env scripts/run-brand-calibration.ts
//   tsx --env-file=.env scripts/run-brand-calibration.ts --concurrency=5

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { ClaudeAdapter } from '../src/infrastructure/adapters/llm/ClaudeAdapter.js';
import { BrandGuideLoader } from '../src/infrastructure/brand/BrandGuideLoader.js';
import { BrandValidatorAdapter } from '../src/infrastructure/adapters/brand/BrandValidatorAdapter.js';
import type { BrandValidationOutput } from '../src/domain/ports/BrandValidator.js';

const ROOT = resolve(process.cwd(), 'brand', 'calibration-set');
const CSV_PATH = resolve(process.cwd(), 'brand', 'calibration-ratings.csv');
const RUNS_DIR = join(ROOT, 'runs');

const args = process.argv.slice(2);
const CONCURRENCY = parseInt(
  args.find((a) => a.startsWith('--concurrency='))?.split('=')[1] ?? '5',
  10
);

const AGREEMENT_GATE = 0.90; // ≥90%
const MAE_GATE = 5;          // ≤5pp absolute mean error on score 0-100

type Bucket = 'on-brand' | 'borderline' | 'off-brand';

interface CsvRow {
  filename: string;
  bucket: Bucket;
  human_score: number | null;
}

interface ValidatorResult {
  filename: string;
  bucket: Bucket;
  human_score: number;            // 0-100
  validator_score: number;        // 0-100 (convertido de 0-1)
  validator_decision: BrandValidationOutput['decision'];
  human_band: Bucket;
  validator_band: Bucket;
  bands_match: boolean;
  abs_error: number;
  validator_issues_count: number;
  cost_brl: number;
  latency_ms: number;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) { out.push(cur); cur = ''; }
    else { cur += ch; }
  }
  out.push(cur);
  return out;
}

function parseCsv(): CsvRow[] {
  if (!existsSync(CSV_PATH)) {
    console.error(`❌ CSV não encontrado em ${CSV_PATH}. Rode antes:`);
    console.error(`   npm run brand:calibration:seed`);
    process.exit(2);
  }
  const text = readFileSync(CSV_PATH, 'utf-8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    console.error(`❌ CSV vazio. Adicione imagens e rode seed.`);
    process.exit(2);
  }
  const header = lines[0].split(',');
  const fnIdx = header.indexOf('filename');
  const bkIdx = header.indexOf('bucket');
  const scIdx = header.indexOf('score_total_0_100');
  if (fnIdx < 0 || bkIdx < 0 || scIdx < 0) {
    console.error(`❌ CSV malformado: faltam colunas filename/bucket/score_total_0_100.`);
    process.exit(2);
  }
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const raw = cells[scIdx]?.trim() ?? '';
    rows.push({
      filename: cells[fnIdx],
      bucket: cells[bkIdx] as Bucket,
      human_score: raw === '' ? null : Number(raw)
    });
  }
  return rows;
}

function scoreToBand(score: number): Bucket {
  if (score >= 99) return 'on-brand';
  if (score >= 96) return 'borderline';
  return 'off-brand';
}

function loadImageBase64(bucket: Bucket, filename: string): {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png';
} {
  const path = join(ROOT, bucket, filename);
  const buf = readFileSync(path);
  const ext = extname(filename).toLowerCase();
  const mime: 'image/jpeg' | 'image/png' = ext === '.png' ? 'image/png' : 'image/jpeg';
  return { base64: buf.toString('base64'), mimeType: mime };
}

async function runConcurrent<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(runners);
  return results;
}

function fmtPct(x: number): string {
  return (x * 100).toFixed(1) + '%';
}

function buildReport(
  results: ValidatorResult[],
  agreement: number,
  mae: number,
  totalCost: number,
  meanLatency: number,
  unratedSkipped: number,
  promptHash: string
): string {
  const ts = new Date().toISOString();
  const passAgreement = agreement >= AGREEMENT_GATE;
  const passMae = mae <= MAE_GATE;
  const gatePass = passAgreement && passMae;

  // Per-band breakdown
  const byBand: Record<Bucket, { total: number; matches: number; mae: number[] }> = {
    'on-brand': { total: 0, matches: 0, mae: [] },
    'borderline': { total: 0, matches: 0, mae: [] },
    'off-brand': { total: 0, matches: 0, mae: [] }
  };
  for (const r of results) {
    const band = r.human_band;
    byBand[band].total++;
    if (r.bands_match) byBand[band].matches++;
    byBand[band].mae.push(r.abs_error);
  }

  const bandTable = (['on-brand', 'borderline', 'off-brand'] as const)
    .map((b) => {
      const stat = byBand[b];
      const ag = stat.total > 0 ? stat.matches / stat.total : 0;
      const m = stat.mae.length > 0 ? stat.mae.reduce((s, v) => s + v, 0) / stat.mae.length : 0;
      return `| ${b} | ${stat.matches}/${stat.total} | ${fmtPct(ag)} | ${m.toFixed(1)}pp |`;
    })
    .join('\n');

  const disagreements = results
    .filter((r) => !r.bands_match)
    .sort((a, b) => b.abs_error - a.abs_error);

  const disagreementRows = disagreements.length === 0
    ? '_(nenhuma)_'
    : '| filename | bucket folder | human | validator | banda humano | banda val | Δ |\n' +
      '|---|---|---:|---:|---|---|---:|\n' +
      disagreements.map((r) =>
        `| ${r.filename} | ${r.bucket} | ${r.human_score.toFixed(1)} | ${r.validator_score.toFixed(1)} | ${r.human_band} | ${r.validator_band} | ${r.abs_error.toFixed(1)} |`
      ).join('\n');

  const perImageRows = results
    .sort((a, b) => a.filename.localeCompare(b.filename))
    .map((r) =>
      `| ${r.filename} | ${r.bucket} | ${r.human_score.toFixed(0)} | ${r.validator_score.toFixed(1)} | ${r.validator_decision} | ${r.bands_match ? '✅' : '❌'} | ${r.abs_error.toFixed(1)} | ${r.validator_issues_count} | ${r.cost_brl.toFixed(4)} | ${r.latency_ms} |`
    )
    .join('\n');

  return `# Brand Validator Calibration Run — ${ts}

> Gate inquebrantável (DES-T4.3): concordância ≥ ${(AGREEMENT_GATE * 100).toFixed(0)}% E MAE ≤ ${MAE_GATE}pp
> Validator: \`BrandValidatorAdapter\` (Claude Sonnet 4.6 vision)
> Prompt hash: \`${promptHash}\`

## Resultado agregado

| Métrica | Valor | Gate | Status |
|---|---:|---|:---:|
| **Concordância de banda** | ${fmtPct(agreement)} | ≥ ${(AGREEMENT_GATE * 100).toFixed(0)}% | ${passAgreement ? '✅' : '❌'} |
| **MAE (score 0-100)** | ${mae.toFixed(2)}pp | ≤ ${MAE_GATE}pp | ${passMae ? '✅' : '❌'} |
| **Veredicto final** | — | — | ${gatePass ? '✅ **GATE LIBERADO**' : '❌ **TUNAR PROMPT**'} |

- Imagens avaliadas: ${results.length}
- Imagens sem rating humano (puladas): ${unratedSkipped}
- Custo total: R$ ${totalCost.toFixed(2)}
- Latência média: ${meanLatency.toFixed(0)}ms

## Por banda

| Banda (humano) | Concordância | Match rate | MAE médio |
|---|---|---:|---:|
${bandTable}

## Desacordos (human band ≠ validator band)

${disagreementRows}

## Detalhe por imagem

| filename | bucket | humano | validator | decision | match | Δ | issues | custo R$ | latência ms |
|---|---|---:|---:|---|:---:|---:|---:|---:|---:|
${perImageRows}

## Próximo passo

${gatePass
    ? '✅ Gate liberado. Atualize `lifecycle-stage.md` (gate 5 = ✅) e siga Wave 5 do designer-agent.'
    : `❌ Gate NÃO liberado. Caminhos:\n` +
      `1. **DES-T4.4** — tunar prompt do \`BrandValidatorAdapter\` em \`src/infrastructure/adapters/brand/BrandValidatorAdapter.ts\` (system prompt) e re-rodar.\n` +
      `2. **DES-T4.5** (se T4.4 não fechar) — revisar critérios humanos e/ou ampliar set para 75 imagens.\n` +
      `3. **Pior caso** — abrir ADR para revisar o threshold do gate ou trocar de juiz (modelo).`
  }
`;
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(`❌ ANTHROPIC_API_KEY não definida. Rode com:`);
    console.error(`   tsx --env-file=.env scripts/run-brand-calibration.ts`);
    console.error(`   (ou via npm script: npm run brand:calibration:run)`);
    process.exit(2);
  }

  const rows = parseCsv();
  const rated = rows.filter((r) => r.human_score !== null && !Number.isNaN(r.human_score!));
  const unratedSkipped = rows.length - rated.length;

  if (rated.length === 0) {
    console.error(`❌ Nenhuma imagem com rating humano. Preencha 'score_total_0_100' no CSV e tente de novo.`);
    process.exit(2);
  }

  console.log(`🔍 Rodando validator em ${rated.length} imagem(ns) (concorrência=${CONCURRENCY})...`);
  if (unratedSkipped > 0) {
    console.log(`   ${unratedSkipped} imagem(ns) sem rating humano — pulando.`);
  }

  const brandGuide = BrandGuideLoader.fromYamlFile();
  const llm = new ClaudeAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const validator = new BrandValidatorAdapter({ llmProvider: llm, brandGuide });

  const promptHash = (() => {
    // Hash do source do BrandValidatorAdapter — muda quando T4.4 tuna o prompt
    try {
      const adapterPath = resolve(
        process.cwd(),
        'src/infrastructure/adapters/brand/BrandValidatorAdapter.ts'
      );
      const src = readFileSync(adapterPath, 'utf-8');
      let h = 0;
      for (let i = 0; i < src.length; i++) h = ((h << 5) - h + src.charCodeAt(i)) | 0;
      return `0x${(h >>> 0).toString(16).padStart(8, '0')}`;
    } catch {
      return 'unknown';
    }
  })();

  const results = await runConcurrent(
    rated,
    async (row): Promise<ValidatorResult | null> => {
      try {
        const { base64, mimeType } = loadImageBase64(row.bucket, row.filename);
        const out = await validator.validate({ imageBase64: base64, imageMimeType: mimeType });
        const validator_score = out.score * 100;
        const human_score = row.human_score!;
        const human_band = scoreToBand(human_score);
        const validator_band = scoreToBand(validator_score);
        return {
          filename: row.filename,
          bucket: row.bucket,
          human_score,
          validator_score,
          validator_decision: out.decision,
          human_band,
          validator_band,
          bands_match: human_band === validator_band,
          abs_error: Math.abs(human_score - validator_score),
          validator_issues_count: out.issues.length,
          cost_brl: out.costBrl,
          latency_ms: out.latencyMs
        };
      } catch (err) {
        console.error(`   ⚠️  ${row.bucket}/${row.filename}: ${err instanceof Error ? err.message : String(err)}`);
        return null;
      }
    },
    CONCURRENCY
  );

  const valid = results.filter((r): r is ValidatorResult => r !== null);
  if (valid.length === 0) {
    console.error(`❌ Todas as chamadas falharam. Confirme ANTHROPIC_API_KEY e arquivos de imagem.`);
    process.exit(2);
  }

  const matches = valid.filter((r) => r.bands_match).length;
  const agreement = matches / valid.length;
  const mae = valid.reduce((s, r) => s + r.abs_error, 0) / valid.length;
  const totalCost = valid.reduce((s, r) => s + r.cost_brl, 0);
  const meanLatency = valid.reduce((s, r) => s + r.latency_ms, 0) / valid.length;

  const report = buildReport(valid, agreement, mae, totalCost, meanLatency, unratedSkipped, promptHash);

  if (!existsSync(RUNS_DIR)) mkdirSync(RUNS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(RUNS_DIR, `${stamp}.md`);
  writeFileSync(reportPath, report, 'utf-8');

  const passAgreement = agreement >= AGREEMENT_GATE;
  const passMae = mae <= MAE_GATE;
  const gatePass = passAgreement && passMae;

  console.log(``);
  console.log(`📊 Resultado:`);
  console.log(`   Concordância de banda: ${fmtPct(agreement)} (gate ≥ ${(AGREEMENT_GATE * 100).toFixed(0)}%) ${passAgreement ? '✅' : '❌'}`);
  console.log(`   MAE (score 0-100):     ${mae.toFixed(2)}pp (gate ≤ ${MAE_GATE}pp) ${passMae ? '✅' : '❌'}`);
  console.log(`   Custo total:           R$ ${totalCost.toFixed(2)}`);
  console.log(`   Latência média:        ${meanLatency.toFixed(0)}ms`);
  console.log(`   Imagens com erro:      ${results.length - valid.length}`);
  console.log(``);
  console.log(`📝 Relatório: ${reportPath}`);
  console.log(``);
  console.log(gatePass
    ? `✅ GATE LIBERADO — atualize lifecycle-stage.md (gate 5 ✅) e siga Wave 5.`
    : `❌ GATE NÃO LIBERADO — siga DES-T4.4 (tunar prompt) e re-rode.`);

  process.exit(gatePass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(3);
});
