import { AttendanceStatus } from "../generated/prisma";
import { prisma } from "../config/database";
import { schoolDaySummary } from "./attendance.service";

function dateOnly(d = new Date()) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

const presentStatuses: AttendanceStatus[] = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
  AttendanceStatus.HALF_DAY,
  AttendanceStatus.PERMISSION,
];

export type SectorSnapshotRow = {
  organizationId: string;
  attendanceTenant: boolean;
  studentManagementHint: boolean;
  daySummary: Awaited<ReturnType<typeof schoolDaySummary>> | null;
  error?: string;
};

export async function batchSchoolSnapshots(organizationIds: string[]): Promise<SectorSnapshotRow[]> {
  const ids = [...new Set(organizationIds.map((id) => id.trim()).filter(Boolean))];
  return Promise.all(
    ids.map(async (organizationId) => {
      const tenant = await prisma.tenant.findFirst({
        where: {
          OR: [{ organizationId }, { organizationCode: organizationId }],
          status: "ACTIVE",
        },
      });
      if (!tenant) {
        return {
          organizationId,
          attendanceTenant: false,
          studentManagementHint: false,
          daySummary: null,
        };
      }
      try {
        const daySummary = await schoolDaySummary(tenant.organizationId);
        return {
          organizationId: tenant.organizationId,
          attendanceTenant: true,
          studentManagementHint: true,
          daySummary,
        };
      } catch (err) {
        return {
          organizationId: tenant.organizationId,
          attendanceTenant: true,
          studentManagementHint: false,
          daySummary: null,
          error: err instanceof Error ? err.message : "snapshot failed",
        };
      }
    })
  );
}

export async function batchSectorHistory(organizationIds: string[], days: number) {
  const ids = [...new Set(organizationIds.map((id) => id.trim()).filter(Boolean))];
  const dayCount = Math.min(Math.max(days, 1), 366);
  const end = dateOnly();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (dayCount - 1));

  const rows = await prisma.attendanceRecord.groupBy({
    by: ["lessonDate", "status"],
    where: {
      organizationId: { in: ids },
      lessonDate: { gte: start, lte: end },
      NOT: { level: { startsWith: "STAFF:" } },
    },
    _count: { _all: true },
  });

  const dayMap = new Map<string, { present: number; late: number; absent: number; total: number }>();
  for (const row of rows) {
    const key = row.lessonDate.toISOString().slice(0, 10);
    const bucket = dayMap.get(key) ?? { present: 0, late: 0, absent: 0, total: 0 };
    const n = row._count._all;
    bucket.total += n;
    if (row.status === AttendanceStatus.LATE) bucket.late += n;
    else if (row.status === AttendanceStatus.ABSENT) bucket.absent += n;
    else if (presentStatuses.includes(row.status)) bucket.present += n;
    dayMap.set(key, bucket);
  }

  const series: Array<{
    date: string;
    recordCount: number;
    present: number;
    late: number;
    absent: number;
    attendanceRate: number;
  }> = [];

  for (let i = 0; i < dayCount; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    const b = dayMap.get(key) ?? { present: 0, late: 0, absent: 0, total: 0 };
    const attended = b.present + b.late;
    const rate = b.total > 0 ? Math.round((attended / b.total) * 1000) / 10 : 0;
    series.push({
      date: key,
      recordCount: b.total,
      present: b.present,
      late: b.late,
      absent: b.absent,
      attendanceRate: rate,
    });
  }

  return { days: dayCount, series };
}

export async function schoolAttendanceDetail(organizationId: string) {
  const today = dateOnly();
  const grouped = await prisma.attendanceRecord.groupBy({
    by: ["className", "status"],
    where: {
      organizationId,
      lessonDate: today,
      NOT: { level: { startsWith: "STAFF:" } },
    },
    _count: { _all: true },
  });

  const classMap = new Map<
    string,
    { present: number; late: number; absent: number; total: number }
  >();
  for (const row of grouped) {
    const name = row.className?.trim() || "Unassigned";
    const bucket = classMap.get(name) ?? { present: 0, late: 0, absent: 0, total: 0 };
    const n = row._count._all;
    bucket.total += n;
    if (row.status === AttendanceStatus.LATE) bucket.late += n;
    else if (row.status === AttendanceStatus.ABSENT) bucket.absent += n;
    else if (presentStatuses.includes(row.status)) bucket.present += n;
    classMap.set(name, bucket);
  }

  const classes = [...classMap.entries()].map(([name, b]) => {
    const attended = b.present + b.late;
    const attendancePct = b.total > 0 ? Math.round((attended / b.total) * 1000) / 10 : 0;
    return { name, present: b.present, late: b.late, absent: b.absent, records: b.total, attendancePct };
  });

  const chronicAbsentees = await listChronicAbsentees(organizationId, 3);

  return { classes, chronicAbsentees };
}

export async function listChronicAbsentees(organizationId: string, minConsecutiveDays = 3) {
  const today = dateOnly();
  const days: Date[] = [];
  for (let i = 0; i < minConsecutiveDays; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(dateOnly(d));
  }

  const records = await prisma.attendanceRecord.findMany({
    where: {
      organizationId,
      lessonDate: { in: days },
      status: AttendanceStatus.ABSENT,
      NOT: { level: { startsWith: "STAFF:" } },
    },
    select: {
      studentCode: true,
      studentName: true,
      className: true,
      lessonDate: true,
    },
  });

  const byKey = new Map<string, { studentCode: string; studentName: string; className: string | null; dates: Set<string> }>();
  for (const r of records) {
    const code = r.studentCode?.trim() || r.studentName?.trim() || "";
    if (!code) continue;
    const key = code.toLowerCase();
    const entry = byKey.get(key) ?? {
      studentCode: r.studentCode ?? code,
      studentName: r.studentName ?? code,
      className: r.className,
      dates: new Set<string>(),
    };
    entry.dates.add(r.lessonDate.toISOString().slice(0, 10));
    byKey.set(key, entry);
  }

  const required = new Set(days.map((d) => d.toISOString().slice(0, 10)));
  return [...byKey.values()]
    .filter((s) => {
      for (const d of required) {
        if (!s.dates.has(d)) return false;
      }
      return true;
    })
    .map((s) => ({
      studentCode: s.studentCode,
      studentName: s.studentName,
      className: s.className,
      consecutiveDays: minConsecutiveDays,
    }))
    .slice(0, 200);
}

export async function sectorChronicAbsenteeSummary(organizationIds: string[], minDays = 3) {
  const ids = [...new Set(organizationIds.map((id) => id.trim()).filter(Boolean))];
  const perSchool = await Promise.all(
    ids.map(async (organizationId) => {
      const list = await listChronicAbsentees(organizationId, minDays);
      return { organizationId, count: list.length, students: list.slice(0, 25) };
    })
  );
  const total = perSchool.reduce((s, x) => s + x.count, 0);
  return { minConsecutiveDays: minDays, total, bySchool: perSchool };
}

export async function sectorDataQualityMetrics(organizationIds: string[]) {
  const ids = [...new Set(organizationIds.map((id) => id.trim()).filter(Boolean))];
  const [alerts, audits] = await Promise.all([
    prisma.securityAlert.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: ids }, resolved: false },
      _count: { _all: true },
    }),
    prisma.auditLog.count({
      where: {
        organizationId: { in: ids },
        action: { contains: "manual", mode: "insensitive" },
        createdAt: { gte: dateOnly() },
      },
    }),
  ]);
  const alertByOrg = new Map(alerts.map((a) => [a.organizationId, a._count._all]));
  return {
    unresolvedAlerts: alerts.reduce((s, a) => s + a._count._all, 0),
    alertsByOrganization: Object.fromEntries(alertByOrg),
    manualCorrectionsToday: audits,
  };
}
