import { env } from '../config/env';

export interface StaffMemberOption {
  key: string;
  id: string;
  name: string;
  email?: string;
  department?: string;
  role?: string;
  source: 'iam' | 'hr' | 'teacher';
}

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() ?? '';
}

function addStaff(
  map: Map<string, StaffMemberOption>,
  entry: Omit<StaffMemberOption, 'key'> & { key?: string }
) {
  const key = entry.key ?? `${entry.source}:${entry.id}`;
  const email = normalizeEmail(entry.email);
  if (email) {
    for (const existing of map.values()) {
      if (normalizeEmail(existing.email) === email) return;
    }
  }
  for (const existing of map.values()) {
    if (existing.name.toLowerCase() === entry.name.toLowerCase() && existing.source !== entry.source) return;
  }
  if (map.has(key)) return;
  map.set(key, { ...entry, key });
}

function iamInternalBase() {
  const base = (process.env.IAM_API_URL ?? 'http://127.0.0.1:3001/api/v1').replace(/\/$/, '');
  return `${base}/internal`;
}

function hrInternalBase() {
  return (process.env.HR_API_URL ?? 'http://127.0.0.1:4002/api').replace(/\/$/, '');
}

async function serviceFetch<T>(url: string, organizationId?: string): Promise<T | null> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'x-service-key': env.SERVICE_API_KEY,
    };
    if (organizationId) headers['x-organization-id'] = organizationId;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: T };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchOrganizationStaff(organizationId: string, search?: string): Promise<StaffMemberOption[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  const map = new Map<string, StaffMemberOption>();

  const [iamUsers, teachingStaff, hrStaff] = await Promise.all([
    serviceFetch<
      Array<{
        id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        department?: string;
        roles?: string[];
      }>
    >(`${iamInternalBase()}/organizations/${organizationId}/users${q}`),
    serviceFetch<
      Array<{
        id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        department?: string;
        position?: string;
      }>
    >(`${iamInternalBase()}/organizations/${organizationId}/teaching-staff${q}`),
    serviceFetch<
      Array<{
        id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        position?: string;
      }>
    >(`${hrInternalBase()}/internal/staff${q}`, organizationId),
  ]);

  for (const u of iamUsers ?? []) {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || u.id;
    addStaff(map, {
      id: u.id,
      name,
      email: u.email,
      department: u.department,
      role: u.roles?.[0],
      source: 'iam',
    });
  }

  for (const t of teachingStaff ?? []) {
    const name = [t.firstName, t.lastName].filter(Boolean).join(' ').trim() || t.email || t.id;
    addStaff(map, {
      id: t.id,
      name,
      email: t.email,
      department: t.department,
      role: t.position ?? 'Teacher',
      source: 'teacher',
    });
  }

  for (const e of hrStaff ?? []) {
    const name = [e.firstName, e.lastName].filter(Boolean).join(' ').trim() || e.email || e.id;
    addStaff(map, {
      id: e.id,
      name,
      email: e.email,
      role: e.position ?? 'Staff',
      source: 'hr',
    });
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
