# Output — Sequência de e-mail (Tipo B)

Retorne **JSON dentro de bloco ```json ... ```** seguindo o schema canônico abaixo
(`schema_version: 1.0.0`).

## Estrutura JSON (chave principal `email_sequence`)

```json
{
  "email_sequence": {
    "emails": [
      {
        "position": 1,
        "subject": "...",                  // ≤ 60 chars
        "preview_text": "...",             // ≤ 100 chars
        "body": "... markdown ...",
        "cta": "Reservar minha vaga",
        "send_offset_hours": 0,
        "references_previous": false
      },
      {
        "position": 2,
        "subject": "...",
        "preview_text": "...",
        "body": "...",
        "cta": "...",
        "send_offset_hours": 24,
        "references_previous": true
      }
      // ... até position 4 (default) ou 5
    ],
    "total_word_count": 1600
  }
}
```

## Regras

- **3-5 emails** (default 4). Posições contínuas 1..N.
- `total_word_count` = soma das palavras de `body` dos emails. Range: 1.200-2.000.
- Ao menos 1 email com `position > 1` deve ter `references_previous=true` (conectividade narrativa).
- `send_offset_hours` indica horas após o email anterior (primeiro = 0).
- `subject` deve evitar palavras-gatilho de spam (free, grátis, urgente!!).

## Frameworks suportados (use o declarado no briefing)

- **soap_opera** (default): cliffhanger no final de cada email + abertura amarrando o gancho.
- **welcome_series**: foco em onboarding + estabelecer expectativa + 1 oferta no último.
- **aida**: AIDA condensado por email (cada email é um AIDA completo).
- **storybrand**: cada email avança 1 etapa do arco hero→success.
