import { env } from '../config/env';

export type SeiScope = {
  userId: string;
  provinceId: string | null;
  provinceName: string | null;
  districtId: string | null;
  districtName: string | null;
  sectorId: string | null;
  sectorName: string;
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
    'x-source-service': 'sector-mis',
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

export async function fetchSeiScope(userId: string): Promise<SeiScope | null> {
  const res = await fetch(`${iamBase()}/internal/sei-officers/${encodeURIComponent(userId)}/scope`, {
    headers: serviceHeaders(),
    signal: AbortSignal.timeout(12_000),
  });
  return parseJson<SeiScope>(res);
}

export async function listRegisteredSchools(filters: {
  sectorId?: string | null;
  districtId?: string | null;
  provinceId?: string | null;
  sectorName?: string | null;
  limit?: number;
}): Promise<RegisteredSchool[]> {
  const qs = new URLSearchParams({ status: 'ACTIVE', limit: String(filters.limit ?? 500) });
  if (filters.sectorId) qs.set('sectorId', filters.sectorId);
  if (filters.districtId) qs.set('districtId', filters.districtId);
  if (filters.provinceId) qs.set('provinceId', filters.provinceId);
  if (filters.sectorName?.trim()) qs.set('sector', filters.sectorName.trim());

  const res = await fetch(`${iamBase()}/internal/organizations?${qs}`, {
    headers: serviceHeaders(),
    signal: AbortSignal.timeout(20_000),
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
