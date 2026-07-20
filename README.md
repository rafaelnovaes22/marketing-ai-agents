# Novais Digital Social

> SaaS² (SaaS de agentes) de marketing digital autônomo — 7 agentes IA especializados operando 4 redes sociais. Consumidor do **agent-governance-framework** (Constitution C1-C8).

## O que é

Plataforma que entrega marketing digital 100% autônomo:

- **7 agentes especializados**: social media, copywriter, designer, tráfego, vídeo, estrategista, atendimento DM
- **4 redes sociais**: LinkedIn, Instagram, Facebook, Twitter — 3 posts/semana = 52 posts/mês
- **0 pessoas operacionais** — apenas 1 Eng AI de manutenção + founder na estratégia

**Números-chave (projeção):** investimento Ano 1 R$ 441.490 · retorno R$ 1.343.110 · ROI Ano 1 204% · payback 4 meses.

## Stack

Anthropic Claude + Google Vertex AI (Imagen 4 + Veo 3) + Meta APIs + **LangGraph** (orchestration runtime) + **LangSmith** (tracing). Ver [ADR-005-PROJ](docs/foundry/decisions/ADR-005-PROJ-orchestration-runtime.md) e [ADR-006-PROJ](docs/foundry/decisions/ADR-006-PROJ-tracing-substitution.md).

## Status

Em desenvolvimento sob pipeline Foundry. Trabalho recente: brand-voice `brand-voice-ceo` ([brand/](brand/)) extraído por análise dos top 50 posts + eval cases de Instagram para o copywriter-agent ([evals/](evals/)).

## Pontos de entrada

| Documento | Para quê |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Guia operacional para Claude Code |
| [templates/master-prompt.md](templates/master-prompt.md) | Referência canônica de operação do pipeline Foundry |
| [documentacao/EXECUTIVE_SUMMARY_NOVAIS.md](documentacao/EXECUTIVE_SUMMARY_NOVAIS.md) | Síntese executiva de 1 página |
| [.claude/CONSTITUTION.md](.claude/CONSTITUTION.md) | Constitution C1-C8 (cópia canônica do foundry — não editar localmente) |

## Desenvolvimento

```bash
cp .env.example .env   # preencher credenciais
npm install
npm test               # vitest
```

## Licença

Copyright (c) 2026 Rafael Novaes.

Licenciado sob [MIT License](./LICENSE) — © 2026 Rafael Novaes.
