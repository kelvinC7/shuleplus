import { AttendanceStatus } from "../generated/prisma";
import { prisma } from "../config/database";
import { fetchAcademicContext } from "../clients/academic-settings.client";
import {
  resolvePeriod,
  countWeekdays,
  isPresentStatus,
  type PeriodQuery,
} from "../utils/attendance-period";

function parseDate(iso: string) {
  return new Date(Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10))
  ));
}

function isStaffRecord(level: string | null | undefined) {
  return Boolean(level?.startsWith("STAFF:"));
}

export async function getAnalytics(organizationId: string, query?: PeriodQuery & { personType?: string }) {
  const academic = await fetchAcademicContext(organizationId);
  const period = resolvePeriod(query, academic);
  const fromDate = parseDate(period.from);
  const toDate = parseDate(period.to);
  const expectedSchoolDays = countWeekdays(period.from, period.to);
  const personFilter = query?.personType?.toUpperCase();

  const records = await prisma.attendanceRecord.findMany({
    where: {
      organizationId,
      lessonDate: { gte: fromDate, lte: toDate },
    },
    orderBy: [{ lessonDate: "asc" }, { entryTime: "asc" }],
  });

  const filtered = records.filter((r) => {
    if (personFilter === "STUDENT") return !isStaffRecord(r.level);
    if (personFilter === "STAFF") return isStaffRecord(r.level);
    return true;
  });

  const dailyMap = new Map<string, { present: number; late: number; absent: number; total: number }>();
  const classMap = new Map<string, { present: number; total: number }>();
  const statusTotals = { present: 0, late: 0, absent: 0, enteredOnly: 0, other: 0 };

  for (const row of filtered) {
    const day = row.lessonDate.toISOString().slice(0, 10);
    const bucket = dailyMap.get(day) ?? { present: 0, late: 0, absent: 0, total: 0 };
    bucket.total += 1;

    if (row.status === AttendanceStatus.LATE) {
      bucket.late += 1;
      statusTotals.late += 1;
    } else if (row.status === AttendanceStatus.ABSENT) {
      bucket.absent += 1;
      statusTotals.absent += 1;
    } else if (row.status === AttendanceStatus.ENTERED_ONLY) {
      bucket.present += 1;
      statusTotals.enteredOnly += 1;
    } else if (isPresentStatus(row.status)) {
      bucket.present += 1;
      statusTotals.present += 1;
    } else {
      statusTotals.other += 1;
    }
    dailyMap.set(day, bucket);

    const cls = row.className?.trim() || "Unassigned";
    const clsBucket = classMap.get(cls) ?? { present: 0, total: 0 };
    clsBucket.total += 1;
    if (isPresentStatus(row.status)) clsBucket.present += 1;
    classMap.set(cls, clsBucket);
  }

  const dailyTrend = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      present: v.present + v.late,
      late: v.late,
      absent: v.absent,
      total: v.total,
    }));

  const byClass = [...classMap.entries()]
    .map(([label, v]) => ({
      label,
      present: v.present,
      total: v.total,
      rate: v.total ? Math.round((v.present / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  const studentRecords = filtered.filter((r) => !isStaffRecord(r.level));
  const staffRecords = filtered.filter((r) => isStaffRecord(r.level));

  const uniqueStudents = new Set(studentRecords.map((r) => r.studentId ?? r.studentCode ?? r.studentName)).size;
  const uniqueStaff = new Set(staffRecords.map((r) => r.studentId ?? r.studentCode ?? r.studentName)).size;

  const presentStudentDays = studentRecords.filter((r) => isPresentStatus(r.status)).length;
  const presentStaffDays = staffRecords.filter((r) => isPresentStatus(r.status)).length;

  return {
    period,
    academic,
    expectedSchoolDays,
    kpis: {
      totalRecords: filtered.length,
      present: statusTotals.present + statusTotals.late + statusTotals.enteredOnly,
      late: statusTotals.late,
      absent: statusTotals.absent,
      uniqueStudents,
      uniqueStaff,
      studentAttendanceRate:
        uniqueStudents && expectedSchoolDays
          ? Math.min(100, Math.round((presentStudentDays / (uniqueStudents * expectedSchoolDays)) * 100))
          : 0,
      staffAttendanceRate:
        uniqueStaff && expectedSchoolDays
          ? Math.min(100, Math.round((presentStaffDays / (uniqueStaff * expectedSchoolDays)) * 100))
          : 0,
    },
    dailyTrend,
    byClass,
    byPersonType: [
      {
        label: "Students",
        present: presentStudentDays,
        total: studentRecords.length,
        unique: uniqueStudents,
      },
      {
        label: "Staff",
        present: presentStaffDays,
        total: staffRecords.length,
        unique: uniqueStaff,
      },
    ],
    statusBreakdown: [
      { label: "Present", value: statusTotals.present, color: "#10b981" },
      { label: "Late", value: statusTotals.late, color: "#f59e0b" },
      { label: "Entered only", value: statusTotals.enteredOnly, color: "#3b82f6" },
      { label: "Absent", value: statusTotals.absent, color: "#ef4444" },
    ].filter((r) => r.value > 0),
  };
}

export async function getAcademicContextForOrg(organizationId: string) {
  return fetchAcademicContext(organizationId);
}
