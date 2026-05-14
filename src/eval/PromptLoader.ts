// Carrega prompts/{artifactId}/v{version}/system.md e calcula prompt_hash (SHA-256).
// Suporta autodetecção da maior versão semver disponível.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import type { PromptArtifact } from './types.js';

export class PromptLoader {
  constructor(private readonly repoRoot: string) {}

  load(artifactId: string, version?: string): PromptArtifact {
    const baseDir = resolve(this.repoRoot, 'prompts', artifactId);
    const resolvedVersion = version ?? this.detectLatestVersion(baseDir);
    const systemPath = join(baseDir, `v${resolvedVersion}`, 'system.md');
    let systemPrompt: string;
    try {
      systemPrompt = readFileSync(systemPath, 'utf-8');
    } catch (err) {
      throw new Error(
        `PromptLoader: prompt não encontrado em ${systemPath}. ` +
          `Versione o system prompt em prompts/${artifactId}/v${resolvedVersion}/system.md`
      );
    }
    const promptHash = createHash('sha256')
      .update(systemPrompt)
      .digest('hex')
      .slice(0, 16); // hash curto (16 hex = 64 bits) para usar em nome de arquivo

    return {
      artifactId,
      version: resolvedVersion,
      systemPrompt,
      promptHash
    };
  }

  private detectLatestVersion(baseDir: string): string {
    let dirs: string[];
    try {
      dirs = readdirSync(baseDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^v\d+\.\d+\.\d+$/.test(d.name))
        .map((d) => d.name.slice(1));
    } catch (err) {
      throw new Error(
        `PromptLoader: pasta de prompts não encontrada: ${baseDir}`
      );
    }
    if (dirs.length === 0) {
      throw new Error(
        `PromptLoader: nenhuma versão v*.* em ${baseDir}. Crie ao menos uma (ex: v0.1.0/system.md).`
      );
    }
    return dirs.sort(compareSemver).at(-1)!;
  }
}

function compareSemver(a: string, b: string): number {
  const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
  const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}
