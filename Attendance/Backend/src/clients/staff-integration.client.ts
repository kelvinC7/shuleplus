import { env } from "../config/env";

export type StaffMember = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  department?: string | null;
  employeeNumber?: string | null;
  photoUrl?: string | null;
  rfidUid?: string | null;
  source: "hr" | "iam" | "teacher" | "timetable";
  teacherUserId?: string | null;
};

type ApiEnvelope<T> = { success?: boolean; data?: T };

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function normalizeUid(uid?: string | null) {
  if (!uid) return null;
  const trimmed = uid.trim().toUpperCase();
  return trimmed || null;
}

async function serviceFetchWithStatus<T>(
  url: string,
  organizationId?: string
): Promise<{ data: T | null; ok: boolean }> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "x-service-key": env.SERVICE_API_KEY,
      "x-source-service": "attendance",
    };
    if (organizationId) headers["x-organization-id"] = organizationId;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { data: null, ok: false };
    const body = (await res.json()) as ApiEnvelope<T>;
    return { data: body.data ?? null, ok: true };
  } catch {
    return { data: null, ok: false };
  }
}

async function serviceFetch<T>(url: string, organizationId?: string): Promise<T | null> {
  const result = await serviceFetchWithStatus<T>(url, organizationId);
  return result.data;
}

function iamInternalBase() {
  return `${env.IAM_API_URL.replace(/\/$/, "")}/internal`;
}

function hrBase() {
  return env.HR_API_URL.replace(/\/$/, "");
}

function timetableBase() {
  return env.TIMETABLE_API_URL.replace(/\/$/, "");
}

function addStaff(map: Map<string, StaffMember>, entry: StaffMember) {
  const email = normalizeEmail(entry.email);
  if (email) {
    for (const existing of map.values()) {
      if (normalizeEmail(existing.email) === email) {
        if (entry.rfidUid && !existing.rfidUid) map.set(existing.id, { ...existing, rfidUid: entry.rfidUid });
        return;
      }
    }
  }
  const nameKey = entry.fullName.trim().toLowerCase();
  for (const existing of map.values()) {
    if (existing.fullName.trim().toLowerCase() === nameKey && existing.source !== entry.source) return;
  }
  if (!map.has(entry.id)) map.set(entry.id, entry);
}

export function isHrEnabled() {
  return Boolean(env.HR_API_URL);
}

export function isIamEnabled() {
  return Boolean(env.IAM_API_URL);
}

export function isTimetableEnabled() {
  return Boolean(env.TIMETABLE_API_URL);
}

export type StaffSourceMeta = {
  hr: { reachable: boolean; count: number };
  iam: { reachable: boolean; count: number };
  timetable: { reachable: boolean; count: number };
};

function mergeStaffRows(
  map: Map<string, StaffMember>,
  hrStaff: StaffMember[],
  timetableStaff: StaffMember[],
  iamUsers: StaffMember[],
  teachingStaff: StaffMember[]
) {
  for (const row of hrStaff) addStaff(map, row);
  for (const row of timetableStaff) addStaff(map, row);
  for (const row of iamUsers) addStaff(map, row);
  for (const row of teachingStaff) addStaff(map, row);
}

export async function fetchOrganizationStaffWithMeta(
  organizationId: string,
  search?: string
): Promise<{ rows: StaffMember[]; sources: StaffSourceMeta }> {
  const q = search ? `&search=${encodeURIComponent(search)}` : "";
  const iamSearch = search ? `?search=${encodeURIComponent(search)}` : "";

  const [hrRes, timetableRes, iamUsersRes, teachingRes] = await Promise.all([
    serviceFetchWithStatus<
      Array<{
        id: string;
        fullName: string;
        email?: string | null;
        phone?: string | null;
        position?: string | null;
        employeeNumber?: string | null;
        photoUrl?: string | null;
        rfidUid?: string | null;
      }>
    >(`${hrBase()}/internal/staff?organizationId=${encodeURIComponent(organizationId)}${q}`, organizationId),
    serviceFetchWithStatus<
      Array<{
        id: string;
        fullName?: string;
        teacherName?: string;
        email?: string | null;
        phone?: string | null;
        position?: string | null;
        photoUrl?: string | null;
        rfidUid?: string | null;
        teacherUserId?: string | null;
      }>
    >(`${timetableBase()}/internal/staff?organizationId=${encodeURIComponent(organizationId)}${q}`, organizationId),
    serviceFetchWithStatus<
      Array<{
        id: string;
        fullName?: string;
        name?: string;
        firstName?: string;
        lastName?: string;
        email?: string | null;
        phone?: string | null;
        department?: string | null;
        position?: string | null;
        employeeNumber?: string | null;
        employeeId?: string | null;
        photoUrl?: string | null;
        rfidUid?: string | null;
      }>
    >(
      `${iamInternalBase()}/organizations/${encodeURIComponent(organizationId)}/staff-for-cards${iamSearch}`,
      organizationId
    ),
    serviceFetchWithStatus<
      Array<{
        id: string;
        name?: string;
        firstName?: string;
        lastName?: string;
        email?: string | null;
        phone?: string | null;
        department?: string | null;
        position?: string | null;
        employeeId?: string | null;
      }>
    >(
      `${iamInternalBase()}/organizations/${encodeURIComponent(organizationId)}/teaching-staff${iamSearch}`,
      organizationId
    ),
  ]);

  const hrStaff = (hrRes.data ?? []).map((row) => ({
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    position: row.position,
    employeeNumber: row.employeeNumber,
    photoUrl: row.photoUrl,
    rfidUid: normalizeUid(row.rfidUid),
    source: "hr" as const,
  }));

  const timetableStaff = (timetableRes.data ?? []).map((row) => ({
    id: row.id,
    fullName: row.fullName ?? row.teacherName ?? row.id,
    email: row.email,
    phone: row.phone,
    position: row.position ?? "Teacher",
    photoUrl: row.photoUrl,
    rfidUid: normalizeUid(row.rfidUid),
    teacherUserId: row.teacherUserId ?? null,
    source: "timetable" as const,
  }));

  const iamUsers = (iamUsersRes.data ?? []).map((row) => ({
    id: row.id,
    fullName:
      row.fullName?.trim() ||
      row.name?.trim() ||
      [row.firstName, row.lastName].filter(Boolean).join(" ").trim() ||
      row.email ||
      row.id,
    email: row.email,
    phone: row.phone,
    department: row.department,
    position: row.position ?? "Staff",
    employeeNumber: row.employeeNumber ?? row.employeeId ?? null,
    photoUrl: row.photoUrl ?? null,
    rfidUid: normalizeUid(row.rfidUid),
    teacherUserId: row.id,
    source: "iam" as const,
  }));

  const teachingStaff = (teachingRes.data ?? []).map((row) => ({
    id: row.id,
    fullName:
      row.name?.trim() ||
      [row.firstName, row.lastName].filter(Boolean).join(" ").trim() ||
      row.email ||
      row.id,
    email: row.email,
    phone: row.phone,
    department: row.department,
    position: row.position ?? "Teacher",
    employeeNumber: row.employeeId,
    teacherUserId: row.id,
    source: "teacher" as const,
  }));

  const map = new Map<string, StaffMember>();
  mergeStaffRows(map, hrStaff, timetableStaff, iamUsers, teachingStaff);

  return {
    rows: [...map.values()].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    sources: {
      hr: { reachable: hrRes.ok, count: hrStaff.length },
      iam: { reachable: iamUsersRes.ok || teachingRes.ok, count: iamUsers.length + teachingStaff.length },
      timetable: { reachable: timetableRes.ok, count: timetableStaff.length },
    },
  };
}

export async function fetchOrganizationStaff(
  organizationId: string,
  search?: string
): Promise<StaffMember[]> {
  const { rows } = await fetchOrganizationStaffWithMeta(organizationId, search);
  return rows;
}

/** Deduped staff roster (HR + Timetable + IAM / Users & Access). */
export async function countOrganizationStaffRoster(organizationId: string): Promise<number> {
  if (!isStaffIntegrationEnabled()) return 0;
  try {
    const { rows } = await fetchOrganizationStaffWithMeta(organizationId);
    return rows.length;
  } catch {
    return 0;
  }
}

export function isStaffIntegrationEnabled() {
  return Boolean(env.HR_API_URL || env.TIMETABLE_API_URL || env.IAM_API_URL);
}

type RfidStaffHit = {
  organizationId: string;
  id: string;
  name: string;
  code?: string | null;
  source: StaffMember["source"];
  rfidUid: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  photoUrl?: string | null;
  teacherUserId?: string | null;
};

async function lookupStaffByRfidGlobally(rfidUid: string): Promise<RfidStaffHit | null> {
  const normalized = normalizeUid(rfidUid);
  if (!normalized) return null;

  const qs = `rfidUid=${encodeURIComponent(normalized)}`;
  type LookupRow = {
    organizationId?: string;
    id: string;
    name: string;
    code?: string | null;
    source?: StaffMember["source"];
    rfidUid?: string;
  };

  const [hr, timetable, iam] = await Promise.all([
    serviceFetch<LookupRow | null>(`${hrBase()}/internal/staff/rfid-lookup?${qs}`),
    serviceFetch<LookupRow | null>(`${timetableBase()}/internal/staff/rfid-lookup?${qs}`),
    serviceFetch<LookupRow | null>(`${iamInternalBase()}/staff/rfid-lookup?${qs}`),
  ]);

  for (const row of [hr, timetable, iam]) {
    if (!row?.id || !row.organizationId) continue;
    return {
      organizationId: row.organizationId,
      id: row.id,
      name: row.name,
      code: row.code,
      source: row.source ?? "hr",
      rfidUid: normalizeUid(row.rfidUid) ?? normalized,
    };
  }
  return null;
}

export async function fetchStaffByRfidUid(
  organizationId: string,
  rfidUid: string
): Promise<StaffMember | null> {
  const normalized = normalizeUid(rfidUid);
  if (!normalized) return null;

  const hit = await lookupStaffByRfidGlobally(normalized);
  if (!hit || hit.organizationId !== organizationId) {
    return null;
  }

  const orgQs = `organizationId=${encodeURIComponent(organizationId)}`;
  const [hrStaff, timetableStaff] = await Promise.all([
    hit.source === "hr" || hit.source === "iam"
      ? serviceFetch<
          Array<{
            id: string;
            fullName: string;
            email?: string | null;
            phone?: string | null;
            position?: string | null;
            employeeNumber?: string | null;
            photoUrl?: string | null;
            rfidUid?: string | null;
          }>
        >(`${hrBase()}/internal/staff?${orgQs}`, organizationId)
      : Promise.resolve(null),
    hit.source === "timetable"
      ? serviceFetch<
          Array<{
            id: string;
            fullName?: string;
            teacherName?: string;
            email?: string | null;
            phone?: string | null;
            position?: string | null;
            photoUrl?: string | null;
            rfidUid?: string | null;
            teacherUserId?: string | null;
          }>
        >(`${timetableBase()}/internal/staff?${orgQs}`, organizationId)
      : Promise.resolve(null),
  ]);

  const hrRow = (hrStaff ?? []).find((r) => r.id === hit.id);
  if (hrRow) {
    return {
      id: hrRow.id,
      fullName: hrRow.fullName,
      email: hrRow.email,
      phone: hrRow.phone,
      position: hrRow.position,
      employeeNumber: hrRow.employeeNumber ?? hit.code ?? hit.id,
      photoUrl: hrRow.photoUrl,
      rfidUid: normalized,
      source: hit.source === "iam" ? "iam" : "hr",
    };
  }

  const ttRow = (timetableStaff ?? []).find((r) => r.id === hit.id);
  if (ttRow) {
    return {
      id: ttRow.id,
      fullName: ttRow.fullName ?? ttRow.teacherName ?? hit.name,
      email: ttRow.email,
      phone: ttRow.phone,
      position: ttRow.position ?? "Teacher",
      photoUrl: ttRow.photoUrl,
      rfidUid: normalized,
      teacherUserId: ttRow.teacherUserId ?? null,
      source: "timetable",
    };
  }

  if (hit.source === "iam") {
    return {
      id: hit.id,
      fullName: hit.name,
      employeeNumber: hit.code ?? hit.id,
      position: "Staff",
      rfidUid: normalized,
      source: "iam",
    };
  }

  return {
    id: hit.id,
    fullName: hit.name,
    employeeNumber: hit.code ?? hit.id,
    position: hit.source === "timetable" ? "Teacher" : "Staff",
    rfidUid: normalized,
    source: hit.source,
    ...(hit.source === "timetable" ? { teacherUserId: hit.id } : {}),
  };
}

export async function fetchTeacherToday(
  organizationId: string,
  teacherUserId: string,
  email?: string | null
) {
  const qs = new URLSearchParams({
    organizationId,
    teacherUserId,
  });
  if (email) qs.set("email", email);
  return serviceFetch<{
    date: string;
    dayOfWeek: string;
    kpis: {
      todayClasses: number;
      checkedIn: number;
      lateArrivals: number;
      notCheckedIn: number;
    };
    current?: { subjectName?: string; className?: string; lessonStatus?: string } | null;
    next?: { subjectName?: string; className?: string; startTime?: string } | null;
  }>(`${timetableBase()}/internal/teacher/today?${qs}`, organizationId);
}

export async function checkIntegrationHealth() {
  const checks = await Promise.all([
    (async () => {
      try {
        const res = await fetch(`${hrBase()}/health`, { signal: AbortSignal.timeout(4000) });
        return { module: "hr", configured: true, reachable: res.ok, url: hrBase() };
      } catch {
        return { module: "hr", configured: true, reachable: false, url: hrBase() };
      }
    })(),
    (async () => {
      try {
        const res = await fetch(`${env.IAM_API_URL.replace(/\/$/, "")}/health`, {
          signal: AbortSignal.timeout(4000),
        });
        return { module: "iam", configured: true, reachable: res.ok, url: env.IAM_API_URL };
      } catch {
        return { module: "iam", configured: true, reachable: false, url: env.IAM_API_URL };
      }
    })(),
    (async () => {
      try {
        const res = await fetch(`${timetableBase()}/health`, { signal: AbortSignal.timeout(4000) });
        return { module: "timetable", configured: true, reachable: res.ok, url: timetableBase() };
      } catch {
        return { module: "timetable", configured: true, reachable: false, url: timetableBase() };
      }
    })(),
  ]);
  return checks;
}
