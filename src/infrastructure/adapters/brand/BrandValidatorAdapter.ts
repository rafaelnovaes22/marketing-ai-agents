// Adapter: Brand Validator usando Claude Sonnet 4.6 vision
// Compara imagem gerada × brand_guide.yaml e retorna score 0.0-1.0 + issues.

import type {
  BrandValidationInput,
  BrandValidationOutput,
  BrandValidator,
  BrandValidationIssue
} from '../../../domain/ports/BrandValidator.js';
import type { LLMProvider } from '../../../domain/ports/LLMProvider.js';
import type { BrandGuide } from '../../../domain/carrossel/BrandGuide.js';

export interface BrandValidatorAdapterConfig {
  llmProvider: LLMProvider;
  brandGuide: BrandGuide;
}

interface JudgeResponse {
  score: number;            // 0.0 - 1.0
  decision: 'accept' | 'accept_with_warning' | 'retry';
  issues: BrandValidationIssue[];
}

export class BrandValidatorAdapter implements BrandValidator {
  private readonly llmProvider: LLMProvider;
  private readonly brandGuide: BrandGuide;

  constructor(config: BrandValidatorAdapterConfig) {
    this.llmProvider = config.llmProvider;
    this.brandGuide = config.brandGuide;
  }

  async validate(input: BrandValidationInput): Promise<BrandValidationOutput> {
    const start = Date.now();

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt();

    const response = await this.llmProvider.generateWithVision({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      images: [
        {
          base64: input.imageBase64,
          mimeType: input.imageMimeType
        }
      ],
      maxTokens: 1024,
      temperature: 0.1,
      cacheControl: true   // brand_guide context é estável
    });

    const latencyMs = Date.now() - start;

    let judge: JudgeResponse;
    try {
      const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response.text;
      judge = JSON.parse(jsonText);
    } catch (err) {
      // Fallback se Claude não retornar JSON limpo
      judge = {
        score: 0.0,
        decision: 'retry',
        issues: [
          {
            category: 'other',
            severity: 'critical',
            description: `Falha ao parsear veredicto: ${
              err instanceof Error ? err.message : String(err)
            }`
          }
        ]
      };
    }

    return {
      score: judge.score,
      decision: this.brandGuide.decisaoBrandScore(judge.score),
      issues: judge.issues,
      costBrl: response.costBrl,
      latencyMs
    };
  }

  private buildSystemPrompt(): string {
    const colors = this.brandGuide.todasAsCores().join(', ');
    const headingsFont = this.brandGuide.typography.headings.family;
    const bodyFont = this.brandGuide.typography.body.family;

    return `# Brand Validator — Novais Digital

Você é um auditor de brand consistency. Avalia se imagens geradas por IA seguem o brand guide oficial.

## Brand Novais Digital (canônico)

**Cores permitidas (EXCLUSIVAS):**
${colors}

Qualquer cor fora dessa lista = violation.

**Tipografia permitida:**
- Headlines: ${headingsFont}
- Body: ${bodyFont}

**Composição:**
- Layout center-aligned
- Cantos arredondados (botões pill, cards 16px)
- Whitespace generoso

## Tarefa

Avalie a imagem fornecida em 4 dimensões:
1. **color** (peso 40%): Todas as cores estão na lista permitida?
2. **typography** (peso 30%): Texto em ${headingsFont}/${bodyFont}?
3. **composition** (peso 20%): Center-aligned + whitespace?
4. **corner_radius** (peso 10%): Cantos arredondados?

## Output (JSON dentro de \`\`\`json ... \`\`\`)

\`\`\`json
{
  "score": 0.98,
  "decision": "accept",
  "issues": [
    {
      "category": "color",
      "severity": "warning",
      "description": "Slide tem #2563EB mas com brilho ligeiramente alterado (~98% match)"
    }
  ]
}
\`\`\`

- score: 0.0 a 1.0 (1.0 = perfeito match)
- decision: "accept" (≥0.99) | "accept_with_warning" (0.96-0.98) | "retry" (<0.96)
- issues: array com categoria, severidade (critical/warning/info), descrição`;
  }

  private buildUserPrompt(): string {
    return 'Avalie esta imagem contra o brand guide Novais Digital. Retorne APENAS JSON válido conforme o formato.';
  }
}
