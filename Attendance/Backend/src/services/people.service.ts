import {
  fetchStudentsList,
  fetchStudentByIdentity,
  fetchStudentByRfidUid,
  isStudentManagementEnabled,
} from "../clients/student-management.client";
import {
  fetchOrganizationStaff,
  fetchOrganizationStaffWithMeta,
  fetchStaffByRfidUid,
  fetchTeacherToday,
  checkIntegrationHealth,
  isStaffIntegrationEnabled,
  type StaffMember,
} from "../clients/staff-integration.client";
import { checkStudentManagementHealth } from "../clients/student-management.client";
import { fetchAcademicContext } from "../clients/academic-settings.client";
import {
  resolvePeriod,
  countWeekdays,
  eachDayIso,
  termElapsedPercent,
  attendanceRate,
  isPresentStatus,
  isWeekendIso,
  resolveTermWeekdayMetrics,
  todayIso,
  type PeriodQuery,
} from "../utils/attendance-period";
import { CardStatus } from "../generated/prisma";
import { listAttendance } from "./attendance.service";
import { prisma } from "../config/database";

const ATTENDANCE_TZ = "Africa/Kigali";

function dateOnly(d = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: ATTENDANCE_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(d)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value])
  );
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
}

type AttendanceSlice = {
  id: string;
  status: string;
  entryTime?: Date | null;
  exitTime?: Date | null;
  gateName?: string | null;
  deviceCode?: string | null;
  cardNumber?: string | null;
  durationMins?: number | null;
};

function mapAttendance(row: Awaited<ReturnType<typeof listAttendance>>[number]): AttendanceSlice {
  return {
    id: row.id,
    status: row.status,
    entryTime: row.entryTime,
    exitTime: row.exitTime,
    gateName: row.gateName,
    deviceCode: row.deviceCode,
    cardNumber: row.cardNumber,
    durationMins: row.durationMins,
  };
}

type PeopleQuery = PeriodQuery & { q?: string; className?: string; page?: number; limit?: number };

function paginateRows<T>(rows: T[], query?: PeopleQuery) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(100, Math.max(10, Number(query?.limit) || 20));
  const total = rows.length;
  const start = (page - 1) * limit;
  return {
    rows: rows.slice(start, start + limit),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

type PerformanceStats = {
  presentDays: number;
  /** Mon–Fri days in the full term (denominator for term %). */
  expectedDays: number;
  rate: number;
  termElapsed: number;
  termTotalDays?: number;
  /** Mon–Fri days from term start through today (within term). */
  elapsedWeekdays?: number;
  weekendPresentDays?: number;
};

async function staffRfidLookup(organizationId: string) {
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

function buildAttendanceIndex(records: Awaited<ReturnType<typeof listAttendance>>) {
  const byStudentId = new Map<string, AttendanceSlice>();
  const byStudentCode = new Map<string, AttendanceSlice>();
  const byCard = new Map<string, AttendanceSlice>();
  const byName = new Map<string, AttendanceSlice>();

  for (const row of records) {
    const slice = mapAttendance(row);
    if (row.studentId) byStudentId.set(row.studentId, slice);
    if (row.studentCode) byStudentCode.set(row.studentCode, slice);
    if (row.cardNumber) byCard.set(row.cardNumber.toUpperCase(), slice);
    byName.set(row.studentName.trim().toLowerCase(), slice);
  }

  return { byStudentId, byStudentCode, byCard, byName };
}

function personKeys(row: {
  studentId?: string | null;
  studentCode?: string | null;
  cardNumber?: string | null;
  studentName: string;
}) {
  return [
    row.studentId,
    row.studentCode,
    row.cardNumber?.toUpperCase(),
    row.studentName.trim().toLowerCase(),
  ].filter((k): k is string => Boolean(k));
}

function buildPerformanceIndex(
  records: Awaited<ReturnType<typeof listAttendance>>,
  elapsedWeekdays: number,
  termRange?: { start: string; end: string },
  termTotalDays?: number
) {
  const presentByKey = new Map<string, Set<string>>();

  for (const row of records) {
    if (!isPresentStatus(row.status)) continue;
    const day = row.lessonDate.toISOString().slice(0, 10);
    for (const key of personKeys(row)) {
      const set = presentByKey.get(key) ?? new Set<string>();
      set.add(day);
      presentByKey.set(key, set);
    }
  }

  function getPerformance(keys: Array<string | null | undefined>): PerformanceStats {
    const merged = new Set<string>();
    for (const key of keys) {
      if (!key) continue;
      const days = presentByKey.get(key);
      if (days) days.forEach((d) => merged.add(d));
    }
    let weekendPresentDays = 0;
    let presentWeekdays = 0;
    for (const day of merged) {
      if (isWeekendIso(day)) weekendPresentDays += 1;
      else presentWeekdays += 1;
    }
    const denominator =
      termTotalDays && termTotalDays > 0 ? termTotalDays : elapsedWeekdays;
    return {
      presentDays: presentWeekdays,
      expectedDays: denominator,
      rate: attendanceRate(presentWeekdays, denominator),
      termElapsed: termElapsedPercent(termRange),
      termTotalDays: termTotalDays ?? denominator,
      elapsedWeekdays,
      weekendPresentDays,
    };
  }

  return { getPerformance };
}

function lessonDateIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function classifyDayStatus(
  rows: Awaited<ReturnType<typeof listAttendance>>
): "PRESENT" | "LATE" | "ABSENT" {
  if (!rows.length) return "ABSENT";
  if (rows.some((r) => r.status === "LATE")) return "LATE";
  if (rows.some((r) => isPresentStatus(r.status))) return "PRESENT";
  if (rows.some((r) => r.status === "ABSENT")) return "ABSENT";
  return "ABSENT";
}

function buildPersonDayAnalytics(
  mine: Awaited<ReturnType<typeof listAttendance>>,
  fromIso: string,
  toIso: string
) {
  const byDay = new Map<string, Awaited<ReturnType<typeof listAttendance>>>();
  for (const row of mine) {
    const day = lessonDateIso(row.lessonDate);
    const list = byDay.get(day) ?? [];
    list.push(row);
    byDay.set(day, list);
  }

  const dailyTrend: Array<{
    date: string;
    present: number;
    late: number;
    absent: number;
    total: number;
  }> = [];
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
      if (st === "LATE") {
        dailyTrend.push({ date, present: 0, late: 1, absent: 0, total: 1 });
      } else if (st === "PRESENT") {
        dailyTrend.push({ date, present: 1, late: 0, absent: 0, total: 1 });
      }
      continue;
    }

    const st = classifyDayStatus(dayRows);
    if (st === "LATE") {
      lateDays += 1;
      dailyTrend.push({ date, present: 0, late: 1, absent: 0, total: 1 });
    } else if (st === "PRESENT") {
      presentDays += 1;
      dailyTrend.push({ date, present: 1, late: 0, absent: 0, total: 1 });
    } else {
      absentDays += 1;
      dailyTrend.push({ date, present: 0, late: 0, absent: 1, total: 1 });
    }
  }

  const statusBreakdown = [
    { label: "Present", value: presentDays, color: "#10b981" },
    { label: "Late", value: lateDays, color: "#f59e0b" },
    { label: "Absent", value: absentDays, color: "#ef4444" },
  ];

  return { dailyTrend, statusBreakdown, presentDays, lateDays, absentDays };
}

export async function integrationsStatus() {
  const [studentManagement, moduleChecks] = await Promise.all([
    checkStudentManagementHealth(),
    checkIntegrationHealth(),
  ]);
  return {
    studentManagement,
    hr: moduleChecks.find((m) => m.module === "hr") ?? null,
    iam: moduleChecks.find((m) => m.module === "iam") ?? null,
    timetable: moduleChecks.find((m) => m.module === "timetable") ?? null,
  };
}

export async function studentsOverview(organizationId: string, query?: PeopleQuery) {
  const academic = await fetchAcademicContext(organizationId);
  const period = resolvePeriod(query, academic);
  const { termRange, termTotalDays, elapsedWeekdays } = resolveTermWeekdayMetrics(
    period,
    academic,
    query
  );
  const isSingleDay = period.from === period.to;

  const [students, records] = await Promise.all([
    isStudentManagementEnabled()
      ? fetchStudentsList(organizationId, { search: query?.q, className: query?.className })
      : Promise.resolve([]),
    listAttendance(organizationId, {
      ...(isSingleDay ? { date: period.from } : { from: period.from, to: period.to }),
      q: query?.q,
      className: query?.className,
    }),
  ]);

  const studentRecords = records.filter((r) => !r.level?.startsWith("STAFF:"));
  const index = buildAttendanceIndex(studentRecords);
  const performanceIndex = buildPerformanceIndex(
    studentRecords,
    elapsedWeekdays,
    termRange,
    termTotalDays
  );

  if (students.length) {
    const rows = students.map((s) => {
      const att =
        index.byStudentId.get(s.id) ??
        index.byStudentCode.get(s.studentCode) ??
        (s.rfidUid ? index.byCard.get(s.rfidUid.toUpperCase()) : undefined) ??
        index.byName.get(s.fullName.trim().toLowerCase());

      return {
        id: s.id,
        studentCode: s.studentCode,
        fullName: s.fullName,
        className: s.className,
        photoUrl: s.photoUrl ?? null,
        rfidUid: s.rfidUid ?? null,
        parentName: s.parentName ?? null,
        parentPhone: s.parentPhone ?? null,
        personType: "STUDENT" as const,
        todayStatus: att?.status ?? "ABSENT",
        attendance: att ?? null,
        performance: performanceIndex.getPerformance([s.id, s.studentCode, s.rfidUid?.toUpperCase(), s.fullName.trim().toLowerCase()]),
      };
    });

    rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
    const present = rows.filter((r) => isPresentStatus(r.todayStatus)).length;
    const paged = paginateRows(rows, query);
    return {
      source: "student_management" as const,
      period,
      total: rows.length,
      present,
      late: rows.filter((r) => r.todayStatus === "LATE").length,
      absent: rows.filter((r) => r.todayStatus === "ABSENT").length,
      rows: paged.rows,
      page: paged.page,
      limit: paged.limit,
      totalPages: paged.totalPages,
    };
  }

  const rows = studentRecords.map((r) => ({
    id: r.studentId ?? r.id,
    studentCode: r.studentCode ?? null,
    fullName: r.studentName,
    className: r.className ?? null,
    photoUrl: null,
    rfidUid: r.cardNumber ?? null,
    parentName: null,
    parentPhone: null,
    personType: "STUDENT" as const,
    todayStatus: r.status,
    attendance: mapAttendance(r),
    performance: performanceIndex.getPerformance(personKeys(r)),
  }));

  rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  const paged = paginateRows(rows, query);
  return {
    source: "attendance_only" as const,
    period,
    total: rows.length,
    present: rows.filter((r) => isPresentStatus(r.todayStatus)).length,
    late: rows.filter((r) => r.todayStatus === "LATE").length,
    absent: 0,
    rows: paged.rows,
    page: paged.page,
    limit: paged.limit,
    totalPages: paged.totalPages,
  };
}

export async function staffOverview(organizationId: string, query?: PeopleQuery) {
  const academic = await fetchAcademicContext(organizationId);
  const period = resolvePeriod(query, academic);
  const { termRange, termTotalDays, elapsedWeekdays } = resolveTermWeekdayMetrics(
    period,
    academic,
    query
  );
  const isSingleDay = period.from === period.to;

  const [{ rows: roster, sources }, records, rfidLookup] = await Promise.all([
    fetchOrganizationStaffWithMeta(organizationId, query?.q),
    listAttendance(organizationId, {
      ...(isSingleDay ? { date: period.from } : { from: period.from, to: period.to }),
      q: query?.q,
    }),
    staffRfidLookup(organizationId),
  ]);

  const staffRecords = records.filter((r) => r.level?.startsWith("STAFF:"));
  const index = buildAttendanceIndex(staffRecords);
  const performanceIndex = buildPerformanceIndex(
    staffRecords,
    elapsedWeekdays,
    termRange,
    termTotalDays
  );

  const rows = await Promise.all(
    roster.map(async (s) => {
      const att =
        index.byStudentId.get(s.id) ??
        (s.employeeNumber ? index.byStudentCode.get(s.employeeNumber) : undefined) ??
        (s.rfidUid ? index.byCard.get(s.rfidUid.toUpperCase()) : undefined) ??
        index.byName.get(s.fullName.trim().toLowerCase());

      const isTeacher = s.source === "teacher" || s.source === "timetable" || /teacher/i.test(s.position ?? "");
      let schedule: Awaited<ReturnType<typeof fetchTeacherToday>> | null = null;
      const shouldLoadSchedule =
        isTeacher &&
        s.teacherUserId &&
        (Boolean(query?.q) || roster.length <= 20 || Boolean(att));
      if (shouldLoadSchedule) {
        schedule = await fetchTeacherToday(organizationId, s.teacherUserId!, s.email);
      }

      const rfidUid =
        s.rfidUid ??
        rfidLookup.byId.get(s.id) ??
        (s.employeeNumber ? rfidLookup.byCode.get(s.employeeNumber.trim().toUpperCase()) : undefined) ??
        null;

      return {
        id: s.id,
        fullName: s.fullName,
        email: s.email ?? null,
        phone: s.phone ?? null,
        position: s.position ?? null,
        department: s.department ?? null,
        employeeNumber: s.employeeNumber ?? null,
        photoUrl: s.photoUrl ?? null,
        rfidUid,
        source: s.source,
        isTeacher,
        personType: "STAFF" as const,
        todayStatus: att?.status ?? "ABSENT",
        attendance: att ?? null,
        performance: performanceIndex.getPerformance([
          s.id,
          s.employeeNumber,
          rfidUid?.toUpperCase(),
          s.fullName.trim().toLowerCase(),
        ]),
        schedule: schedule
          ? {
              todayClasses: schedule.kpis.todayClasses,
              currentLesson: schedule.current?.subjectName ?? null,
              currentClass: schedule.current?.className ?? null,
              nextLesson: schedule.next?.subjectName ?? null,
            }
          : null,
      };
    })
  );

  rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  const checkedIn = rows.filter((r) => r.attendance && isPresentStatus(r.todayStatus)).length;
  const paged = paginateRows(rows, query);

  return {
    source: roster.length ? "integrated" : "attendance_only",
    sources,
    period,
    total: rows.length,
    checkedIn,
    late: rows.filter((r) => r.todayStatus === "LATE").length,
    absent: rows.filter((r) => !r.attendance).length,
    inside: rows.filter((r) => r.attendance?.entryTime && !r.attendance?.exitTime).length,
    rows: paged.rows,
    page: paged.page,
    limit: paged.limit,
    totalPages: paged.totalPages,
  };
}

export async function staffRankings(organizationId: string, query?: PeriodQuery) {
  const overview = await staffOverview(organizationId, { ...query, page: 1, limit: 500 });
  const ranked = [...overview.rows].sort(
    (a, b) => (b.performance?.rate ?? 0) - (a.performance?.rate ?? 0)
  );
  return { period: overview.period, rows: ranked, total: ranked.length };
}

export async function studentsClassPerformance(organizationId: string, query?: PeopleQuery) {
  const overview = await studentsOverview(organizationId, { ...query, page: 1, limit: 500 });
  const byClass = new Map<
    string,
    { className: string; studentCount: number; rateSum: number; presentSum: number; expectedSum: number }
  >();
  for (const row of overview.rows) {
    const className = row.className?.trim() || "Unassigned";
    const bucket = byClass.get(className) ?? {
      className,
      studentCount: 0,
      rateSum: 0,
      presentSum: 0,
      expectedSum: 0,
    };
    bucket.studentCount += 1;
    bucket.rateSum += row.performance?.rate ?? 0;
    bucket.presentSum += row.performance?.presentDays ?? 0;
    bucket.expectedSum += row.performance?.expectedDays ?? 0;
    byClass.set(className, bucket);
  }
  const classes = [...byClass.values()]
    .map((c) => ({
      className: c.className,
      studentCount: c.studentCount,
      avgRate: c.studentCount ? Math.round(c.rateSum / c.studentCount) : 0,
      presentDays: c.presentSum,
      expectedDays: c.expectedSum,
    }))
    .sort((a, b) => b.avgRate - a.avgRate);
  return { period: overview.period, classes };
}

export async function studentsInClassPerformance(
  organizationId: string,
  className: string,
  query?: PeopleQuery
) {
  const overview = await studentsOverview(organizationId, {
    ...query,
    className,
    page: 1,
    limit: 500,
  });
  const rows = [...overview.rows].sort(
    (a, b) => (b.performance?.rate ?? 0) - (a.performance?.rate ?? 0)
  );
  return { period: overview.period, className, rows, total: rows.length };
}

function normalizeStaffCode(value?: string | null) {
  return (value ?? "").replace(/\s+/g, "").trim().toUpperCase();
}

function normalizePersonName(value?: string | null) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function buildStaffPhotoIndex(staff: StaffMember[]) {
  const byCode = new Map<string, StaffMember>();
  const byId = new Map<string, StaffMember>();
  const byName = new Map<string, StaffMember>();
  for (const row of staff) {
    if (row.employeeNumber) byCode.set(normalizeStaffCode(row.employeeNumber), row);
    byId.set(row.id, row);
    byName.set(normalizePersonName(row.fullName), row);
  }
  return { byCode, byId, byName };
}

function matchStaffFromIndex(
  index: ReturnType<typeof buildStaffPhotoIndex>,
  record: { studentId?: string | null; studentCode?: string | null; studentName?: string | null; cardNumber?: string | null }
): StaffMember | null {
  if (record.studentId && index.byId.has(record.studentId)) {
    return index.byId.get(record.studentId) ?? null;
  }
  const code = normalizeStaffCode(record.studentCode);
  if (code && index.byCode.has(code)) return index.byCode.get(code) ?? null;
  const nameKey = normalizePersonName(record.studentName);
  if (nameKey && index.byName.has(nameKey)) return index.byName.get(nameKey) ?? null;
  return null;
}

export async function enrichMovementRecords(
  organizationId: string,
  records: Awaited<ReturnType<typeof listAttendance>>
) {
  if (!records.length) return [];

  const photoCache = new Map<string, string | null>();
  const personTypeCache = new Map<string, "STUDENT" | "STAFF">();

  const staffIndex = isStaffIntegrationEnabled()
    ? buildStaffPhotoIndex(await fetchOrganizationStaff(organizationId))
    : null;

  async function resolvePhoto(record: (typeof records)[number]) {
    const key = record.studentId ?? record.studentCode ?? record.cardNumber ?? record.id;
    if (photoCache.has(key)) return photoCache.get(key) ?? null;

    let photoUrl: string | null = null;
    let personType: "STUDENT" | "STAFF" = record.level?.startsWith("STAFF:") ? "STAFF" : "STUDENT";

    const isStaffRow = personType === "STAFF";

    if (isStaffRow && staffIndex) {
      const staff = matchStaffFromIndex(staffIndex, record);
      if (staff?.photoUrl) {
        photoUrl = staff.photoUrl;
        personType = "STAFF";
      }
    }

    if (!photoUrl && isStudentManagementEnabled() && !isStaffRow) {
      let student = null;
      if (record.studentId) student = await fetchStudentByIdentity(organizationId, record.studentId);
      if (!student && record.studentCode) student = await fetchStudentByIdentity(organizationId, record.studentCode);
      if (!student && record.cardNumber) student = await fetchStudentByRfidUid(organizationId, record.cardNumber);
      if (student?.photoUrl) {
        photoUrl = student.photoUrl;
        personType = "STUDENT";
      }
    }

    if (!photoUrl && record.cardNumber) {
      const staff = await fetchStaffByRfidUid(organizationId, record.cardNumber);
      if (staff?.photoUrl) {
        photoUrl = staff.photoUrl;
        personType = "STAFF";
      }
    }

    if (!photoUrl && staffIndex && !isStaffRow) {
      const staff = matchStaffFromIndex(staffIndex, record);
      if (staff?.photoUrl) {
        photoUrl = staff.photoUrl;
        personType = "STAFF";
      }
    }

    photoCache.set(key, photoUrl);
    personTypeCache.set(key, personType);
    return photoUrl;
  }

  const enriched = await Promise.all(
    records.map(async (record) => {
      const key = record.studentId ?? record.studentCode ?? record.cardNumber ?? record.id;
      const photoUrl = await resolvePhoto(record);
      return {
        ...record,
        photoUrl,
        personType: personTypeCache.get(key) ?? (record.level?.startsWith("STAFF:") ? "STAFF" : "STUDENT"),
      };
    })
  );

  return enriched;
}

function entryMinutesFromIso(iso: string | Date) {
  const d = iso instanceof Date ? iso : new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function formatEntryTime(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isStaffLevel(level: string | null | undefined) {
  return Boolean(level?.startsWith("STAFF:"));
}

export async function personPerformanceDetail(
  organizationId: string,
  personId: string,
  kind: "STUDENT" | "STAFF",
  query?: PeopleQuery
) {
  const academic = await fetchAcademicContext(organizationId);
  const period = resolvePeriod(query, academic);
  const { termRange } = resolveTermWeekdayMetrics(period, academic, query);
  const isSingleDay = period.from === period.to;
  const records = await listAttendance(organizationId, {
    ...(isSingleDay ? { date: period.from } : { from: period.from, to: period.to }),
    personType: kind,
  });

  const keys = new Set<string>([personId]);
  if (kind === "STUDENT") {
    const overview = await studentsOverview(organizationId, query);
    const person = overview.rows.find((r) => r.id === personId || r.studentCode === personId);
    if (person) {
      keys.add(person.id);
      if (person.studentCode) keys.add(person.studentCode);
      if (person.rfidUid) keys.add(person.rfidUid.toUpperCase());
      keys.add(person.fullName.trim().toLowerCase());
    }
  } else {
    const overview = await staffOverview(organizationId, query);
    const person = overview.rows.find((r) => r.id === personId);
    if (person) {
      keys.add(person.id);
      if (person.employeeNumber) keys.add(person.employeeNumber);
      if (person.rfidUid) keys.add(person.rfidUid.toUpperCase());
      keys.add(person.fullName.trim().toLowerCase());
    }
  }

  const mine = records.filter((r) => {
    const idHit = r.studentId && keys.has(r.studentId);
    const codeHit = r.studentCode && keys.has(r.studentCode);
    const cardHit = r.cardNumber && keys.has(r.cardNumber.toUpperCase());
    const nameHit = keys.has(r.studentName.trim().toLowerCase());
    return idHit || codeHit || cardHit || nameHit;
  });

  const trendFrom = termRange?.start ?? period.from;
  const { dailyTrend, statusBreakdown } = buildPersonDayAnalytics(mine, trendFrom, period.to);

  let entryCompare: {
    studentAvg: string | null;
    classAvg: string | null;
    deltaMinutes: number | null;
  } | null = null;

  if (kind === "STUDENT") {
    const className = mine.find((r) => r.className)?.className;
    const studentEntries = mine.filter((r) => r.entryTime).map((r) => entryMinutesFromIso(r.entryTime!));
    const classEntries = records
      .filter((r) => !isStaffLevel(r.level) && r.className === className && r.entryTime)
      .map((r) => entryMinutesFromIso(r.entryTime!));

    if (studentEntries.length && classEntries.length) {
      const studentAvgM = Math.round(studentEntries.reduce((a, b) => a + b, 0) / studentEntries.length);
      const classAvgM = Math.round(classEntries.reduce((a, b) => a + b, 0) / classEntries.length);
      entryCompare = {
        studentAvg: formatEntryTime(studentAvgM),
        classAvg: formatEntryTime(classAvgM),
        deltaMinutes: studentAvgM - classAvgM,
      };
    }
  }

  return {
    period,
    dailyTrend,
    statusBreakdown,
    entryCompare,
    totalEvents: mine.length,
  };
}

export async function studentProfile(organizationId: string, studentId: string) {
  const overview = await studentsOverview(organizationId);
  const row = overview.rows.find((r) => r.id === studentId || r.studentCode === studentId);
  if (!row && isStudentManagementEnabled()) {
    const student = await fetchStudentByIdentity(organizationId, studentId);
    if (!student) return null;
    return {
      ...student,
      personType: "STUDENT" as const,
      todayStatus: "ABSENT",
      attendance: null,
    };
  }
  return row ?? null;
}

export async function staffProfile(organizationId: string, staffId: string) {
  const overview = await staffOverview(organizationId);
  return overview.rows.find((r) => r.id === staffId) ?? null;
}
