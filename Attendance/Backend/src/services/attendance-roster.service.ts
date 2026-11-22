import { prisma } from "../config/database";
import { CardStatus } from "../generated/prisma";
import {
  fetchStudentsForAttendanceRoster,
  fetchAllStudentsList,
  isStudentManagementEnabled,
  type SmStudent,
} from "../clients/student-management.client";
import { fetchOrganizationStaffWithMeta, type StaffMember } from "../clients/staff-integration.client";
import {
  computeAttendanceDisplay,
  staffDepartmentFromLevel,
  staffRoleFromLevel,
} from "../utils/attendance-display.util";
import { getOrCreateSettings } from "./attendance.service";
import { listActiveScheduleRules, resolveScheduleFromRules } from "./attendance-schedule.service";

type RosterQuery = {
  date?: string;
  from?: string;
  to?: string;
  className?: string;
  department?: string;
  staffRole?: string;
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
};

function rosterDayIso(query?: RosterQuery): string {
  if (query?.date) return query.date.slice(0, 10);
  if (query?.from) return query.from.slice(0, 10);
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function dayUtcRange(iso: string) {
  const part = iso.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(part);
  if (!m) {
    const now = new Date();
    const gte = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return { gte, lte: gte };
  }
  const gte = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return { gte, lte: gte };
}

function isStaffCard(card: { level?: string | null; notes?: string | null; qrPayload?: string | null }) {
  if (card.notes?.includes("owner:staff")) return true;
  if (card.level?.startsWith("STAFF:")) return true;
  if (card.qrPayload?.includes("|STAFF:")) return true;
  return false;
}

function isStudentCard(card: {
  level?: string | null;
  notes?: string | null;
  qrPayload?: string | null;
  studentId?: string | null;
  studentCode?: string | null;
}) {
  if (isStaffCard(card)) return false;
  if (card.notes?.includes("owner:student")) return true;
  if (card.qrPayload?.includes("|STUDENT:")) return true;
  if (card.studentId?.trim() || card.studentCode?.trim()) return true;
  return false;
}

function normalizeGroupLabel(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

function compactGroupLabel(value?: string | null) {
  return normalizeGroupLabel(value).replace(/\s+/g, "");
}

function groupLabelsMatch(left?: string | null, right?: string | null) {
  const a = normalizeGroupLabel(left);
  const b = normalizeGroupLabel(right);
  if (!b) return true;
  if (!a) return false;
  if (a === b) return true;
  if (compactGroupLabel(left) === compactGroupLabel(right)) return true;
  return a.includes(b) || b.includes(a);
}

function studentMatchesFilters(
  student: SmStudent,
  query?: Pick<RosterQuery, "className" | "q"> & { className?: string },
  cardClassName?: string | null
) {
  if (query?.className) {
    const want = query.className;
    const cls = student.className ?? cardClassName ?? "";
    if (!groupLabelsMatch(cls, want)) return false;
  }
  if (query?.q) {
    const q = query.q.trim().toLowerCase();
    const hay = `${student.fullName} ${student.studentCode ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function studentKey(student: SmStudent) {
  return (student.studentCode ?? student.id).trim().toLowerCase();
}

function staffDepartmentMatches(member: StaffMember, department?: string) {
  if (!department?.trim()) return true;
  const want = normalizeGroupLabel(department);
  const dept = normalizeGroupLabel(member.department);
  const pos = normalizeGroupLabel(member.position);
  if (groupLabelsMatch(dept, want)) return true;
  if (want.includes("teaching") && (pos.includes("teacher") || dept.includes("teach"))) return true;
  if (want.includes("admin") && (dept.includes("admin") || pos.includes("admin"))) return true;
  if (pos && groupLabelsMatch(pos, want)) return true;
  return false;
}

function staffMatchesFilters(
  member: StaffMember,
  query?: Pick<RosterQuery, "department" | "staffRole" | "q">
) {
  if (query?.department && !staffDepartmentMatches(member, query.department)) return false;
  if (query?.staffRole) {
    const want = query.staffRole.trim().toLowerCase();
    const role = (member.position ?? "").trim().toLowerCase();
    if (role !== want) return false;
  }
  if (query?.q) {
    const q = query.q.trim().toLowerCase();
    const hay = `${member.fullName} ${member.employeeNumber ?? ""} ${member.email ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function memberKey(member: StaffMember) {
  return (member.employeeNumber ?? member.id).trim().toLowerCase();
}

function buildStaffLookup(rows: StaffMember[]) {
  const map = new Map<string, StaffMember>();
  for (const member of rows) {
    map.set(memberKey(member), member);
    map.set(member.id.trim().toLowerCase(), member);
    const emp = member.employeeNumber?.trim().toLowerCase();
    if (emp) map.set(emp, member);
  }
  return map;
}

function lookupStaffMember(
  lookup: Map<string, StaffMember>,
  row: { studentId?: string | null; studentCode?: string | null }
) {
  for (const k of recordKeys(row)) {
    const hit = lookup.get(k);
    if (hit) return hit;
  }
  return undefined;
}

function rowMatchesStaffQuery(
  row: {
    department?: string | null;
    staffRole?: string | null;
    className?: string | null;
    level?: string | null;
  },
  query?: Pick<RosterQuery, "department" | "staffRole">
) {
  if (!query?.department && !query?.staffRole) return true;
  const dept = (row.department ?? row.className ?? "").trim().toLowerCase();
  const role = (row.staffRole ?? staffRoleFromLevel(row.level) ?? "").trim().toLowerCase();
  if (query.department) {
    const want = normalizeGroupLabel(query.department);
    const rowDept = normalizeGroupLabel(dept);
    const rowRole = normalizeGroupLabel(role);
    if (!groupLabelsMatch(rowDept, want) && !groupLabelsMatch(rowRole, want)) {
      if (!(want.includes("teaching") && rowRole.includes("teacher"))) return false;
    }
  }
  if (query.staffRole) {
    const want = query.staffRole.trim().toLowerCase();
    if (role !== want) return false;
  }
  return true;
}

function applyStaffProfileToRow<T extends {
  department?: string | null;
  staffRole?: string | null;
  groupLabel?: string | null;
  className?: string | null;
  photoUrl?: string | null;
}>(row: T, member?: StaffMember): T {
  if (!member) return row;
  const department = member.department?.trim() || row.department || row.className || null;
  const staffRole = member.position?.trim() || row.staffRole || null;
  return {
    ...row,
    department,
    staffRole,
    groupLabel: department ?? row.groupLabel ?? "Staff",
    className: department ?? row.className,
    photoUrl: row.photoUrl ?? member.photoUrl ?? null,
  };
}

function recordKeys(row: { studentId?: string | null; studentCode?: string | null }) {
  return [
    row.studentId?.trim().toLowerCase(),
    row.studentCode?.trim().toLowerCase(),
  ].filter(Boolean) as string[];
}

function cardKeys(card: { studentId?: string | null; studentCode?: string | null }) {
  return recordKeys(card);
}

function matchesStatusFilter(
  row: { attendanceStatus?: string; punctuality?: string; checkoutStatus?: string },
  status?: string
) {
  if (!status) return true;
  const s = status.toUpperCase();
  if (s === "ABSENT") return row.attendanceStatus === "ABSENT";
  if (s === "LATE") return row.punctuality === "LATE";
  if (s === "PENDING_CHECKOUT") return row.checkoutStatus === "PENDING";
  if (s === "PRESENT") return row.attendanceStatus === "PRESENT";
  if (s === "ENTERED_ONLY") {
    return row.attendanceStatus === "PRESENT" && row.checkoutStatus === "PENDING";
  }
  return true;
}

function sortRows<T extends Record<string, unknown>>(
  rows: T[],
  sortBy?: string,
  sortDir?: string
): T[] {
  const dir = sortDir?.toLowerCase() === "asc" ? 1 : -1;
  const key = sortBy?.toLowerCase() ?? "name";
  return [...rows].sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    if (key === "checkin") {
      av = String(a.entryTime ?? "");
      bv = String(b.entryTime ?? "");
    } else if (key === "checkout") {
      av = String(a.exitTime ?? "");
      bv = String(b.exitTime ?? "");
    } else if (key === "class") {
      av = String(a.groupLabel ?? a.className ?? "");
      bv = String(b.groupLabel ?? b.className ?? "");
    } else {
      av = String(a.studentName ?? "");
      bv = String(b.studentName ?? "");
    }
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

function serializeStaffRecord(
  organizationId: string,
  row: Awaited<ReturnType<typeof prisma.attendanceRecord.findMany>>[number],
  settings: Awaited<ReturnType<typeof getOrCreateSettings>>,
  scheduleRules: Awaited<ReturnType<typeof listActiveScheduleRules>>
) {
  const resolved = resolveScheduleFromRules(settings, scheduleRules, {
    lessonDate: row.lessonDate,
    className: row.className,
    isStaff: true,
  });
  const merged = {
    ...settings,
    schoolStarts: resolved.schoolStarts,
    lateStarts: resolved.lateStarts,
    schoolEnds: resolved.schoolEnds,
    attendanceClosingTime: resolved.attendanceClosingTime,
    enableLateDetection: resolved.enableLateDetection,
  };
  const display = computeAttendanceDisplay(
    {
      status: row.status,
      entryTime: row.entryTime,
      exitTime: row.exitTime,
      lessonDate: row.lessonDate,
    },
    merged,
    { isStaff: true }
  );
  const department = staffDepartmentFromLevel(row.level, row.className);
  const staffRole = staffRoleFromLevel(row.level);
  return {
    ...row,
    personType: "STAFF" as const,
    lessonDate:
      row.lessonDate instanceof Date
        ? row.lessonDate.toISOString().slice(0, 10)
        : String(row.lessonDate).slice(0, 10),
    entryTime: row.entryTime?.toISOString() ?? null,
    exitTime: row.exitTime?.toISOString() ?? null,
    department,
    staffRole,
    groupLabel: department ?? "Staff",
    display,
    attendanceStatus: display.attendanceStatus,
    punctuality: display.punctuality,
    checkoutStatus: display.checkoutStatus,
    expectedArrival: display.expectedArrival,
    expectedDeparture: display.expectedDeparture,
    scheduleRuleName: resolved.ruleName ?? null,
    synthetic: false,
  };
}

function serializeStudentRecord(
  organizationId: string,
  row: Awaited<ReturnType<typeof prisma.attendanceRecord.findMany>>[number],
  settings: Awaited<ReturnType<typeof getOrCreateSettings>>,
  scheduleRules: Awaited<ReturnType<typeof listActiveScheduleRules>>
) {
  const resolved = resolveScheduleFromRules(settings, scheduleRules, {
    lessonDate: row.lessonDate,
    className: row.className,
    isStaff: false,
  });
  const merged = {
    ...settings,
    schoolStarts: resolved.schoolStarts,
    lateStarts: resolved.lateStarts,
    schoolEnds: resolved.schoolEnds,
    attendanceClosingTime: resolved.attendanceClosingTime,
    enableLateDetection: resolved.enableLateDetection,
  };
  const display = computeAttendanceDisplay(
    {
      status: row.status,
      entryTime: row.entryTime,
      exitTime: row.exitTime,
      lessonDate: row.lessonDate,
    },
    merged,
    { isStaff: false }
  );
  return {
    ...row,
    personType: "STUDENT" as const,
    lessonDate:
      row.lessonDate instanceof Date
        ? row.lessonDate.toISOString().slice(0, 10)
        : String(row.lessonDate).slice(0, 10),
    entryTime: row.entryTime?.toISOString() ?? null,
    exitTime: row.exitTime?.toISOString() ?? null,
    department: null,
    staffRole: null,
    groupLabel: row.className ?? "—",
    display,
    attendanceStatus: display.attendanceStatus,
    punctuality: display.punctuality,
    checkoutStatus: display.checkoutStatus,
    expectedArrival: display.expectedArrival,
    expectedDeparture: display.expectedDeparture,
    scheduleRuleName: resolved.ruleName ?? null,
    synthetic: false,
  };
}

function syntheticStudentAbsentRow(
  student: SmStudent,
  card: { cardNumber: string },
  lessonDate: string,
  settings: Awaited<ReturnType<typeof getOrCreateSettings>>
) {
  const display = computeAttendanceDisplay(
    { status: "ABSENT", entryTime: null, exitTime: null, lessonDate: new Date(lessonDate) },
    settings
  );
  return {
    id: `absent:${student.id}:${lessonDate}`,
    organizationId: "",
    studentId: student.id,
    studentCode: student.studentCode,
    studentName: student.fullName,
    className: student.className ?? "—",
    level: student.educationLevel ?? null,
    cardNumber: card.cardNumber,
    status: "ABSENT",
    direction: "NONE",
    entryTime: null,
    exitTime: null,
    durationMins: null,
    lessonDate,
    personType: "STUDENT" as const,
    department: null,
    staffRole: null,
    groupLabel: student.className ?? "—",
    display,
    attendanceStatus: "ABSENT" as const,
    punctuality: display.punctuality,
    checkoutStatus: display.checkoutStatus,
    expectedArrival: display.expectedArrival,
    expectedDeparture: display.expectedDeparture,
    synthetic: true,
    photoUrl: student.photoUrl ?? null,
  };
}

function syntheticAbsentRow(
  member: StaffMember,
  card: { cardNumber: string },
  lessonDate: string,
  settings: Awaited<ReturnType<typeof getOrCreateSettings>>
) {
  const display = computeAttendanceDisplay(
    { status: "ABSENT", entryTime: null, exitTime: null, lessonDate: new Date(lessonDate) },
    settings
  );
  return {
    id: `absent:${member.id}:${lessonDate}`,
    organizationId: "",
    studentId: member.id,
    studentCode: member.employeeNumber ?? member.id,
    studentName: member.fullName,
    className: member.department ?? "Staff",
    level: `STAFF:${member.position ?? "Staff"}`,
    cardNumber: card.cardNumber,
    status: "ABSENT",
    direction: "NONE",
    entryTime: null,
    exitTime: null,
    durationMins: null,
    lessonDate,
    personType: "STAFF" as const,
    department: member.department ?? null,
    staffRole: member.position ?? null,
    groupLabel: member.department ?? "Staff",
    display,
    attendanceStatus: "ABSENT" as const,
    punctuality: display.punctuality,
    checkoutStatus: display.checkoutStatus,
    expectedArrival: display.expectedArrival,
    expectedDeparture: display.expectedDeparture,
    synthetic: true,
    photoUrl: member.photoUrl ?? null,
  };
}

/** Staff day roster: movement records + absent rows for card holders who did not tap. */
export async function listStaffAttendanceRoster(organizationId: string, query?: RosterQuery) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(100, Math.max(10, Number(query?.limit) || 25));
  const dayIso = rosterDayIso(query);
  const { gte, lte } = dayUtcRange(dayIso);

  const [staffMeta, settings, scheduleRules, cards, dbRecords] = await Promise.all([
    fetchOrganizationStaffWithMeta(organizationId, query?.q),
    getOrCreateSettings(organizationId),
    listActiveScheduleRules(organizationId),
    prisma.rfidCard.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: [CardStatus.ACTIVE, CardStatus.TEMPORARY] },
      },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        lessonDate: { gte, lte },
        level: { startsWith: "STAFF:" },
      },
      orderBy: [{ entryTime: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const staffLookup = buildStaffLookup(staffMeta.rows);
  const staffCards = cards.filter(isStaffCard);
  const cardByStaffKey = new Map<string, (typeof staffCards)[number]>();
  for (const card of staffCards) {
    for (const k of cardKeys(card)) cardByStaffKey.set(k, card);
  }

  const recordByKey = new Map<string, (typeof dbRecords)[number]>();
  for (const rec of dbRecords) {
    for (const k of recordKeys(rec)) {
      if (!recordByKey.has(k)) recordByKey.set(k, rec);
    }
  }

  type StaffRosterRow = Awaited<ReturnType<typeof serializeStaffRecord>> & {
    synthetic?: boolean;
    photoUrl?: string | null;
  };
  const merged: StaffRosterRow[] = [];
  const seenKeys = new Set<string>();

  for (const member of staffMeta.rows) {
    if (!staffMatchesFilters(member, query)) continue;
    const key = memberKey(member);
    const card = cardByStaffKey.get(key) ?? cardByStaffKey.get(member.id.toLowerCase());
    const rec = recordByKey.get(key) ?? recordByKey.get(member.id.toLowerCase());

    if (rec) {
      seenKeys.add(key);
      for (const k of recordKeys(rec)) seenKeys.add(k);
      const serialized = serializeStaffRecord(organizationId, rec, settings, scheduleRules);
      merged.push(applyStaffProfileToRow({ ...serialized, photoUrl: member.photoUrl ?? null }, member));
      continue;
    }
    if (card) {
      seenKeys.add(key);
      for (const k of cardKeys(card)) seenKeys.add(k);
      merged.push(syntheticAbsentRow(member, card, dayIso, settings) as StaffRosterRow);
    }
  }

  for (const rec of dbRecords) {
    const keys = recordKeys(rec);
    if (keys.some((k) => seenKeys.has(k))) continue;
    const member = lookupStaffMember(staffLookup, rec);
    const serialized = serializeStaffRecord(organizationId, rec, settings, scheduleRules);
    const row = applyStaffProfileToRow(serialized, member);
    if (!rowMatchesStaffQuery(row, query)) continue;
    merged.push(row);
  }

  let filtered = merged.filter((r) => rowMatchesStaffQuery(r, query));
  filtered = filtered.filter((r) => matchesStatusFilter(r, query?.status));
  filtered = sortRows(filtered, query?.sortBy, query?.sortDir);

  const total = filtered.length;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  const summary = summarizeRoster(filtered);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary,
    lessonDate: dayIso,
  };
}

function summarizeRoster(
  filtered: Array<{
    attendanceStatus?: string;
    punctuality?: string;
    checkoutStatus?: string;
    cardNumber?: string | null;
  }>
) {
  let present = 0;
  let late = 0;
  let missingCheckout = 0;
  let absent = 0;
  let assigned = 0;
  for (const r of filtered) {
    if (String(r.cardNumber ?? "").trim()) assigned += 1;
    if (r.attendanceStatus === "ABSENT") absent += 1;
    else if (r.attendanceStatus === "PRESENT") {
      present += 1;
      if (r.punctuality === "LATE") late += 1;
      if (r.checkoutStatus === "PENDING") missingCheckout += 1;
    }
  }
  const tapped = present;
  const notTapped = absent;
  return { present, late, missingCheckout, absent, assigned, tapped, notTapped, total: filtered.length };
}

/** Student day roster: movement records + absent rows for card holders who did not tap. */
export async function listStudentAttendanceRoster(organizationId: string, query?: RosterQuery) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(100, Math.max(10, Number(query?.limit) || 25));
  const dayIso = rosterDayIso(query);
  const { gte, lte } = dayUtcRange(dayIso);

  const [students, settings, scheduleRules, cards, dbRecords] = await Promise.all([
    fetchStudentsForAttendanceRoster(organizationId, {
      search: query?.q,
      className: query?.className,
    }),
    getOrCreateSettings(organizationId),
    listActiveScheduleRules(organizationId),
    prisma.rfidCard.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: [CardStatus.ACTIVE, CardStatus.TEMPORARY] },
      },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        lessonDate: { gte, lte },
        OR: [{ level: null }, { NOT: { level: { startsWith: "STAFF:" } } }],
      },
      orderBy: [{ entryTime: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const studentByKey = new Map<string, SmStudent>();
  for (const student of students) {
    studentByKey.set(studentKey(student), student);
    studentByKey.set(student.id.trim().toLowerCase(), student);
    const code = student.studentCode?.trim().toLowerCase();
    if (code) studentByKey.set(code, student);
  }

  const studentCards = cards.filter(isStudentCard);
  const activeStudentCards = studentCards.filter(
    (c) => c.status === CardStatus.ACTIVE || c.status === CardStatus.TEMPORARY
  );
  const cardByStudentKey = new Map<string, (typeof studentCards)[number]>();
  for (const card of activeStudentCards) {
    for (const k of cardKeys(card)) cardByStudentKey.set(k, card);
  }

  const recordByKey = new Map<string, (typeof dbRecords)[number]>();
  for (const rec of dbRecords) {
    for (const k of recordKeys(rec)) {
      if (!recordByKey.has(k)) recordByKey.set(k, rec);
    }
  }

  function studentFromCard(card: (typeof studentCards)[number]): SmStudent {
    const id = card.studentId?.trim() || card.studentCode?.trim() || card.cardNumber;
    return {
      id,
      studentCode: card.studentCode?.trim() || card.studentId?.trim() || id,
      fullName: card.studentName?.trim() || "Student",
      className: card.className ?? null,
    };
  }

  type StudentRosterRow = Awaited<ReturnType<typeof serializeStudentRecord>> & {
    synthetic?: boolean;
    photoUrl?: string | null;
  };
  const merged: StudentRosterRow[] = [];
  const seenKeys = new Set<string>();

  for (const student of students) {
    const cardPreview =
      cardByStudentKey.get(studentKey(student)) ?? cardByStudentKey.get(student.id.toLowerCase());
    if (!studentMatchesFilters(student, query, cardPreview?.className)) continue;
    const key = studentKey(student);
    const card = cardByStudentKey.get(key) ?? cardByStudentKey.get(student.id.toLowerCase());
    const rec = recordByKey.get(key) ?? recordByKey.get(student.id.toLowerCase());

    if (rec) {
      seenKeys.add(key);
      for (const k of recordKeys(rec)) seenKeys.add(k);
      const serialized = serializeStudentRecord(organizationId, rec, settings, scheduleRules);
      merged.push({ ...serialized, photoUrl: student.photoUrl ?? null });
      continue;
    }
    if (card) {
      seenKeys.add(key);
      for (const k of cardKeys(card)) seenKeys.add(k);
      merged.push(syntheticStudentAbsentRow(student, card, dayIso, settings) as StudentRosterRow);
    }
  }

  for (const card of activeStudentCards) {
    const keys = cardKeys(card);
    if (keys.some((k) => seenKeys.has(k))) continue;
    const student =
      keys.map((k) => studentByKey.get(k)).find(Boolean) ??
      studentByKey.get(studentKey(studentFromCard(card))) ??
      studentFromCard(card);
    if (!studentMatchesFilters(student, query, card.className)) continue;
    const key = studentKey(student);
    const rec = recordByKey.get(key) ?? keys.map((k) => recordByKey.get(k)).find(Boolean);
    if (rec) {
      seenKeys.add(key);
      for (const k of recordKeys(rec)) seenKeys.add(k);
      const serialized = serializeStudentRecord(organizationId, rec, settings, scheduleRules);
      merged.push({ ...serialized, photoUrl: student.photoUrl ?? null });
      continue;
    }
    seenKeys.add(key);
    for (const k of keys) seenKeys.add(k);
    merged.push(syntheticStudentAbsentRow(student, card, dayIso, settings) as StudentRosterRow);
  }

  for (const rec of dbRecords) {
    const keys = recordKeys(rec);
    if (keys.some((k) => seenKeys.has(k))) continue;
    if (query?.className && !groupLabelsMatch(rec.className, query.className)) continue;
    const row = serializeStudentRecord(organizationId, rec, settings, scheduleRules);
    merged.push(row);
  }

  let filtered = merged.filter((r) => matchesStatusFilter(r, query?.status));
  filtered = sortRows(filtered, query?.sortBy, query?.sortDir);

  const total = filtered.length;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);
  const summary = summarizeRoster(filtered);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary,
    lessonDate: dayIso,
  };
}

export type StaffCardAccessRow = {
  staffId: string;
  fullName: string;
  employeeNumber: string | null;
  department: string | null;
  role: string | null;
  email: string | null;
  cardAssigned: boolean;
  cardNumber: string | null;
  cardStatus: string | null;
  source: string;
};

export async function listStaffCardAccess(
  organizationId: string,
  query?: {
    department?: string;
    staffRole?: string;
    q?: string;
    assigned?: "all" | "yes" | "no";
    page?: number;
    limit?: number;
  }
) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(200, Math.max(10, Number(query?.limit) || 25));

  const [staffMeta, cards] = await Promise.all([
    fetchOrganizationStaffWithMeta(organizationId, query?.q),
    prisma.rfidCard.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const staffCards = cards.filter(isStaffCard);
  const cardByKey = new Map<string, (typeof staffCards)[number]>();
  for (const card of staffCards) {
    for (const k of cardKeys(card)) cardByKey.set(k, card);
  }

  let rows: StaffCardAccessRow[] = staffMeta.rows
    .filter((m) => staffMatchesFilters(m, query))
    .map((m) => {
      const key = memberKey(m);
      const card = cardByKey.get(key) ?? cardByKey.get(m.id.toLowerCase());
      const assigned = Boolean(
        card && (card.status === CardStatus.ACTIVE || card.status === CardStatus.TEMPORARY)
      );
      return {
        staffId: m.id,
        fullName: m.fullName,
        employeeNumber: m.employeeNumber ?? null,
        department: m.department ?? null,
        role: m.position ?? null,
        email: m.email ?? null,
        cardAssigned: assigned,
        cardNumber: assigned ? card!.cardNumber : null,
        cardStatus: assigned ? card!.status : null,
        source: m.source,
      };
    });

  const assignedFilter = query?.assigned ?? "all";
  if (assignedFilter === "yes") rows = rows.filter((r) => r.cardAssigned);
  if (assignedFilter === "no") rows = rows.filter((r) => !r.cardAssigned);

  rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  const total = rows.length;
  const assignedTotal = rows.filter((r) => r.cardAssigned).length;
  const start = (page - 1) * limit;
  return {
    items: rows.slice(start, start + limit),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary: { total, assigned: assignedTotal, notAssigned: total - assignedTotal },
  };
}

export type StudentCardAccessRow = {
  studentId: string;
  fullName: string;
  studentCode: string | null;
  className: string | null;
  cardAssigned: boolean;
  cardNumber: string | null;
  cardStatus: string | null;
  source: string;
};

export async function listStudentCardAccess(
  organizationId: string,
  query?: {
    className?: string;
    q?: string;
    assigned?: "all" | "yes" | "no";
    page?: number;
    limit?: number;
  }
) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(200, Math.max(10, Number(query?.limit) || 25));

  const [students, cards] = await Promise.all([
    isStudentManagementEnabled()
      ? fetchAllStudentsList(organizationId, {
          search: query?.q,
          className: query?.className,
          status: "ACTIVE",
        })
      : Promise.resolve([] as SmStudent[]),
    prisma.rfidCard.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const studentCards = cards.filter(isStudentCard);
  const cardByKey = new Map<string, (typeof studentCards)[number]>();
  for (const card of studentCards) {
    for (const k of cardKeys(card)) cardByKey.set(k, card);
  }

  const byId = new Map<string, SmStudent>();
  for (const s of students) byId.set(s.id, s);

  let rows: StudentCardAccessRow[] = students.map((s) => {
    const key = studentKey(s);
    const codeKey = s.studentCode?.trim().toLowerCase();
    const card =
      cardByKey.get(key) ??
      cardByKey.get(s.id.toLowerCase()) ??
      (codeKey ? cardByKey.get(codeKey) : undefined) ??
      (s.rfidUid ? cardByKey.get(s.rfidUid.trim().toLowerCase()) : undefined);
    const assigned = Boolean(
      card && (card.status === CardStatus.ACTIVE || card.status === CardStatus.TEMPORARY)
    ) || Boolean(String(s.rfidUid ?? "").trim());
    const resolvedNumber = assigned ? (card?.cardNumber ?? s.rfidUid ?? null) : null;
    return {
      studentId: s.id,
      fullName: s.fullName,
      studentCode: s.studentCode ?? null,
      className: s.className ?? null,
      cardAssigned: assigned,
      cardNumber: resolvedNumber,
      cardStatus: assigned ? (card?.status ?? "ACTIVE") : null,
      source: "student_management",
    };
  });

  // Include locally assigned student cards not found in SM list (edge cases).
  if (rows.length === 0 || !query?.className) {
    for (const card of studentCards) {
      const id = card.studentId?.trim() || "";
      const code = card.studentCode?.trim() || "";
      if (id && byId.has(id)) continue;
      const exists = rows.some(
        (r) =>
          (id && r.studentId === id) ||
          (code && r.studentCode && r.studentCode.toLowerCase() === code.toLowerCase()) ||
          r.cardNumber === card.cardNumber
      );
      if (exists) continue;
      const assigned = card.status === CardStatus.ACTIVE || card.status === CardStatus.TEMPORARY;
      rows.push({
        studentId: id || card.id,
        fullName: card.studentName ?? "Student",
        studentCode: code || null,
        className: card.className ?? null,
        cardAssigned: assigned,
        cardNumber: assigned ? card.cardNumber : null,
        cardStatus: assigned ? card.status : null,
        source: "attendance_card",
      });
    }
  }

  if (query?.className) {
    rows = rows.filter((r) => groupLabelsMatch(r.className, query.className));
  }
  if (query?.q) {
    const q = query.q.trim().toLowerCase();
    rows = rows.filter((r) => `${r.fullName} ${r.studentCode ?? ""}`.toLowerCase().includes(q));
  }

  const assignedFilter = query?.assigned ?? "all";
  if (assignedFilter === "yes") rows = rows.filter((r) => r.cardAssigned);
  if (assignedFilter === "no") rows = rows.filter((r) => !r.cardAssigned);

  rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  const total = rows.length;
  const assignedTotal = rows.filter((r) => r.cardAssigned).length;
  const start = (page - 1) * limit;
  return {
    items: rows.slice(start, start + limit),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary: { total, assigned: assignedTotal, notAssigned: total - assignedTotal },
  };
}
