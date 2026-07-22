# Prompt — Auditoria de Pendências no agent-governance-framework
**Como usar:** Abra o Claude Code dentro de `C:\Users\Rafael\Projetos\agent-governance-framework\` e cole o bloco "PROMPT" abaixo.

> 🎯 **Objetivo:** mapear honestamente o que falta implementar no Foundry para ele estar 100% maduro como framework distribuível, considerando que já temos 1 consumidor real adotando (Novais Digital Social).

---

## 📋 PROMPT (copiar a partir daqui)

```markdown
# Auditoria de Pendências — Novais Digital Foundry

Você está no repositório `agent-governance-framework` (v0.12.0, Foundry-12 Fase 2 entregue).
Acabei de adotar o framework no primeiro projeto consumidor real (Novais Digital Social
em C:\Users\Rafael\Projetos\Novais_Social) e identifiquei lacunas durante o
processo. Preciso de uma **auditoria honesta** do que falta implementar.

## Contexto do que já existe (v0.12.0)

✅ **Foundry-0 a Foundry-12 Fase 2 entregues:**
- Constitution v0.3.0 (8 princípios C1-C8)
- 9 skills L0/L1/L2
- 15 slash commands `/novais-digital:*`
- 10 Guardian subagents
- 10 hooks runtime (4 PreToolUse + 4 PostToolUse incl. friendly-errors + 2 Stop)
- 19 templates (incl. master-prompt.md universal)
- AIOS TDD-first pipeline (test_agent red/verify, coverage gates por tier)
- CI/CD esteira (4 workflows GitHub Actions)
- DeepAgent reviewer (GPT-5.5) com prompt + skills + validation-rules
- HELLO.md + QUICKSTART_VIBE + QUICKSTART_DEV + scripts/foundry CLI
- PLAYGROUND/ com 3 exemplos (agentic_saas, platform, hybrid)
- COMMON_ERRORS.md (top 10 erros)
- Hook friendly-errors traduz violações C1-C8 por modo

## Pendências que IDENTIFIQUEI durante a adoção em Novais Digital Social

### 1. foundry-doctor.sh não funciona em consumidores
Quando rodado em projeto consumidor, gera ~65 warnings "artefato órfão"
(porque manifest local não duplica entries canônicas) + 2 fails sobre
`reviewer/` ausente (consumidor não tem essa pasta). Isso confunde o
usuário e desincentiva validação. Precisa de modo `--consumer`.

### 2. foundry-router subagent não existe
Foi documentado em F27 ("próxima evolução prevista") e em Foundry-12 Fase 3
(F12.14). Sem ele, operador precisa saber slash commands manualmente —
quebra a promessa do master-prompt para CEO vibecoder.

### 3. Persona auto-detect não existe
Foundry-12 Fase 3 (F12.15) prevê detectar modo vibe/dev/agent baseado em
comportamento, sem precisar rodar `foundry mode`. Hoje é manual.

### 4. CHANGELOG/decisions têm inconsistências históricas
Existem DUAS decisões F26 em decisions.md (uma para Foundry-9, outra para
Foundry-10). Provavelmente erro de numeração no passado. Vale revisar.

### 5. Sync entre foundry e consumidores é manual
Quando foundry faz bump de versão (ex: 0.12.0 → 0.13.0), consumidores
precisam manualmente `cp -r` os artefatos canônicos. Não há script
de sync nem validação cross-version (manifest_consumer.framework_version_required
vs foundry.version atual).

### 6. PLAYGROUND/04-automation não existe
Foundry-9 declarou suporte a `project_type=automation` (jobs/RPA),
mas PLAYGROUND não tem exemplo executável dele. Foundry-12 Fase 3 (F12.16)
prevê isso mas não foi feito.

## Tarefa

Faça uma **auditoria estruturada** e me devolva um documento markdown com:

### Seção 1 — Pendências priorizadas
Liste TODAS as pendências (as 6 que identifiquei + outras que você encontrar)
priorizadas em 3 tiers:

- 🔴 **P0 — Bloqueador real** (impede adoção de novos consumidores OU
  quebra promessa de UX)
- 🟡 **P1 — Importante** (degrada experiência mas não bloqueia)
- 🟢 **P2 — Nice-to-have** (melhora mas não impacta uso atual)

Para cada pendência:
- **ID** (proposto, ex: F12.17, F30, FX.Y)
- **Nome**
- **Por que importa** (1-2 frases)
- **Esforço estimado** (horas ou dias)
- **Bloqueia o quê?** (ex: "adoção por Aicfo", "modo vibe completo", etc.)
- **Tipo** (bug, feature, doc, refactor, perf)

### Seção 2 — Auditoria de qualidade dos artefatos existentes
Para cada categoria, identifique gaps:

- **Skills L0/L1/L2** — alguma duplicação? coverage de casos? performance?
- **Slash commands** — algum command faltando para fluxo real?
- **Guardians** — algum cenário sem Guardian? algum Guardian redundante?
- **Hooks** — cobertura adequada? falsos positivos comuns?
- **Templates** — algum tipo de spec/ADR sem template?
- **Reviewer DeepAgent** — prompt está atualizado com últimas mudanças?
- **CI/CD** — workflows cobrem todos os checks do foundry-doctor?

### Seção 3 — Pendências documentadas no próprio roadmap
Leia `docs/foundry/roadmap.md` e liste o que está marcado como ⏳ pendente,
diferenciando:
- O que ainda faz sentido manter
- O que pode ser deletado (não é mais relevante)
- O que mudou de escopo

### Seção 4 — Pendências de adoção (consumidores)
Considerando que Novais Digital Social acabou de adotar hoje e Aicfo/SchoolPlatform
ainda não adotaram o master-prompt, liste o que falta para:
- Aicfo adotar (esforço estimado)
- SchoolPlatform adotar (esforço estimado)
- Primeira auditoria mensal real rodar

### Seção 5 — Bugs e dívidas técnicas conhecidas
- F26 duplicado em decisions.md
- Outros bugs que você detectar lendo o código

### Seção 6 — Roadmap proposto
Com base nas pendências P0/P1/P2, proponha um roadmap de:
- **Foundry-13** (próxima onda — o que entrega)
- **Foundry-14** (onda subsequente)
- **Foundry-15+** (longer-term)

Cada onda com: objetivo, entregáveis principais, esforço estimado, dependências.

## Output esperado

Salve o documento em `docs/foundry/AUDIT_2026-05-13_pendencias.md` com a
estrutura acima. Use as 5 seções do master-prompt no início (Diagnóstico,
Rota, Riscos, Próximo passo, Outputs).

**NÃO implemente nada ainda.** Esta é uma auditoria de planejamento.
Quero ver o quadro completo antes de decidir prioridades.

## Constrains

- Use os Guardians para validar análises (`@po-guardian` para outcomes,
  `@unit-economist` para estimativas, `@artifact-architect` para
  decisões arquiteturais).
- Considere LGPD/GDPR ao propor features que envolvem dados de consumidores.
- Considere portabilidade (C7): cada pendência proposta deve ser
  implementável sem acoplar provider específico.
- Seja honesto sobre trade-offs — se uma pendência tem "risco de
  scope creep", diga.

## Como começar

1. Leia `docs/foundry/manifest.json` (estado atual canônico)
2. Leia `docs/foundry/roadmap.md` (pendências oficiais)
3. Leia `docs/foundry/decisions.md` (F1-F29 — contexto histórico)
4. Leia `CHANGELOG.md` últimas 3 entradas (v0.10.0, v0.11.0, v0.12.0)
5. Faça grep por "TODO|FIXME|HACK" no código
6. Compare manifest com filesystem (artefatos órfãos)
7. Compile a auditoria nas 6 seções

Bons insights!
```

---

## 🧭 Após executar o prompt

O Claude Code vai gerar `docs/foundry/AUDIT_2026-05-13_pendencias.md` no
repo do foundry. Esse documento será a base para decidir o **Foundry-13**
(próxima onda).

**Próximo passo lógico** depois da auditoria:
1. Você revisa o AUDIT_2026-05-13 e prioriza com base no que importa
   para o seu negócio (não para o framework abstratamente)
2. Volta aqui e me diz: "vamos implementar o que está em P0"
3. Eu executo a implementação seguindo o pipeline `/novais-digital:diagnose →
   spec → plan → tasks → implement → eval → promote` para cada
   pendência selecionada

---

## ⚙️ Como usar este prompt

### Opção A — Cole no Claude Code
1. Abra Claude Code em `C:\Users\Rafael\Projetos\agent-governance-framework\`
2. Cole o conteúdo entre as marcações "PROMPT (copiar a partir daqui)"
   e o fim do bloco ```
3. Aguarde a auditoria (deve gerar ~3000-5000 palavras de análise)
4. Revise o `AUDIT_2026-05-13_pendencias.md` gerado

### Opção B — Use como referência manual
Se preferir auditar você mesmo, este prompt funciona como **checklist**
do que olhar — as 6 seções de output são as áreas onde mais comumente
aparecem pendências em frameworks maduros.

---

## 🎯 Critério de sucesso da auditoria

O documento gerado é útil se você consegue responder, ao ler:

- ✅ "O que precisamos fazer NA PRÓXIMA SPRINT?" (P0)
- ✅ "Quanto tempo até o Foundry estar 'pronto para venda' como produto?"
- ✅ "Quais os 3 riscos maiores se ignorarmos as pendências?"
- ✅ "Qual a próxima onda Foundry-13 entregará?"

Se alguma dessas perguntas continua vaga após ler o AUDIT, peça refino:
> "Refine a seção X com mais detalhe — não ficou claro [Y]"
