// Loader: lê brand/acme-brand-guide.yaml e constrói BrandGuide entity.
// Fica em infrastructure porque depende de FS + parser YAML.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { z } from 'zod';
import { BrandGuide } from '../../domain/carrossel/BrandGuide.js';

// Schema de validação Zod (defesa contra YAML mal-formado)
const brandSchema = z.object({
  version: z.string(),
  brand_name: z.string(),
  tagline: z.string(),
  colors: z.object({
    primary: z.object({
      navy_deep: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      royal_blue: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      cyan_accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      white: z.string().regex(/^#[0-9A-Fa-f]{6}$/)
    }),
    secondary: z.object({
      off_white: z.string(),
      text_secondary: z.string(),
      card_bg_dark: z.string()
    }),
    status: z.object({
      badge_red: z.string(),
      badge_green: z.string()
    }),
    tolerance: z.object({
      exact_match_required: z.number().min(0).max(100),
      warning_threshold: z.number().min(0).max(100),
      rejection_threshold: z.number().min(0).max(100)
    })
  }),
  typography: z.object({
    headings: z.object({ family: z.string(), weights: z.array(z.number()) }),
    body: z.object({ family: z.string(), weights: z.array(z.number()) }),
    logo: z.object({ family: z.string(), weight: z.number() })
  })
});

export class BrandGuideLoader {
  static fromYamlFile(path?: string): BrandGuide {
    const resolvedPath = resolve(path ?? 'brand/acme-brand-guide.yaml');
    const yamlText = readFileSync(resolvedPath, 'utf-8');
    return BrandGuideLoader.fromYamlString(yamlText);
  }

  static fromYamlString(yamlText: string): BrandGuide {
    const parsed = parseYaml(yamlText);
    const validated = brandSchema.parse(parsed);

    return new BrandGuide(
      validated.version,
      validated.brand_name,
      validated.tagline,
      {
        primary: validated.colors.primary,
        secondary: validated.colors.secondary,
        status: validated.colors.status
      },
      {
        headings: validated.typography.headings,
        body: validated.typography.body,
        logo: validated.typography.logo
      },
      validated.colors.tolerance,
      parsed as Record<string, unknown>
    );
  }
}
