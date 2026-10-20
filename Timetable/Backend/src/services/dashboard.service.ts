import { prisma } from '../config/database';
import { conflictService } from './conflict.service';
import { generatorService } from './generator.service';
import { scheduleService } from './schedule.service';
import { normalizeTime } from '../utils/time.utils';
import type { PeriodSlotDefinition } from '../utils/schedule-builder.utils';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseHm(hm: string) {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

function nowMinutes(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}

function lessonPhase(start: string, end: string, now: number) {
  const s = parseHm(start);
  const e = parseHm(end);
  if (now < s) return 'upcoming' as const;
  if (now >= s && now < e) return 'current' as const;
  return 'past' as const;
}

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function weekNumber(d: Date) {
  const start = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return Math.max(1, Math.ceil((days + start.getDay() + 1) / 7));
}

function formatDisplayDate(d: Date) {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function academicYearLabel(year: string) {
  const y = Number.parseInt(year, 10);
  if (Number.isNaN(y)) return year;
  return `${y}–${y + 1}`;
}

function periodLabels(startTimes: string[]) {
  const sorted = [...new Set(startTimes)].sort((a, b) => parseHm(a) - parseHm(b));
  const map = new Map<string, string>();
  sorted.forEach((t, i) => map.set(t, `P${i + 1}`));
  return map;
}

function teachingPeriodSlots(schedule: { periodSlots?: PeriodSlotDefinition[] }) {
  return (schedule.periodSlots ?? []).filter((slot) => !slot.isBreak);
}

function periodLabelMap(slots: PeriodSlotDefinition[]) {
  const map = new Map<string, string>();
  for (const slot of slots) {
    map.set(normalizeTime(slot.startTime), slot.name);
  }
  return map;
}

function workloadStatus(today: number, week: number, maxPerDay = 6) {
  if (today >= maxPerDay + 1 || week >= 30) return 'heavy' as const;
  if (today >= maxPerDay - 1 || week >= 24) return 'high' as const;
  return 'normal' as const;
}

function sessionStatus(
  phase: 'upcoming' | 'current' | 'past',
  session?: { status: string; punctuality: string } | null,
) {
  if (session?.status === 'COMPLETED') return 'completed' as const;
  if (session?.status === 'MISSED') return 'missed' as const;
  if (session?.status === 'RUNNING') return 'running' as const;
  if (
    phase === 'past' &&
    (session?.punctuality === 'LATE' || session?.punctuality === 'VERY_LATE')
  ) {
    return 'late' as const;
  }
  if (phase === 'current') return 'running' as const;
  if (phase === 'past' && !session) return 'missed' as const;
  return 'upcoming' as const;
}

export class DashboardService {
  async summary(organizationId: string, opts?: { term?: string; academicYear?: string }) {
    const term = opts?.term || 'Term 1';
    const academicYear = opts?.academicYear || String(new Date().getFullYear());

    const [
      tenant,
      assignmentCount,
      timetableCount,
      teacherProfiles,
      courseConfigs,
      schedule,
      conflictScan,
      workload,
    ] = await Promise.all([
      prisma.tenant.findUnique({ where: { organizationId } }),
      prisma.teacherAssignment.count({ where: { organizationId, status: 'ACTIVE' } }),
      prisma.academicTimetable.count({ where: { organizationId, term, academicYear } }),
      prisma.timetableTeacherProfile.count({ where: { organizationId } }),
      prisma.timetableCourseConfig.count({ where: { organizationId } }),
      prisma.timetableSchoolSchedule.findFirst({ where: { organizationId, term, academicYear } }),
      conflictService.scan(organizationId, term, academicYear),
      generatorService.classCoverage(organizationId, term, academicYear),
    ]);

    const classes = await prisma.teacherAssignment.findMany({
      where: { organizationId, status: 'ACTIVE', term, academicYear },
      select: { className: true },
      distinct: ['className'],
    });

    return {
      organizationId,
      organizationName: tenant?.organizationName,
      term,
      academicYear,
      kpis: {
        assignments: assignmentCount,
        timetableRows: timetableCount,
        teachers: teacherProfiles,
        courses: courseConfigs,
        classes: classes.length,
        conflicts: conflictScan.total,
        coveragePercent: workload.summary.percent,
      },
      alerts: {
        noSchedule: !schedule,
        hasConflicts: conflictScan.total > 0,
        incompleteCoverage: workload.summary.percent < 100,
      },
      coverage: workload.summary,
      conflictBreakdown: conflictScan.byType,
    };
  }

  async overview(
    organizationId: string,
    opts?: { term?: string; academicYear?: string; date?: string },
  ) {
    const refDate = opts?.date ? new Date(opts.date) : new Date();
    const term = opts?.term ?? 'Term 1';
    const academicYear = opts?.academicYear ?? String(refDate.getFullYear());
    const dayName = DAY_NAMES[refDate.getDay()];
    const lessonDate = dateOnly(refDate);
    const now = nowMinutes(refDate);
    const isToday = dateOnly(new Date()).getTime() === lessonDate.getTime();
    const effectiveNow = isToday ? nowMinutes() : now;

    const [tenant, allRows, sessions, profiles, conflictScan, coverageData, assignments, schedule] =
      await Promise.all([
        prisma.tenant.findUnique({ where: { organizationId } }),
        prisma.academicTimetable.findMany({
          where: { organizationId, term, academicYear, isExtraActivity: false },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        }),
        prisma.lessonSession.findMany({
          where: { organizationId, lessonDate },
        }),
        prisma.timetableTeacherProfile.findMany({ where: { organizationId } }),
        conflictService.scan(organizationId, term, academicYear),
        generatorService.classCoverage(organizationId, term, academicYear),
        prisma.teacherAssignment.findMany({
          where: { organizationId, status: 'ACTIVE', term, academicYear },
        }),
        scheduleService.get(organizationId, term, academicYear),
      ]);

    const profileMap = new Map(profiles.map((p) => [p.teacherUserId, p]));
    const todayRows = allRows.filter((r) => r.dayOfWeek === dayName);
    const configuredSlots = teachingPeriodSlots(schedule as { periodSlots?: PeriodSlotDefinition[] });
    const labels = configuredSlots.length
      ? periodLabelMap(configuredSlots)
      : periodLabels(todayRows.map((r) => r.startTime));

    const sessionByTimetable = new Map(sessions.map((s) => [s.timetableId, s]));

    const todaySchedule = todayRows.map((row) => {
      const session = sessionByTimetable.get(row.id);
      const phase = lessonPhase(row.startTime, row.endTime, effectiveNow);
      return {
        id: row.id,
        period: labels.get(normalizeTime(row.startTime)) ?? row.startTime,
        time: `${row.startTime}–${row.endTime}`,
        className: row.className,
        subjectName: row.subjectName,
        teacherName: row.teacherName,
        teacherUserId: row.teacherUserId,
        room: row.room,
        status: sessionStatus(phase, session),
      };
    });

    const currentSlots = todayRows
      .filter((r) => lessonPhase(r.startTime, r.endTime, effectiveNow) === 'current')
      .sort((a, b) => parseHm(a.startTime) - parseHm(b.startTime));

    const upcomingSlots = todayRows
      .filter((r) => lessonPhase(r.startTime, r.endTime, effectiveNow) === 'upcoming')
      .sort((a, b) => parseHm(a.startTime) - parseHm(b.startTime));

    const currentRow = currentSlots[0] ?? null;
    const nextRow = upcomingSlots[0] ?? null;

    const currentPeriod = currentRow
      ? {
          periodLabel: labels.get(normalizeTime(currentRow.startTime)) ?? 'Period',
          startTime: currentRow.startTime,
          endTime: currentRow.endTime,
          className: currentRow.className,
          subjectName: currentRow.subjectName,
          teacherName: currentRow.teacherName,
          room: currentRow.room,
          minutesRemaining: Math.max(0, parseHm(currentRow.endTime) - effectiveNow),
        }
      : null;

    const nextPeriod = nextRow
      ? {
          periodLabel: labels.get(normalizeTime(nextRow.startTime)) ?? 'Period',
          startTime: nextRow.startTime,
          endTime: nextRow.endTime,
          className: nextRow.className,
          subjectName: nextRow.subjectName,
          teacherName: nextRow.teacherName,
          room: nextRow.room,
        }
      : null;

    const teachersToday = new Set(todayRows.map((r) => r.teacherUserId));
    const allTeachers = new Set(allRows.map((r) => r.teacherUserId));
    const classesToday = new Set(todayRows.map((r) => r.className));

    const teacherWeekMap = new Map<string, { name: string; week: number; today: number }>();
    for (const row of allRows) {
      const entry = teacherWeekMap.get(row.teacherUserId) ?? {
        name: row.teacherName,
        week: 0,
        today: 0,
      };
      entry.week += 1;
      teacherWeekMap.set(row.teacherUserId, entry);
    }
    for (const row of todayRows) {
      const entry = teacherWeekMap.get(row.teacherUserId);
      if (entry) entry.today += 1;
    }

    const maxTodaySlots = configuredSlots.length || 8;
    const teacherWorkload = [...teacherWeekMap.entries()]
      .filter(([, v]) => v.today > 0)
      .map(([teacherUserId, v]) => {
        return {
          teacherUserId,
          teacherName: v.name,
          today: v.today,
          week: v.week,
          status: workloadStatus(v.today, v.week, maxTodaySlots),
        };
      })
      .sort((a, b) => b.today - a.today)
      .slice(0, 12);

    const classActivity = [...classesToday].map((className) => {
      const classTodayRows = todayRows.filter((r) => r.className === className);
      const completed = classTodayRows.filter((r) => {
        const s = sessionByTimetable.get(r.id);
        return s?.status === 'COMPLETED';
      }).length;
      return {
        className,
        today: classTodayRows.length,
        completed,
        remaining: Math.max(0, classTodayRows.length - completed),
      };
    }).sort((a, b) => a.className.localeCompare(b.className));

    const subjectCounts = new Map<string, number>();
    for (const row of todayRows) {
      subjectCounts.set(row.subjectName, (subjectCounts.get(row.subjectName) ?? 0) + 1);
    }
    const subjectDistribution = [...subjectCounts.entries()]
      .map(([subjectName, count]) => ({ subjectName, count }))
      .sort((a, b) => b.count - a.count);

    const conducted = sessions.filter((s) => s.status === 'COMPLETED').length;
    const late = sessions.filter(
      (s) => s.punctuality === 'LATE' || s.punctuality === 'VERY_LATE',
    ).length;
    const missed = sessions.filter((s) => s.status === 'MISSED').length;
    const scheduledToday = todayRows.length;
    const lessonCoveragePercent = scheduledToday
      ? Math.round((conducted / scheduledToday) * 100)
      : 0;

    const onTime = sessions.filter(
      (s) => s.punctuality === 'ON_TIME' || s.punctuality === 'EARLY',
    ).length;
    const absent = sessions.filter((s) => s.status === 'MISSED').length;

    const roomConflicts: string[] = [];
    for (let i = 0; i < todayRows.length; i += 1) {
      for (let j = i + 1; j < todayRows.length; j += 1) {
        const a = todayRows[i];
        const b = todayRows[j];
        if (!a.room || !b.room || a.room !== b.room) continue;
        if (a.startTime === b.startTime && a.className !== b.className) {
          roomConflicts.push(`${a.room} assigned to ${a.className} and ${b.className} at ${a.startTime}`);
        }
      }
    }

    const missingCoverage = coverageData.coverage.filter((c) => !c.complete);
    const overloadedTeachers = [...teacherWeekMap.entries()].filter(([id, v]) => {
      const expected = assignments
        .filter((a) => a.teacherUserId === id)
        .reduce((s, a) => s + a.periodsPerWeek, 0);
      return expected > 0 && v.week > expected;
    });

    const teacherClash = conflictScan.conflicts.find((c) => c.type === 'teacher_clash');

    const alerts: Array<{
      id: string;
      type: string;
      count: number;
      message: string;
      severity: 'warning' | 'error' | 'info';
      href?: string;
    }> = [];

    if (conflictScan.total > 0) {
      alerts.push({
        id: 'conflicts',
        type: 'conflicts',
        count: conflictScan.total,
        message: teacherClash?.message ?? `${conflictScan.total} timetable conflict(s) detected.`,
        severity: 'error',
        href: '/timetable?tab=conflicts',
      });
    }

    if (missingCoverage.length > 0) {
      alerts.push({
        id: 'missing',
        type: 'missing_periods',
        count: missingCoverage.length,
        message: `${missingCoverage[0]?.className ?? 'A class'} has incomplete weekly period placement.`,
        severity: 'warning',
        href: '/timetable?tab=generator',
      });
    }

    if (roomConflicts.length > 0) {
      alerts.push({
        id: 'rooms',
        type: 'room_conflict',
        count: roomConflicts.length,
        message: roomConflicts[0],
        severity: 'warning',
        href: '/timetable?tab=conflicts',
      });
    }

    if (overloadedTeachers.length > 0) {
      alerts.push({
        id: 'overload',
        type: 'overloaded_teachers',
        count: overloadedTeachers.length,
        message: `${overloadedTeachers.length} teacher(s) exceed configured weekly periods.`,
        severity: 'warning',
        href: '/timetable?tab=teachers',
      });
    }

    return {
      organizationId,
      organizationName: tenant?.organizationName,
      context: {
        academicYear,
        academicYearLabel: academicYearLabel(academicYear),
        term,
        weekNumber: weekNumber(refDate),
        date: refDate.toISOString(),
        dayName,
        formattedDate: formatDisplayDate(refDate),
      },
      kpis: {
        todaysPeriods: scheduledToday,
        teachersTeaching: { active: teachersToday.size, total: allTeachers.size || profiles.length },
        activeClasses: classesToday.size,
        lessonsToday: scheduledToday,
        conflicts: conflictScan.total,
        lessonCoveragePercent,
      },
      currentPeriod,
      nextPeriod,
      todaySchedule,
      teacherWorkload,
      classActivity,
      alerts,
      lessonCoverage: {
        scheduled: scheduledToday,
        conducted,
        late,
        missed,
        percent: lessonCoveragePercent,
      },
      subjectDistribution,
      teacherAttendance: {
        scheduled: teachersToday.size,
        onTime,
        late,
        absent,
      },
    };
  }
}

export const dashboardService = new DashboardService();
