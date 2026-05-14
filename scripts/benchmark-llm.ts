#!/usr/bin/env tsx
// Benchmark: Claude Sonnet 4.6 vs GPT-4o vs GPT-4o-mini
//
// Mede custo (R$), latência (ms) e valida estrutura do output para os
// dois tipos de chamada do social-media-agent:
//   1. copy_generation  — gera slides + captions (prompt longo, JSON estruturado)
//   2. brand_validation — julga imagem × brand guide (vision + JSON)
//
// Uso:
//   tsx --env-file=.env scripts/benchmark-llm.ts
//   tsx --env-file=.env scripts/benchmark-llm.ts --runs=5
//   tsx --env-file=.env scripts/benchmark-llm.ts --skip-vision

import { readFileSync } from 'node:fs';
import { join }         from 'node:path';

import { ClaudeAdapter }  from '../src/infrastructure/adapters/llm/ClaudeAdapter.js';
import { OpenAIAdapter }  from '../src/infrastructure/adapters/llm/OpenAIAdapter.js';
import type { LLMProvider, LLMGenerateOutput } from '../src/domain/ports/LLMProvider.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const args        = process.argv.slice(2);
const RUNS        = parseInt(args.find((a) => a.startsWith('--runs='))?.split('=')[1] ?? '3', 10);
const SKIP_VISION = args.includes('--skip-vision');

// ─── Prompts ─────────────────────────────────────────────────────────────────

function loadSystemPrompt(): string {
  const p = join(process.cwd(), 'prompts/social-media-agent/system-prompts/brand_voice_ceo.md');
  try { return readFileSync(p, 'utf-8'); }
  catch { return '# Tom the CEO\nEspecialista em negócios e empreendedorismo. Direto, provocativo, orientado a resultado.'; }
}

const SYSTEM_PROMPT = loadSystemPrompt();

const USER_PROMPT_COPY = `# Briefing

Criamos uma plataforma de IA generativa para empresas industriais B2B. Nossa solução reduz 40% do tempo gasto em relatórios operacionais e permite que gestores tomem decisões com dados em tempo real. Clientes como metalúrgicas e distribuidoras aumentaram margem em 12% após adotar.

# Output esperado

Retorne JSON com a estrutura:

\`\`\`json
{
  "slides": [
    { "role": "hook", "textOverlay": "...", "visualBrief": "..." },
    { "role": "context", "textOverlay": "...", "visualBrief": "..." },
    { "role": "point", "visualBrief": "..." },
    { "role": "point", "visualBrief": "..." },
    { "role": "cta", "textOverlay": "...", "visualBrief": "..." }
  ],
  "captions": {
    "linkedin": "...",
    "instagram": "...",
    "facebook": "...",
    "twitter": ["tweet 1", "tweet 2", "tweet 3", "#hashtag"]
  }
}
\`\`\`

Número de slides: 5. Tom: the CEO (direto, provocativo, B2B).`;

const SYSTEM_PROMPT_BRAND = `# Brand Validator — Acme

Você é um auditor de brand consistency. Avalie se a imagem segue o brand guide.

## Brand Acme
Cores permitidas: #0A1628, #2563EB, #5EEAD4, #FFFFFF, #F5F7FA, #6B7280, #0F1B2D, #DC2626, #10B981
Tipografia: Inter (headlines bold, body regular)
Layout: center-aligned, cantos arredondados, whitespace generoso

## Output (JSON dentro de \`\`\`json ... \`\`\`)
{ "score": 0.98, "decision": "accept", "issues": [] }
- score: 0.0–1.0
- decision: "accept" (≥0.99) | "accept_with_warning" (0.96–0.98) | "retry" (<0.96)`;

// Imagem 1×1 px azul Acme (#2563EB) em base64 — proxy para brand validation
const FAKE_IMAGE_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=';

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface RunResult {
  model:      string;
  latencyMs:  number;
  inputToks:  number;
  outputToks: number;
  cachedToks: number;
  costBrl:    number;
  valid:      boolean;
  error?:     string;
}

async function runCopy(provider: LLMProvider): Promise<RunResult> {
  try {
    const out: LLMGenerateOutput = await provider.generate({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: USER_PROMPT_COPY }
      ],
      maxTokens:    2000,
      temperature:  0.7,
      cacheControl: true
    });

    const valid = validateCopyOutput(out.text);
    return {
      model:      out.modelUsed,
      latencyMs:  out.latencyMs,
      inputToks:  out.inputTokens,
      outputToks: out.outputTokens,
      cachedToks: out.cachedInputTokens ?? 0,
      costBrl:    out.costBrl,
      valid
    };
  } catch (err) {
    return { model: provider.modelName(), latencyMs: 0, inputToks: 0, outputToks: 0, cachedToks: 0, costBrl: 0, valid: false, error: String(err) };
  }
}

async function runVision(provider: LLMProvider): Promise<RunResult> {
  try {
    const out: LLMGenerateOutput = await provider.generateWithVision({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_BRAND },
        { role: 'user',   content: 'Avalie esta imagem. Retorne APENAS JSON válido.' }
      ],
      images: [{ base64: FAKE_IMAGE_B64, mimeType: 'image/png' }],
      maxTokens:   512,
      temperature: 0.1,
      cacheControl: true
    });

    const valid = validateVisionOutput(out.text);
    return {
      model:      out.modelUsed,
      latencyMs:  out.latencyMs,
      inputToks:  out.inputTokens,
      outputToks: out.outputTokens,
      cachedToks: out.cachedInputTokens ?? 0,
      costBrl:    out.costBrl,
      valid
    };
  } catch (err) {
    return { model: provider.modelName(), latencyMs: 0, inputToks: 0, outputToks: 0, cachedToks: 0, costBrl: 0, valid: false, error: String(err) };
  }
}

function validateCopyOutput(text: string): boolean {
  try {
    const m = text.match(/```json\n([\s\S]*?)\n```/);
    const parsed = JSON.parse(m ? m[1] : text) as Record<string, unknown>;
    const slides = parsed['slides'] as unknown[];
    const captions = parsed['captions'] as Record<string, unknown>;
    return Array.isArray(slides) && slides.length === 5
      && typeof captions?.['linkedin'] === 'string'
      && Array.isArray(captions?.['twitter']);
  } catch { return false; }
}

function validateVisionOutput(text: string): boolean {
  try {
    const m = text.match(/```json\n([\s\S]*?)\n```/);
    const parsed = JSON.parse(m ? m[1] : text) as Record<string, unknown>;
    return typeof parsed['score'] === 'number'
      && typeof parsed['decision'] === 'string';
  } catch { return false; }
}

function avg(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0) / (nums.length || 1);
}

function fmt(n: number, dec = 1): string {
  return n.toFixed(dec);
}

// ─── Table renderer ───────────────────────────────────────────────────────────

function printTable(
  label:   string,
  results: Record<string, RunResult[]>
): void {
  console.log(`\n${'═'.repeat(72)}`);
  console.log(` ${label}`);
  console.log('═'.repeat(72));
  console.log(
    `${'Modelo'.padEnd(22)} ${'Lat ms'.padStart(7)} ${'In tok'.padStart(7)} ${'Out tok'.padStart(7)} ${'Cache%'.padStart(6)} ${'R$ custo'.padStart(9)} ${'Válido'.padStart(7)}`
  );
  console.log('─'.repeat(72));

  for (const [key, runs] of Object.entries(results)) {
    const ok   = runs.filter((r) => r.valid);
    const lats = ok.map((r) => r.latencyMs);
    const costs= ok.map((r) => r.costBrl);
    const itoks= ok.map((r) => r.inputToks);
    const otoks= ok.map((r) => r.outputToks);
    const ctoks= ok.map((r) => r.cachedToks);

    const cacheRatio = itoks.length
      ? (avg(ctoks) / (avg(itoks) || 1)) * 100
      : 0;

    const validRate = `${ok.length}/${runs.length}`;

    console.log(
      `${key.padEnd(22)} ${fmt(avg(lats), 0).padStart(7)} ${fmt(avg(itoks), 0).padStart(7)} ${fmt(avg(otoks), 0).padStart(7)} ${fmt(cacheRatio, 0).padStart(5)}% ${('R$' + fmt(avg(costs), 4)).padStart(9)} ${validRate.padStart(7)}`
    );

    // Erros, se houver
    for (const r of runs.filter((r) => r.error)) {
      console.log(`  ⚠ ${r.error?.slice(0, 80)}`);
    }
  }
  console.log('─'.repeat(72));

  // Custo relativo
  const entries = Object.entries(results);
  const baseEntry = entries.find(([k]) => k.startsWith('claude'));
  if (baseEntry) {
    const baseCost = avg(baseEntry[1].filter(r => r.valid).map(r => r.costBrl));
    if (baseCost > 0) {
      console.log('\n  Custo relativo ao Claude Sonnet 4.6:');
      for (const [key, runs] of entries) {
        const c = avg(runs.filter(r => r.valid).map(r => r.costBrl));
        const ratio = c / baseCost;
        const arrow = ratio < 1 ? '↓' : ratio > 1 ? '↑' : '=';
        console.log(`    ${key.padEnd(20)} ${arrow} ${fmt(ratio * 100, 0)}% do custo (${ratio < 1 ? '-' : '+'}${fmt(Math.abs(1 - ratio) * 100, 0)}%)`);
      }
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const anthropicKey = process.env['ANTHROPIC_API_KEY'];
  const openaiKey    = process.env['OPENAI_API_KEY'];

  if (!anthropicKey || anthropicKey.startsWith('sk-ant-...')) {
    console.error('❌  ANTHROPIC_API_KEY não configurada no .env');
    process.exit(1);
  }
  if (!openaiKey || openaiKey.startsWith('sk-...')) {
    console.error('❌  OPENAI_API_KEY não configurada no .env');
    process.exit(1);
  }

  const providers: Record<string, LLMProvider> = {
    'claude-sonnet-4.6': new ClaudeAdapter({ apiKey: anthropicKey }),
    'gpt-4o':            new OpenAIAdapter({ apiKey: openaiKey, model: 'gpt-4o' }),
    'gpt-4o-mini':       new OpenAIAdapter({ apiKey: openaiKey, model: 'gpt-4o-mini' }),
  };

  console.log(`\n🔬  Acme LLM Benchmark — ${new Date().toISOString()}`);
  console.log(`    Rodadas: ${RUNS} | Vision: ${SKIP_VISION ? 'skip' : 'sim'}`);
  console.log(`    Modelos: ${Object.keys(providers).join(', ')}`);

  // ── Copy generation ───────────────────────────────────────────────────────
  console.log('\n⏳  Rodando copy_generation...');
  const copyResults: Record<string, RunResult[]> = {};

  for (const [name, provider] of Object.entries(providers)) {
    copyResults[name] = [];
    for (let i = 0; i < RUNS; i++) {
      process.stdout.write(`    ${name} run ${i + 1}/${RUNS}...`);
      const r = await runCopy(provider);
      copyResults[name].push(r);
      console.log(` ${r.valid ? '✓' : '✗'} ${r.latencyMs}ms R$${r.costBrl}`);
    }
  }

  printTable('COPY GENERATION  (gera 5 slides + captions LinkedIn/IG/FB/Twitter)', copyResults);

  // ── Vision / brand validation ─────────────────────────────────────────────
  if (!SKIP_VISION) {
    console.log('\n⏳  Rodando brand_validation (vision)...');
    const visionResults: Record<string, RunResult[]> = {};

    for (const [name, provider] of Object.entries(providers)) {
      visionResults[name] = [];
      for (let i = 0; i < RUNS; i++) {
        process.stdout.write(`    ${name} run ${i + 1}/${RUNS}...`);
        const r = await runVision(provider);
        visionResults[name].push(r);
        console.log(` ${r.valid ? '✓' : '✗'} ${r.latencyMs}ms R$${r.costBrl}`);
      }
    }

    printTable('BRAND VALIDATION  (vision — 1 slide 1×1 px proxy)', visionResults);
  }

  // ── Projeção mensal (52 posts × 4 redes = 208 runs / mês) ────────────────
  const RUNS_MES = 208;
  console.log(`\n${'═'.repeat(72)}`);
  console.log(` PROJEÇÃO MENSAL  (${RUNS_MES} runs/mês = 52 posts × 4 redes)`);
  console.log('═'.repeat(72));

  for (const [name, runs] of Object.entries(copyResults)) {
    const ok = runs.filter((r) => r.valid);
    if (ok.length === 0) continue;
    const avgCost = avg(ok.map((r) => r.costBrl));
    const monthly = avgCost * RUNS_MES;
    const precoSku = 12; // R$ 12 por carrossel (project.json)
    const fatMes = precoSku * RUNS_MES;
    const ratio = (monthly / fatMes) * 100;
    const c3ok = ratio <= 25;
    console.log(`  ${name.padEnd(20)}  R$${fmt(avgCost, 4)}/run × ${RUNS_MES} = R$${fmt(monthly, 2)}/mês  (${fmt(ratio, 1)}% receita)  ${c3ok ? '✅ C3' : '❌ C3 VIOLA'}`);
  }

  console.log('\n✅  Benchmark concluído.\n');
}

main().catch((err) => {
  console.error('Benchmark falhou:', err);
  process.exit(1);
});
