import { env } from '../config/env';

export type DeoScope = {
  userId: string;
  provinceId: string | null;
  provinceName: string | null;
  districtId: string | null;
  districtName: string;
};

export type RegisteredSchool = {
  id: string;
  organizationCode: string | null;
  name: string;
  province: string | null;
  district: string | null;
  sector: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

function iamBase() {
  return env.IAM_API_URL.replace(/\/$/, '');
}

function serviceHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-service-key': env.SERVICE_API_KEY,
    'x-source-service': 'deo-mis',
  };
}

async function parseJson<T>(res: Response): Promise<T | null> {
  if (!res.ok) return null;
  try {
    const body = (await res.json()) as { success?: boolean; data?: T };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchDeoScope(userId: string): Promise<DeoScope | null> {
  const res = await fetch(`${iamBase()}/internal/deo-officers/${encodeURIComponent(userId)}/scope`, {
    headers: serviceHeaders(),
    signal: AbortSignal.timeout(12_000),
  });
  return parseJson<DeoScope>(res);
}

export async function listRegisteredSchools(filters: {
  districtId?: string | null;
  provinceId?: string | null;
  districtName?: string | null;
  limit?: number;
}): Promise<RegisteredSchool[]> {
  const qs = new URLSearchParams({ status: 'ACTIVE', limit: String(filters.limit ?? 1000) });
  if (filters.districtId) qs.set('districtId', filters.districtId);
  if (filters.provinceId) qs.set('provinceId', filters.provinceId);
  if (filters.districtName?.trim()) qs.set('district', filters.districtName.trim());

  const res = await fetch(`${iamBase()}/internal/organizations?${qs}`, {
    headers: serviceHeaders(),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await parseJson<RegisteredSchool[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function countTeachingStaff(organizationId: string): Promise<number> {
  const res = await fetch(
    `${iamBase()}/internal/organizations/${encodeURIComponent(organizationId)}/teaching-staff`,
    { headers: serviceHeaders(), signal: AbortSignal.timeout(12_000) }
  );
  const data = await parseJson<unknown[]>(res);
  return Array.isArray(data) ? data.length : 0;
}
