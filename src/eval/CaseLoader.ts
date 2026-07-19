// Carrega casos de evals/{artifact_id}/cases/*.md
// Cada arquivo é frontmatter YAML + body livre.

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import {
  CaseFrontmatterSchema,
  type LoadedCase,
  type CaseFrontmatter
} from './types.js';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export interface CaseLoaderOptions {
  /** Filtro: subset=all | category=<x> | source_mode=<x> | critical_path */
  subset?: string;
}

export class CaseLoader {
  constructor(private readonly repoRoot: string) {}

  loadCases(artifactId: string, options: CaseLoaderOptions = {}): LoadedCase[] {
    const casesDir = resolve(this.repoRoot, 'evals', artifactId, 'cases');
    let files: string[];
    try {
      files = readdirSync(casesDir)
        .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
        .sort();
    } catch (err) {
      throw new Error(
        `CaseLoader: diretório não encontrado: ${casesDir}. ` +
          `Crie a estrutura com /novais-digital:eval ou migre manualmente do docs/foundry/sku/${artifactId}/eval-cases.md`
      );
    }
    if (files.length === 0) {
      throw new Error(`CaseLoader: nenhum case .md em ${casesDir}`);
    }

    const allCases = files.map((file) =>
      this.parseCase(join(casesDir, file), artifactId)
    );
    return this.applySubset(allCases, options.subset ?? 'all');
  }

  private parseCase(filePath: string, expectedArtifactId: string): LoadedCase {
    const content = readFileSync(filePath, 'utf-8');
    const match = content.match(FRONTMATTER_RE);
    if (!match) {
      throw new Error(`CaseLoader: frontmatter ausente em ${filePath}`);
    }
    const rawFront = parseYaml(match[1]) as unknown;
    let frontmatter: CaseFrontmatter;
    try {
      frontmatter = CaseFrontmatterSchema.parse(rawFront);
    } catch (err) {
      throw new Error(
        `CaseLoader: frontmatter inválido em ${filePath}: ${(err as Error).message}`
      );
    }
    if (frontmatter.sku_id !== expectedArtifactId) {
      throw new Error(
        `CaseLoader: sku_id "${frontmatter.sku_id}" em ${filePath} não bate com artifactId "${expectedArtifactId}"`
      );
    }
    return {
      frontmatter,
      body: match[2].trim(),
      sourcePath: filePath
    };
  }

  private applySubset(cases: LoadedCase[], subset: string): LoadedCase[] {
    if (subset === 'all') return cases;
    if (subset === 'critical_path') {
      return cases.filter((c) => c.frontmatter.critical_path);
    }
    const [key, value] = subset.split('=');
    if (key === 'category') {
      return cases.filter((c) => c.frontmatter.outcome_category === value);
    }
    if (key === 'source_mode') {
      return cases.filter((c) => c.frontmatter.source_mode === value);
    }
    if (key === 'case_id') {
      return cases.filter((c) => c.frontmatter.case_id === value);
    }
    throw new Error(`CaseLoader: subset desconhecido: ${subset}`);
  }
}
