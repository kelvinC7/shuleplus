import { env } from '../config/env';

export type HrStaffRow = {
  id: string;
  fullName: string;
  email?: string | null;
  employeeNumber: string;
  rfidUid?: string | null;
};

async function hrFetch<T>(organizationId: string, path: string, init?: RequestInit): Promise<T | null> {
  const base = env.HR_API_URL.replace(/\/$/, '');
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  url.searchParams.set('organizationId', organizationId);
  try {
    const response = await fetch(url.toString(), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'timetable',
        'x-organization-id': organizationId,
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { success?: boolean; data?: T };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function listHrStaffForOrg(organizationId: string): Promise<HrStaffRow[]> {
  const rows = await hrFetch<HrStaffRow[]>(organizationId, '/internal/staff');
  return rows ?? [];
}
