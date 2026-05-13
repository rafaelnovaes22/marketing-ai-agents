# Output — Landing page (Tipo A)

Retorne **JSON dentro de bloco ```json ... ```** seguindo o schema canônico abaixo
(`schema_version: 1.0.0`).

## Estrutura JSON (chave principal `landing`)

```json
{
  "landing": {
    "hero": {
      "headline": "...",       // ≤ 90 chars, gancho central
      "subheadline": "...",    // ≤ 180 chars, expansão do hero
      "cta": "..."             // verbo no imperativo + benefício
    },
    "sections": [
      { "kind": "problem",      "body": "..." },
      { "kind": "agitation",    "body": "..." },
      { "kind": "solution",     "body": "..." },
      { "kind": "social_proof", "body": "...", "bullets": ["case 1", "case 2", "case 3"] },
      { "kind": "objections",   "body": "...", "bullets": ["objeção 1 + resposta", "objeção 2 + resposta"] },
      { "kind": "final_cta",    "body": "..." }
    ],
    "ctas": ["CTA secundário 1", "CTA secundário 2"],
    "word_count": 1750
  }
}
```

## Regras

- **Todas as 6 seções são obrigatórias.** Faltar 1 = re-roll.
- `social_proof.bullets`: mínimo 3 itens (cada um pode ser nome + número + 1 frase).
- `objections.bullets`: mínimo 2 itens, formato "objeção: resposta".
- `word_count` = soma de palavras de `hero` + `sections` (sem contar `ctas`).
- Default: 1.500-2.000 palavras (±10%). Upsell (briefing.is_upsell=true): 2.500-3.500.

## Boas práticas

- 1 ideia por parágrafo. Parágrafos com 2-4 linhas no markdown renderizado.
- Repetir o CTA em variações ao longo do texto (não só no final).
- Usar a 2ª pessoa (você) em ≥80% do texto.
