import { prisma } from "../config/prisma";
import { env } from "../config/env";

export type DirectorySource = "timetable" | "hr" | "iam";

export type DirectoryPerson = {
  source: DirectorySource;
  iamUserId?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  department?: string | null;
  employeeNumber?: string | null;
};

function mergeSources(existing: string, add: DirectorySource) {
  const set = new Set(
    existing
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  set.add(add);
  return [...set].join(",");
}

function parseJsonList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as { data?: unknown; success?: boolean };
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
}

async function serviceGet(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      headers: {
        "x-service-key": env.SERVICE_API_KEY,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[kaziavance] directory fetch ${res.status} ${url}`);
      return null;
    }
    return res.json().catch(() => null);
  } finally {
    clearTimeout(timer);
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string | null | undefined) {
  const v = value?.trim().toLowerCase() ?? "";
  return v || null;
}

function syntheticEmail(organizationId: string, key: string) {
  const slug = key.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24) || "staff";
  return `${slug}.${organizationId.slice(0, 8)}@kazi.portal.local`;
}

function makeCode(organizationId: string, source: DirectorySource, raw?: string | null) {
  const prefix = organizationId.slice(0, 6).toUpperCase();
  const body = (raw || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 16)
    .toUpperCase();
  const fallback = Math.floor(1000 + Math.random() * 9000).toString();
  return `${prefix}-${source.slice(0, 3).toUpperCase()}-${body || fallback}`.slice(0, 40);
}

async function fetchHrStaff(organizationId: string): Promise<DirectoryPerson[]> {
  if (!env.HR_API_URL) return [];
  const json = await serviceGet(
    `${env.HR_API_URL}/internal/staff?organizationId=${encodeURIComponent(organizationId)}`
  );
  return parseJsonList(json).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      source: "hr" as const,
      fullName: asString(r.fullName) || [r.firstName, r.lastName].filter(Boolean).join(" "),
      email: asString(r.email) || null,
      phone: asString(r.phone) || null,
      position: asString(r.position) || "Staff",
      department: asString(r.department) || "HR",
      employeeNumber: asString(r.employeeNumber) || null,
    };
  }).filter((p) => p.fullName);
}

async function fetchTimetableTeachers(organizationId: string): Promise<DirectoryPerson[]> {
  if (!env.TIMETABLE_API_URL) return [];
  const json = await serviceGet(
    `${env.TIMETABLE_API_URL}/internal/teacher-profiles?organizationId=${encodeURIComponent(organizationId)}`
  );
  return parseJsonList(json).map((row) => {
    const r = row as Record<string, unknown>;
    const account = (r.account ?? {}) as Record<string, unknown>;
    const teacherUserId = asString(r.teacherUserId);
    const iamId =
      teacherUserId && !teacherUserId.startsWith("teacher-") ? teacherUserId : null;
    return {
      source: "timetable" as const,
      iamUserId: iamId,
      fullName: asString(r.teacherName) || asString(r.fullName) || "Teacher",
      email: asString(r.loginEmail) || asString(account.email) || null,
      phone: asString(r.loginPhone) || asString(account.phone) || null,
      position: "Teacher",
      department: "Teaching",
      employeeNumber: teacherUserId || null,
    };
  }).filter((p) => p.fullName);
}

async function fetchIamUsers(organizationId: string): Promise<DirectoryPerson[]> {
  const json = await serviceGet(
    `${env.IAM_API_URL}/internal/organizations/${encodeURIComponent(organizationId)}/users`
  );
  const people: DirectoryPerson[] = [];
  for (const row of parseJsonList(json)) {
    const r = row as Record<string, unknown>;
    const roles = Array.isArray(r.roles) ? r.roles.map(String) : [];
    if (roles.includes("root_admin") || roles.includes("super_admin")) continue;
    const first = asString(r.firstName);
    const last = asString(r.lastName);
    const name = asString(r.name) || `${first} ${last}`.trim();
    const person: DirectoryPerson = {
      source: "iam",
      iamUserId: asString(r.id) || null,
      fullName: name || asString(r.email) || "User",
      email: asString(r.email) || null,
      phone: asString(r.phone) || null,
      position: asString(r.position) || "Staff",
      department: asString(r.department) || "Organization",
      employeeNumber: asString(r.employeeId) || null,
    };
    if (person.fullName) people.push(person);
  }
  return people;
}

async function findExisting(organizationId: string, person: DirectoryPerson) {
  const email = normalizeEmail(person.email);
  const phone = person.phone?.trim() || null;
  const iamUserId = person.iamUserId?.trim() || null;

  if (iamUserId) {
    const byIam = await prisma.employee.findFirst({
      where: { organizationId, iamUserId },
    });
    if (byIam) return byIam;
  }
  if (email) {
    const byEmail = await prisma.employee.findFirst({
      where: { organizationId, email },
    });
    if (byEmail) return byEmail;
  }
  if (phone) {
    const byPhone = await prisma.employee.findFirst({
      where: { organizationId, phone },
    });
    if (byPhone) return byPhone;
  }
  return null;
}

async function upsertPerson(organizationId: string, person: DirectoryPerson) {
  const email =
    normalizeEmail(person.email) ??
    syntheticEmail(organizationId, person.phone || person.employeeNumber || person.fullName);
  const existing = await findExisting(organizationId, { ...person, email });

  if (existing) {
    return prisma.employee.update({
      where: { id: existing.id },
      data: {
        fullName: person.fullName || existing.fullName,
        phone: person.phone || existing.phone,
        position: person.position || existing.position,
        department:
          person.source === "timetable"
            ? "Teaching"
            : person.department || existing.department,
        iamUserId: person.iamUserId || existing.iamUserId,
        email: existing.email || email,
        directorySources: mergeSources(existing.directorySources ?? "", person.source),
        employmentStatus: "Active",
      },
    });
  }

  try {
    return await prisma.employee.create({
      data: {
        organizationId,
        employeeCode: makeCode(organizationId, person.source, person.employeeNumber || person.email),
        email,
        fullName: person.fullName,
        department: person.source === "timetable" ? "Teaching" : person.department || "General",
        position: person.position || (person.source === "timetable" ? "Teacher" : "Staff"),
        phone: person.phone,
        iamUserId: person.iamUserId ?? undefined,
        companyName: "Organization",
        employmentStatus: "Active",
        yearsOfService: 0,
        verificationStatus: "Verified",
        profileCompletion: 60,
        eligibilityStatus: "Eligible",
        allowAdvance: true,
        directorySources: person.source,
      },
    });
  } catch {
    // Unique email/code race — try match again
    return findExisting(organizationId, { ...person, email });
  }
}

export async function syncStaffDirectory(organizationId: string) {
  const [hr, timetable, iam] = await Promise.all([
    fetchHrStaff(organizationId).catch(() => [] as DirectoryPerson[]),
    fetchTimetableTeachers(organizationId).catch(() => [] as DirectoryPerson[]),
    fetchIamUsers(organizationId).catch(() => [] as DirectoryPerson[]),
  ]);

  const people = [...hr, ...timetable, ...iam];
  for (const person of people) {
    await upsertPerson(organizationId, person);
  }

  return {
    hr: hr.length,
    timetable: timetable.length,
    iam: iam.length,
    upserted: people.length,
  };
}

/** IAM Users & Access → one employee row (eligible roster; advance still needs salary). */
export async function upsertDirectoryPerson(organizationId: string, person: DirectoryPerson) {
  return upsertPerson(organizationId, person);
}

export function parseDirectorySources(raw: string | null | undefined): DirectorySource[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is DirectorySource => s === "timetable" || s === "hr" || s === "iam");
}
