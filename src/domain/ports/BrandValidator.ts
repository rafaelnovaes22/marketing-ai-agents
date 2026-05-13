// Port: Brand Validator
// Compara imagem gerada contra brand_guide.yaml.
// Implementação usa LLM vision (Claude Sonnet 4.6).

export interface BrandValidationInput {
  imageBase64: string;
  imageMimeType: 'image/jpeg' | 'image/png';
}

export interface BrandValidationIssue {
  category: 'color' | 'typography' | 'composition' | 'corner_radius' | 'other';
  severity: 'critical' | 'warning' | 'info';
  description: string;
}

export interface BrandValidationOutput {
  score: number;                 // 0.0 - 1.0
  decision: 'accept' | 'accept_with_warning' | 'retry';
  issues: BrandValidationIssue[];
  costBrl: number;
  latencyMs: number;
}

export interface BrandValidator {
  validate(input: BrandValidationInput): Promise<BrandValidationOutput>;
}
