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

export async function fetchStudentByRfidUid(
  organizationId: string,
  rfidUid: string
): Promise<SmStudent | null> {
  const urlBase = baseUrl();
  if (!urlBase || !rfidUid.trim()) return null;

  const qs = new URLSearchParams({
    organizationId,
    rfidUid: normalizeUid(rfidUid),
    status: "ACTIVE",
  });

  try {
    const res = await fetch(`${urlBase}/service/students?${qs}`, {
      headers: {
        "Content-Type": "application/json",
        "x-service-key": env.SERVICE_API_KEY,
        "x-source-service": "transport",
      },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ApiList<SmStudent>;
    const row = Array.isArray(body.data) ? body.data[0] : null;
    return row?.rfidUid ? row : null;
  } catch {
    return null;
  }
}
