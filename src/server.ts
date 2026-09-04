// Entrypoint deployável mínimo (C2 outcome-first, C6 observabilidade, C7 portabilidade).
// Expõe /health (Railway healthcheck) e /skus (7 SKUs canônicos de docs/foundry/project.json).
// Zero SDK de LLM aqui: só node:http + pino. Sem branch por tenant (C8).

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pino from 'pino';

export interface SkuStatus {
  id: string;
  outcome: string;
  priceBrl: number;
  slaSeconds: number;
  priority: string;
  stage: string;
}

interface ProjectModule {
  id: string;
  outcome_unit: string;
  outcome_price_brl: number;
  target_sla_seconds: number;
  priority: string;
  current_stage: string;
}

const CANONICAL_SKUS: string[] = [
  'social-media-agent',
  'copywriter-agent',
  'designer-agent',
  'trafego-agent',
  'video-editor-agent',
  'estrategista-agent',
  'atendimento-dm-agent'
];

const FALLBACK_SKUS: SkuStatus[] = [
  { id: 'social-media-agent', outcome: 'carrossel_publicado', priceBrl: 12, slaSeconds: 480, priority: 'P0', stage: 'draft' },
  { id: 'copywriter-agent', outcome: 'landing_ou_email_ou_ad_entregue', priceBrl: 80, slaSeconds: 900, priority: 'P0', stage: 'draft' },
  { id: 'designer-agent', outcome: 'carrossel_design_completo', priceBrl: 20, slaSeconds: 1200, priority: 'P0', stage: 'draft' },
  { id: 'trafego-agent', outcome: 'campanha_meta_publicada', priceBrl: 50, slaSeconds: 300, priority: 'P1', stage: 'draft' },
  { id: 'video-editor-agent', outcome: 'video_curto_pronto', priceBrl: 30, slaSeconds: 600, priority: 'P1', stage: 'draft' },
  { id: 'estrategista-agent', outcome: 'diagnostico_funil_completo', priceBrl: 100, slaSeconds: 120, priority: 'P2', stage: 'draft' },
  { id: 'atendimento-dm-agent', outcome: 'lead_qualificado_dm', priceBrl: 5, slaSeconds: 10, priority: 'P2', stage: 'draft_internal_only' }
];

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const startedAt: number = Date.now();

export function buildSkuList(repoRoot: string = process.cwd()): SkuStatus[] {
  try {
    const raw = readFileSync(resolve(repoRoot, 'docs/foundry/project.json'), 'utf8');
    const parsed = JSON.parse(raw) as { modules: ProjectModule[] };
    const byId = new Map(parsed.modules.map((m) => [m.id, m]));
    return CANONICAL_SKUS.map((id) => toSkuStatus(id, byId.get(id)));
  } catch {
    return FALLBACK_SKUS;
  }
}

function toSkuStatus(id: string, found: ProjectModule | undefined): SkuStatus {
  if (found) {
    return {
      id: found.id,
      outcome: found.outcome_unit,
      priceBrl: found.outcome_price_brl,
      slaSeconds: found.target_sla_seconds,
      priority: found.priority,
      stage: found.current_stage
    };
  }
  const fallback = FALLBACK_SKUS.find((s) => s.id === id);
  if (!fallback) throw new Error(`[server] SKU canônico sem fallback: ${id}`);
  return fallback;
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}

export function createRequestListener(): (req: IncomingMessage, res: ServerResponse) => void {
  const skus: SkuStatus[] = buildSkuList();
  return (req: IncomingMessage, res: ServerResponse): void => {
    if (req.url === '/health' && req.method === 'GET') {
      sendJson(res, 200, { status: 'ok', uptime_s: Math.floor((Date.now() - startedAt) / 1000) });
      return;
    }
    if (req.url === '/skus' && req.method === 'GET') {
      sendJson(res, 200, { count: skus.length, skus });
      return;
    }
    if ((req.url === '/' || req.url === '') && req.method === 'GET') {
      sendJson(res, 200, { name: 'marketing-ai-agents', health: '/health', skus: '/skus' });
      return;
    }
    sendJson(res, 404, { error: 'not_found' });
  };
}

export function startServer(port: number): Server {
  const server: Server = createServer(createRequestListener());
  server.listen(port, () => {
    logger.info({ port, skus: 7 }, 'server_listening');
  });
  return server;
}

function resolvePort(): number {
  const raw: string | undefined = process.env.PORT;
  const parsed: number = raw ? Number(raw) : 3000;
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`[server] PORT inválida: ${raw}`);
  return parsed;
}

if (process.argv[1]?.endsWith('server.ts')) {
  startServer(resolvePort());
}
