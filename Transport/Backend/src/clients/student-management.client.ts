import { env } from "../config/env";

export type SmStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  className?: string | null;
  stream?: string | null;
  educationLevel?: string | null;
  photoUrl?: string | null;
  rfidUid?: string | null;
  status?: string;
  parentName?: string | null;
  parentPhone?: string | null;
};

type ApiList<T> = { success?: boolean; data?: T[] };

function baseUrl() {
  return (env.STUDENT_MANAGEMENT_API_URL ?? "").replace(/\/$/, "");
}

export function isStudentManagementEnabled() {
  return Boolean(baseUrl());
}

function normalizeUid(uid: string) {
  return uid.trim().toUpperCase();
}

function serviceHeaders() {
  return {
    "Content-Type": "application/json",
    "x-service-key": env.SERVICE_API_KEY,
    "x-source-service": "transport",
  };
}

export type SmClassOption = {
  id: string;
  label: string;
  name: string;
  stream?: string | null;
};

export async function fetchClassesFromManagement(organizationId: string): Promise<SmClassOption[]> {
  const urlBase = baseUrl();
  if (!urlBase) return [];

  const qs = new URLSearchParams({ organizationId });
  try {
    const res = await fetch(`${urlBase}/service/classes?${qs}`, { headers: serviceHeaders() });
    if (!res.ok) return [];
    const body = (await res.json()) as ApiList<{
      id: string;
      name: string;
      stream?: string | null;
      label?: string;
    }>;
    const rows = Array.isArray(body.data) ? body.data : [];
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      stream: c.stream ?? null,
      label: (c.label ?? c.name).trim(),
    }));
  } catch {
    return [];
  }
}

export async function fetchStudentsFromManagement(
  organizationId: string,
  opts: { search?: string; className?: string; classId?: string; limit?: number; rfidUid?: string }
): Promise<SmStudent[]> {
  const urlBase = baseUrl();
  if (!urlBase) return [];

  const qs = new URLSearchParams({
    organizationId,
    status: "ACTIVE",
  });
  if (opts.search?.trim()) qs.set("search", opts.search.trim());
  if (opts.classId?.trim()) qs.set("classId", opts.classId.trim());
  else if (opts.className?.trim()) qs.set("className", opts.className.trim());
  if (opts.rfidUid?.trim()) qs.set("rfidUid", normalizeUid(opts.rfidUid));

  try {
    const res = await fetch(`${urlBase}/service/students?${qs}`, { headers: serviceHeaders() });
    if (!res.ok) return [];
    const body = (await res.json()) as ApiList<{
      id: string;
      studentCode: string;
      fullName: string;
      className?: string | null;
      photoUrl?: string | null;
      rfidUid?: string | null;
      parentName?: string | null;
      parentPhone?: string | null;
    }>;
    const rows = Array.isArray(body.data) ? body.data : [];
    const limit = Math.min(Math.max(opts.limit ?? 500, 1), 2000);
    return rows.slice(0, limit).map((r) => ({
      id: r.id,
      studentCode: r.studentCode,
      fullName: r.fullName,
      className: r.className,
      photoUrl: r.photoUrl,
      rfidUid: r.rfidUid,
      parentName: r.parentName,
      parentPhone: r.parentPhone,
    }));
  } catch {
    return [];
  }
}

export async function fetchStudentByRfidUid(
  organizationId: string,
  rfidUid: string
): Promise<SmStudent | null> {
  const rows = await fetchStudentsFromManagement(organizationId, { rfidUid, limit: 1 });
  const row = rows[0];
  return row?.rfidUid ? row : rows[0] ?? null;
}
