import { fetchTeacherAssignments } from '../clients/timetable.client';
import { fetchSmClasses } from '../clients/student-management.client';
import { resolveTimetableTeacherLink } from './teacher-link.service';
import { defaultAcademicSettings, fetchIamAcademicSettings } from '../clients/iam.client';

export type MyCourseItem = {
  subjectName: string;
  className: string;
  classId: string | null;
  classLabel: string;
  periodsPerWeek: number;
  room: string | null;
  term: string;
  academicYear: string;
};

export type MyCourseGroup = {
  subjectName: string;
  totalPeriods: number;
  classes: Array<{ className: string; classId: string | null; periodsPerWeek: number; room: string | null }>;
};

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

function smClassLabel(c: { name?: string | null; stream?: string | null; label?: string | null }) {
  return c.label?.trim() || [c.name, c.stream].filter(Boolean).join(' ').trim() || String(c.name ?? '');
}

function matchClassByName(
  classes: Array<{ id: string; name: string; stream?: string | null; label?: string | null }>,
  className: string
) {
  const target = normalize(className);
  if (!target) return undefined;
  const exact = classes.find((c) => normalize(smClassLabel(c)) === target);
  if (exact) return exact;
  const byName = classes.find((c) => normalize(c.name) === target);
  if (byName) return byName;
  const parts = className.trim().split(/\s+/);
  if (parts.length >= 2) {
    const streamPart = parts[parts.length - 1]!;
    const namePart = parts.slice(0, -1).join(' ');
    return classes.find(
      (c) =>
        normalize(c.name) === normalize(namePart) &&
        normalize(c.stream ?? '') === normalize(streamPart)
    );
  }
  return undefined;
}

export const myCoursesService = {
  async academicContext(organizationId: string) {
    return (await fetchIamAcademicSettings(organizationId)) ?? defaultAcademicSettings();
  },

  async listForTeacher(
    organizationId: string,
    userId: string,
    email?: string | null,
    opts?: { term?: string; academicYear?: string }
  ) {
    const link = await resolveTimetableTeacherLink(organizationId, userId, email);
    const teacherUserId = link.profile?.teacherUserId ?? userId;
    const [assignments, smClasses] = await Promise.all([
      fetchTeacherAssignments(organizationId, teacherUserId, opts).catch(() => []),
      fetchSmClasses(organizationId).catch(() => []),
    ]);

    const courses: MyCourseItem[] = assignments.map((a) => {
      const matched = matchClassByName(smClasses, a.className);
      return {
        subjectName: a.subjectName,
        className: a.className,
        classId: matched?.id ?? null,
        classLabel: matched ? smClassLabel(matched) : a.className,
        periodsPerWeek: a.periodsPerWeek,
        room: a.room ?? null,
        term: a.term,
        academicYear: a.academicYear,
      };
    });

    const groupedMap = new Map<string, MyCourseGroup>();
    for (const course of courses) {
      const current = groupedMap.get(course.subjectName) ?? {
        subjectName: course.subjectName,
        totalPeriods: 0,
        classes: [],
      };
      current.totalPeriods += course.periodsPerWeek;
      current.classes.push({
        className: course.className,
        classId: course.classId,
        periodsPerWeek: course.periodsPerWeek,
        room: course.room,
      });
      groupedMap.set(course.subjectName, current);
    }

    const grouped = [...groupedMap.values()].sort((a, b) => a.subjectName.localeCompare(b.subjectName));

    return {
      linked: link.linked,
      teacherName: link.profile?.teacherName ?? null,
      assignments: courses.sort((a, b) =>
        a.subjectName.localeCompare(b.subjectName) || a.className.localeCompare(b.className)
      ),
      grouped,
      totalPeriods: courses.reduce((sum, c) => sum + c.periodsPerWeek, 0),
    };
  },
};
