import { AssignmentStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { assignmentService } from './assignment.service';
import { courseConfigService } from './course-config.service';
import { scheduleService } from './schedule.service';
import { listAcademicClasses } from './smart.service';
import { fetchAcademicStudents, normalizeClassLabel } from '../clients/academic.client';
import { parseSchedulingRules } from '../utils/course-scheduling.utils';

export type ClassConfigStatus = 'ready' | 'incomplete' | 'missing';

export interface ClassConfigListItem {
  className: string;
  classId: string | null;
  level: string;
  stream: string | null;
  section: string | null;
  studentCount: number;
  courseCount: number;
  teacherCount: number;
  totalPeriods: number;
  readinessPercent: number;
  status: ClassConfigStatus;
}

export interface ClassCourseRow {
  id: string;
  subjectName: string;
  courseCode: string;
  periodsPerWeek: number;
  defaultCourseMarks: number | null;
  teacherUserId: string;
  teacherName: string;
  room: string | null;
  structure: string;
  preferredTime: string;
  status: 'ready' | 'warning' | 'missing';
  schedulingOverrides: Record<string, unknown>;
  isCore: boolean;
  defaults: {
    periodsPerWeek: number;
    structure: string;
    roomRequirement: string;
    preferredRoom: string | null;
  };
}

export interface ClassConfigDetail {
  className: string;
  level: string;
  stream: string | null;
  section: string | null;
  studentCount: number;
  courses: ClassCourseRow[];
  summary: {
    courseCount: number;
    teacherCount: number;
    totalPeriods: number;
    labPeriods: number;
    doublePreferences: number;
    readinessPercent: number;
    status: ClassConfigStatus;
  };
  alerts: Array<{ severity: 'error' | 'warning'; message: string }>;
  readiness: {
    courses: { ok: boolean; label: string };
    teachers: { ok: boolean; label: string };
    periods: { ok: boolean; label: string };
    rooms: { ok: boolean; label: string };
    conflicts: { ok: boolean; label: string };
  };
}

const UNASSIGNED_TEACHER_ID = '00000000-0000-0000-0000-000000000001';

function isTeacherAssigned(teacherUserId: string, teacherName: string): boolean {
  return (
    Boolean(teacherUserId) &&
    teacherUserId !== UNASSIGNED_TEACHER_ID &&
    Boolean(teacherName) &&
    !/unassigned/i.test(teacherName)
  );
}

function courseCode(subjectName: string): string {
  const words = subjectName.trim().split(/\s+/);
  if (words.length >= 2) return words.map((w) => w[0]?.toUpperCase() ?? '').join('').slice(0, 4);
  return subjectName.slice(0, 4).toUpperCase();
}

function structureLabel(rules: ReturnType<typeof parseSchedulingRules>, overrides: Record<string, unknown>): string {
  const duration = (overrides.lessonDuration as string) ?? rules.lessonDuration;
  const mode = (overrides.doublePeriodMode as string) ?? rules.doublePeriodMode;
  if (duration === 'SINGLE') return 'Single';
  if (mode === 'REQUIRE') return 'Require Double';
  return 'Prefer Double';
}

function sectionFromCategory(category: string | null | undefined): string | null {
  if (!category) return null;
  const c = category.toUpperCase();
  if (c.includes('SECONDARY') || c.includes('O-LEVEL') || c.includes('A-LEVEL')) return 'Secondary';
  if (c.includes('PRIMARY')) return 'Primary';
  if (c.includes('NURSERY')) return 'Nursery';
  if (c.includes('TVET')) return 'TVET';
  return category;
}

export class ClassConfigService {
  private async studentCountByClass(organizationId: string, academicYear: string) {
    try {
      const { students } = await fetchAcademicStudents(organizationId, { academicYear });
      const map = new Map<string, number>();
      for (const s of students) {
        const key = s.className ?? '';
        if (!key) continue;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return map;
    } catch {
      return new Map<string, number>();
    }
  }

  private computeStatus(courseCount: number, withTeacher: number): ClassConfigStatus {
    if (courseCount === 0) return 'missing';
    if (withTeacher < courseCount) return 'incomplete';
    return 'ready';
  }

  async list(
    organizationId: string,
    term: string,
    academicYear: string,
    filters: { section?: string; level?: string; stream?: string; status?: ClassConfigStatus } = {}
  ): Promise<ClassConfigListItem[]> {
    const [{ classes }, assignments, studentCounts] = await Promise.all([
      listAcademicClasses(organizationId, { term, academicYear }),
      assignmentService.list(organizationId, { term, academicYear }),
      this.studentCountByClass(organizationId, academicYear),
    ]);

    const byClass = new Map<string, typeof assignments>();
    for (const a of assignments) {
      const key = normalizeClassLabel(a.className) || a.className;
      const list = byClass.get(key) ?? [];
      list.push(a);
      byClass.set(key, list);
    }

    const academicLabels = new Set(classes.map((c) => c.label));
    for (const a of assignments) academicLabels.add(a.className);

    const rows: ClassConfigListItem[] = [];
    const seen = new Set<string>();

    for (const label of [...academicLabels].sort()) {
      const key = normalizeClassLabel(label);
      if (seen.has(key)) continue;
      seen.add(key);
      const academic = classes.find((c) => normalizeClassLabel(c.label) === key);
      const classAssignments = byClass.get(key) ?? [];
      const courseCount = classAssignments.length;
      const teacherCount = new Set(classAssignments.map((a) => a.teacherUserId)).size;
      const withTeacher = classAssignments.filter((a) =>
        isTeacherAssigned(a.teacherUserId, a.teacherName)
      ).length;
      const status = this.computeStatus(courseCount, withTeacher);
      const readinessPercent =
        courseCount === 0 ? 0 : Math.round((withTeacher / courseCount) * 100);

      const section = sectionFromCategory(academic?.category ?? null);
      const level = academic?.grade?.name ?? academic?.name ?? '—';
      const stream = academic?.stream ?? null;

      if (filters.section && section !== filters.section) continue;
      if (filters.level && level !== filters.level) continue;
      if (filters.stream && stream !== filters.stream) continue;
      if (filters.status && status !== filters.status) continue;

      rows.push({
        className: label,
        classId: academic?.id ?? null,
        level,
        stream,
        section,
        studentCount: studentCounts.get(label) ?? 0,
        courseCount,
        teacherCount,
        totalPeriods: classAssignments.reduce((s, a) => s + a.periodsPerWeek, 0),
        readinessPercent,
        status,
      });
    }

    return rows;
  }

  async detail(
    organizationId: string,
    className: string,
    term: string,
    academicYear: string
  ): Promise<ClassConfigDetail> {
    const [{ classes }, assignments, courseConfigs, studentCounts, allAssignments, schedule, profiles] =
      await Promise.all([
        listAcademicClasses(organizationId, { term, academicYear }),
        assignmentService.list(organizationId, { term, academicYear, className }),
        courseConfigService.list(organizationId),
        this.studentCountByClass(organizationId, academicYear),
        assignmentService.list(organizationId, { term, academicYear }),
        scheduleService.get(organizationId, term, academicYear).catch(() => null),
        prisma.timetableTeacherProfile.findMany({ where: { organizationId } }),
      ]);

    function matchCourseConfig(subjectName: string, periodsPerWeek: number) {
      const matches = courseConfigs.filter((c) => c.subjectName === subjectName);
      if (matches.length <= 1) return matches[0];
      return (
        matches.find((c) => c.periodsPerWeek === periodsPerWeek) ??
        matches.sort((a, b) => (a.courseCode ?? '').localeCompare(b.courseCode ?? ''))[0]
      );
    }
    const academic = classes.find((c) => normalizeClassLabel(c.label) === normalizeClassLabel(className));
    const teacherWorkload = new Map<string, number>();
    for (const a of allAssignments) {
      teacherWorkload.set(a.teacherUserId, (teacherWorkload.get(a.teacherUserId) ?? 0) + a.periodsPerWeek);
    }

    const { schoolWeeklyCapacity, teacherMaxPeriods } = this.resolveTeacherCapacity(schedule, profiles);

    const courses: ClassCourseRow[] = assignments.map((a) => {
      const cfg = matchCourseConfig(a.subjectName, a.periodsPerWeek);
      const rules = parseSchedulingRules(cfg?.schedulingRules);
      const overrides = (a.schedulingOverrides as Record<string, unknown>) ?? {};
      const hasTeacher = isTeacherAssigned(a.teacherUserId, a.teacherName);
      const workload = teacherWorkload.get(a.teacherUserId) ?? a.periodsPerWeek;
      const maxPeriods = teacherMaxPeriods.get(a.teacherUserId) ?? schoolWeeklyCapacity;
      const roomReq = (overrides.roomRequirement as string) ?? rules.roomRequirement;
      const needsLab = roomReq === 'REQUIRE_LAB';
      const hasRoom = Boolean(a.room || rules.preferredLabRoom);

      let status: ClassCourseRow['status'] = 'ready';
      if (!hasTeacher) status = 'missing';
      else if (workload > maxPeriods || (needsLab && !hasRoom)) status = 'warning';

      const preferredTime =
        cfg?.timePreference === 'MORNING'
          ? 'Morning'
          : cfg?.timePreference === 'AFTERNOON'
            ? 'Afternoon'
            : cfg?.timePreference === 'CUSTOM'
              ? 'Custom'
              : 'Any';

      return {
        id: a.id,
        subjectName: a.subjectName,
        courseCode: cfg?.courseCode ?? courseCode(a.subjectName),
        periodsPerWeek: a.periodsPerWeek,
        defaultCourseMarks:
          a.defaultCourseMarks != null ? Number(a.defaultCourseMarks) : null,
        teacherUserId: a.teacherUserId,
        teacherName: a.teacherName,
        room: a.room,
        structure: structureLabel(rules, overrides),
        preferredTime,
        status,
        schedulingOverrides: overrides,
        isCore: cfg?.isCore ?? true,
        defaults: {
          periodsPerWeek: cfg?.periodsPerWeek ?? a.periodsPerWeek,
          structure: structureLabel(rules, {}),
          roomRequirement: rules.roomRequirement,
          preferredRoom: rules.preferredLabRoom ?? rules.preferredRoom ?? null,
        },
      };
    });

    const alerts: ClassConfigDetail['alerts'] = [];
    const missingTeacher = courses.filter((c) => c.status === 'missing');
    if (missingTeacher.length) {
      alerts.push({
        severity: 'error',
        message: `${missingTeacher.length} course(s) have no teacher assigned`,
      });
    }

    const labCourses = courses.filter((c) => {
      const cfg = matchCourseConfig(c.subjectName, c.periodsPerWeek);
      const rules = parseSchedulingRules(cfg?.schedulingRules);
      const ov = c.schedulingOverrides;
      const req = (ov.roomRequirement as string) ?? rules.roomRequirement;
      return req === 'REQUIRE_LAB' || req === 'PREFER_LAB';
    });
    const labWithoutRoom = labCourses.filter((c) => !c.room);
    if (labWithoutRoom.length) {
      alerts.push({
        severity: 'warning',
        message: `${labWithoutRoom.length} course(s) require or prefer a laboratory`,
      });
    }

    for (const c of courses) {
      const load = teacherWorkload.get(c.teacherUserId) ?? 0;
      const maxPeriods = teacherMaxPeriods.get(c.teacherUserId) ?? schoolWeeklyCapacity;
      if (load > maxPeriods) {
        alerts.push({
          severity: 'warning',
          message: `${c.teacherName} has ${load} periods/week (recommended max: ${maxPeriods})`,
        });
        break;
      }
    }

    const courseCount = courses.length;
    const teacherCount = new Set(courses.map((c) => c.teacherUserId).filter(Boolean)).size;
    const withTeacher = courses.filter((c) => isTeacherAssigned(c.teacherUserId, c.teacherName)).length;
    const totalPeriods = courses.reduce((s, c) => s + c.periodsPerWeek, 0);
    const labPeriods = labCourses.reduce((s, c) => s + c.periodsPerWeek, 0);
    const doublePreferences = courses.filter((c) => c.structure !== 'Single').length;
    const readinessPercent = courseCount ? Math.round((withTeacher / courseCount) * 100) : 0;
    const status = this.computeStatus(courseCount, withTeacher);

    return {
      className,
      level: academic?.grade?.name ?? academic?.name ?? '—',
      stream: academic?.stream ?? null,
      section: sectionFromCategory(academic?.category ?? null),
      studentCount: studentCounts.get(className) ?? 0,
      courses,
      summary: {
        courseCount,
        teacherCount,
        totalPeriods,
        labPeriods,
        doublePreferences,
        readinessPercent,
        status,
      },
      alerts: dedupeAlerts(alerts),
      readiness: {
        courses: { ok: courseCount > 0, label: `${courseCount}/${courseCount || '—'}` },
        teachers: { ok: withTeacher >= courseCount && courseCount > 0, label: `${withTeacher}/${courseCount || '—'}` },
        periods: { ok: totalPeriods > 0, label: `${totalPeriods}` },
        rooms: { ok: labWithoutRoom.length === 0, label: `${labCourses.length - labWithoutRoom.length}/${labCourses.length || '—'}` },
        conflicts: { ok: alerts.filter((a) => a.severity === 'error').length === 0, label: String(alerts.filter((a) => a.severity === 'error').length) },
      },
    };
  }

  async copyConfiguration(
    organizationId: string,
    fromClass: string,
    toClasses: string[],
    term: string,
    academicYear: string
  ) {
    const source = await assignmentService.list(organizationId, { term, academicYear, className: fromClass });
    if (!source.length) throw new AppError(400, `No configuration found for ${fromClass}`);

    let copied = 0;
    for (const target of toClasses) {
      if (target === fromClass) continue;
      await prisma.teacherAssignment.deleteMany({
        where: { organizationId, className: target, term, academicYear },
      });
      for (const row of source) {
        await prisma.teacherAssignment.create({
          data: {
            organizationId,
            className: target,
            subjectName: row.subjectName,
            teacherUserId: row.teacherUserId,
            teacherName: row.teacherName,
            periodsPerWeek: row.periodsPerWeek,
            room: row.room,
            schedulingOverrides: row.schedulingOverrides ?? {},
            term,
            academicYear,
            status: AssignmentStatus.ACTIVE,
          },
        });
        copied += 1;
      }
    }
    return { copied, targets: toClasses.filter((c) => c !== fromClass) };
  }

  private resolveTeacherCapacity(
    schedule: unknown,
    profiles: Array<{
      teacherUserId: string;
      availableDays: unknown;
      maxPeriodsPerDay: number | null;
    }>
  ): { schoolWeeklyCapacity: number; teacherMaxPeriods: Map<string, number>; activeDays: string[] } {
    const periodSlots = Array.isArray((schedule as { periodSlots?: unknown } | null)?.periodSlots)
      ? ((schedule as { periodSlots: Array<{ isBreak?: boolean }> }).periodSlots)
      : [];
    const periodsPerDay =
      periodSlots.filter((s) => !s.isBreak).length ||
      (typeof (schedule as { periodCount?: number } | null)?.periodCount === 'number'
        ? (schedule as { periodCount: number }).periodCount
        : 8);
    const activeDays = Array.isArray((schedule as { activeDays?: string[] } | null)?.activeDays)
      ? (schedule as { activeDays: string[] }).activeDays
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const schoolWeeklyCapacity = Math.max(1, periodsPerDay * activeDays.length);

    const teacherMaxPeriods = new Map<string, number>();
    for (const p of profiles) {
      const availableDays = Array.isArray(p.availableDays) ? (p.availableDays as string[]) : activeDays;
      const dayCount = Math.max(1, availableDays.filter((d) => activeDays.includes(d)).length || activeDays.length);
      teacherMaxPeriods.set(
        p.teacherUserId,
        Math.min(schoolWeeklyCapacity, Math.max(1, periodsPerDay * dayCount))
      );
    }
    return { schoolWeeklyCapacity, teacherMaxPeriods, activeDays };
  }

  async teacherOptions(organizationId: string, term: string, academicYear: string, subjectName?: string) {
    const [profiles, assignments, schedule] = await Promise.all([
      prisma.timetableTeacherProfile.findMany({ where: { organizationId } }),
      assignmentService.list(organizationId, { term, academicYear }),
      scheduleService.get(organizationId, term, academicYear).catch(() => null),
    ]);

    const { schoolWeeklyCapacity, teacherMaxPeriods } = this.resolveTeacherCapacity(schedule, profiles);

    const workload = new Map<string, { name: string; periods: number; subjects: Set<string>; classes: Set<string> }>();
    for (const a of assignments) {
      const cur = workload.get(a.teacherUserId) ?? {
        name: a.teacherName,
        periods: 0,
        subjects: new Set<string>(),
        classes: new Set<string>(),
      };
      cur.periods += a.periodsPerWeek;
      cur.subjects.add(a.subjectName);
      cur.classes.add(a.className);
      workload.set(a.teacherUserId, cur);
    }

    const teachers = profiles.length
      ? profiles.map((p) => ({
          teacherUserId: p.teacherUserId,
          teacherName: p.teacherName,
          maxPeriods: teacherMaxPeriods.get(p.teacherUserId) ?? schoolWeeklyCapacity,
        }))
      : [...workload.entries()].map(([id, w]) => ({
          teacherUserId: id,
          teacherName: w.name,
          maxPeriods: schoolWeeklyCapacity,
        }));

    return teachers
      .map((t) => {
        const w = workload.get(t.teacherUserId);
        const periods = w?.periods ?? 0;
        const teachesSubject = subjectName ? w?.subjects.has(subjectName) : false;
        let availability: 'available' | 'high' | 'overloaded' = 'available';
        if (periods > t.maxPeriods) availability = 'overloaded';
        else if (t.maxPeriods > 3 && periods >= t.maxPeriods - 3) availability = 'high';
        const recommended = Boolean(subjectName && teachesSubject && availability !== 'overloaded');
        return {
          ...t,
          weeklyPeriods: periods,
          weeklyCapacity: schoolWeeklyCapacity,
          availability,
          recommended,
          subjects: w ? [...w.subjects] : [],
          classes: w ? [...w.classes] : [],
        };
      })
      .sort((a, b) => {
        if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
        return a.weeklyPeriods - b.weeklyPeriods;
      });
  }

  private async assignmentsForCatalog(organizationId: string, term: string, academicYear: string) {
    const attempts: Array<{ term?: string; academicYear?: string }> = [
      { term, academicYear },
      { academicYear },
      { term },
    ];
    for (const filters of attempts) {
      const rows = await assignmentService.list(organizationId, filters);
      if (rows.length) return rows;
    }
    return [];
  }

  async catalog(organizationId: string, term: string, academicYear: string) {
    const [rows, assignments, courseConfigs] = await Promise.all([
      this.list(organizationId, term, academicYear),
      this.assignmentsForCatalog(organizationId, term, academicYear),
      courseConfigService.list(organizationId).catch(() => []),
    ]);
    const codeBySubject = new Map(
      courseConfigs.map((c) => [c.subjectName, c.courseCode ?? courseCode(c.subjectName)]),
    );
    const coreBySubject = new Map(courseConfigs.map((c) => [c.subjectName, c.isCore !== false]));
    const byClass = new Map<string, typeof assignments>();
    for (const assignment of assignments) {
      const list = byClass.get(assignment.className) ?? [];
      list.push(assignment);
      byClass.set(assignment.className, list);
    }

    return rows.map((row) => {
      const classAssignments = [...byClass.entries()]
        .filter(([name]) => normalizeClassLabel(name) === normalizeClassLabel(row.className))
        .flatMap(([, list]) => list);
      return {
        ...row,
        courseCount: classAssignments.length || row.courseCount,
        courses: classAssignments.map((a) => ({
          id: a.id,
          subjectName: a.subjectName,
          courseCode: codeBySubject.get(a.subjectName) ?? courseCode(a.subjectName),
          periodsPerWeek: a.periodsPerWeek,
          defaultCourseMarks:
            a.defaultCourseMarks != null ? Number(a.defaultCourseMarks) : null,
          teacherName: a.teacherName,
          room: a.room ?? null,
          isCore: coreBySubject.get(a.subjectName) ?? true,
        })),
      };
    });
  }
}

function dedupeAlerts(alerts: ClassConfigDetail['alerts']) {
  return alerts.filter((a, i, arr) => arr.findIndex((x) => x.message === a.message) === i);
}

export const classConfigService = new ClassConfigService();
