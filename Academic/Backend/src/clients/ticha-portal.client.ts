import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

const BASE = env.TICHA_PORTAL_API_URL.replace(/\/$/, '');

async function tichaFetch(
  path: string,
  opts?: { method?: string; query?: Record<string, string | number | undefined>; body?: unknown }
) {
  let url: URL;
  try {
    url = new URL(`${BASE}${path.startsWith('/') ? path : `/${path}`}`);
  } catch {
    throw new AppError(
      500,
      `Invalid TICHA_PORTAL_API_URL (${BASE}). Set http://127.0.0.1:4003/api on the server.`
    );
  }
  if (opts?.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
  }
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: opts?.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'academic',
      },
      body: opts?.body != null ? JSON.stringify(opts.body) : undefined,
    });
  } catch (cause) {
    const hint = cause instanceof Error ? cause.message : String(cause);
    throw new AppError(
      502,
      `Cannot reach TichaPortal at ${BASE}. Check ticha-api (pm2) and TICHA_PORTAL_API_URL. (${hint})`
    );
  }
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: unknown;
    message?: string;
  };
  if (!res.ok) {
    throw new AppError(res.status >= 500 ? 502 : res.status, json.message || `TichaPortal ${res.status}`);
  }
  return json.data ?? json;
}

export async function listTeacherPermissionRequests(
  organizationId: string,
  query?: Record<string, string | number | undefined>
) {
  return tichaFetch('/service/teacher-permissions', {
    query: { organizationId, ...query },
  });
}

export async function approveTeacherPermission(
  organizationId: string,
  id: string,
  reviewedBy: string,
  reviewNotes?: string
) {
  return tichaFetch(`/service/teacher-permissions/${id}/approve`, {
    method: 'POST',
    body: { organizationId, reviewedBy, reviewNotes },
  });
}

export async function rejectTeacherPermission(
  organizationId: string,
  id: string,
  reviewedBy: string,
  reviewNotes?: string
) {
  return tichaFetch(`/service/teacher-permissions/${id}/reject`, {
    method: 'POST',
    body: { organizationId, reviewedBy, reviewNotes },
  });
}

export async function listRoundRollCallHistory(
  organizationId: string,
  query?: Record<string, string | number | undefined>
) {
  return tichaFetch('/service/round-roll-call/history', {
    query: { organizationId, ...query },
  });
}

export async function getRoundRollCallSession(organizationId: string, sessionId: string) {
  return tichaFetch(`/service/round-roll-call/sessions/${sessionId}`, {
    query: { organizationId },
  });
}

export async function getRoundRollCallAnalytics(
  organizationId: string,
  query?: Record<string, string | number | undefined>
) {
  return tichaFetch('/service/round-roll-call/analytics', {
    query: { organizationId, ...query },
  });
}
