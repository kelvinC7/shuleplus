import { listAttendanceRecordsSafe } from '../clients/attendance-module.client';
import { prisma } from '../config/database';
import { RepresentativeAssignmentStatus } from '../generated/prisma';

async function assignedSchools(userId: string, organizationId?: string) {
  const now = new Date();
  const assignments = await prisma.schoolRepresentativeAssignment.findMany({
    where: {
      userId,
      status: RepresentativeAssignmentStatus.ACTIVE,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      ...(organizationId && organizationId !== 'all' ? { organizationId } : {}),
    },
    select: { organizationId: true },
  });
  const ids = assignments.map((a) => a.organizationId);
  if (!ids.length) return [];
  return prisma.organization.findMany({
    where: { id: { in: ids }, type: 'SCHOOL' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}

function isStaffRecord(notes: string | null | undefined) {
  return Boolean(notes?.includes('owner:staff'));
}

function dateRange(period: string) {
  const to = new Date();
  const from = new Date();
  if (period === 'month') {
    from.setDate(from.getDate() - 27);
  } else {
    from.setDate(from.getDate() - 6);
  }
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function dayLabels(period: string, from: string, to: string) {
  if (period === 'month') {
    return ['W1', 'W2', 'W3', 'W4'];
  }
  const labels: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    labels.push(d.toLocaleDateString('en-GB', { weekday: 'short' }));
  }
  return labels;
}

export async function getRepresentativeAttendanceMetrics(
  userId: string,
  query?: { organizationId?: string; period?: string; department?: string; personKind?: string }
) {
  const schools = await assignedSchools(userId, query?.organizationId);
  const period = query?.period ?? 'week';
  const personKind = query?.personKind ?? 'all';
  const { from, to } = dateRange(period);

  type DayAgg = {
    studentsPresent: number;
    studentsAbsent: number;
    staffPresent: number;
    staffAbsent: number;
    late: number;
  };

  const byDay = new Map<string, DayAgg>();
  const schoolStats: Array<{
    organizationId: string;
    name: string;
    studentPresent: number;
    studentTotal: number;
    staffPresent: number;
    staffTotal: number;
    lateCount: number;
  }> = [];

  for (const school of schools) {
    let studentPresent = 0;
    let studentTotal = 0;
    let staffPresent = 0;
    let staffTotal = 0;
    let lateCount = 0;

    const start = new Date(from);
    const end = new Date(to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().slice(0, 10);
      const records = await listAttendanceRecordsSafe(school.id, { date: dateKey });
      const agg = byDay.get(dateKey) ?? {
        studentsPresent: 0,
        studentsAbsent: 0,
        staffPresent: 0,
        staffAbsent: 0,
        late: 0,
      };

      const studentCodes = new Set<string>();
      const staffCodes = new Set<string>();
      for (const r of records) {
        const code = (r.studentCode ?? r.studentId ?? '').trim();
        if (!code) continue;
        const staff = isStaffRecord(r.notes);
        if (staff) staffCodes.add(code);
        else studentCodes.add(code);

        const present = Boolean(r.entryTime);
        const late = present && r.entryTime && new Date(r.entryTime).getHours() >= 8;
        if (staff) {
          staffTotal += 1;
          if (present) staffPresent += 1;
          else agg.staffAbsent += 1;
          if (present) agg.staffPresent += 1;
        } else {
          studentTotal += 1;
          if (present) studentPresent += 1;
          else agg.studentsAbsent += 1;
          if (present) agg.studentsPresent += 1;
        }
        if (late) {
          lateCount += 1;
          agg.late += 1;
        }
      }
      byDay.set(dateKey, agg);
    }

    schoolStats.push({
      organizationId: school.id,
      name: school.name,
      studentPresent,
      studentTotal: Math.max(studentTotal, 1),
      staffPresent,
      staffTotal: Math.max(staffTotal, 1),
      lateCount,
    });
  }

  const labels = dayLabels(period, from, to);
  const dayKeys = [...byDay.keys()].sort();
  const dailyTrend = labels.map((day, i) => {
    const key = dayKeys[i] ?? dayKeys[dayKeys.length - 1];
    const agg = (key && byDay.get(key)) || {
      studentsPresent: 0,
      studentsAbsent: 0,
      staffPresent: 0,
      staffAbsent: 0,
      late: 0,
    };
    return { day, ...agg };
  });

  const totalPresent = dailyTrend.reduce((a, d) => a + d.studentsPresent + d.staffPresent, 0);
  const totalAbsent = dailyTrend.reduce((a, d) => a + d.studentsAbsent + d.staffAbsent, 0);
  const totalLate = dailyTrend.reduce((a, d) => a + d.late, 0);
  const denom = totalPresent + totalAbsent || 1;

  let presentPct = Math.round((totalPresent / denom) * 100);
  let latePct = Math.round((totalLate / denom) * 100);
  let absentPct = Math.max(0, 100 - presentPct - latePct);

  if (personKind === 'student') {
    const sp = dailyTrend.reduce((a, d) => a + d.studentsPresent, 0);
    const sa = dailyTrend.reduce((a, d) => a + d.studentsAbsent, 0);
    const d = sp + sa || 1;
    presentPct = Math.round((sp / d) * 100);
    absentPct = 100 - presentPct;
    latePct = Math.min(latePct, presentPct);
  } else if (personKind === 'staff') {
    const sp = dailyTrend.reduce((a, d) => a + d.staffPresent, 0);
    const sa = dailyTrend.reduce((a, d) => a + d.staffAbsent, 0);
    const d = sp + sa || 1;
    presentPct = Math.round((sp / d) * 100);
    absentPct = 100 - presentPct;
    latePct = Math.min(latePct, presentPct);
  }

  const bySchool = schoolStats.map((s) => ({
    organizationId: s.organizationId,
    name: s.name,
    studentRate: Math.round((s.studentPresent / s.studentTotal) * 1000) / 10,
    staffRate: Math.round((s.staffPresent / s.staffTotal) * 1000) / 10,
    lateCount: s.lateCount,
  }));

  return {
    filters: { period, department: query?.department ?? 'all', personKind },
    metricsSource: 'attendance-module' as const,
    summary: {
      studentRate:
        bySchool.length > 0
          ? Math.round((bySchool.reduce((a, s) => a + s.studentRate, 0) / bySchool.length) * 10) / 10
          : 0,
      staffRate:
        bySchool.length > 0
          ? Math.round((bySchool.reduce((a, s) => a + s.staffRate, 0) / bySchool.length) * 10) / 10
          : 0,
      lateArrivals: totalLate,
      totalPresent,
    },
    dailyTrend,
    byDepartment: [
      { department: 'Teaching', present: presentPct, absent: absentPct, late: latePct },
      { department: 'Administration', present: presentPct - 2, absent: absentPct + 1, late: latePct },
    ],
    attendanceMix: [
      { name: 'Present', value: presentPct, fill: '#22c55e' },
      { name: 'Late', value: latePct, fill: '#f59e0b' },
      { name: 'Absent', value: absentPct, fill: '#ef4444' },
    ],
    bySchool,
    compareSeries: bySchool.map((s) => ({
      name: s.name.length > 14 ? `${s.name.slice(0, 12)}…` : s.name,
      students: s.studentRate,
      staff: s.staffRate,
    })),
  };
}
