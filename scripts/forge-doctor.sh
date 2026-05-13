#!/usr/bin/env bash
# Acme Forge — forge-doctor.sh
# Valida consistência do framework: JSON, paths, versões, hooks, artefatos.
# Uso: bash scripts/forge-doctor.sh [--consumer|--canonical]
# Exit: 0 = OK, 1 = WARN, 2 = FAIL
#
# Modos:
#   --canonical : valida o repo canônico do Forge (todos os checks, inclusive reviewer/ e órfãos)
#   --consumer  : valida projeto consumidor (relaxa reviewer/* opcional, pula órfãos, AIOS condicional)
#   (sem flag)  : auto-detecta via manifest.framework.canonical

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ─── Detecção de modo (canonical vs consumer) ─────────────────────────
IS_CONSUMER=""
for arg in "$@"; do
  case "$arg" in
    --consumer)  IS_CONSUMER="true" ;;
    --canonical) IS_CONSUMER="false" ;;
  esac
done

# Auto-detect quando nenhuma flag passada: lê manifest.framework.canonical
if [[ -z "$IS_CONSUMER" ]] && command -v node >/dev/null 2>&1; then
  if node -e "
    const m=JSON.parse(require('fs').readFileSync('docs/forge/manifest.json','utf8'));
    process.exit(m.framework && m.framework.canonical===true ? 0 : 1);
  " 2>/dev/null; then
    IS_CONSUMER="false"
  else
    IS_CONSUMER="true"
  fi
fi
# Fallback final se node indisponível
[[ -z "$IS_CONSUMER" ]] && IS_CONSUMER="false"

MODE_LABEL="canonical (repo do framework)"
[[ "$IS_CONSUMER" == "true" ]] && MODE_LABEL="consumer (projeto consumidor)"
printf '┌─ Forge Doctor ─ modo: %s\n' "$MODE_LABEL"

# ─── Helper: path Git Bash → Node-friendly (compat Windows) ──────────
to_node_path() {
  local p="$1"
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -m "$p" 2>/dev/null || echo "$p"
  else
    echo "$p"
  fi
}

# Acumulador via arquivo temporário — funciona mesmo em subshells e process substitution
TMP=$(mktemp 2>/dev/null || echo "/tmp/forge-doctor-$$")
trap 'rm -f "$TMP"' EXIT

pass() { printf 'P\n' >> "$TMP"; printf '  ✅  %s\n' "$1"; }
warn() { printf 'W\n' >> "$TMP"; printf '  ⚠️   %s\n' "$1"; }
fail() { printf 'F\n' >> "$TMP"; printf '  ❌  %s\n' "$1"; }
sep()  { printf '\n─── %s\n' "$1"; }

if ! command -v node >/dev/null 2>&1; then
  printf '  ❌  node.js não encontrado — necessário para todos os checks JSON\n'
  exit 2
fi

# ─── C1: JSON parse ──────────────────────────────────────────────────
sep "C1  JSON parse"
# Arquivos sempre obrigatórios
for f in docs/forge/manifest.json \
         .claude/settings.json; do
  if node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" 2>/dev/null; then
    pass "$f"
  else
    fail "$f — JSON inválido ou inacessível"
  fi
done
# Arquivos do reviewer: obrigatórios no canônico, opcionais no consumer
for f in reviewer/output-schema.json \
         reviewer/validation-rules.json; do
  if [[ -f "$f" ]]; then
    if node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" 2>/dev/null; then
      pass "$f"
    else
      fail "$f — JSON inválido"
    fi
  else
    if [[ "$IS_CONSUMER" == "true" ]]; then
      pass "$f (ausente — opcional em consumer)"
    else
      fail "$f — ausente no repo canônico"
    fi
  fi
done

# ─── C2: Paths do manifest existem no filesystem ─────────────────────
sep "C2  Paths manifest → filesystem"
while IFS= read -r line; do
  case "$line" in
    OK:*)      pass "${line#OK:}" ;;
    MISSING:*) fail "ausente: ${line#MISSING:}" ;;
  esac
done < <(node -e "
const fs=require('fs');
const m=JSON.parse(fs.readFileSync('docs/forge/manifest.json','utf8'));
const entries=[];
function collect(o){
  if(!o||typeof o!=='object')return;
  if(typeof o.path==='string') entries.push({p:o.path,k:o.path_kind||'file'});
  Object.values(o).forEach(collect);
}
collect(m.artifacts);
const missing=entries.filter(({p,k})=>{
  if(!fs.existsSync(p)) return true;
  if(k==='directory'&&!fs.statSync(p).isDirectory()) return true;
  return false;
});
if(missing.length===0) console.log('OK:'+entries.length+' paths verificados, nenhum faltando');
else missing.forEach(({p})=>console.log('MISSING:'+p));
" 2>/dev/null)

# ─── C3: Coerência de versão framework ───────────────────────────────
sep "C3  Coerência de versão (manifest / settings / README badge / CHANGELOG)"
while IFS= read -r line; do
  case "$line" in
    OK:*)   pass "${line#OK:}" ;;
    DIFF:*) fail "${line#DIFF:}" ;;
  esac
done < <(node -e "
const fs=require('fs');
const m=JSON.parse(fs.readFileSync('docs/forge/manifest.json','utf8'));
const s=JSON.parse(fs.readFileSync('.claude/settings.json','utf8'));
const readme=fs.readFileSync('README.md','utf8');
const changelog=fs.readFileSync('CHANGELOG.md','utf8');
const v=m.framework.version;
const sv=s._forge_version;
const badge=(readme.match(/version-([\d.]+)-blue/)||[])[1];
const cl=(changelog.match(/## \[([\d.]+)\]/)||[])[1];
const errs=[];
if(sv!==v) errs.push('settings._forge_version='+sv+' ≠ manifest='+v);
if(badge!==v) errs.push('README badge='+badge+' ≠ manifest='+v);
if(cl!==v) errs.push('CHANGELOG top='+cl+' ≠ manifest='+v);
if(errs.length===0) console.log('OK:'+v+' coerente em 4 fontes');
else errs.forEach(e=>console.log('DIFF:'+e));
" 2>/dev/null)

# ─── C4: Coerência de versão da Constitution ─────────────────────────
sep "C4  Coerência constitution (manifest / settings / CONSTITUTION.md)"
while IFS= read -r line; do
  case "$line" in
    OK:*)   pass "${line#OK:}" ;;
    DIFF:*) fail "${line#DIFF:}" ;;
  esac
done < <(node -e "
const fs=require('fs');
const m=JSON.parse(fs.readFileSync('docs/forge/manifest.json','utf8'));
const s=JSON.parse(fs.readFileSync('.claude/settings.json','utf8'));
const con=fs.readFileSync('.claude/CONSTITUTION.md','utf8');
const v=m.framework.constitution_version;
const sv=s._constitution_version;
const cv=(con.match(/\*\*Versão\*\*: ([\d.]+)/)||[])[1];
const errs=[];
if(sv!==v) errs.push('settings._constitution_version='+sv+' ≠ manifest='+v);
if(cv!==v) errs.push('CONSTITUTION.md header='+cv+' ≠ manifest='+v);
if(errs.length===0) console.log('OK:'+v+' coerente em 3 fontes');
else errs.forEach(e=>console.log('DIFF:'+e));
" 2>/dev/null)

# ─── C5: Sintaxe dos hooks (bash -n) ─────────────────────────────────
sep "C5  Sintaxe de hooks bash (bash -n)"
HOOK_COUNT=0
while IFS= read -r -d '' hook; do
  HOOK_COUNT=$((HOOK_COUNT+1))
  if bash -n "$hook" 2>/dev/null; then
    pass "$hook"
  else
    fail "$hook — erro de sintaxe bash"
  fi
done < <(find hooks -name '*.sh' -print0 2>/dev/null)
[[ $HOOK_COUNT -eq 0 ]] && warn "nenhum .sh encontrado em hooks/"

# ─── C6: Artefatos órfãos (filesystem sem entry no manifest) ─────────
sep "C6  Artefatos órfãos (filesystem → manifest)"
if [[ "$IS_CONSUMER" == "true" ]]; then
  pass "pulado em modo consumer (manifest local pode não duplicar artefatos canônicos)"
else
while IFS= read -r line; do
  case "$line" in
    OK:*)     pass "${line#OK:}" ;;
    ORPHAN:*) warn "sem entry no manifest: ${line#ORPHAN:}" ;;
  esac
done < <(node -e "
const fs=require('fs');
const m=JSON.parse(fs.readFileSync('docs/forge/manifest.json','utf8'));
const manifPaths=new Set();
function collect(o){
  if(!o||typeof o!=='object')return;
  if(typeof o.path==='string') manifPaths.add(o.path);
  Object.values(o).forEach(collect);
}
collect(m.artifacts);
const scopes=[
  {dir:'.claude/skills', ext:'.md'},
  {dir:'.claude/agents', ext:'.md'},
  {dir:'.claude/commands/acme',ext:'.md'},
  {dir:'templates', ext:'.md'},
  {dir:'hooks', ext:'.sh'},
  {dir:'scripts', ext:'.sh'},
];
const orphans=[];
function walk(d,ext){
  if(!fs.existsSync(d)) return;
  fs.readdirSync(d).forEach(f=>{
    const fp=d+'/'+f;
    if(fs.statSync(fp).isDirectory()){walk(fp,ext);return;}
    if(fp.endsWith(ext)&&!manifPaths.has(fp)) orphans.push(fp);
  });
}
scopes.forEach(({dir,ext})=>walk(dir,ext));
if(orphans.length===0) console.log('OK:nenhum artefato órfão nos escopos verificados');
else orphans.forEach(o=>console.log('ORPHAN:'+o));
" 2>/dev/null)
fi

# ─── C7: Permissions sanity ──────────────────────────────────────────
sep "C7  Permissions sanity (.claude/settings.json)"
while IFS= read -r line; do
  case "$line" in
    OK:*)    pass "${line#OK:}" ;;
    ISSUE:*) warn "${line#ISSUE:}" ;;
  esac
done < <(node -e "
const s=JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'));
const issues=[];
['allow','deny'].forEach(k=>{
  const arr=(s.permissions&&s.permissions[k])||[];
  const seen=new Set();
  arr.forEach((v,i)=>{
    if(!v||!v.trim()) issues.push('permissions.'+k+'['+i+'] está vazio');
    if(seen.has(v)) issues.push('permissions.'+k+': duplicata \"'+v+'\"');
    seen.add(v);
  });
});
const na=(s.permissions&&s.permissions.allow||[]).length;
const nd=(s.permissions&&s.permissions.deny||[]).length;
if(issues.length===0) console.log('OK:allow='+na+' deny='+nd+' entradas, sem duplicatas ou vazios');
else issues.forEach(i=>console.log('ISSUE:'+i));
" 2>/dev/null)

# ─── C8: AIOS templates TDD-ready (Forge v0.9.0+) ────────────────────
sep "C8  AIOS templates TDD-ready"
# Em modo consumer: pular se templates/aios/ não existir (consumidor pode não usar AIOS)
if [[ "$IS_CONSUMER" == "true" && ! -d "templates/aios" ]]; then
  pass "pulado em modo consumer (templates/aios/ ausente — projeto não usa AIOS)"
else
# C8.1 — test_agent/config.json.template declara os modos red/verify
TA_CFG="templates/aios/agents/test_agent/config.json.template"
if [[ -f "$TA_CFG" ]]; then
  if node -e "
    const c=JSON.parse(require('fs').readFileSync('$TA_CFG','utf8'));
    const modes=(c.meta&&c.meta.modes)||[];
    const ok=modes.includes('red')&&modes.includes('verify');
    process.exit(ok?0:1);
  " 2>/dev/null; then
    pass "test_agent declara modes: [red, verify]"
  else
    fail "test_agent/config.json.template sem modes:['red','verify'] — TDD desabilitado"
  fi
  if node -e "
    const c=JSON.parse(require('fs').readFileSync('$TA_CFG','utf8'));
    const cv=(c.meta&&c.meta.coverage_defaults)||{};
    const ok=cv.A&&cv.B&&cv.C;
    process.exit(ok?0:1);
  " 2>/dev/null; then
    pass "test_agent declara coverage_defaults A/B/C"
  else
    fail "test_agent/config.json.template sem coverage_defaults por tier"
  fi
else
  fail "$TA_CFG não encontrado"
fi

# C8.2 — orchestrator.py.template aceita --mode em test
ORC="templates/aios/orchestrator.py.template"
if [[ -f "$ORC" ]]; then
  if grep -qE 'choices=\["red", "verify"\]' "$ORC" 2>/dev/null; then
    pass "orchestrator.py.template tem subcmd test --mode red|verify"
  else
    fail "orchestrator.py.template sem --mode red|verify"
  fi
fi

# C8.3 — config.yaml.template tem coverage_targets + test_commands
CFG_YAML="templates/aios/config.yaml.template"
if [[ -f "$CFG_YAML" ]]; then
  if grep -q '^coverage_targets:' "$CFG_YAML" 2>/dev/null && \
     grep -q '^test_commands:' "$CFG_YAML" 2>/dev/null; then
    pass "config.yaml.template tem coverage_targets + test_commands"
  else
    fail "config.yaml.template sem coverage_targets ou test_commands"
  fi
fi

# C8.4 — workflow forge-test existe
TEST_WF="templates/cicd/github-actions-test.template.yml"
if [[ -f "$TEST_WF" ]]; then
  pass "templates/cicd/github-actions-test.template.yml presente"
elif [[ "$IS_CONSUMER" == "true" ]]; then
  pass "$TEST_WF ausente — opcional em consumer (copiar de templates canônicos se usar testes)"
else
  fail "$TEST_WF — workflow de testes do projeto cliente ausente"
fi

# C8.5 — validate workflow inclui job tdd-red-phase-check
VAL_WF="templates/cicd/github-actions-validate.template.yml"
if [[ -f "$VAL_WF" ]] && grep -q 'tdd-red-phase-check:' "$VAL_WF" 2>/dev/null; then
  pass "validate workflow inclui gate G6 tdd-red-phase-check"
elif [[ "$IS_CONSUMER" == "true" && ! -f "$VAL_WF" ]]; then
  pass "$VAL_WF ausente — opcional em consumer"
else
  fail "$VAL_WF sem job tdd-red-phase-check (G6)"
fi
fi  # fim do bloco C8 (else do skip-consumer-sem-aios)

# ─── C9 (apenas consumer): Drift vs canônico ─────────────────────────
# Compara framework.framework_version_required (set pelo forge-sync) com
# a versão atual do Forge canônico local (resolvido via FORGE_PATH env ou
# diretório adjacente ../agent-governance-framework/). Sem rede, sem dependência externa.
if [[ "$IS_CONSUMER" == "true" ]]; then
  sep "C9  Drift vs canônico (consumer-only)"
  CANON_PATH=""
  if [[ -n "${FORGE_PATH:-}" ]] && [[ -f "$FORGE_PATH/docs/forge/manifest.json" ]]; then
    CANON_PATH="$FORGE_PATH"
  elif [[ -f "../agent-governance-framework/docs/forge/manifest.json" ]]; then
    CANON_PATH="../agent-governance-framework"
  elif [[ -f "$HOME/Projetos/agent-governance-framework/docs/forge/manifest.json" ]]; then
    CANON_PATH="$HOME/Projetos/agent-governance-framework"
  fi

  if [[ -z "$CANON_PATH" ]]; then
    pass "drift check pulado — Forge canônico não resolvido (defina FORGE_PATH ou clone em ../agent-governance-framework/)"
  else
    DRIFT_CONSUMER_M="$(to_node_path "docs/forge/manifest.json")"
    DRIFT_CANON_M="$(to_node_path "$CANON_PATH/docs/forge/manifest.json")"
    DRIFT_RESULT=$(node -e "
      const fs=require('fs');
      const cm=JSON.parse(fs.readFileSync('$DRIFT_CONSUMER_M','utf8'));
      const km=JSON.parse(fs.readFileSync('$DRIFT_CANON_M','utf8'));
      const required=(cm.framework&&cm.framework.framework_version_required)||(cm.framework&&cm.framework.version)||'unknown';
      const canon=km.framework&&km.framework.version||'unknown';
      const synced=cm.framework&&cm.framework.last_synced_at||'never';
      if(required===canon) console.log('OK:em dia com canônico v'+canon+' (last_synced_at='+synced+')');
      else console.log('DRIFT:consumer espera v'+required+' (synced='+synced+'); canônico atual='+canon+' — rode \`bash scripts/forge-sync.sh\`');
    " 2>/dev/null) || DRIFT_RESULT="ERROR:falha ao comparar manifests"

    case "$DRIFT_RESULT" in
      OK:*)    pass "${DRIFT_RESULT#OK:}" ;;
      DRIFT:*) warn "${DRIFT_RESULT#DRIFT:}" ;;
      *)       warn "drift check falhou ($DRIFT_RESULT)" ;;
    esac
  fi
fi

# ─── Sumário ─────────────────────────────────────────────────────────
PASS_N=$(grep -c '^P$' "$TMP" 2>/dev/null) || PASS_N=0
WARN_N=$(grep -c '^W$' "$TMP" 2>/dev/null) || WARN_N=0
FAIL_N=$(grep -c '^F$' "$TMP" 2>/dev/null) || FAIL_N=0

printf '\n════════════════════════════════════════════\n'
printf '  Forge Doctor — resultado\n'
printf '  ✅  %s OK   ⚠️   %s WARN   ❌  %s FAIL\n' "$PASS_N" "$WARN_N" "$FAIL_N"
printf '════════════════════════════════════════════\n\n'

if [[ "$FAIL_N" -gt 0 ]]; then
  exit 2
elif [[ "$WARN_N" -gt 0 ]]; then
  exit 1
else
  exit 0
fi
