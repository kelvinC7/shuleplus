import { env } from '../config/env';

export type SmStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  className?: string | null;
  rfidUid?: string | null;
  status?: string;
};

type ApiList<T> = { success?: boolean; data?: T[] };

function baseUrl() {
  return (env.STUDENT_MANAGEMENT_API_URL ?? '').replace(/\/$/, '');
}

export function isStudentManagementEnabled() {
  return Boolean(baseUrl());
}

export function normalizeCardUid(uid: string) {
  return uid.replace(/\*/g, '').trim().toUpperCase();
}

function serviceHeaders(organizationId: string) {
  return {
    'Content-Type': 'application/json',
    'x-service-key': env.SERVICE_API_KEY,
    'x-source-service': 'device',
    'x-organization-id': organizationId,
  };
}

export async function fetchStudentByRfidUid(
  organizationId: string,
  rfidUid: string
): Promise<SmStudent | null> {
  const urlBase = baseUrl();
  const normalized = normalizeCardUid(rfidUid);
  if (!urlBase || !normalized) return null;

  const qs = new URLSearchParams({
    organizationId,
    rfidUid: normalized,
    status: 'ACTIVE',
  });

  try {
    const res = await fetch(`${urlBase}/service/students?${qs}`, {
      headers: serviceHeaders(organizationId),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ApiList<SmStudent>;
    const row = Array.isArray(body.data) ? body.data[0] : null;
    return row?.rfidUid ? row : null;
  } catch {
    return null;
  }
}

export async function searchStudents(organizationId: string, query: string): Promise<SmStudent[]> {
  const urlBase = baseUrl();
  if (!urlBase || !query.trim()) return [];

  const qs = new URLSearchParams({
    organizationId,
    search: query.trim(),
    status: 'ACTIVE',
  });

  try {
    const res = await fetch(`${urlBase}/service/students?${qs}`, {
      headers: serviceHeaders(organizationId),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as ApiList<SmStudent>;
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}

export type SmTenantProfile = {
  district?: string | null;
  schoolCode?: string | null;
  organizationCode?: string | null;
  organizationName?: string | null;
};

export async function fetchTenantProfile(organizationId: string): Promise<SmTenantProfile | null> {
  const urlBase = baseUrl();
  if (!urlBase) return null;

  try {
    const res = await fetch(`${urlBase}/service/tenant-profile`, {
      headers: serviceHeaders(organizationId),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: SmTenantProfile };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function linkRfidToStudent(
  organizationId: string,
  studentId: string,
  rfidUid: string
): Promise<SmStudent | null> {
  const urlBase = baseUrl();
  const normalized = normalizeCardUid(rfidUid);
  if (!urlBase || !studentId || !normalized) return null;

  try {
    const res = await fetch(`${urlBase}/service/students/${studentId}/identity`, {
      method: 'PUT',
      headers: serviceHeaders(organizationId),
      body: JSON.stringify({ rfidUid: normalized }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { id: string; rfidUid?: string } };
    return body.data
      ? {
          id: body.data.id,
          studentCode: body.data.id,
          fullName: '',
          rfidUid: body.data.rfidUid ?? normalized,
        }
      : null;
  } catch {
    return null;
  }
}
