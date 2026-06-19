// Testes peça B — injeção de ClientMemory no runtime do copywriter (ADR-007-PROJ).
// Verifica: fragment entra no system prompt; span client_memory_load com metadata;
// ausência de clientMemory ⇒ comportamento idêntico ao anterior (zero impacto).

import { beforeEach, describe, expect, it } from 'vitest';
import { GenerateCopywriterOutputUseCase } from '../../../src/application/copywriter-agent/GenerateCopywriterOutputUseCase.js';
import {
  FakeObservability,
  ProgrammableLLM
} from '../../copywriter-agent/unit/fakes.js';
import type {
  ClientMemory,
  ClientMemorySnapshot
} from '../../../src/domain/ports/ClientMemory.js';

const TOM = 'brand_voice_ceo';

const promptMaps = () => ({
  systemPromptByTom: new Map([[TOM, 'PROMPT_TOM']]),
  systemPromptByFramework: new Map([['pas', 'PROMPT_PAS']]),
  systemPromptByOutputType: new Map([['landing', 'PROMPT_LANDING']])
});

const LANDING_JSON = `\`\`\`json
{
  "landing": {
    "hero": { "headline": "H", "subheadline": "S", "cta": "Quero" },
    "sections": [
      { "kind": "problem", "body": "Problema." },
      { "kind": "agitation", "body": "Custo." },
      { "kind": "solution", "body": "Solução." },
      { "kind": "social_proof", "body": "Cases.", "bullets": ["A", "B", "C"] },
      { "kind": "objections", "body": "Objeções.", "bullets": ["x", "y"] },
      { "kind": "final_cta", "body": "Comece." }
    ],
    "ctas": [],
    "word_count": 1750
  }
}
\`\`\``;

const BASE_INPUT = {
  tenantId: 'acme-internal-copywriter-001',
  outputType: 'landing',
  framework: 'pas',
  tomSlug: TOM,
  product: 'Acme Forge',
  audience: 'Founders B2B',
  goal: 'Inscrição',
  context: 'Lançamento de curso intensivo de 14 dias com 7 agentes IA para marketing.',
  isUpsell: false,
  mode: 'shadow' as const
};

class FakeClientMemory implements ClientMemory {
  public loads: string[] = [];
  constructor(private readonly snapshot: Partial<ClientMemorySnapshot>) {}
  async load(tenantId: string): Promise<ClientMemorySnapshot> {
    this.loads.push(tenantId);
    return {
      tenantId,
      soul: this.snapshot.soul ?? null,
      facts: this.snapshot.facts ?? [],
      promptFragment: this.snapshot.promptFragment ?? ''
    };
  }
}

const FRAGMENT = [
  '# Memória deste cliente (self-harness)',
  '',
  '## Identidade e contexto durável',
  'Cliente piloto interno Acme. Tom direto, sem jargão.',
  '',
  '## Fatos aprendidos (confirmados)',
  '### pitfalls',
  '- [shadow] Evitar jargão corporativo nas headlines',
  '- [assisted] CTA deve ser direto e em primeira pessoa'
].join('\n');

function systemMessageOf(llm: ProgrammableLLM): string {
  const msgs = llm.calls[0].messages;
  return msgs.find((m) => m.role === 'system')?.content ?? '';
}

describe('Peça B — injeção de ClientMemory no copywriter', () => {
  let obs: FakeObservability;

  beforeEach(() => {
    obs = new FakeObservability();
  });

  it('injeta o promptFragment como último bloco do system prompt', async () => {
    const llm = new ProgrammableLLM([{ kind: 'success', output: { text: LANDING_JSON } }]);
    const clientMemory = new FakeClientMemory({
      soul: 'Cliente piloto interno Acme.',
      promptFragment: FRAGMENT
    });

    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      ...promptMaps(),
      clientMemory
    });

    await useCase.execute(BASE_INPUT);

    const systemPrompt = systemMessageOf(llm);
    expect(systemPrompt).toContain('Evitar jargão corporativo');
    // memória vem DEPOIS dos prompts estáticos (cache-friendly)
    expect(systemPrompt.indexOf('PROMPT_LANDING')).toBeLessThan(
      systemPrompt.indexOf('Memória deste cliente')
    );
    expect(clientMemory.loads).toEqual(['acme-internal-copywriter-001']);
  });

  it('emite span client_memory_load com metadata de fatos e soul (C6)', async () => {
    const llm = new ProgrammableLLM([{ kind: 'success', output: { text: LANDING_JSON } }]);
    const clientMemory = new FakeClientMemory({
      soul: 'presente',
      promptFragment: FRAGMENT
    });

    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      ...promptMaps(),
      clientMemory
    });

    await useCase.execute(BASE_INPUT);

    const span = obs.spans.find((s) => s.span.name === 'client_memory_load');
    expect(span).toBeDefined();
    expect(span?.span.metadata?.client_facts_injected).toBe(2);
    expect(span?.span.metadata?.client_soul_present).toBe(true);
  });

  it('sem clientMemory: nenhum span de memória e prompt sem bloco de memória (zero impacto)', async () => {
    const llm = new ProgrammableLLM([{ kind: 'success', output: { text: LANDING_JSON } }]);

    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      ...promptMaps()
    });

    await useCase.execute(BASE_INPUT);

    expect(obs.spans.find((s) => s.span.name === 'client_memory_load')).toBeUndefined();
    expect(systemMessageOf(llm)).not.toContain('Memória deste cliente');
  });

  it('cliente sem memória (fragment vazio): injeta nada e não polui o prompt', async () => {
    const llm = new ProgrammableLLM([{ kind: 'success', output: { text: LANDING_JSON } }]);
    const clientMemory = new FakeClientMemory({ promptFragment: '' });

    const useCase = new GenerateCopywriterOutputUseCase({
      llm,
      observability: obs,
      ...promptMaps(),
      clientMemory
    });

    await useCase.execute(BASE_INPUT);

    const span = obs.spans.find((s) => s.span.name === 'client_memory_load');
    expect(span?.span.metadata?.client_facts_injected).toBe(0);
    expect(span?.span.metadata?.client_soul_present).toBe(false);
    // fragment vazio é filtrado da junção do system prompt
    expect(systemMessageOf(llm).endsWith('PROMPT_LANDING')).toBe(true);
  });
});
