import { CardStatus } from "../generated/prisma";
import { prisma } from "../config/database";
import { fetchAcademicContext } from "../clients/academic-settings.client";
import {
  fetchOrganizationStaffWithMeta,
  type StaffMember,
} from "../clients/staff-integration.client";
import {
  attendanceRate,
  eachDayIso,
  isPresentStatus,
  isWeekendIso,
  resolvePeriod,
  resolveTermWeekdayMetrics,
  todayIso,
} from "../utils/attendance-period";
import { listAttendance, serializeAttendanceRecordsForApi } from "./attendance.service";

type AttendanceRecord = Awaited<ReturnType<typeof listAttendance>>[number];
type SerializedRecord = Awaited<ReturnType<typeof serializeAttendanceRecordsForApi>>[number];

export type TeacherGatePortalRow = {
  teacher_id: string;
  date: string;
  lessonDate: string;
  status_in: "present" | "late" | "missed";
  check_in: string | null;
  check_out: string | null;
  entryTime: string | null;
  exitTime: string | null;
  attendanceStatus: string;
  punctuality: string;
  checkoutStatus: string;
  primaryBadge: string;
  durationMins: number | null;
  display: SerializedRecord["display"];
};

type TeacherLookup = {
  teacherUserId: string;
  email?: string | null;
  teacherName?: string | null;
};

async function staffRfidById(organizationId: string) {
  const cards = await prisma.rfidCard.findMany({
    where: {
      organizationId,
      deletedAt: null,
      status: { in: [CardStatus.ACTIVE, CardStatus.PENDING] },
      OR: [{ level: { startsWith: "STAFF:" } }, { notes: { contains: "owner:staff" } }],
    },
    select: { studentId: true, studentCode: true, cardNumber: true },
  });
  const byId = new Map<string, string>();
  const byCode = new Map<string, string>();
  for (const c of cards) {
    const num = c.cardNumber.trim().toUpperCase();
    if (c.studentId) byId.set(c.studentId, num);
    if (c.studentCode) byCode.set(c.studentCode.trim().toUpperCase(), num);
  }
  return { byId, byCode };
}

function enrichStaffRfid(
  staff: StaffMember,
  lookup: Awaited<ReturnType<typeof staffRfidById>>
): StaffMember {
  const rfidUid =
    staff.rfidUid ??
    lookup.byId.get(staff.id) ??
    (staff.employeeNumber ? lookup.byCode.get(staff.employeeNumber.trim().toUpperCase()) : undefined) ??
    null;
  return rfidUid && rfidUid !== staff.rfidUid ? { ...staff, rfidUid } : staff;
}

async function resolveTeacherStaff(
  organizationId: string,
  lookup: TeacherLookup
): Promise<StaffMember | null> {
  const teacherUserId = lookup.teacherUserId.trim();
  const search =
    lookup.teacherName?.trim() ||
    lookup.email?.trim() ||
    undefined;
  const [{ rows }, rfidLookup] = await Promise.all([
    fetchOrganizationStaffWithMeta(organizationId, search),
    staffRfidById(organizationId),
  ]);

  const emailNorm = lookup.email?.trim().toLowerCase() ?? "";
  for (const row of rows) {
    const enriched = enrichStaffRfid(row, rfidLookup);
    if (enriched.teacherUserId === teacherUserId || enriched.id === teacherUserId) {
      return enriched;
    }
    if (emailNorm && enriched.email?.trim().toLowerCase() === emailNorm) {
      return enriched;
    }
  }

  if (lookup.teacherName?.trim()) {
    const nameKey = lookup.teacherName.trim().toLowerCase();
    for (const row of rows) {
      if (row.fullName.trim().toLowerCase() === nameKey) {
        return enrichStaffRfid(row, rfidLookup);
      }
    }
  }

  return null;
}

function staffMatchKeys(staff: StaffMember): Set<string> {
  const keys = new Set<string>([staff.id]);
  if (staff.employeeNumber) keys.add(staff.employeeNumber);
  if (staff.rfidUid) keys.add(staff.rfidUid.toUpperCase());
  keys.add(staff.fullName.trim().toLowerCase());
  return keys;
}

function recordMatchesStaff(staff: StaffMember, row: AttendanceRecord): boolean {
  const keys = staffMatchKeys(staff);
  if (row.studentId && keys.has(row.studentId)) return true;
  if (row.studentCode && keys.has(row.studentCode)) return true;
  if (row.cardNumber && keys.has(row.cardNumber.toUpperCase())) return true;
  if (keys.has(row.studentName.trim().toLowerCase())) return true;
  return false;
}

function filterStaffMemberRecords(staff: StaffMember, records: AttendanceRecord[]): AttendanceRecord[] {
  return records.filter((row) => row.level?.startsWith("STAFF:") && recordMatchesStaff(staff, row));
}

function classifyDayStatus(rows: AttendanceRecord[]): "PRESENT" | "LATE" | "ABSENT" {
  if (!rows.length) return "ABSENT";
  if (rows.some((r) => r.status === "LATE")) return "LATE";
  if (rows.some((r) => isPresentStatus(r.status))) return "PRESENT";
  if (rows.some((r) => r.status === "ABSENT")) return "ABSENT";
  return "ABSENT";
}

function portalStatusIn(serialized: SerializedRecord | null): TeacherGatePortalRow["status_in"] {
  if (!serialized) return "missed";
  const attendanceStatus = serialized.attendanceStatus ?? serialized.display?.attendanceStatus;
  const punctuality = serialized.punctuality ?? serialized.display?.punctuality;
  if (attendanceStatus === "ABSENT" || (!serialized.entryTime && attendanceStatus !== "PRESENT")) {
    return "missed";
  }
  if (punctuality === "LATE") return "late";
  if (serialized.entryTime) return "present";
  return "missed";
}

function emptyPortalRow(teacherUserId: string, date: string): TeacherGatePortalRow {
  return {
    teacher_id: teacherUserId,
    date,
    lessonDate: date,
    status_in: "missed",
    check_in: null,
    check_out: null,
    entryTime: null,
    exitTime: null,
    attendanceStatus: "ABSENT",
    punctuality: "UNKNOWN",
    checkoutStatus: "NOT_APPLICABLE",
    primaryBadge: "ABSENT",
    durationMins: null,
    display: {
      attendanceStatus: "ABSENT",
      punctuality: "UNKNOWN",
      checkoutStatus: "NOT_APPLICABLE",
      primaryBadge: "ABSENT",
      expectedArrival: "",
      expectedDeparture: "",
    },
  };
}

function toPortalRow(teacherUserId: string, serialized: SerializedRecord | null, date?: string): TeacherGatePortalRow {
  if (!serialized) return emptyPortalRow(teacherUserId, date ?? todayIso());
  const lessonDate = serialized.lessonDate;
  const status_in = portalStatusIn(serialized);
  return {
    teacher_id: teacherUserId,
    date: lessonDate,
    lessonDate,
    status_in,
    check_in: serialized.entryTime,
    check_out: serialized.exitTime,
    entryTime: serialized.entryTime,
    exitTime: serialized.exitTime,
    attendanceStatus: serialized.attendanceStatus,
    punctuality: serialized.punctuality,
    checkoutStatus: serialized.checkoutStatus,
    primaryBadge: serialized.primaryBadge,
    durationMins: serialized.durationMins ?? null,
    display: serialized.display,
  };
}

function buildPersonDayAnalytics(
  mine: AttendanceRecord[],
  fromIso: string,
  toIso: string
) {
  const byDay = new Map<string, AttendanceRecord[]>();
  for (const row of mine) {
    const day =
      row.lessonDate instanceof Date
        ? row.lessonDate.toISOString().slice(0, 10)
        : String(row.lessonDate).slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(row);
    byDay.set(day, list);
  }

  let presentDays = 0;
  let lateDays = 0;
  let absentDays = 0;
  const today = todayIso();

  for (const date of eachDayIso(fromIso, toIso)) {
    if (date > today) continue;
    const dayRows = byDay.get(date) ?? [];
    if (isWeekendIso(date)) {
      if (!dayRows.length) continue;
      const st = classifyDayStatus(dayRows);
      if (st === "LATE") lateDays += 1;
      else if (st === "PRESENT") presentDays += 1;
      continue;
    }

    const st = classifyDayStatus(dayRows);
    if (st === "LATE") lateDays += 1;
    else if (st === "PRESENT") presentDays += 1;
    else absentDays += 1;
  }

  return { presentDays, lateDays, absentDays };
}

function buildTermPerformance(
  mine: AttendanceRecord[],
  elapsedWeekdays: number,
  termTotalDays?: number
) {
  const presentByDay = new Set<string>();
  for (const row of mine) {
    if (!isPresentStatus(row.status)) continue;
    const day =
      row.lessonDate instanceof Date
        ? row.lessonDate.toISOString().slice(0, 10)
        : String(row.lessonDate).slice(0, 10);
    if (!isWeekendIso(day)) presentByDay.add(day);
  }
  const presentDays = presentByDay.size;
  const expectedDays = termTotalDays && termTotalDays > 0 ? termTotalDays : elapsedWeekdays;
  return {
    presentDays,
    expectedDays,
    rate: attendanceRate(presentDays, expectedDays),
  };
}

async function portalRowsForRange(
  organizationId: string,
  lookup: TeacherLookup,
  from: string,
  to: string
): Promise<TeacherGatePortalRow[]> {
  const staff = await resolveTeacherStaff(organizationId, lookup);
  const records = staff
    ? await listAttendance(organizationId, { from, to, personType: "STAFF" })
    : [];
  const mine = staff ? filterStaffMemberRecords(staff, records) : [];
  const serialized = await serializeAttendanceRecordsForApi(organizationId, mine);
  const byDay = new Map<string, SerializedRecord>();
  for (const row of serialized) {
    if (!byDay.has(row.lessonDate)) byDay.set(row.lessonDate, row);
  }

  const out: TeacherGatePortalRow[] = [];
  const today = todayIso();
  for (const date of eachDayIso(from, to)) {
    if (date > today) continue;
    out.push(toPortalRow(lookup.teacherUserId, byDay.get(date) ?? null, date));
  }
  return out.reverse();
}

export async function teacherGateAttendanceDay(
  organizationId: string,
  lookup: TeacherLookup,
  date?: string
): Promise<TeacherGatePortalRow[]> {
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayIso();
  const rows = await portalRowsForRange(organizationId, lookup, day, day);
  if (rows.length) return rows;
  return [emptyPortalRow(lookup.teacherUserId, day)];
}

export async function teacherGateAttendanceHistory(
  organizationId: string,
  lookup: TeacherLookup,
  from: string,
  to: string
): Promise<TeacherGatePortalRow[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return [];
  }
  return portalRowsForRange(organizationId, lookup, from, to);
}

export type TeacherHistoryFilters = {
  date?: string;
  from?: string;
  to?: string;
  scope?: "term" | "days";
  days?: number;
  academicYear?: string;
  term?: string;
  page?: number;
  limit?: number;
};

export async function resolveTeacherHistoryWindow(
  organizationId: string,
  filters: TeacherHistoryFilters
): Promise<{ from: string; to: string; academicYear?: string; term?: string }> {
  const academic = await fetchAcademicContext(organizationId);
  const period = resolvePeriod(
    {
      academicYear: filters.academicYear,
      term: filters.term,
    },
    academic
  );
  const academicYear = filters.academicYear ?? academic.currentAcademicYear ?? undefined;
  const term = filters.term ?? academic.currentTerm ?? undefined;

  if (filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
    return { from: filters.date, to: filters.date, academicYear, term };
  }

  if (filters.from && filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.from) && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
    return { from: filters.from, to: filters.to, academicYear, term };
  }

  if (filters.scope === "days") {
    const to = todayIso();
    const fromDate = new Date(`${to}T12:00:00`);
    fromDate.setDate(fromDate.getDate() - Math.min(90, Math.max(1, filters.days ?? 45)) + 1);
    return {
      from: fromDate.toISOString().slice(0, 10),
      to,
      academicYear,
      term,
    };
  }

  const { termRange } = resolveTermWeekdayMetrics(period, academic, {
    academicYear: filters.academicYear,
    term: filters.term,
  });
  const from = termRange?.start ?? period.from;
  const to = period.to;
  return { from, to, academicYear, term };
}

export async function teacherGateHistoryPaged(
  organizationId: string,
  lookup: TeacherLookup,
  filters: TeacherHistoryFilters
): Promise<{
  rows: TeacherGatePortalRow[];
  total: number;
  page: number;
  limit: number;
  from: string;
  to: string;
  academicYear?: string;
  term?: string;
  termRate: number | null;
}> {
  const window = await resolveTeacherHistoryWindow(organizationId, filters);
  const allRows = await portalRowsForRange(organizationId, lookup, window.from, window.to);
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(5, filters.limit ?? 10));
  const total = allRows.length;
  const rows = allRows.slice((page - 1) * limit, page * limit);

  const academic = await fetchAcademicContext(organizationId);
  const period = resolvePeriod(
    { academicYear: window.academicYear, term: window.term },
    academic
  );
  const { termRange, termTotalDays, elapsedWeekdays } = resolveTermWeekdayMetrics(period, academic);
  const termFrom = termRange?.start ?? period.from;
  const staff = await resolveTeacherStaff(organizationId, lookup);
  const termRecords = staff
    ? filterStaffMemberRecords(
        staff,
        await listAttendance(organizationId, { from: termFrom, to: period.to, personType: "STAFF" })
      )
    : [];
  const termPerformance = buildTermPerformance(termRecords, elapsedWeekdays, termTotalDays);

  return {
    rows,
    total,
    page,
    limit,
    from: window.from,
    to: window.to,
    academicYear: window.academicYear,
    term: window.term,
    termRate: termPerformance.rate,
  };
}

export async function teacherGateHistoryForScope(
  organizationId: string,
  lookup: TeacherLookup,
  scope: "term" | "days",
  days: number
): Promise<TeacherGatePortalRow[]> {
  if (scope === "term") {
    const academic = await fetchAcademicContext(organizationId);
    const period = resolvePeriod({}, academic);
    const { termRange } = resolveTermWeekdayMetrics(period, academic);
    const from = termRange?.start ?? period.from;
    const to = period.to;
    return portalRowsForRange(organizationId, lookup, from, to);
  }

  const to = todayIso();
  const fromDate = new Date(`${to}T12:00:00`);
  fromDate.setDate(fromDate.getDate() - Math.min(90, Math.max(1, days)) + 1);
  const from = fromDate.toISOString().slice(0, 10);
  return portalRowsForRange(organizationId, lookup, from, to);
}

export async function teacherGateMonthlyGrid(
  organizationId: string,
  lookup: TeacherLookup,
  month: number,
  year: number
): Promise<{
  grid: Array<{ teacher_id: string; present_days: number; late_days: number; absent_days: number }>;
  performance: {
    rate: number;
    presentDays: number;
    lateDays: number;
    absentDays: number;
    expectedDays: number;
    termRate: number;
    termPresentDays: number;
    termExpectedDays: number;
  };
}> {
  const m = Math.min(12, Math.max(1, month));
  const y = year > 2000 ? year : new Date().getFullYear();
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const daysInMonth = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const staff = await resolveTeacherStaff(organizationId, lookup);
  const records = staff
    ? await listAttendance(organizationId, { from, to, personType: "STAFF" })
    : [];
  const mine = staff ? filterStaffMemberRecords(staff, records) : [];
  const monthAnalytics = buildPersonDayAnalytics(mine, from, to);

  const academic = await fetchAcademicContext(organizationId);
  const period = resolvePeriod({}, academic);
  const { termRange, termTotalDays, elapsedWeekdays } = resolveTermWeekdayMetrics(period, academic);
  const termFrom = termRange?.start ?? period.from;
  const termRecords = staff
    ? filterStaffMemberRecords(
        staff,
        await listAttendance(organizationId, { from: termFrom, to: period.to, personType: "STAFF" })
      )
    : [];
  const termPerformance = buildTermPerformance(termRecords, elapsedWeekdays, termTotalDays);

  return {
    grid: [
      {
        teacher_id: lookup.teacherUserId,
        present_days: monthAnalytics.presentDays,
        late_days: monthAnalytics.lateDays,
        absent_days: monthAnalytics.absentDays,
      },
    ],
    performance: {
      rate: attendanceRate(
        monthAnalytics.presentDays + monthAnalytics.lateDays,
        monthAnalytics.presentDays + monthAnalytics.lateDays + monthAnalytics.absentDays
      ),
      presentDays: monthAnalytics.presentDays,
      lateDays: monthAnalytics.lateDays,
      absentDays: monthAnalytics.absentDays,
      expectedDays:
        monthAnalytics.presentDays + monthAnalytics.lateDays + monthAnalytics.absentDays,
      termRate: termPerformance.rate,
      termPresentDays: termPerformance.presentDays,
      termExpectedDays: termPerformance.expectedDays,
    },
  };
}
