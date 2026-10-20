import { env } from '../config/env';

function headers(actorName?: string) {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-service-key': env.SERVICE_API_KEY,
    'x-source-service': 'nesa-dashboard',
  };
  if (actorName) h['x-actor-name'] = actorName;
  return h;
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as { success?: boolean; data?: T; message?: string };
  if (!response.ok) {
    throw new Error(body.message ?? `Babyeyi API failed: HTTP ${response.status}`);
  }
  return body.data as T;
}

export async function fetchCirculars(params: Record<string, string | undefined> = {}) {
  const base = env.BABYEYI_API_URL.replace(/\/$/, '');
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const url = `${base}/nesa/circulars${qs.toString() ? `?${qs}` : ''}`;
  const response = await fetch(url, { headers: headers() });
  return parseJson<unknown[]>(response);
}

export async function fetchCircular(id: string) {
  const base = env.BABYEYI_API_URL.replace(/\/$/, '');
  const response = await fetch(`${base}/nesa/circulars/${id}`, { headers: headers() });
  return parseJson<Record<string, unknown>>(response);
}

export async function postCircularComment(id: string, content: string, actorName: string) {
  const base = env.BABYEYI_API_URL.replace(/\/$/, '');
  const response = await fetch(`${base}/nesa/circulars/${id}/comments`, {
    method: 'POST',
    headers: headers(actorName),
    body: JSON.stringify({ content }),
  });
  return parseJson<Record<string, unknown>>(response);
}

export async function rejectCircular(id: string, reason: string, actorName: string) {
  const base = env.BABYEYI_API_URL.replace(/\/$/, '');
  const response = await fetch(`${base}/nesa/circulars/${id}/reject`, {
    method: 'POST',
    headers: headers(actorName),
    body: JSON.stringify({ reason }),
  });
  return parseJson<Record<string, unknown>>(response);
}

export async function unpublishCircular(id: string, reason: string, actorName: string) {
  const base = env.BABYEYI_API_URL.replace(/\/$/, '');
  const response = await fetch(`${base}/nesa/circulars/${id}/unpublish`, {
    method: 'POST',
    headers: headers(actorName),
    body: JSON.stringify({ reason }),
  });
  return parseJson<Record<string, unknown>>(response);
}

export async function approveCircular(id: string, notes: string | undefined, actorName: string) {
  const base = env.BABYEYI_API_URL.replace(/\/$/, '');
  const response = await fetch(`${base}/nesa/circulars/${id}/approve`, {
    method: 'POST',
    headers: headers(actorName),
    body: JSON.stringify({ notes }),
  });
  return parseJson<Record<string, unknown>>(response);
}

/** Returns official print HTML (View & Print). */
export async function fetchCircularPrintHtml(id: string, lang = 'en') {
  const base = env.BABYEYI_API_URL.replace(/\/$/, '');
  const response = await fetch(`${base}/nesa/circulars/${id}/print?lang=${encodeURIComponent(lang)}`, {
    headers: headers(),
  });
  if (!response.ok) {
    throw new Error(`Babyeyi print failed: HTTP ${response.status}`);
  }
  return response.text();
}
