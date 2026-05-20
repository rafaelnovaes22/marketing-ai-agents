#!/usr/bin/env tsx
// Seed: gera ou atualiza brand/calibration-ratings.csv a partir das imagens em
// brand/calibration-set/{on-brand,borderline,off-brand}/.
//
// Idempotente: preserva ratings já preenchidos quando re-rodado.
//
// Uso:
//   npm run brand:calibration:seed
//   tsx scripts/seed-calibration-ratings.ts

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const ROOT = resolve(process.cwd(), 'brand', 'calibration-set');
const CSV_PATH = resolve(process.cwd(), 'brand', 'calibration-ratings.csv');

const BUCKETS = ['on-brand', 'borderline', 'off-brand'] as const;
type Bucket = (typeof BUCKETS)[number];

const EXPECTED_BAND: Record<Bucket, string> = {
  'on-brand': '>=99',
  'borderline': '96-98',
  'off-brand': '<96'
};

const IMG_EXT = new Set(['.png', '.jpg', '.jpeg']);

const HEADER = [
  'filename',
  'bucket',
  'expected_band',
  'color_0_100',
  'typography_0_100',
  'composition_0_100',
  'corner_radius_0_100',
  'score_total_0_100',
  'notes'
] as const;

interface Row {
  filename: string;
  bucket: Bucket;
  expected_band: string;
  color_0_100: string;
  typography_0_100: string;
  composition_0_100: string;
  corner_radius_0_100: string;
  score_total_0_100: string;
  notes: string;
}

function emptyRow(filename: string, bucket: Bucket): Row {
  return {
    filename,
    bucket,
    expected_band: EXPECTED_BAND[bucket],
    color_0_100: '',
    typography_0_100: '',
    composition_0_100: '',
    corner_radius_0_100: '',
    score_total_0_100: '',
    notes: ''
  };
}

function parseCsv(text: string): Map<string, Row> {
  const map = new Map<string, Row>();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return map;
  const headerLine = lines[0].split(',');
  if (headerLine[0] !== 'filename') return map;
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.length < HEADER.length) continue;
    const row: Row = {
      filename: cells[0],
      bucket: cells[1] as Bucket,
      expected_band: cells[2],
      color_0_100: cells[3],
      typography_0_100: cells[4],
      composition_0_100: cells[5],
      corner_radius_0_100: cells[6],
      score_total_0_100: cells[7],
      notes: cells[8] ?? ''
    };
    map.set(`${row.bucket}/${row.filename}`, row);
  }
  return map;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowToCsvLine(row: Row): string {
  return HEADER.map((k) => escapeCsv(row[k])).join(',');
}

function scanBucket(bucket: Bucket): string[] {
  const dir = join(ROOT, bucket);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    return [];
  }
  return readdirSync(dir)
    .filter((f) => IMG_EXT.has(extname(f).toLowerCase()))
    .sort();
}

function main(): void {
  const existing = existsSync(CSV_PATH)
    ? parseCsv(readFileSync(CSV_PATH, 'utf-8'))
    : new Map<string, Row>();

  const observed: Row[] = [];
  const stats = { 'on-brand': 0, 'borderline': 0, 'off-brand': 0 };

  for (const bucket of BUCKETS) {
    for (const filename of scanBucket(bucket)) {
      const key = `${bucket}/${filename}`;
      const existingRow = existing.get(key);
      observed.push(existingRow ?? emptyRow(filename, bucket));
      stats[bucket]++;
    }
  }

  const csv = [HEADER.join(','), ...observed.map(rowToCsvLine)].join('\n') + '\n';
  writeFileSync(CSV_PATH, csv, 'utf-8');

  const total = stats['on-brand'] + stats['borderline'] + stats['off-brand'];
  const filled = observed.filter((r) => r.score_total_0_100.trim() !== '').length;

  console.log(`✅ CSV atualizado: ${CSV_PATH}`);
  console.log(`   Imagens observadas: ${total}`);
  console.log(`     on-brand:   ${stats['on-brand']}/20 ${stats['on-brand'] === 20 ? '✅' : '⚠️ '}`);
  console.log(`     borderline: ${stats['borderline']}/15 ${stats['borderline'] === 15 ? '✅' : '⚠️ '}`);
  console.log(`     off-brand:  ${stats['off-brand']}/15 ${stats['off-brand'] === 15 ? '✅' : '⚠️ '}`);
  console.log(`   Linhas com rating humano: ${filled}/${total}`);
  if (total < 50) {
    console.log(`\n⚠️  Faltam ${50 - total} imagens para completar o set canônico (50).`);
  }
  if (filled < total) {
    console.log(`\nPróximo passo: preencher as colunas 0-100 em ${CSV_PATH} e rodar:`);
    console.log(`  npm run brand:calibration:run`);
  } else if (total === 50) {
    console.log(`\nPróximo passo:`);
    console.log(`  npm run brand:calibration:run`);
  }
}

main();
