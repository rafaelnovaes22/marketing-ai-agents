#!/usr/bin/env tsx
// Generator: cria 50 imagens de calibração via OpenAI gpt-image-1.
//
// Uso one-shot para curadoria (NÃO é adapter de produção — ver benchmarking
// 2026-05-20 que rejeitou OpenAI/Higgsfield como provider primário do
// designer-agent). Distribution shift mitigado pelo fato de que o gate é
// brand-consistency (paleta fechada), não estilo do gerador.
//
// Cost: 50 × $0.042 (gpt-image-1 medium 1024x1024) ≈ $2,10 ≈ R$ 11.
//
// Idempotente: arquivos existentes em brand/calibration-set/ são pulados.
//
// Uso:
//   npm run brand:calibration:generate
//   tsx --env-file=.env scripts/generate-calibration-set.ts
//   tsx --env-file=.env scripts/generate-calibration-set.ts --only=on-brand
//   tsx --env-file=.env scripts/generate-calibration-set.ts --concurrency=3

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const API_URL = 'https://api.openai.com/v1/images/generations';
const MODEL = 'gpt-image-1';
const SIZE = '1024x1024';
const QUALITY = 'medium';
const PRICE_PER_IMG_USD = 0.042;
const USD_TO_BRL = 5.3;

const ROOT = resolve(process.cwd(), 'brand', 'calibration-set');

const args = process.argv.slice(2);
const CONCURRENCY = parseInt(
  args.find((a) => a.startsWith('--concurrency='))?.split('=')[1] ?? '3',
  10
);
const ONLY = args.find((a) => a.startsWith('--only='))?.split('=')[1];

type Bucket = 'on-brand' | 'borderline' | 'off-brand';

interface Spec {
  bucket: Bucket;
  filename: string;
  prompt: string;
}

// ─── Bloco brand (reutilizado em on-brand prompts) ───────────────────────────

const BRAND_BLOCK = `
Brand: Novais Digital (B2B SaaS). Strict design system:
- Background: navy deep #0A1628 or off-white #F5F7FA.
- Accents: royal blue #2563EB, cyan #5EEAD4.
- Text: white #FFFFFF on dark, navy on light.
- Typography: Inter font, headlines extra-bold (800-900), body regular.
- Layout: center-aligned, generous whitespace, clean grid.
- Corners: cards 16px rounded, CTA buttons fully pill-shaped.
- CTA button: gradient royal-blue to cyan, arrow icon right.
- No stock photos. No serif fonts. No sharp corners.

CRITICAL: All text in the image MUST be rendered in clean ENGLISH only.
Do NOT use Portuguese, Spanish, or any other language — the image generator
mis-spells non-English words and the brand validator needs crisp Inter typography.
Keep all wording short (1-4 words max per line).

Aspect: social carousel slide. Render exactly the described scene, no extra elements.
`.trim();

// ─── 7 ON-BRAND ──────────────────────────────────────────────────────────────
// As demais imagens on-brand vêm dos frames do screencast de referência (não incluídos no repo público).
// Estas 7 são geradas ancoradas em refs de design B2B SaaS de alta qualidade.

const ON_BRAND: Omit<Spec, 'bucket'>[] = [
  {
    // Reference: Linear.app — "How we redesigned the Linear UI"
    filename: 'on_001.png',
    prompt: `${BRAND_BLOCK}\n\nReference style: Linear.app product UI design. Dark navy #0A1628 canvas with a subtle linear gradient bottom-right corner (slightly lighter navy). Center: a floating product UI card with 16px rounded corners, dark fill #0F1B2D, 1px hairline cyan #5EEAD4 border, soft drop-shadow. The card contains 2-3 abstract UI rows (tiny rectangles in royal blue #2563EB). Above the card: white Inter Black 900 headline reading "Build". Below card: muted gray #6B7280 Inter Regular subhead "Faster". Single tiny cyan accent dot top-right of card. Center-aligned, generous whitespace, no other elements.`
  },
  {
    // Reference: Vercel.com homepage hero
    filename: 'on_002.png',
    prompt: `${BRAND_BLOCK}\n\nReference style: Vercel.com homepage hero. Pure navy deep #0A1628 background. Center stack from top: (1) thin angular gradient line divider royal-blue to cyan, (2) tiny pill badge with cyan #5EEAD4 1px border reading "New" in cyan, (3) extra-bold white Inter Black 900 headline reading "Ship instantly" (very large), (4) muted gray subhead in Inter Regular reading "AI agents that deliver", (5) pill button with gradient #2563EB to #5EEAD4, white text "Start" with arrow right icon. Center-aligned, generous whitespace. No other elements.`
  },
  {
    // Reference: Stripe.com — oversized stat
    filename: 'on_003.png',
    prompt: `${BRAND_BLOCK}\n\nReference style: Stripe.com oversized stat block. Off-white #F5F7FA background. Center: a GIGANTIC numeral "99" rendered in Inter Black 900 in royal blue #2563EB, roughly 600pt size, taking up most of the slide. Above the number: tiny cyan #5EEAD4 micro-label in Inter Bold uppercase reading "Reliability". Below the number: small navy #0A1628 Inter Regular subhead reading "Uptime guarantee". Center-aligned, lots of whitespace. No other elements.`
  },
  {
    // Reference: Mercury.com banking dashboard hero
    filename: 'on_004.png',
    prompt: `${BRAND_BLOCK}\n\nReference style: Mercury.com banking landing. Off-white #F5F7FA canvas. Center: a single white card with 16px rounded corners and soft drop shadow, containing a clean dashboard mockup (one simple bar chart with 4 royal blue #2563EB bars, one KPI tile with a navy number, very minimal). Above the card: navy #0A1628 Inter Bold headline reading "Analytics". No accent colors except the chart bars. Center-aligned, generous whitespace.`
  },
  {
    // Reference: Cursor.com code editor hero
    filename: 'on_005.png',
    prompt: `${BRAND_BLOCK}\n\nReference style: Cursor.com landing with code editor mockup. Navy deep #0A1628 background. Center: a code editor mockup card with 16px rounded corners, fill darker navy #0F1B2D, white Inter Mono monospace code lines with cyan #5EEAD4 syntax highlights (keywords) and royal blue #2563EB strings. A subtle cyan glow underneath the editor card. Above the editor: white Inter Black 900 headline reading "Code". Center-aligned, generous whitespace.`
  },
  {
    // Reference: Resend.com — 3-col stats grid
    filename: 'on_006.png',
    prompt: `${BRAND_BLOCK}\n\nReference style: Resend.com stats grid. Off-white #F5F7FA background. Three columns equally spaced across the canvas. Each column contains, top to bottom: (1) tiny cyan #5EEAD4 monospace label like "Posts", "Reach", "Hours", (2) a thin navy hairline rule below the label, (3) an OVERSIZED royal blue #2563EB Inter Black 900 numeral "52", "4M", "0", (4) tiny navy Inter Regular subtext. Grid-locked, calm rhythm, generous whitespace, no other ornamentation.`
  },
  {
    // Reference: Supabase LinkedIn carousel hook slide
    filename: 'on_007.png',
    prompt: `${BRAND_BLOCK}\n\nReference style: Supabase LinkedIn carousel hook slide. Square format. Navy deep #0A1628 background. Center: extra-bold white Inter Black 900 headline "AI agents". Bottom-right corner: a small 16px rounded card with darker navy fill #0F1B2D containing 3 tiny cyan #5EEAD4 pagination dots (slide indicator). Above the headline: tiny cyan uppercase micro-label "Hook". Center-aligned, generous whitespace, no other elements.`
  }
];

// ─── 15 BORDERLINE (1 desvio identificável cada, ancorado em ref real) ───────

const BORDERLINE: Omit<Spec, 'bucket'>[] = [
  {
    // Reference: Stripe Press book covers — SERIF deviation
    filename: 'border_001.png',
    prompt: `Reference style: Stripe Press book cover. Navy #0A1628 canvas, generous whitespace, premium minimal feel, 16px rounded corners — BUT the main headline uses a classical SERIF font (Playfair Display or Times). White serif Bold headline reading "Quality first" centered. Below: cyan #5EEAD4 small subhead in Inter Regular (preserved). Royal blue #2563EB accent dot. Center-aligned. The serif headline is the SINGLE deviation. Text in English only, short.`
  },
  {
    // Reference: Monzo blog hero — LEFT-ALIGNED deviation
    filename: 'border_002.png',
    prompt: `Reference style: Monzo blog hero. Navy deep #0A1628 background. Inter Bold white headline "Smart banking" and cyan #5EEAD4 Inter Regular subhead "AI-powered insights" — BUT entire composition is hard-LEFT-aligned: all text and elements slammed to the left edge with text rivers, not centered. Generous whitespace on right half. 16px rounded corners, clean grid, royal blue accent. The left alignment is the SINGLE deviation. Text in English, short.`
  },
  {
    // Reference: Notion changelog — SHARP CORNERS deviation
    filename: 'border_003.png',
    prompt: `Reference style: Notion changelog page. Off-white #F5F7FA canvas, navy #0A1628 Inter Bold headline "Updates", cyan #5EEAD4 accent dot, royal blue #2563EB tiny CTA button — BUT all cards, buttons, and badges have SHARP 0px corners (zero rounding anywhere on the canvas). Center-aligned, single blue accent, generous whitespace otherwise. The sharp corners are the SINGLE deviation. Text in English.`
  },
  {
    // Reference: PostHog homepage — ORANGE accent deviation
    filename: 'border_004.png',
    prompt: `Reference style: PostHog homepage. Navy deep #0A1628 background, Inter Black 900 white headline "Insights" centered, dashboard mockup card 16px rounded with cyan #5EEAD4 chart elements — BUT one prominent SATURATED ORANGE #FF7A00 accent badge sits in the top-right corner, breaking the blue+cyan-only palette discipline. Otherwise brand-correct. The orange accent is the SINGLE deviation. Text in English.`
  },
  {
    // Reference: Replit landing — MAGENTA glow deviation
    filename: 'border_005.png',
    prompt: `Reference style: Replit landing. Navy deep #0A1628 base, centered composition with Inter Black 900 white headline "Build it" and cyan #5EEAD4 small Inter Regular subhead — BUT a large saturated MAGENTA #EC4899 radial glow effect dominates the background (left and right sides), wrong hue for blue+cyan brand. 16px rounded corners, generous whitespace. The magenta glow is the SINGLE deviation. Text in English.`
  },
  {
    // Reference: Modal compute — FILLED icons deviation
    filename: 'border_006.png',
    prompt: `Reference style: Modal compute homepage. Navy deep #0A1628 base, white Inter Bold headline "Compute" centered, 3-column grid below with one icon per column — BUT icons are SOLID FILLED rounded blob shapes (royal blue #2563EB solid circles with white pictograms inside), NOT thin 1.5px outline strokes. 16px rounded corners on cards, cyan #5EEAD4 small labels. Center-aligned, otherwise brand-correct. The filled solid icons are the SINGLE deviation. Text in English.`
  },
  {
    // Reference: Pinecone — STOCK PHOTO overlay deviation
    filename: 'border_007.png',
    prompt: `Reference style: Pinecone vector DB hero. Navy deep #0A1628 base, white Inter Bold headline "Search smarter" left side, cyan #5EEAD4 pill CTA button preserved — BUT a STOCK PHOTOGRAPH of a person looking at a laptop overlays the right half of the hero with a navy color tint at 60% opacity. The corporate stock photo overlay is the SINGLE deviation. 16px corners, otherwise brand-correct. Text in English.`
  },
  {
    // Reference: Cohere — CORAL gradient deviation
    filename: 'border_008.png',
    prompt: `Reference style: Cohere homepage hero. Cream off-white #F5F7FA canvas with Inter Bold navy #0A1628 headline "Smart language", clean grid, 16px rounded cards — BUT background has a CORAL-to-PEACH gradient mesh (#FB923C to #FBBF24) dominating the canvas, wrong hue family for blue+cyan brand. Center-aligned, otherwise brand-correct. The coral gradient is the SINGLE deviation. Text in English.`
  },
  {
    // Reference: Liveblocks — MULTI-ACCENT (4+) deviation
    filename: 'border_009.png',
    prompt: `Reference style: Liveblocks homepage. Navy deep #0A1628 base, Inter Bold white headline "Realtime" centered, dashboard mockup card 16px rounded — BUT the design uses 5 SATURATED ACCENT COLORS simultaneously: cyan #5EEAD4 + purple #9333EA + green #10B981 + yellow #EAB308 + pink #EC4899, sprinkled across icons, badges, and bars. The disciplined blue+cyan duo is broken by color explosion. The 5-color accent overload is the SINGLE deviation. Text in English.`
  },
  {
    // Reference: Railway — GLASSMORPHISM deviation
    filename: 'border_010.png',
    prompt: `Reference style: Railway homepage. Navy deep #0A1628 background, Inter Bold white headline "Deploy fast", cyan #5EEAD4 accents and royal blue elements preserved — BUT all cards use HEAVY FROSTED-GLASS BLUR effect with semi-transparent fills (glassmorphism style — backdrop-filter blur, white 10% fill, faint border), departing from solid flat cards. 16px corners. Center-aligned. The glassmorphism cards are the SINGLE deviation. Text in English.`
  },
  {
    // Reference: n8n — RAINBOW CTA deviation
    filename: 'border_011.png',
    prompt: `Reference style: n8n workflow landing. Navy deep #0A1628 base, Inter Bold white headline "Automate", clean centered composition, 16px rounded cards — BUT the main pill CTA button uses a full RAINBOW gradient sweep (red → orange → yellow → green → blue → purple) instead of the brand royal-blue to cyan gradient. The rainbow CTA is the SINGLE deviation. Text in English, white text on the button.`
  },
  {
    // Reference: Anthropic claude.ai — BEIGE base deviation
    filename: 'border_012.png',
    prompt: `Reference style: Anthropic claude.ai homepage. Inter Bold headline "Thoughtful AI" centered, royal blue #2563EB accent, cyan #5EEAD4 small subhead, 16px rounded cards, generous whitespace, pill CTA — BUT the background canvas is WARM BEIGE / CREAM-OCHRE #E8DCC4 (not navy and not off-white #F5F7FA). All other rules preserved. The warm beige base is the SINGLE deviation. Text in English.`
  },
  {
    // Reference: Loft.com.br — SERIF wordmark deviation
    filename: 'border_013.png',
    prompt: `Reference style: Loft.com.br brand site. Navy deep #0A1628 base, navy/cyan palette, minimal grid, 16px rounded cards, Inter body text — BUT the wordmark logo "Brand" at top and one section heading use a refined SERIF font (Garamond style). Body text and CTA button stay in Inter (preserved). Center-aligned. The serif wordmark is the SINGLE deviation. Text in English.`
  },
  {
    // Reference: QuintoAndar — WARM PHOTO overlay deviation
    filename: 'border_014.png',
    prompt: `Reference style: QuintoAndar brand site. Royal blue #2563EB brand color preserved, Inter Bold white headline "Find home" centered on navy #0A1628 base, 16px rounded cards — BUT one prominent card background uses a WARM RESIDENTIAL PHOTOGRAPH (sunlit interior with wooden furniture and plants). Photography is prohibited in the brand. Center-aligned. The residential photo card is the SINGLE deviation. Text in English.`
  },
  {
    // Reference: Brilliance v0 SaaS template — WEIGHT CONFLICT deviation
    filename: 'border_015.png',
    prompt: `Reference style: Brilliance v0 SaaS landing template. Navy deep #0A1628 background, royal blue #2563EB and cyan #5EEAD4 accents, clean grid, 16px rounded cards — BUT the headline mixes two extreme font WEIGHTS in the same line: the word "Code" in Inter Thin 200 (ultra-light) followed by the word "faster" in Inter Black 900 (extra-bold), creating a visible weight clash. The single-weight discipline (800-900) is broken. Center-aligned. The dual-weight headline is the SINGLE deviation. Text in English.`
  }
];

// ─── 15 OFF-BRAND (ostensivamente fora) ──────────────────────────────────────

const OFF_BRAND: Omit<Spec, 'bucket'>[] = [
  {
    filename: 'off_001.png',
    prompt: `Marketing carousel slide. Bright neon yellow #FFEB3B background. Headline in COMIC SANS font, very playful and casual: "ECONOMIZE AGORA!". Red exclamation. No brand structure, busy with stars and emojis.`
  },
  {
    filename: 'off_002.png',
    prompt: `Marketing slide. White background, headline in Times New Roman SERIF "Quality Service" centered. Bright red color #DC2626 as the dominant color used for body text and button. Old-school corporate vibe, no rounded corners.`
  },
  {
    filename: 'off_003.png',
    prompt: `Marketing slide with aggressive purple-to-pink gradient (#9333EA to #EC4899) covering the whole background. Big bold sans-serif (Impact font) headline "BUY NOW". Casual lifestyle imagery, glitter effects.`
  },
  {
    filename: 'off_004.png',
    prompt: `Chaotic marketing carousel slide. Mix of Arial, Georgia, and Impact fonts on different lines. Multiple competing colors: orange, lime green, hot pink. Asymmetric layout, elements scattered, no clear hierarchy. Slogan "Tudo o que sua marca precisa!".`
  },
  {
    filename: 'off_005.png',
    prompt: `Generic stock photo style marketing slide. Photo of smiling diverse business team in office holding tablets, with cheesy text overlay "Working Together" in Arial. No brand identity, generic corporate stock.`
  },
  {
    filename: 'off_006.png',
    prompt: `Marketing slide with vibrant lime-green to bright-yellow vertical gradient (#84CC16 to #EAB308). Comfortaa rounded display font headline "FRESH IDEAS". Smiley face emoji as accent. Casual youthful brand.`
  },
  {
    filename: 'off_007.png',
    prompt: `Marketing slide with extreme asymmetric layout. Text tilted at random angles, no central alignment. Multiple typefaces, random font sizes. Orange #FF5722 and lime backgrounds in odd geometric shapes. Brutalist style.`
  },
  {
    filename: 'off_008.png',
    prompt: `Marketing slide with earth-tone palette: dark brown #A0522D, beige #DAA520, terracotta orange. Rustic warm cozy feel. Serif Garamond font headline "Tradição & Qualidade". No tech vibes at all, old-world artisan branding.`
  },
  {
    filename: 'off_009.png',
    prompt: `Marketing slide with skeuomorphic 3D shadows, heavy bevels and gradients. Hard sharp 0px corners on all elements. Glossy plastic-looking buttons. Headline "Premium Solutions" in Verdana bold. 2010s web design throwback style.`
  },
  {
    filename: 'off_010.png',
    prompt: `Marketing slide in athletic apparel style. Bright orange #FF5722 dominant color (Lululemon/Nike vibes). Athletic sans-serif font (Bebas Neue) headline "MOVE FASTER". Photo of running shoe. No corporate B2B feel.`
  },
  {
    filename: 'off_011.png',
    prompt: `Marketing slide with playful handwritten script font (Pacifico). Pastel pink #FBCFE8 and lavender #E9D5FF background. Cursive headline "Hello there!". Doodle illustrations of stars and hearts. Casual lifestyle blog vibe.`
  },
  {
    filename: 'off_012.png',
    prompt: `Marketing slide in Microsoft 2000s corporate style. Light blue #0078D4 background gradient. Segoe UI font. Tile-based layout like old Windows Metro. Headline "Enterprise Solutions" with cliché business icons.`
  },
  {
    filename: 'off_013.png',
    prompt: `Marketing slide with overload of fluorescent neon: hot pink, electric green, neon yellow all at once. Glowing text effects. Rave / cyberpunk aesthetic. Headline "FUTURE" in pixelated arcade font.`
  },
  {
    filename: 'off_014.png',
    prompt: `Luxury marketing slide. Pitch black background. Metallic gold #FFD700 ornate serif headline "ELEGANCE" with flourishes. Filigree decorative borders. Crown emoji. High-end perfume / jewelry ad aesthetic.`
  },
  {
    filename: 'off_015.png',
    prompt: `Pixel art retro marketing slide. 8-bit style chunky pixels. Bright primary colors (pure red, blue, yellow). Pixel font headline "GAME ON". Sprite icons of controllers and coins. Nintendo 80s arcade vibe.`
  }
];

// ─── Build full spec list ────────────────────────────────────────────────────

const ALL_SPECS: Spec[] = [
  ...ON_BRAND.map((s) => ({ ...s, bucket: 'on-brand' as const })),
  ...BORDERLINE.map((s) => ({ ...s, bucket: 'borderline' as const })),
  ...OFF_BRAND.map((s) => ({ ...s, bucket: 'off-brand' as const }))
];

// ─── Generation ──────────────────────────────────────────────────────────────

interface GenResult {
  spec: Spec;
  status: 'generated' | 'skipped' | 'failed';
  error?: string;
}

async function generateOne(spec: Spec, apiKey: string): Promise<GenResult> {
  const dir = join(ROOT, spec.bucket);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const outPath = join(dir, spec.filename);

  if (existsSync(outPath)) {
    return { spec, status: 'skipped' };
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: spec.prompt,
        n: 1,
        size: SIZE,
        quality: QUALITY
      })
    });

    if (!res.ok) {
      const body = await res.text();
      return { spec, status: 'failed', error: `${res.status}: ${body.slice(0, 200)}` };
    }

    const json = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const item = json.data?.[0];
    if (!item) {
      return { spec, status: 'failed', error: 'no data[0] in response' };
    }

    let bytes: Buffer;
    if (item.b64_json) {
      bytes = Buffer.from(item.b64_json, 'base64');
    } else if (item.url) {
      const imgRes = await fetch(item.url);
      bytes = Buffer.from(await imgRes.arrayBuffer());
    } else {
      return { spec, status: 'failed', error: 'no b64_json or url in response' };
    }

    writeFileSync(outPath, bytes);
    return { spec, status: 'generated' };
  } catch (err) {
    return { spec, status: 'failed', error: err instanceof Error ? err.message : String(err) };
  }
}

async function runConcurrent(
  specs: Spec[],
  apiKey: string,
  concurrency: number
): Promise<GenResult[]> {
  const results: GenResult[] = new Array(specs.length);
  let cursor = 0;
  let done = 0;
  const total = specs.length;

  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= specs.length) return;
      const result = await generateOne(specs[idx], apiKey);
      results[idx] = result;
      done++;
      const icon =
        result.status === 'generated' ? '✅' :
        result.status === 'skipped' ? '⏭️ ' : '❌';
      const tail = result.error ? `  (${result.error.slice(0, 80)})` : '';
      console.log(`[${done}/${total}] ${icon} ${result.spec.bucket}/${result.spec.filename}${tail}`);
    }
  });

  await Promise.all(workers);
  return results;
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY não definida.');
    console.error('   Rode: tsx --env-file=.env scripts/generate-calibration-set.ts');
    process.exit(2);
  }

  let specs = ALL_SPECS;
  if (ONLY) {
    if (!['on-brand', 'borderline', 'off-brand'].includes(ONLY)) {
      console.error(`❌ --only deve ser on-brand | borderline | off-brand (recebido: ${ONLY})`);
      process.exit(2);
    }
    specs = specs.filter((s) => s.bucket === ONLY);
  }

  // Pre-flight: quantos serão pulados
  const skipCount = specs.filter((s) => existsSync(join(ROOT, s.bucket, s.filename))).length;
  const toGenerate = specs.length - skipCount;
  const estimatedUsd = toGenerate * PRICE_PER_IMG_USD;
  const estimatedBrl = estimatedUsd * USD_TO_BRL;

  console.log(`📦 Specs total: ${specs.length}`);
  console.log(`   A gerar:    ${toGenerate}`);
  console.log(`   A pular:    ${skipCount}`);
  console.log(`   Modelo:     ${MODEL} (${QUALITY}, ${SIZE})`);
  console.log(`   Custo estimado: $${estimatedUsd.toFixed(2)} ≈ R$ ${estimatedBrl.toFixed(2)}`);
  console.log(`   Concorrência: ${CONCURRENCY}`);
  console.log(``);

  if (toGenerate === 0) {
    console.log(`✅ Nada a fazer. Próximo passo:`);
    console.log(`   npm run brand:calibration:seed`);
    return;
  }

  const results = await runConcurrent(specs, apiKey, CONCURRENCY);

  const generated = results.filter((r) => r.status === 'generated').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed = results.filter((r) => r.status === 'failed');

  const actualUsd = generated * PRICE_PER_IMG_USD;

  console.log(``);
  console.log(`📊 Resumo:`);
  console.log(`   Geradas:   ${generated}`);
  console.log(`   Puladas:   ${skipped}`);
  console.log(`   Falhas:    ${failed.length}`);
  console.log(`   Custo real: ≈ $${actualUsd.toFixed(2)} ≈ R$ ${(actualUsd * USD_TO_BRL).toFixed(2)}`);

  if (failed.length > 0) {
    console.log(``);
    console.log(`⚠️  Falhas (rode de novo o script — é idempotente):`);
    for (const f of failed) {
      console.log(`   - ${f.spec.bucket}/${f.spec.filename}: ${f.error}`);
    }
  }

  console.log(``);
  console.log(`📁 Próximo passo: auditar PNGs em brand/calibration-set/`);
  console.log(`   Quando satisfeito, rode:`);
  console.log(`     npm run brand:calibration:seed`);
  console.log(`     # (preencha CSV)`);
  console.log(`     npm run brand:calibration:run`);

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(3);
});
