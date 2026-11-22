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

export type SmParent = {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string | null;
  smsEnabled?: boolean;
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
        "x-source-service": "attendance",
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

export type RfidOwner = {
  organizationId: string;
  organizationName: string | null;
  organizationCode: string | null;
  studentName: string;
  studentCode: string | null;
  rfidUid: string;
};

export async function lookupRfidOwner(rfidUid: string): Promise<RfidOwner | null> {
  const urlBase = baseUrl();
  const normalized = normalizeUid(rfidUid);
  if (!urlBase || !normalized) return null;

  try {
    const qs = new URLSearchParams({ rfidUid: normalized });
    const res = await fetch(`${urlBase}/service/rfid-lookup?${qs}`, {
      headers: {
        "Content-Type": "application/json",
        "x-service-key": env.SERVICE_API_KEY,
        "x-source-service": "attendance",
      },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: RfidOwner | null };
    return body.data?.rfidUid ? body.data : null;
  } catch {
    return null;
  }
}

export async function checkStudentManagementHealth(): Promise<{
  configured: boolean;
  reachable: boolean;
  url: string | null;
}> {
  const url = baseUrl() || null;
  if (!url) return { configured: false, reachable: false, url: null };
  try {
    const res = await fetch(`${url}/health`, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    return { configured: true, reachable: res.ok, url };
  } catch {
    return { configured: true, reachable: false, url };
  }
}

export type SmDashboardSummary = {
  studentCount: number;
  activeEnrollments: number;
  classCount?: number;
};

export async function fetchStudentManagementDashboardSummary(
  organizationId: string
): Promise<SmDashboardSummary | null> {
  const urlBase = baseUrl();
  if (!urlBase) return null;

  const qs = new URLSearchParams({ organizationId });
  try {
    const res = await fetch(`${urlBase}/service/dashboard-summary?${qs}`, {
      headers: {
        "Content-Type": "application/json",
        "x-service-key": env.SERVICE_API_KEY,
        "x-source-service": "attendance",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: SmDashboardSummary };
    const data = body.data;
    if (!data || typeof data.studentCount !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchStudentsPage(
  organizationId: string,
  opts?: { search?: string; className?: string; status?: string; page?: number; limit?: number }
): Promise<SmStudent[]> {
  const urlBase = baseUrl();
  if (!urlBase) return [];

  const qs = new URLSearchParams({
    organizationId,
    status: opts?.status ?? "ACTIVE",
  });
  if (opts?.search) qs.set("search", opts.search);
  if (opts?.className) qs.set("className", opts.className);
  if (opts?.page) qs.set("page", String(opts.page));
  if (opts?.limit) qs.set("limit", String(opts.limit));

  try {
    const res = await fetch(`${urlBase}/service/students?${qs}`, {
      headers: {
        "Content-Type": "application/json",
        "x-service-key": env.SERVICE_API_KEY,
        "x-source-service": "attendance",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as ApiList<SmStudent & { parentName?: string | null; parentPhone?: string | null }>;
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}

export async function fetchStudentsList(
  organizationId: string,
  opts?: { search?: string; className?: string; status?: string }
): Promise<SmStudent[]> {
  return fetchAllStudentsList(organizationId, opts);
}

/**
 * Records roster: avoid loading the full school on every page view.
 * Without class/search filter, rely on RFID cards + same-day taps only.
 */
export async function fetchStudentsForAttendanceRoster(
  organizationId: string,
  opts?: { search?: string; className?: string }
): Promise<SmStudent[]> {
  const hasFilter = Boolean(opts?.search?.trim() || opts?.className?.trim());
  if (!hasFilter) return [];

  const limit = 500;
  const maxPages = opts?.search?.trim() ? 4 : 12;
  const merged = new Map<string, SmStudent>();
  for (let page = 1; page <= maxPages; page += 1) {
    const batch = await fetchStudentsPage(organizationId, {
      search: opts?.search,
      className: opts?.className,
      status: "ACTIVE",
      page,
      limit,
    });
    for (const row of batch) merged.set(row.id, row);
    if (batch.length < limit) break;
  }
  return [...merged.values()];
}

/** Load all ACTIVE students (paginated) so roster counts match Student Management. */
export async function fetchAllStudentsList(
  organizationId: string,
  opts?: { search?: string; className?: string; status?: string }
): Promise<SmStudent[]> {
  const limit = 500;
  const merged = new Map<string, SmStudent>();
  for (let page = 1; page <= 80; page += 1) {
    const batch = await fetchStudentsPage(organizationId, { ...opts, page, limit });
    for (const row of batch) merged.set(row.id, row);
    if (batch.length < limit) break;
  }
  return [...merged.values()];
}

export async function fetchStudentByIdentity(
  organizationId: string,
  code: string
): Promise<SmStudent | null> {
  const urlBase = baseUrl();
  const q = code.trim();
  if (!urlBase || !q) return null;
  const qs = new URLSearchParams({
    organizationId,
    search: q,
    status: "ACTIVE",
  });
  try {
    const res = await fetch(`${urlBase}/service/students?${qs}`, {
      headers: {
        "Content-Type": "application/json",
        "x-service-key": env.SERVICE_API_KEY,
        "x-source-service": "attendance",
      },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ApiList<SmStudent>;
    const rows = Array.isArray(body.data) ? body.data : [];
    return rows.find((s) => s.id === q || s.studentCode === q) ?? null;
  } catch {
    return null;
  }
}

export type SmClass = {
  id: string;
  name: string;
  stream?: string | null;
  label: string;
};

export async function fetchClassesList(organizationId: string): Promise<SmClass[]> {
  const urlBase = baseUrl();
  if (!urlBase) return [];

  const qs = new URLSearchParams({ organizationId });
  try {
    const res = await fetch(`${urlBase}/service/classes?${qs}`, {
      headers: {
        "Content-Type": "application/json",
        "x-service-key": env.SERVICE_API_KEY,
        "x-source-service": "attendance",
        "x-organization-id": organizationId,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as ApiList<SmClass>;
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}

export async function fetchSmParents(
  organizationId: string,
  studentId: string
): Promise<SmParent[]> {
  const urlBase = baseUrl();
  if (!urlBase || !studentId) return [];

  const qs = new URLSearchParams({ organizationId, studentId });

  try {
    const res = await fetch(`${urlBase}/service/parents?${qs}`, {
      headers: {
        "Content-Type": "application/json",
        "x-service-key": env.SERVICE_API_KEY,
        "x-source-service": "attendance",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as ApiList<SmParent>;
    const rows = Array.isArray(body.data) ? body.data : [];
    // Hard guard: never treat an unfiltered school-wide parent list as recipients
    if (rows.length > 20) {
      console.warn(
        `[SM] parents?studentId=${studentId} returned ${rows.length} rows — refusing blast`
      );
      return [];
    }
    return rows;
  } catch {
    return [];
  }
}
