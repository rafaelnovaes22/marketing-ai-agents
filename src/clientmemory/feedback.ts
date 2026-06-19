// CLI: `npm run feedback:record -- <payload.json>` (ADR-007-PROJ)
//
// Ponto de ingestão fino do feedback humano em ASSISTED até existir UI. Lê um
// JSON com o FeedbackEvent e grava um learning snapshot consumível pelo curator.
//
// Payload (JSON):
//   {
//     "tenantId": "acme-internal-copywriter-001",
//     "sku": "copywriter-agent",
//     "traceId": "ls-abc123",
//     "outputType": "landing",
//     "mode": "assisted",
//     "verdict": "edited",
//     "editSummary": "Encurtou hero e trocou jargão 'sinergia' por linguagem direta",
//     "originalLength": 1820,
//     "finalLength": 1610
//   }

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FeedbackEvent } from '../domain/clientmemory/FeedbackEvent.js';
import { RecordClientFeedbackUseCase } from '../application/clientmemory/RecordClientFeedbackUseCase.js';

function main(): number {
  const [, , payloadPath] = process.argv;
  if (!payloadPath) {
    throw new Error(
      'Uso: npm run feedback:record -- <payload.json>\n' +
        'Ver src/clientmemory/feedback.ts para o schema do payload.'
    );
  }

  const raw = readFileSync(resolve(payloadPath), 'utf-8');
  const event = FeedbackEvent.create(JSON.parse(raw));

  const useCase = new RecordClientFeedbackUseCase();
  const { snapshotPath, factLine } = useCase.execute(event);

  console.log(`[feedback] snapshot=${snapshotPath}`);
  console.log(`[feedback] fato candidato: ${factLine}`);
  console.log('[feedback] curar com: /acme:learn ' + event.tenantId);
  return 0;
}

try {
  process.exit(main());
} catch (err) {
  console.error(`[feedback] ERRO: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
