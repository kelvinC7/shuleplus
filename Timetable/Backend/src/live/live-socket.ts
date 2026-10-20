import http from 'http';
import jwt from 'jsonwebtoken';
import { WebSocket, WebSocketServer } from 'ws';
import { env } from '../config/env';
import type { JwtPayload } from '../middleware/auth.middleware';

const orgClients = new Map<string, Set<WebSocket>>();

function canAccessLive(payload: JwtPayload) {
  const mods = payload.modules ?? [];
  return (
    mods.includes(env.MODULE_SLUG) ||
    mods.includes('timetable') ||
    mods.includes('teacher-portal') ||
    Boolean(payload.organizationId)
  );
}

export function attachLiveWebSocket(server: http.Server) {
  const path = `${env.API_PREFIX}/live/ws`;
  const wss = new WebSocketServer({ server, path });

  wss.on('connection', (ws, req) => {
    try {
      const host = req.headers.host ?? 'localhost';
      const url = new URL(req.url ?? path, `http://${host}`);
      const token = url.searchParams.get('token');
      if (!token) {
        ws.close(4401, 'Authentication required');
        return;
      }

      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      if (!canAccessLive(payload)) {
        ws.close(4403, 'Module not licensed');
        return;
      }

      const orgId = payload.organizationId;
      if (!orgId) {
        ws.close(4401, 'Missing organization');
        return;
      }

      let clients = orgClients.get(orgId);
      if (!clients) {
        clients = new Set();
        orgClients.set(orgId, clients);
      }
      clients.add(ws);

      ws.send(JSON.stringify({ type: 'connected', organizationId: orgId, at: new Date().toISOString() }));

      ws.on('close', () => {
        clients?.delete(ws);
        if (clients?.size === 0) orgClients.delete(orgId);
      });
    } catch {
      ws.close(4401, 'Invalid token');
    }
  });

  console.log(`[Timetable] Live WebSocket on ws://localhost:${env.PORT}${path}`);
}

export function emitLiveMonitorChanged(
  organizationId: string,
  detail: Record<string, unknown> = {}
) {
  const clients = orgClients.get(organizationId);
  if (!clients?.size) return;

  const payload = JSON.stringify({
    type: 'live_update',
    ...detail,
    at: new Date().toISOString(),
  });

  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}
