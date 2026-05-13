#!/usr/bin/env bash
# Hook: friendly-errors (Forge-12 Fase 2)
# Intercepta mensagens de erro relacionadas a violações de Constitution C1-C8 e
# traduz para linguagem amigável conforme modo de operação (.forge-mode).
#
# Modos suportados:
#   vibe  → tradução leiga (ex: "C3 violation" → "Esse SKU está caro demais")
#   dev   → mostra tradução + detalhes técnicos
#   agent → não traduz (output original)
#   unset → comportamento dev por padrão
#
# Não bloqueia execução (apenas anexa explicação ao output).

set -euo pipefail

INPUT=$(cat)

# Diretório raiz do repo (pasta acima do hooks/)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODE_FILE="${REPO_ROOT}/.forge-mode"

# Determina modo
if [[ -f "${MODE_FILE}" ]]; then
  FORGE_MODE=$(cat "${MODE_FILE}" | tr -d '[:space:]')
else
  FORGE_MODE="dev"
fi

# Em modo agent → não traduz
if [[ "${FORGE_MODE}" == "agent" ]]; then
  exit 0
fi

# Extrai output do tool (compatível com jq ou python3)
if command -v jq >/dev/null 2>&1; then
  TOOL_OUTPUT=$(echo "${INPUT}" | jq -r '.tool_output // .output // empty' 2>/dev/null || echo "")
  TOOL_NAME=$(echo "${INPUT}" | jq -r '.tool_name // empty' 2>/dev/null || echo "")
elif command -v python3 >/dev/null 2>&1; then
  TOOL_OUTPUT=$(echo "${INPUT}" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d.get('tool_output', d.get('output', '')))" \
    2>/dev/null || echo "")
  TOOL_NAME=$(echo "${INPUT}" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" \
    2>/dev/null || echo "")
else
  exit 0
fi

[[ -z "${TOOL_OUTPUT}" ]] && exit 0

# ─────────────────────────────────────────────────────────────────────────────
# Detecção de violações Constitution e tradução amigável
# ─────────────────────────────────────────────────────────────────────────────

FRIENDLY_MSG=""

# C1 — Diagnose-first
if echo "${TOOL_OUTPUT}" | grep -qiE "(C1|diagnose-?(before|first))"; then
  case "${FORGE_MODE}" in
    vibe)
      FRIENDLY_MSG="🤔 Antes de criar isso, preciso entender melhor o problema. Você pode me contar o que o cliente vai pagar por aqui?"
      ;;
    dev)
      FRIENDLY_MSG="C1 violation — diagnose-first principle: capability nova exige /acme:diagnose antes de spec/plan/code. Veja COMMON_ERRORS.md #1."
      ;;
  esac
fi

# C2 — Outcome contratual
if echo "${TOOL_OUTPUT}" | grep -qiE "(C2|outcome.?clause|po.guardian.*reject)"; then
  case "${FORGE_MODE}" in
    vibe)
      FRIENDLY_MSG="📝 O pedido tá muito vago — me ajuda a deixar mais claro? Tenta responder: 'O cliente vai poder MEDIR se eu cumpri assim: ___'"
      ;;
    dev)
      FRIENDLY_MSG="C2 violation — outcome contratual vago ou ICP fit inadequado. Reescreva como: [verbo mensurável] + [métrica] + [ICP específico]. Veja COMMON_ERRORS.md #4 e #7."
      ;;
  esac
fi

# C3 — Unit economics
if echo "${TOOL_OUTPUT}" | grep -qiE "(C3|cost.?per.?outcome|unit.?economics|margin)"; then
  case "${FORGE_MODE}" in
    vibe)
      FRIENDLY_MSG="💸 Esse projeto tá caro demais pra você cobrar o preço atual — você precisa: (a) cobrar mais, (b) cortar custos, ou (c) entregar menos. Posso te ajudar a decidir."
      ;;
    dev)
      FRIENDLY_MSG="C3 violation — custo/preço > 25%. Opções: (a) reduzir scope (menos slides/features), (b) aumentar pricing, (c) ADR documentando upsell. Veja COMMON_ERRORS.md #8."
      ;;
  esac
fi

# C4 — Verifiable evaluation
if echo "${TOOL_OUTPUT}" | grep -qiE "(C4|eval.?suite|shadow|acceptance.?gate|tdd.?red)"; then
  case "${FORGE_MODE}" in
    vibe)
      FRIENDLY_MSG="✅ Antes de cobrar do cliente, eu preciso ter certeza que funciona — isso significa rodar uns testes/exemplos primeiro. Quer que eu prepare?"
      ;;
    dev)
      FRIENDLY_MSG="C4 violation — eval-suite (agentic) ou acceptance-gate (platform) não satisfeito. Veja COMMON_ERRORS.md #10 (TDD red phase)."
      ;;
  esac
fi

# C5 — ADR
if echo "${TOOL_OUTPUT}" | grep -qiE "(C5|ADR|adr-approval-gate|architectural.?decision)"; then
  case "${FORGE_MODE}" in
    vibe)
      FRIENDLY_MSG="📋 Essa é uma mudança importante na estrutura — eu preciso documentar PORQUÊ estamos fazendo. Me explica em 1 frase: por que essa mudança agora?"
      ;;
    dev)
      FRIENDLY_MSG="C5 violation — mudança arquitetural sem ADR. Crie em docs/forge/decisions.md com template (Contexto/Decisão/Consequências). Veja COMMON_ERRORS.md #5."
      ;;
  esac
fi

# C6 — Observability
if echo "${TOOL_OUTPUT}" | grep -qiE "(C6|langfuse|telemetry|trace)"; then
  case "${FORGE_MODE}" in
    vibe)
      FRIENDLY_MSG="📊 Eu preciso registrar tudo que acontece (pra você saber depois) — vou configurar isso automaticamente, ok?"
      ;;
    dev)
      FRIENDLY_MSG="C6 violation — telemetria insuficiente. ai_enabled=true exige Langfuse; ai_enabled=false aceita logs estruturados + audit-trail."
      ;;
  esac
fi

# C7 — Portability
if echo "${TOOL_OUTPUT}" | grep -qiE "(C7|portability|coupling|domain.?layer)"; then
  case "${FORGE_MODE}" in
    vibe)
      FRIENDLY_MSG="🔌 Você tá amarrando muito o código a uma ferramenta específica — se um dia quisermos trocar, vai dar trabalho. Vou abstrair isso."
      ;;
    dev)
      FRIENDLY_MSG="C7 violation — SDK específico (Anthropic/OpenAI/etc.) acoplado ao domain layer. Use adapter pattern em lib/<provider>-adapter/."
      ;;
  esac
fi

# C8 — Tenant context
if echo "${TOOL_OUTPUT}" | grep -qiE "(C8|tenant|multi.?tenant|RLS)"; then
  case "${FORGE_MODE}" in
    vibe)
      FRIENDLY_MSG="🏢 Lembra que diferentes clientes não podem ver dados uns dos outros — vou garantir que isso esteja respeitado."
      ;;
    dev)
      FRIENDLY_MSG="C8 violation — multi-tenant context não respeitado. Adicione tenant_id em queries + RLS no PostgreSQL."
      ;;
  esac
fi

# Hash mismatch (C2 path-related)
if echo "${TOOL_OUTPUT}" | grep -qiE "(hash mismatch|sha256.*divergent)"; then
  case "${FORGE_MODE}" in
    vibe)
      FRIENDLY_MSG="🔐 Um arquivo foi editado mas a 'impressão digital' dele no controle de versão não foi atualizada — eu corrijo agora."
      ;;
    dev)
      FRIENDLY_MSG="Hash mismatch — arquivo foi editado mas sha256 no manifest não foi atualizado. Rode: sha256sum <path> | cut -c1-16. Veja COMMON_ERRORS.md #9."
      ;;
  esac
fi

# Secret detected
if echo "${TOOL_OUTPUT}" | grep -qiE "(secret.?scan|api.?key|password|token).*(detected|found|block)"; then
  case "${FORGE_MODE}" in
    vibe)
      FRIENDLY_MSG="🚨 Você tem uma senha ou chave secreta no código — isso é perigoso! Vou mover pra um lugar seguro automaticamente."
      ;;
    dev)
      FRIENDLY_MSG="secret-scan bloqueou commit — secret hardcoded detectado. Mova para .env (gitignored) + use process.env. Veja COMMON_ERRORS.md #6."
      ;;
  esac
fi

# ─────────────────────────────────────────────────────────────────────────────
# Output amigável (não bloqueia; apenas adiciona contexto)
# ─────────────────────────────────────────────────────────────────────────────

if [[ -n "${FRIENDLY_MSG}" ]]; then
  echo ""
  echo "─── 🤖 Forge Friendly Errors ───────────────"
  echo "${FRIENDLY_MSG}"
  if [[ "${FORGE_MODE}" == "vibe" ]]; then
    echo ""
    echo "💡 Quer que eu te mostre o erro técnico original também? Diga: 'modo dev'"
  fi
  echo "────────────────────────────────────────────"
fi

exit 0
