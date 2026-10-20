import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

function baseUrl() {
  return env.ACADEMIC_API_URL.replace(/\/$/, '');
}

async function readAcademicError(response: Response): Promise<never> {
  const text = await response.text().catch(() => '');
  let message = text || response.statusText;
  try {
    const parsed = JSON.parse(text) as { message?: string };
    if (parsed.message) message = parsed.message;
  } catch { /* keep text */ }
  throw new AppError(response.status >= 400 && response.status < 600 ? response.status : 502, message);
}

export async function academicGet<T>(
  path: string,
  organizationId: string,
  authorization?: string,
  query?: Record<string, string | undefined>,
) {
  const qs = new URLSearchParams({ organizationId });
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v) qs.set(k, v);
    }
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authorization) headers['Authorization'] = authorization;
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path.startsWith('/') ? path : `/${path}`}?${qs}`, {
      headers,
    });
  } catch {
    throw new AppError(502, 'Academic service is unavailable');
  }
  if (!response.ok) await readAcademicError(response);
  return (await response.json()) as T;
}

export async function academicPost<T>(
  path: string,
  organizationId: string,
  body: unknown,
  authorization?: string,
  query?: Record<string, string | undefined>,
) {
  const qs = new URLSearchParams({ organizationId });
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v) qs.set(k, v);
    }
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authorization) headers['Authorization'] = authorization;
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path.startsWith('/') ? path : `/${path}`}?${qs}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new AppError(502, 'Academic service is unavailable');
  }
  if (!response.ok) await readAcademicError(response);
  return (await response.json()) as T;
}

export async function academicPut<T>(
  path: string,
  organizationId: string,
  body: unknown,
  authorization?: string,
  query?: Record<string, string | undefined>,
) {
  const qs = new URLSearchParams({ organizationId });
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v) qs.set(k, v);
    }
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authorization) headers['Authorization'] = authorization;
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path.startsWith('/') ? path : `/${path}`}?${qs}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new AppError(502, 'Academic service is unavailable');
  }
  if (!response.ok) await readAcademicError(response);
  return (await response.json()) as T;
}

export async function academicDelete<T>(
  path: string,
  organizationId: string,
  authorization?: string,
) {
  const qs = new URLSearchParams({ organizationId });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authorization) headers['Authorization'] = authorization;
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path.startsWith('/') ? path : `/${path}`}?${qs}`, {
      method: 'DELETE',
      headers,
    });
  } catch {
    throw new AppError(502, 'Academic service is unavailable');
  }
  if (!response.ok) await readAcademicError(response);
  return (await response.json()) as T;
}
