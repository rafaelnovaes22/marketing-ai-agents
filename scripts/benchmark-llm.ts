#!/usr/bin/env tsx
// Benchmark: Claude Sonnet 4.6 vs GPT-4o vs GPT-4o-mini
//
// Fase 1 — Métricas operacionais: custo (R$), latência, validade estrutural
// Fase 2 — Qualidade textual: LLM-as-judge (Claude) avalia 5 critérios
//
// Uso:
//   tsx --env-file=.env scripts/benchmark-llm.ts
//   tsx --env-file=.env scripts/benchmark-llm.ts --runs=5
//   tsx --env-file=.env scripts/benchmark-llm.ts --skip-vision
//   tsx --env-file=.env scripts/benchmark-llm.ts --skip-judge

import { readFileSync }  from 'node:fs';
import { join }          from 'node:path';
import { deflateSync }   from 'node:zlib';

import { ClaudeAdapter }  from '../src/infrastructure/adapters/llm/ClaudeAdapter.js';
import { OpenAIAdapter }  from '../src/infrastructure/adapters/llm/OpenAIAdapter.js';
import type { LLMProvider, LLMGenerateOutput } from '../src/domain/ports/LLMProvider.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const args        = process.argv.slice(2);
const RUNS        = parseInt(args.find((a) => a.startsWith('--runs='))?.split('=')[1] ?? '3', 10);
const SKIP_VISION = args.includes('--skip-vision');
const SKIP_JUDGE  = args.includes('--skip-judge');

// ─── Prompts ─────────────────────────────────────────────────────────────────

function loadSystemPrompt(): string {
  const p = join(process.cwd(), 'prompts/social-media-agent/system-prompts/brand_voice_ceo.md');
  try { return readFileSync(p, 'utf-8'); }
  catch { return '# Tom the CEO\nEspecialista em negócios e empreendedorismo. Direto, provocativo, orientado a resultado, sem rodeios. Usa dados concretos. B2B.'; }
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

// ─── PNG builder (32×32 sólido Acme royal-blue) ────────────────────────────

function makeSolidPNG(w: number, h: number, r: number, g: number, b: number): string {
  const u32 = (n: number) => { const buf = Buffer.alloc(4); buf.writeUInt32BE(n, 0); return buf; };
  const crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc32Table[i] = c;
  }
  const crc32 = (data: Buffer) => {
    let crc = 0xffffffff;
    for (const byte of data) crc = crc32Table[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
    return ((crc ^ 0xffffffff) >>> 0);
  };
  const chunk = (type: string, data: Buffer) => {
    const t = Buffer.from(type, 'ascii');
    return Buffer.concat([u32(data.length), t, data, u32(crc32(Buffer.concat([t, data])))]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    const off = y * (1 + w * 3);
    raw[off] = 0;
    for (let x = 0; x < w; x++) {
      raw[off + 1 + x * 3] = r; raw[off + 2 + x * 3] = g; raw[off + 3 + x * 3] = b;
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]).toString('base64');
}

const FAKE_IMAGE_B64 = makeSolidPNG(32, 32, 0x25, 0x63, 0xeb);

// ─── Types ────────────────────────────────────────────────────────────────────

interface RunResult {
  model:      string;
  latencyMs:  number;
  inputToks:  number;
  outputToks: number;
  cachedToks: number;
  costBrl:    number;
  valid:      boolean;
  text?:      string;  // raw output (copy only)
  error?:     string;
}

interface JudgeScore {
  model:            string;
  portugues:        number; // 0-10
  tom_fidelidade:   number; // 0-10
  persuasao_b2b:    number; // 0-10
  arco_narrativo:   number; // 0-10
  caption_linkedin: number; // 0-10
  overall:          number; // média
  destaque:         string; // ponto forte
  fraqueza:         string; // ponto fraco
}

// ─── Runners ──────────────────────────────────────────────────────────────────

async function runCopy(provider: LLMProvider): Promise<RunResult> {
  try {
    const out: LLMGenerateOutput = await provider.generate({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: USER_PROMPT_COPY }
      ],
      maxTokens: 2000, temperature: 0.7, cacheControl: true
    });
    return {
      model: out.modelUsed, latencyMs: out.latencyMs,
      inputToks: out.inputTokens, outputToks: out.outputTokens,
      cachedToks: out.cachedInputTokens ?? 0, costBrl: out.costBrl,
      valid: validateCopyOutput(out.text), text: out.text
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
      maxTokens: 512, temperature: 0.1, cacheControl: true
    });
    return {
      model: out.modelUsed, latencyMs: out.latencyMs,
      inputToks: out.inputTokens, outputToks: out.outputTokens,
      cachedToks: out.cachedInputTokens ?? 0, costBrl: out.costBrl,
      valid: validateVisionOutput(out.text)
    };
  } catch (err) {
    return { model: provider.modelName(), latencyMs: 0, inputToks: 0, outputToks: 0, cachedToks: 0, costBrl: 0, valid: false, error: String(err) };
  }
}

// ─── LLM-as-judge ─────────────────────────────────────────────────────────────

const JUDGE_SYSTEM = `Você é um avaliador especialista em copywriting B2B em português brasileiro.
Avalie o output de carrossel abaixo em 5 critérios (0–10 cada).
Seja rigoroso, consistente e independente — avalie cada output sem comparar com os outros.

Critérios:
1. portugues        — qualidade gramatical, fluidez e vocabulário em pt-BR
2. tom_fidelidade   — aderência ao tom the CEO (direto, provocativo, resultado, dados concretos, B2B)
3. persuasao_b2b    — clareza do valor, urgência, ROI evidente para gestor industrial
4. arco_narrativo   — estrutura: hook forte → contexto com dados → pontos de valor → CTA claro
5. caption_linkedin — profissionalismo, engajamento e uso de hashtags relevantes

Retorne APENAS JSON (sem markdown):
{
  "portugues": 8,
  "tom_fidelidade": 9,
  "persuasao_b2b": 7,
  "arco_narrativo": 8,
  "caption_linkedin": 6,
  "destaque": "hook impactante com dado numérico concreto",
  "fraqueza": "CTA genérico, sem call-to-action específico"
}`;

function buildJudgeUserPrompt(modelLabel: string, text: string): string {
  // Extrair só slides + linkedin da resposta para não sobrecarregar o judge
  let excerpt = text;
  try {
    const m = text.match(/```json\n([\s\S]*?)\n```/);
    const parsed = JSON.parse(m ? m[1] : text) as Record<string, unknown>;
    const slides = (parsed['slides'] as Array<Record<string, unknown>>)
      ?.map((s) => `[${s['role']}] ${s['textOverlay'] ?? ''} | ${s['visualBrief']}`)
      .join('\n');
    const linkedin = (parsed['captions'] as Record<string, unknown>)?.['linkedin'];
    excerpt = `SLIDES:\n${slides}\n\nCAPTION LINKEDIN:\n${linkedin}`;
  } catch {
    // Texto estruturado (Claude v0.5.0): extrai slides + caption LinkedIn
    const linkedinMatch = text.match(
      /(?:Caption LinkedIn|##\s*LinkedIn)[:\s]*([\s\S]*?)(?=##\s*Instagram|##\s*Facebook|##\s*Twitter|$)/i
    );
    const slidesMatch = text.match(
      /(\*\*Slide\s+1[\s\S]*?)(?=(?:\*\*Caption LinkedIn|##\s*LinkedIn))/i
    );
    if (slidesMatch ?? linkedinMatch) {
      excerpt = `SLIDES:\n${(slidesMatch?.[1] ?? '').slice(0, 800)}\n\nCAPTION LINKEDIN:\n${(linkedinMatch?.[1] ?? text).slice(0, 800)}`;
    }
  }

  return `Avalie este output gerado pelo modelo "${modelLabel}":\n\n${excerpt}`;
}

async function judgeOutputs(
  outputs: Record<string, string>,
  judge: LLMProvider
): Promise<JudgeScore[]> {
  const scores: JudgeScore[] = [];

  for (const [modelLabel, text] of Object.entries(outputs)) {
    try {
      const res = await judge.generate({
        messages: [
          { role: 'system', content: JUDGE_SYSTEM },
          { role: 'user',   content: buildJudgeUserPrompt(modelLabel, text) }
        ],
        maxTokens: 512, temperature: 0.1
      });

      // Parse — judge retorna JSON sem markdown
      let raw = res.text.trim();
      const m = raw.match(/```json\n([\s\S]*?)\n```/);
      if (m) raw = m[1];
      const j = JSON.parse(raw) as Omit<JudgeScore, 'model' | 'overall'>;

      const overall = (j.portugues + j.tom_fidelidade + j.persuasao_b2b + j.arco_narrativo + j.caption_linkedin) / 5;
      scores.push({ model: modelLabel, ...j, overall });
    } catch (err) {
      console.log(`  ⚠ Judge falhou para ${modelLabel}: ${String(err).slice(0, 80)}`);
    }
  }

  return scores;
}

// ─── Validators ───────────────────────────────────────────────────────────────

function validateCopyOutput(text: string): boolean {
  // JSON format (GPT models)
  try {
    const m = text.match(/```json\n([\s\S]*?)\n```/);
    const parsed = JSON.parse(m ? m[1] : text) as Record<string, unknown>;
    const slides = parsed['slides'] as unknown[];
    const captions = parsed['captions'] as Record<string, unknown>;
    if (Array.isArray(slides) && slides.length >= 4 && typeof captions?.['linkedin'] === 'string') {
      return true;
    }
  } catch { /* não é JSON */ }

  // Texto estruturado (Claude v0.5.0): **Slide 1:** + Caption LinkedIn / ## LinkedIn
  const hasSlides = /\*\*Slide\s+[1-9]/i.test(text) || /^Slide\s+[1-9]/im.test(text);
  const hasLinkedIn = /Caption LinkedIn|##\s*LinkedIn/i.test(text);
  return hasSlides && hasLinkedIn;
}

function validateVisionOutput(text: string): boolean {
  try {
    const m = text.match(/```json\n([\s\S]*?)\n```/);
    const parsed = JSON.parse(m ? m[1] : text) as Record<string, unknown>;
    return typeof parsed['score'] === 'number' && typeof parsed['decision'] === 'string';
  } catch { return false; }
}

// ─── Display ──────────────────────────────────────────────────────────────────

function avg(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0) / (nums.length || 1);
}

function fmt(n: number, dec = 1): string {
  return n.toFixed(dec);
}

function printOperationalTable(label: string, results: Record<string, RunResult[]>): void {
  console.log(`\n${'═'.repeat(76)}`);
  console.log(` ${label}`);
  console.log('═'.repeat(76));
  console.log(
    `${'Modelo'.padEnd(22)} ${'Lat ms'.padStart(7)} ${'Out tok'.padStart(7)} ${'R$ custo'.padStart(9)} ${'Válido'.padStart(7)}`
  );
  console.log('─'.repeat(76));

  for (const [key, runs] of Object.entries(results)) {
    const ok    = runs.filter((r) => r.valid);
    const lats  = ok.map((r) => r.latencyMs);
    const costs = ok.map((r) => r.costBrl);
    const otoks = ok.map((r) => r.outputToks);
    const valid = `${ok.length}/${runs.length}`;

    console.log(
      `${key.padEnd(22)} ${fmt(avg(lats), 0).padStart(7)} ${fmt(avg(otoks), 0).padStart(7)} ${('R$' + fmt(avg(costs), 4)).padStart(9)} ${valid.padStart(7)}`
    );

    for (const r of runs.filter((r) => r.error)) {
      console.log(`  ⚠ ${r.error?.slice(0, 90)}`);
    }
  }

  // Custo relativo
  const base = Object.entries(results).find(([k]) => k.startsWith('claude'));
  if (base) {
    const baseCost = avg(base[1].filter((r) => r.valid).map((r) => r.costBrl));
    if (baseCost > 0) {
      console.log('\n  Custo vs Claude:');
      for (const [key, runs] of Object.entries(results)) {
        const c = avg(runs.filter((r) => r.valid).map((r) => r.costBrl));
        const ratio = c / baseCost;
        const sym = ratio < 0.99 ? '↓' : ratio > 1.01 ? '↑' : '=';
        console.log(`    ${key.padEnd(20)} ${sym} ${fmt(ratio * 100, 0)}%`);
      }
    }
  }
}

function printQualityTable(scores: JudgeScore[]): void {
  if (scores.length === 0) return;

  console.log(`\n${'═'.repeat(88)}`);
  console.log(' QUALIDADE TEXTUAL  (LLM-as-judge: Claude Sonnet 4.6 — escala 0–10)');
  console.log('═'.repeat(88));
  console.log(
    `${'Modelo'.padEnd(22)} ${'PT-BR'.padStart(6)} ${'Tom'.padStart(6)} ${'B2B'.padStart(6)} ${'Arco'.padStart(6)} ${'LinkedIn'.padStart(9)} ${'Overall'.padStart(8)}`
  );
  console.log('─'.repeat(88));

  const sorted = [...scores].sort((a, b) => b.overall - a.overall);
  for (const s of sorted) {
    const bar = '█'.repeat(Math.round(s.overall));
    console.log(
      `${s.model.padEnd(22)} ${fmt(s.portugues).padStart(6)} ${fmt(s.tom_fidelidade).padStart(6)} ${fmt(s.persuasao_b2b).padStart(6)} ${fmt(s.arco_narrativo).padStart(6)} ${fmt(s.caption_linkedin).padStart(9)} ${fmt(s.overall).padStart(8)}  ${bar}`
    );
    console.log(`  ✦ ${s.destaque}`);
    console.log(`  ✗ ${s.fraqueza}`);
  }
  console.log('─'.repeat(88));

  const winner = sorted[0];
  if (winner) console.log(`\n  🏆 Melhor qualidade geral: ${winner.model} (${fmt(winner.overall)}/10)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const anthropicKey = process.env['ANTHROPIC_API_KEY'];
  const openaiKey    = process.env['OPENAI_API_KEY'];

  if (!anthropicKey || anthropicKey.startsWith('sk-ant-...')) {
    console.error('❌  ANTHROPIC_API_KEY não configurada no .env'); process.exit(1);
  }
  if (!openaiKey || openaiKey.startsWith('sk-...')) {
    console.error('❌  OPENAI_API_KEY não configurada no .env'); process.exit(1);
  }

  const providers: Record<string, LLMProvider> = {
    'claude-sonnet-4.6': new ClaudeAdapter({ apiKey: anthropicKey }),
    'gpt-5.4':           new OpenAIAdapter({ apiKey: openaiKey, model: 'gpt-5.4' }),   // Sonnet-tier
    'gpt-4.1':           new OpenAIAdapter({ apiKey: openaiKey, model: 'gpt-4.1' }),   // baseline
    'gpt-4o':            new OpenAIAdapter({ apiKey: openaiKey, model: 'gpt-4o' }),    // referência anterior
  };

  const judge = new ClaudeAdapter({ apiKey: anthropicKey });

  console.log(`\n🔬  Acme LLM Benchmark — ${new Date().toISOString()}`);
  console.log(`    Rodadas: ${RUNS} | Vision: ${SKIP_VISION ? 'skip' : 'sim'} | Judge: ${SKIP_JUDGE ? 'skip' : 'sim'}`);
  console.log(`    Modelos: ${Object.keys(providers).join(', ')}`);

  // ── FASE 1: Copy generation ───────────────────────────────────────────────
  console.log('\n⏳  Fase 1 — copy_generation...');
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

  printOperationalTable('COPY GENERATION  (5 slides + captions para 4 redes)', copyResults);

  // ── FASE 1: Vision ────────────────────────────────────────────────────────
  if (!SKIP_VISION) {
    console.log('\n⏳  Fase 1 — brand_validation (vision)...');
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

    printOperationalTable('BRAND VALIDATION  (vision — proxy 32×32 px)', visionResults);
  }

  // ── FASE 2: LLM-as-judge ─────────────────────────────────────────────────
  if (!SKIP_JUDGE) {
    console.log('\n⏳  Fase 2 — LLM-as-judge (Claude avalia qualidade textual)...');

    // Usa o último run válido de cada modelo como amostra para o judge
    const outputsToJudge: Record<string, string> = {};
    for (const [name, runs] of Object.entries(copyResults)) {
      const last = [...runs].reverse().find((r) => r.valid && r.text);
      if (last?.text) outputsToJudge[name] = last.text;
    }

    if (Object.keys(outputsToJudge).length === 0) {
      console.log('  ⚠ Nenhum output válido para julgar.');
    } else {
      for (const name of Object.keys(outputsToJudge)) {
        process.stdout.write(`    Julgando ${name}...`);
        const t0 = Date.now();
        // judge will be called inside judgeOutputs
        process.stdout.write(' ');
        console.log('aguardando...');
      }

      const scores = await judgeOutputs(outputsToJudge, judge);
      printQualityTable(scores);
    }
  }

  // ── Projeção mensal ───────────────────────────────────────────────────────
  const RUNS_MES = 208; // 52 posts × 4 redes
  console.log(`\n${'═'.repeat(76)}`);
  console.log(` PROJEÇÃO MENSAL  (${RUNS_MES} runs/mês = 52 posts × 4 redes × R$12/SKU)`);
  console.log('═'.repeat(76));

  for (const [name, runs] of Object.entries(copyResults)) {
    const ok = runs.filter((r) => r.valid);
    if (ok.length === 0) continue;
    const avgCost = avg(ok.map((r) => r.costBrl));
    const monthly = avgCost * RUNS_MES;
    const ratio   = (monthly / (12 * RUNS_MES)) * 100;
    const c3ok    = ratio <= 25;
    console.log(`  ${name.padEnd(20)}  R$${fmt(avgCost, 4)}/run  → R$${fmt(monthly, 2)}/mês  (${fmt(ratio, 1)}% receita)  ${c3ok ? '✅ C3' : '❌ C3 VIOLA'}`);
  }

  console.log('\n✅  Benchmark concluído.\n');
}

main().catch((err) => {
  console.error('Benchmark falhou:', err);
  process.exit(1);
});
