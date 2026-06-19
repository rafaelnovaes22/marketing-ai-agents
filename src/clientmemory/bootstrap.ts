// Bootstrap (ADR-007-PROJ): semeia agent-soul.md + agent-memory.md a partir do
// diagnostic.md de um SKU/cliente (C1 — learning vinculado a diagnóstico real).
//
// Lógica PURA e testável (sem IO). O CLI (scripts/bootstrap-client-memory.ts)
// faz a leitura/escrita. Fatos nascem `confidence:local` — não são injetados no
// prompt (piso shadow) até serem confirmados em run formal e curados.

export interface BootstrapInput {
  tenantId: string;
  sku: string;
  diagnosticMd: string;
  /** Data YYYY-MM-DD (injetável para testes determinísticos). */
  date: string;
}

export interface BootstrapArtifacts {
  soul: string;
  memory: string;
}

/** Extrai a "Promessa em uma frase" (outcome contratual C2) do diagnóstico. */
export function extractPromise(diagnosticMd: string): string | null {
  // Procura o bloco de citação logo após "Promessa em uma frase:".
  const idx = diagnosticMd.search(/Promessa em uma frase:/i);
  if (idx === -1) return null;
  const after = diagnosticMd.slice(idx);
  const quote = after.match(/>\s*"?(.+?)"?\s*(?:\n\n|\n#|$)/s);
  return quote ? quote[1].trim().replace(/\s+/g, ' ') : null;
}

/** Extrai os bullets de "## 6. Restrições conhecidas" como constraints. */
export function extractConstraints(diagnosticMd: string): string[] {
  const match = diagnosticMd.match(
    /##\s*\d*\.?\s*Restri[çc][õo]es conhecidas\s*\n([\s\S]*?)(?:\n##\s|\n---|\s*$)/i
  );
  if (!match) return [];
  return match[1]
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '))
    .map((l) => l.replace(/^-\s*/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean);
}

function frontmatterField(md: string, field: string): string | null {
  const re = new RegExp(`^${field}:\\s*(.+)$`, 'm');
  const m = md.match(re);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

/** Constrói soul + memory a partir do diagnóstico. Determinístico. */
export function buildBootstrapArtifacts(input: BootstrapInput): BootstrapArtifacts {
  const { tenantId, sku, diagnosticMd, date } = input;
  const promise = extractPromise(diagnosticMd);
  const constraints = extractConstraints(diagnosticMd);
  const priority = frontmatterField(diagnosticMd, 'priority') ?? 'n/a';

  const soul = [
    `# Agent Soul — ${tenantId}`,
    '',
    `> Identidade durável do agente \`${sku}\` para este cliente. Gerado por bootstrap`,
    `> a partir do diagnóstico (C1). Sempre injetado no prompt (ADR-007-PROJ).`,
    '',
    '## Quem você é',
    '',
    `Você é o agente **${sku}** operando para o cliente \`${tenantId}\` (prioridade ${priority}).`,
    '',
    '## Outcome contratual (C2)',
    '',
    promise ? `> ${promise}` : '_Promessa não extraída do diagnóstico — preencher manualmente._',
    '',
    '## Restrições deste cliente',
    '',
    ...(constraints.length > 0
      ? constraints.map((c) => `- ${c}`)
      : ['_Sem restrições extraídas — revisar diagnóstico._']),
    ''
  ].join('\n');

  // Memory: fatos seed em confidence:local (não injetados até confirmação).
  const seedFacts: string[] = constraints.map(
    (c) => `§ [confidence:local] [${date}] [run:bootstrap] ${truncate(c, 160)}`
  );

  const memory = [
    `# Agent Memory — ${tenantId}`,
    '',
    `> Fatos aprendidos sobre o cliente. Formato § (learning-curator). Fatos`,
    `> \`local\` são audit trail e NÃO são injetados (piso shadow) até confirmação.`,
    '',
    '## § tech_constraints',
    '',
    ...(seedFacts.length > 0 ? seedFacts : ['_Sem seeds — preencher após primeiros runs._']),
    '',
    '## § pitfalls',
    '',
    '<!-- Preenchido pela curadoria a partir de feedback humano em ASSISTED -->',
    '',
    '## § confirmed_patterns',
    '',
    '<!-- Preenchido pela curadoria após runs aprovados em ASSISTED+ -->',
    ''
  ].join('\n');

  return { soul, memory };
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
