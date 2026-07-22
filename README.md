# Marketing AI Agents

> Multi-agent content & campaign framework — 7 specialized AI agents that run
> a digital marketing operation (content, design, ads, video, strategy, DM
> support) across 4 social networks, governed by an eval-first pipeline.

> **Synthetic data disclaimer:** every brand, persona, client, metric and
> business case in this repository is **fictional or synthetic**, built to
> demonstrate the framework. The financial case is a projection exercise, not
> a real customer result.

## Architecture — the 7 agents

| # | Agent | Outcome | SLA | Models |
|---|-------|---------|-----|--------|
| 1 | `social-media-agent` | Carousel + caption published to 4 networks | 8 min | Claude Sonnet + Imagen 4 |
| 2 | `copywriter-agent` | Landing page / email sequence / ad set | 15 min | Claude Opus |
| 3 | `designer-agent` | On-brand carousel design (99%+ brand consistency) | 20 min | Imagen 4 + Ideogram (fallback) |
| 4 | `trafego-agent` | Meta Ads campaign published + optimized | 5 min | Claude + Meta Ads API |
| 5 | `video-editor-agent` | Short-form video with captions | 10 min | Veo 3 |
| 6 | `estrategista-agent` | Funnel diagnostic + action plan | 2 min | Claude Opus |
| 7 | `atendimento-dm-agent` | Qualified DM lead + CRM handoff | <10 s | Claude Haiku |

Agents are orchestrated with **LangGraph** (ADR-005) and traced with
**LangSmith** (ADR-006). All model/provider access goes through adapters in
`src/infrastructure/adapters/` (portability principle C7).

## Stack

- **Anthropic Claude** — all text intelligence (generation, judging, validation)
- **Google Vertex AI** — Imagen 4 (images), Veo 3 (video)
- **Meta APIs** — publishing and ads
- **LangGraph + LangSmith** — orchestration runtime + tracing
- **TypeScript + Prisma + Vitest** — application layer

## Operation modes (agent lifecycle)

Each agent SKU moves through a gated lifecycle:

```
DRAFT → SHADOW → ASSISTED → AUTONOMOUS
```

- **SHADOW** — runs on real briefings, output reviewed by a human, no billing.
- **ASSISTED** — human approves before publishing.
- **AUTONOMOUS** — publishes within guardrails; monthly audit.

Promotion requires a passing **eval suite** (20+ cases per SKU, LLM-as-judge
with structured judge prompts) — see `evals/` and `src/eval/`.

## Brand voice calibration pipeline

A documented, replicable method for teaching an agent a specific writing
voice (demonstrated with the synthetic persona "The CEO"):

1. Manual corpus collection (no scraping) → `references/brand-voice-ceo-posts/`
2. Pattern distillation → `PATTERNS.md` (hooks, binary contrasts, vocabulary, CTA taxonomy)
3. Versioned system prompts → `prompts/social-media-agent/v0.x.0/`
4. Eval cases with judge prompts → `evals/social-media-agent/cases/`
5. Calibration loop: corpus findings feed prompt refactors (v0.1.0 → v0.6.0)

There is also a **visual brand extraction** pipeline (FFmpeg frames + Whisper +
multimodal analysis → structured brand guide YAML) — see
`documentacao/BRAND_GUIDE.md` and `brand/novais-brand-guide.yaml`.

## Projected case study (synthetic data)

`documentacao/` contains a full executive case — AS IS/TO BE, unit economics,
ROI projection (204% year 1) — built as a **planning exercise with synthetic
numbers** to demonstrate how the framework frames a business case. No real
client data is involved.

## Entry points

| Document | Purpose |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Operational guide for Claude Code |
| [documentacao/EXECUTIVE_SUMMARY_NOVAIS.md](documentacao/EXECUTIVE_SUMMARY_NOVAIS.md) | 1-page executive summary (synthetic case) |
| [docs/foundry/project.json](docs/foundry/project.json) | SKU declarations (outcomes, SLAs, pricing) |
| [.claude/CONSTITUTION.md](.claude/CONSTITUTION.md) | Governance principles C1-C8 |

## Development

```bash
cp .env.example .env   # fill in credentials
npm install
npm test               # vitest
npm run typecheck
npm run eval           # eval runner (requires ANTHROPIC_API_KEY)
```

## License

Copyright (c) 2026 Rafael Novaes.

Licensed under [PolyForm Noncommercial License 1.0.0](./LICENSE.md) —
reading, study and noncommercial use permitted; commercial use requires
express authorization from the author.
