// Adapter: FileClientMemory — implementa ClientMemory + ClientMemoryWriter sobre
// o filesystem (docs/clients/{tenantId}/). Ver ADR-007-PROJ e self-harness.md.
//
// C7: lê markdown agnóstico de modelo. C8: tenantId é só path/param, sem ramificação.
// Degradação graciosa: cliente sem diretório → snapshot vazio (não quebra o run).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  ClientFact,
  ClientMemory,
  ClientMemorySnapshot,
  ClientMemoryWriter,
  FactConfidence,
  MemorySection
} from '../../../domain/ports/ClientMemory.js';
import { selectInjectable } from '../../../domain/clientmemory/factSelection.js';

// Re-export para consumidores que já importavam daqui (compat).
export {
  buildStyleDirectives,
  type StyleDirectivesOptions
} from '../../../domain/clientmemory/factSelection.js';

const SECTIONS: readonly MemorySection[] = [
  'integration_quirks',
  'process_patterns',
  'pitfalls',
  'confirmed_patterns',
  'tech_constraints',
  'economics_real',
  'telemetry_hints',
  'pii_categories'
];

const CONFIDENCES = new Set<FactConfidence>(['local', 'shadow', 'assisted', 'autonomous']);

// Linha de fato:   § [confidence:shadow] [2026-05-18] [run:gh-1234] descrição
const FACT_RE =
  /^§\s*\[confidence:(\w+)\]\s*\[([0-9-]*)\]\s*\[run:([^\]]*)\]\s*(.+?)\s*$/;
// Header de seção:  ## § integration_quirks   (ou ####, ou sem #)
const SECTION_RE = new RegExp(`^#*\\s*§\\s+(${SECTIONS.join('|')})\\s*$`);

/** Parser puro do agent-memory.md → fatos. Tolerante a CRLF e a headers de seção. */
export function parseClientFacts(markdown: string): ClientFact[] {
  const facts: ClientFact[] = [];
  let currentSection: MemorySection = 'confirmed_patterns';

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      currentSection = sectionMatch[1] as MemorySection;
      continue;
    }

    const factMatch = line.match(FACT_RE);
    if (!factMatch) continue;

    const [, rawConfidence, date, runId, text] = factMatch;
    if (!CONFIDENCES.has(rawConfidence as FactConfidence)) continue; // ignora malformado

    facts.push({
      section: currentSection,
      confidence: rawConfidence as FactConfidence,
      date,
      runId,
      text,
      obsolete: /\[OBSOLETO\]/i.test(text)
    });
  }

  return facts;
}

/** Serializa um fato na linha § canônica. */
export function serializeFact(fact: ClientFact): string {
  return `§ [confidence:${fact.confidence}] [${fact.date}] [run:${fact.runId}] ${fact.text}`;
}

export interface FileClientMemoryConfig {
  /** Raiz dos dados por cliente. Default: docs/clients */
  root?: string;
  /**
   * Piso de confiança para INJEÇÃO no prompt (C4). Default 'shadow':
   * fatos `local` (ex: bootstrap não confirmado) ficam como audit trail mas
   * não mudam o comportamento do agente até serem confirmados em run formal.
   */
  injectionFloor?: FactConfidence;
  /** Máximo de fatos injetados (orçamento de contexto). Default 20. */
  maxFacts?: number;
  /** Teto de caracteres do fragment (≈ tokens/4). Default 4000. */
  maxChars?: number;
}

export class FileClientMemory implements ClientMemory, ClientMemoryWriter {
  private readonly root: string;
  private readonly injectionFloor: FactConfidence;
  private readonly maxFacts: number;
  private readonly maxChars: number;

  constructor(config: FileClientMemoryConfig = {}) {
    this.root = config.root ?? join('docs', 'clients');
    this.injectionFloor = config.injectionFloor ?? 'shadow';
    this.maxFacts = config.maxFacts ?? 20;
    this.maxChars = config.maxChars ?? 4000;
  }

  async load(tenantId: string): Promise<ClientMemorySnapshot> {
    const soul = this.readFileOrNull(this.soulPath(tenantId));
    const memoryRaw = this.readFileOrNull(this.memoryPath(tenantId));
    const facts = memoryRaw ? parseClientFacts(memoryRaw) : [];
    const promptFragment = this.buildFragment(soul, facts);
    return { tenantId, soul, facts, promptFragment };
  }

  async appendFact(tenantId: string, fact: ClientFact): Promise<void> {
    const path = this.memoryPath(tenantId);
    const line = serializeFact(fact);
    const header = `## § ${fact.section}`;

    if (!existsSync(path)) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(
        path,
        `# Agent Memory — ${tenantId}\n\n${header}\n\n${line}\n`,
        'utf-8'
      );
      return;
    }

    const content = readFileSync(path, 'utf-8');
    const lines = content.split(/\r?\n/);
    const headerIdx = lines.findIndex((l) =>
      l.trim().match(new RegExp(`^#*\\s*§\\s+${fact.section}\\s*$`))
    );

    if (headerIdx === -1) {
      const trimmed = content.replace(/\s*$/, '');
      writeFileSync(path, `${trimmed}\n\n${header}\n\n${line}\n`, 'utf-8');
      return;
    }

    // Insere o fato logo após o header da seção.
    lines.splice(headerIdx + 1, 0, '', line);
    writeFileSync(path, lines.join('\n'), 'utf-8');
  }

  /** Monta o bloco para o system prompt. SOUL sempre entra; fatos são gated. */
  private buildFragment(soul: string | null, facts: ClientFact[]): string {
    const eligible = selectInjectable(facts, this.injectionFloor, this.maxFacts);

    if (!soul && eligible.length === 0) return '';

    const parts: string[] = ['# Memória deste cliente (self-harness)'];

    if (soul) {
      parts.push('## Identidade e contexto durável', soul.trim());
    }

    if (eligible.length > 0) {
      const bySection = new Map<MemorySection, ClientFact[]>();
      for (const f of eligible) {
        const list = bySection.get(f.section) ?? [];
        list.push(f);
        bySection.set(f.section, list);
      }
      parts.push('## Fatos aprendidos (confirmados)');
      for (const [section, list] of bySection) {
        parts.push(`### ${section}`);
        for (const f of list) parts.push(`- [${f.confidence}] ${f.text}`);
      }
    }

    let fragment = parts.join('\n\n');
    if (fragment.length > this.maxChars) {
      fragment = `${fragment.slice(0, this.maxChars)}\n…(memória truncada por orçamento de contexto)`;
    }
    return fragment;
  }

  private soulPath(tenantId: string): string {
    return join(this.root, tenantId, 'agent-soul.md');
  }

  private memoryPath(tenantId: string): string {
    return join(this.root, tenantId, 'agent-memory.md');
  }

  private readFileOrNull(path: string): string | null {
    if (!existsSync(path)) return null;
    const content = readFileSync(path, 'utf-8').trim();
    return content.length > 0 ? content : null;
  }
}
