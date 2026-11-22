import { resolveLocalModuleBackendUrl } from '../config/local-module-urls';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

function tripApiBase(): string {
  const url = resolveLocalModuleBackendUrl('shule-trip', env.SHULE_TRIP_API_URL ?? null, env.NODE_ENV);
  if (!url) {
    throw new AppError(
      503,
      'ShuleTrip backend is not configured. Set SHULE_TRIP_API_URL or run the ShuleTrip API locally.'
    );
  }
  return url.replace(/\/$/, '');
}

async function tripFetch<T>(authHeader: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${tripApiBase()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authHeader,
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; data?: T };
  if (!res.ok) {
    throw new AppError(res.status, json.message ?? `ShuleTrip API error (${res.status})`);
  }
  return json.data as T;
}

export const shuleTripSchoolRegistrationsService = {
  list(authHeader: string) {
    return tripFetch<unknown[]>(authHeader, '/superadmin/school-registrations');
  },

  review(authHeader: string, id: string, body: { decision: string; reviewNote?: string }) {
    return tripFetch<unknown>(authHeader, `/superadmin/school-registrations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
};
