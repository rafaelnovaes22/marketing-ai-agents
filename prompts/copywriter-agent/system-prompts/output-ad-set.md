# Output — 5 variações de anúncio Meta (Tipo C)

Retorne **JSON dentro de bloco ```json ... ```** seguindo o schema canônico abaixo
(`schema_version: 1.0.0`).

## Estrutura JSON (chave principal `ad_set`)

```json
{
  "ad_set": {
    "variations": [
      {
        "angle": "pain",
        "headline": "...",          // ≤ 40 chars
        "primary_text": "...",      // ≤ 125 chars
        "description": "..."        // ≤ 30 chars
      },
      { "angle": "aspiration", "headline": "...", "primary_text": "...", "description": "..." },
      { "angle": "fomo", "headline": "...", "primary_text": "...", "description": "..." },
      { "angle": "authority", "headline": "...", "primary_text": "...", "description": "..." },
      { "angle": "social_proof", "headline": "...", "primary_text": "...", "description": "..." }
    ]
  }
}
```

## Regras

- **Exatamente 5 variações**, **uma por ângulo**. Sem duplicar.
- 5 ângulos canônicos (Tree-of-Thought, ADR-004-CW):
  - **pain**: foca na dor crua do leitor (e na consequência se nada mudar).
  - **aspiration**: foca no resultado idealizado, sensação de "ter chegado lá".
  - **fomo**: foca em escassez, exclusividade, "outros já estão".
  - **authority**: usa credenciais, número de clientes, anos de mercado.
  - **social_proof**: usa cases reais com nome/empresa.
- Limites Meta validados na entrega: headline ≤40, primary_text ≤125, description ≤30.
- Diversidade entre `primary_text` (cosine similarity ≤ 0,55 → diversidade ≥ 0,45) — calculada fora deste prompt.

## Boas práticas

- Headlines devem ser variadas em estrutura (não todas começarem com verbo no imperativo).
- Cada `primary_text` termina sem CTA explícita — CTA fica em `description`.
- Evitar pontuação dramática (3+ pontos de exclamação).
