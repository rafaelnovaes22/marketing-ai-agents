// Seleção de fatos para injeção (ADR-007-PROJ) — lógica PURA de domínio.
// Compartilhada pelo adapter (buildFragment) e pelos use cases que precisam de
// uma forma compacta (ex.: designer injeta diretrizes no prompt de imagem).

import type { ClientFact, FactConfidence } from '../ports/ClientMemory.js';

export const CONFIDENCE_ORDER: Record<FactConfidence, number> = {
  local: 0,
  shadow: 1,
  assisted: 2,
  autonomous: 3
};

/** Fatos elegíveis a injeção: não-obsoletos, confidence ≥ piso, ordenados (forte/recente). */
export function selectInjectable(
  facts: ClientFact[],
  floor: FactConfidence,
  maxFacts: number
): ClientFact[] {
  return facts
    .filter((f) => !f.obsolete)
    .filter((f) => CONFIDENCE_ORDER[f.confidence] >= CONFIDENCE_ORDER[floor])
    .sort((a, b) => {
      const byConf = CONFIDENCE_ORDER[b.confidence] - CONFIDENCE_ORDER[a.confidence];
      return byConf !== 0 ? byConf : b.date.localeCompare(a.date);
    })
    .slice(0, maxFacts);
}

export interface StyleDirectivesOptions {
  injectionFloor?: FactConfidence;
  maxFacts?: number;
  maxChars?: number;
}

/**
 * Linha COMPACTA de diretrizes a partir dos fatos confirmados — adequada para
 * prompts não-textuais (ex.: prompt de imagem do designer), onde o promptFragment
 * markdown verboso poluiria. Vazio se não houver elegíveis.
 */
export function buildStyleDirectives(
  facts: ClientFact[],
  opts: StyleDirectivesOptions = {}
): string {
  const selected = selectInjectable(
    facts,
    opts.injectionFloor ?? 'shadow',
    opts.maxFacts ?? 5
  ).map((f) => f.text.replace(/\s+/g, ' ').trim());

  let out = selected.join('; ');
  const maxChars = opts.maxChars ?? 400;
  if (out.length > maxChars) out = `${out.slice(0, maxChars - 1)}…`;
  return out;
}
