import {
  fetchSmClasses,
  fetchSmStudentsForClass,
  type SmClass,
  type SmStudent,
} from '../clients/student-management.client';
import { fetchTeacherAssignments } from '../clients/timetable.client';
import { defaultAcademicSettings, fetchIamAcademicSettings } from '../clients/iam.client';
import { resolveTimetableTeacherLink } from './teacher-link.service';
import { fetchGateAttendance } from '../clients/attendance.client';
import { fetchClassDisciplineCases } from '../clients/discipline.client';
import { AppError } from '../middleware/error.middleware';

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

function classLabel(c: SmClass) {
  return c.label || [c.name, c.stream].filter(Boolean).join(' ').trim() || c.name;
}

function approximateTermRange(term: string, academicYear: string): { from: string; to: string } | null {
  const m = academicYear.match(/^(\d{4})-(\d{4})$/);
  if (!m) return null;
  const y1 = m[1];
  const y2 = m[2];
  const label = term.trim().toLowerCase();
  if (label.includes('1')) return { from: `${y1}-09-01`, to: `${y1}-12-20` };
  if (label.includes('2')) return { from: `${y2}-01-07`, to: `${y2}-04-04` };
  if (label.includes('3')) return { from: `${y2}-04-21`, to: `${y2}-07-31` };
  return { from: `${y1}-09-01`, to: `${y2}-07-31` };
}

function matchClassByName(classes: SmClass[], className: string): SmClass | undefined {
  const target = normalize(className);
  if (!target) return undefined;

  const exact = classes.find((c) => normalize(classLabel(c)) === target);
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

export type MyClassItem = SmClass & {
  studentCount?: number;
  roles: Array<'HEAD' | 'TEACHING'>;
  subjects?: string[];
};

export const myClassesService = {
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
    const timetableTeacherId = link.profile?.teacherUserId ?? null;
    const teacherEmail = email?.trim().toLowerCase() ?? link.profile?.loginEmail?.trim().toLowerCase();
    const headLookupIds = [...new Set([userId, timetableTeacherId].filter(Boolean))] as string[];

    const [allClasses, headClassesResult, assignments] = await Promise.all([
      fetchSmClasses(organizationId).catch(() => [] as SmClass[]),
      fetchSmClasses(organizationId, {
        headTeacherUserIds: headLookupIds,
        headTeacherEmail: teacherEmail ?? undefined,
      }).catch(() => []),
      fetchTeacherAssignments(organizationId, timetableTeacherId ?? userId, opts).catch(() => []),
    ]);
    const headClasses = headClassesResult;

    const byId = new Map<string, MyClassItem>();

    for (const cls of headClasses) {
      byId.set(cls.id, {
        ...cls,
        roles: ['HEAD'],
        subjects: [],
      });
    }

    const assignmentSubjects = new Map<string, Set<string>>();
    for (const assignment of assignments) {
      const matched = matchClassByName(allClasses, assignment.className);
      if (!matched) continue;
      const set = assignmentSubjects.get(matched.id) ?? new Set<string>();
      set.add(assignment.subjectName);
      assignmentSubjects.set(matched.id, set);
    }

    for (const [classId, subjects] of assignmentSubjects) {
      const cls = allClasses.find((c) => c.id === classId);
      if (!cls) continue;
      const existing = byId.get(classId);
      if (existing) {
        existing.roles = [...new Set<'HEAD' | 'TEACHING'>([...existing.roles, 'TEACHING'])];
        existing.subjects = [...subjects];
      } else {
        byId.set(classId, {
          ...cls,
          roles: ['TEACHING'],
          subjects: [...subjects],
        });
      }
    }

    const items = [...byId.values()].sort((a, b) => classLabel(a).localeCompare(classLabel(b)));

    const withCounts = await Promise.all(
      items.map(async (item) => {
        try {
          const { students } = await fetchSmStudentsForClass(
            organizationId,
            item.id,
            classLabel(item),
            opts?.academicYear
          );
          return { ...item, studentCount: students.length };
        } catch {
          return { ...item, studentCount: 0 };
        }
      })
    );

    return {
      linked: link.linked,
      teacherName: link.profile?.teacherName ?? null,
      classes: withCounts,
    };
  },

  async studentsForClass(
    organizationId: string,
    classId: string,
    className: string,
    academicYear?: string
  ): Promise<{ students: SmStudent[]; meta?: Record<string, unknown> }> {
    return fetchSmStudentsForClass(organizationId, classId, className, academicYear);
  },

  async assertHeadOfClass(
    organizationId: string,
    userId: string,
    email: string | null | undefined,
    classId: string,
    opts?: { term?: string; academicYear?: string }
  ) {
    const result = await this.listForTeacher(organizationId, userId, email, opts);
    const cls = result.classes.find((c) => c.id === classId);
    if (!cls) throw new AppError(404, 'Class not found in your assignments');
    if (!cls.roles.includes('HEAD')) {
      throw new AppError(403, 'Only head of class can access this feature');
    }
    return cls;
  },

  async gateAttendanceForClass(
    organizationId: string,
    userId: string,
    email: string | null | undefined,
    classId: string,
    className: string,
    opts?: { date?: string; from?: string; to?: string; q?: string; term?: string; academicYear?: string }
  ) {
    await this.assertHeadOfClass(organizationId, userId, email, classId, opts);
    const { students } = await fetchSmStudentsForClass(
      organizationId,
      classId,
      className,
      opts?.academicYear
    );

    let rangeFrom = opts?.from;
    let rangeTo = opts?.to;
    if (opts?.term && opts?.academicYear) {
      const approx = approximateTermRange(opts.term, opts.academicYear);
      if (approx && !rangeFrom && !rangeTo) {
        rangeFrom = approx.from;
        rangeTo = approx.to;
      }
    }

    const day = opts?.date ?? new Date().toISOString().slice(0, 10);
    const { records: dayRecords, serviceAvailable } = await fetchGateAttendance(organizationId, {
      className,
      date: day,
      q: opts?.q,
    });

    let termRecords: Awaited<ReturnType<typeof fetchGateAttendance>>['records'] = [];
    if (rangeFrom && rangeTo) {
      termRecords = (
        await fetchGateAttendance(organizationId, { className, from: rangeFrom, to: rangeTo })
      ).records;
    }
    const dayByCode = new Map(dayRecords.map((r) => [r.studentCode ?? r.studentName, r]));
    const termByCode = new Map<string, { present: number; late: number; total: number }>();

    for (const r of termRecords) {
      const key = r.studentCode ?? r.studentName;
      const bucket = termByCode.get(key) ?? { present: 0, late: 0, total: 0 };
      bucket.total += 1;
      if (r.status === 'LATE') bucket.late += 1;
      if (r.status === 'PRESENT' || r.status === 'LATE' || r.entryTime) bucket.present += 1;
      termByCode.set(key, bucket);
    }

    const q = opts?.q?.trim().toLowerCase();
    const rows = students
      .filter((s) => {
        if (!q) return true;
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.studentCode.toLowerCase().includes(q)
        );
      })
      .map((s) => {
        const key = s.studentCode;
        const termStats = termByCode.get(key) ?? { present: 0, late: 0, total: 0 };
        const rate =
          termStats.total > 0 ? Math.round((termStats.present / termStats.total) * 100) : null;
        return {
          studentId: s.id,
          studentCode: s.studentCode,
          fullName: s.fullName,
          photoUrl: s.photoUrl ?? null,
          rollNumber: s.rollNumber ?? null,
          gender: s.gender ?? null,
          record: dayByCode.get(key) ?? null,
          termAttendanceRate: rate,
          termPresentDays: termStats.present,
          termLateDays: termStats.late,
          termRecordDays: termStats.total,
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    return {
      rows,
      records: dayRecords,
      className,
      serviceAvailable,
      period: { date: day, from: rangeFrom ?? null, to: rangeTo ?? null },
    };
  },

  async disciplineForClass(
    organizationId: string,
    userId: string,
    email: string | null | undefined,
    classId: string,
    className: string,
    opts?: { status?: string; search?: string; term?: string; academicYear?: string }
  ) {
    await this.assertHeadOfClass(organizationId, userId, email, classId, opts);
    const { cases, serviceAvailable } = await fetchClassDisciplineCases(organizationId, {
      className,
      status: opts?.status,
      search: opts?.search,
    });
    return { cases, className, serviceAvailable };
  },
};
