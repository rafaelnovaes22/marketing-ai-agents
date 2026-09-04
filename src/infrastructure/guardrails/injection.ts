// Camada 1 anti-injection (briefings antes de qualquer chamada LLM).
//
// 3 camadas do projeto:
//   1. injection.ts (este arquivo): bloqueia 32 padroes no input, log JSON (C6).
//   2. system prompts versionados (prompts/*/v*/system.md) + brand guide: restricoes de voz/conteudo.
//   3. pos-filtros: BrandValidatorAdapter (imagem x brand) + ClaudeVoiceValidator (tom).
//
// Bloqueio nunca alega LLM: lanca InjectionBlockedError deterministico.

export interface InjectionPattern {
  id: string;
  name: string;
  regex: string;
}

export const INJECTION_PATTERNS: InjectionPattern[] = [
  { id: 'INJ01', name: 'ignore-previous-instructions', regex: 'ignor(e|a|e as) (as )?(instrucoes|instru[cç][oõ]es|previous instructions)' },
  { id: 'INJ02', name: 'system-prompt-leak', regex: '(mostre|revele|exiba|show).{0,30}(system prompt|prompt do sistema|instrucao do sistema)' },
  { id: 'INJ03', name: 'jailbreak-dan', regex: '\\bDAN\\b.{0,20}(mode|jailbreak)|jailbreak' },
  { id: 'INJ04', name: 'roleplay-evil', regex: '(aja como|act as|finja ser|pretend to be).{0,30}(hacker|vilao|sem limites|without limits)' },
  { id: 'INJ05', name: 'prompt-injection-pt', regex: '(esqueca|ignore).{0,20}(tudo|regras|guardrails)' },
  { id: 'INJ06', name: 'developer-mode', regex: '(modo desenvolvedor|developer mode|dev mode)' },
  { id: 'INJ07', name: 'base64-exfil', regex: '(codifique|encode).{0,20}base64' },
  { id: 'INJ08', name: 'translate-instruction', regex: '(traduza|translate).{0,20}(instrucoes|instructions)' },
  { id: 'INJ09', name: 'override-guardian', regex: '(desative|disable|bypass|contorne).{0,20}(guardian|filtro|filter|moderacao|validador)' },
  { id: 'INJ10', name: 'xss-script-tag', regex: '<\\s*script[^>]*>' },
  { id: 'INJ11', name: 'xss-img-onerror', regex: '<\\s*img[^>]*onerror' },
  { id: 'INJ12', name: 'xss-svg-onload', regex: '<\\s*svg[^>]*onload' },
  { id: 'INJ13', name: 'xss-javascript-uri', regex: 'javascript\\s*:' },
  { id: 'INJ14', name: 'xss-event-handler', regex: 'on(click|load|error|mouseover|focus)\\s*=' },
  { id: 'INJ15', name: 'sql-injection-union', regex: 'union\\s+select' },
  { id: 'INJ16', name: 'sql-injection-drop', regex: 'drop\\s+table' },
  { id: 'INJ17', name: 'sql-injection-or-1', regex: 'or\\s+1\\s*=\\s*1' },
  { id: 'INJ18', name: 'path-traversal', regex: '\\.\\./\\.\\./' },
  { id: 'INJ19', name: 'ssrf-localhost', regex: '(localhost|127\\.0\\.0\\.1|169\\.254\\.169\\.254)' },
  { id: 'INJ20', name: 'prompt-leak-delimiter', regex: '(###|```).{0,10}(system|instrucao)' },
  { id: 'INJ21', name: 'token-smuggling', regex: '(seu token|api[_-]?key|secret).{0,15}(e |is |:)' },
  { id: 'INJ22', name: 'phishing-redirect', regex: '(wa\\.me|whatsapp).{0,20}(http|bit\\.ly|tinyurl)' },
  { id: 'INJ23', name: 'instruction-in-image', regex: '(leia|read).{0,15}(qr ?code|imagem anexa).{0,15}(instrucao|instruction)' },
  { id: 'INJ24', name: 'multilang-bypass-en', regex: 'from now on.{0,20}(you are|act as)' },
  { id: 'INJ25', name: 'multilang-bypass-es', regex: '(a partir de ahora|de ahora en adelante).{0,20}(eres|actua como)' },
  { id: 'INJ26', name: 'refund-scam', regex: '(reembolso|refund).{0,20}(cartao|pix|conta).{0,20}(envie|informe)' },
  { id: 'INJ27', name: 'pii-harvest-doc', regex: '(informe|digite|envie).{0,20}(cpf|rg|cnpj)' },
  { id: 'INJ28', name: 'pii-harvest-card', regex: '(numero do cartao|card number| CVV |cvv)' },
  { id: 'INJ29', name: 'chain-of-thought-leak', regex: '(mostre seu raciocinio|show your reasoning|chain.of.thought)' },
  { id: 'INJ30', name: 'tool-use-escalation', regex: '(execute|rode|run).{0,20}(comando|command|shell|rm -rf)' },
  { id: 'INJ31', name: 'persona-grandma', regex: '(vozinha|grandma).{0,25}(dormir|sleep).{0,25}(receita|napalm|windows key)' },
  { id: 'INJ32', name: 'indirect-order', regex: '(mensagem no whatsapp|forward).{0,20}(diz para|instructs to).{0,20}(transferir|pagar|pay)' }
];

const COMPILED: Array<{ id: string; re: RegExp }> = INJECTION_PATTERNS.map((p) => ({
  id: p.id,
  re: new RegExp(p.regex, 'i')
}));

export type InjectionScan = { blocked: true; patternId: string } | { blocked: false; patternId: null };

export function scanInjection(text: string): InjectionScan {
  const input = text ?? '';
  for (const c of COMPILED) {
    if (c.re.test(input)) return { blocked: true, patternId: c.id };
  }
  return { blocked: false, patternId: null };
}

export class InjectionBlockedError extends Error {
  readonly patternId: string;
  readonly field: string;

  constructor(field: string, patternId: string, input: string) {
    super(`Briefing bloqueado por injection (${patternId}) no campo ${field}`);
    this.name = 'InjectionBlockedError';
    this.patternId = patternId;
    this.field = field;
    // Log JSON estruturado (C6): evento, pattern, campo, input truncado.
    console.log(JSON.stringify({
      event: 'injection_blocked',
      pattern: patternId,
      field,
      input: (input ?? '').slice(0, 80)
    }));
  }
}

/** Varre campos de texto do briefing; lanca InjectionBlockedError no primeiro match. */
export function assertNoInjection(fields: Record<string, string | undefined>): void {
  for (const [field, value] of Object.entries(fields)) {
    if (!value) continue;
    const r = scanInjection(value);
    if (r.blocked) throw new InjectionBlockedError(field, r.patternId, value);
  }
}
