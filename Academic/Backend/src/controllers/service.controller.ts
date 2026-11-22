import { normalizeReportKind } from '../utils/report-kind';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { classService } from '../services/class.service';
import { parentService } from '../services/parent.service';
import { studentService } from '../services/student.service';
import { parentPortalAcademicsService } from '../services/parent-portal-academics.service';
import { reportCardPublicationService } from '../services/report-card-publication.service';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';

function classLabel(c: {
  name: string;
  stream?: string | null;
  grade?: { name?: string | null } | null;
}): string {
  return [c.name, c.stream].filter(Boolean).join(' ').trim() || c.grade?.name || c.name;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

type ClassRef = {
  id: string;
  name: string;
  stream?: string | null;
  grade?: { name?: string | null } | null;
};

function matchClassLabel(classes: ClassRef[], className: string): ClassRef | undefined {
  const target = normalize(className);
  if (!target) return undefined;

  const exact = classes.find((c) => normalize(classLabel(c)) === target);
  if (exact) return exact;

  const byName = classes.find((c) => normalize(c.name) === target);
  if (byName) return byName;

  return classes.find((c) => {
    const label = normalize(classLabel(c));
    return label.startsWith(target) || target.startsWith(label);
  });
}

function gradeOf(percentage: number): string {
  if (percentage >= 80) return 'A';
  if (percentage >= 75) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'B-';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'E';
}

function groupStats<T extends { key: string; label: string; percentage: number; studentId: string }>(
  rows: T[],
  pass = 50
) {
  const groups = new Map<string, { label: string; total: number; passed: number; students: Set<string>; entries: number }>();
  for (const row of rows) {
    const g = groups.get(row.key) ?? { label: row.label, total: 0, passed: 0, students: new Set<string>(), entries: 0 };
    g.total += row.percentage;
    g.entries += 1;
    if (row.percentage >= pass) g.passed += 1;
    g.students.add(row.studentId);
    groups.set(row.key, g);
  }
  return [...groups.entries()].map(([key, g]) => ({
    key,
    label: g.label,
    average: Math.round((g.total / g.entries) * 10) / 10,
    passRate: Math.round((g.passed / g.entries) * 1000) / 10,
    entries: g.entries,
    students: g.students.size,
  }));
}

export const serviceController = {
  /** Service-to-service: marks by class and course for Director Console analytics (read-only). */
  async marksOverview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      const pick = (key: string) => {
        const value = req.query[key];
        return typeof value === 'string' && value.trim() ? value.trim() : undefined;
      };
      const academicYear = pick('academicYear');
      const term = pick('term');
      const classId = pick('classId');
      const subjectId = pick('subjectId');
      const course = pick('course');

      const entries = await prisma.markEntry.findMany({
        where: {
          organizationId,
          ...(classId ? { classId } : {}),
          ...(subjectId ? { subjectId } : {}),
          exam: {
            ...(academicYear ? { academicYear } : {}),
            ...(term ? { term } : {}),
          },
        },
        include: {
          exam: { select: { name: true, term: true, academicYear: true, totalMarks: true } },
          student: { select: { id: true, firstName: true, lastName: true, studentUid: true, studentCode: true } },
          subject: { select: { id: true, name: true } },
          class: { select: { id: true, name: true, stream: true, grade: { select: { name: true } } } },
        },
        take: 5000,
      });

      const rows = entries
        .filter((e) => !course || e.subject.name.toLowerCase() === course.toLowerCase())
        .map((e) => {
          const maxScore = e.exam.totalMarks ?? 100;
          const score = Number(e.score);
          const percentage = Math.round((score / maxScore) * 1000) / 10;
          return {
            id: e.id,
            organizationId,
            studentId: e.student.id,
            studentName: `${e.student.firstName} ${e.student.lastName}`.trim(),
            studentCode: e.student.studentCode ?? e.student.studentUid,
            classId: e.class.id,
            className: classLabel(e.class),
            subjectId: e.subject.id,
            course: e.subject.name,
            exam: e.exam.name,
            score,
            maxScore,
            percentage,
            grade: gradeOf(percentage),
            academicYear: e.exam.academicYear,
            term: e.exam.term ?? '',
          };
        });

      const [classes, subjects, exams] = await Promise.all([
        prisma.class.findMany({
          where: { organizationId },
          select: { id: true, name: true, stream: true, grade: { select: { name: true } } },
          orderBy: { sortOrder: 'asc' },
        }),
        prisma.subject.findMany({
          where: { organizationId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        prisma.exam.findMany({
          where: { organizationId },
          select: { academicYear: true, term: true },
        }),
      ]);

      const avg = rows.length ? rows.reduce((a, r) => a + r.percentage, 0) / rows.length : 0;
      const passed = rows.filter((r) => r.percentage >= 50).length;

      res.json({
        success: true,
        data: {
          filters: {
            classes: classes.map((c) => ({ id: c.id, label: classLabel(c) })),
            courses: subjects.map((s) => ({ id: s.id, name: s.name })),
            academicYears: [...new Set(exams.map((e) => e.academicYear))].sort().reverse(),
            terms: [...new Set(exams.map((e) => e.term).filter((t): t is string => Boolean(t)))].sort(),
          },
          summary: {
            average: Math.round(avg * 10) / 10,
            passRate: rows.length ? Math.round((passed / rows.length) * 1000) / 10 : 0,
            entries: rows.length,
            students: new Set(rows.map((r) => r.studentId)).size,
            exams: new Set(rows.map((r) => r.exam)).size,
          },
          byClass: groupStats(rows.map((r) => ({ ...r, key: r.classId, label: r.className }))).map((g) => ({
            classId: g.key,
            className: g.label,
            average: g.average,
            passRate: g.passRate,
            entries: g.entries,
            students: g.students,
          })),
          byCourse: groupStats(rows.map((r) => ({ ...r, key: r.subjectId, label: r.course }))).map((g) => ({
            subjectId: g.key,
            course: g.label,
            average: g.average,
            passRate: g.passRate,
            entries: g.entries,
            students: g.students,
          })),
          rows: rows.slice(0, 1000),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async listClasses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const rows = await classService.list(req.organizationRef!);
      const data = rows.map((c) => ({
        id: c.id,
        name: c.name,
        stream: c.stream,
        category: c.category,
        label: classLabel(c),
        grade: c.grade,
        combination: c.combination,
      }));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listStudents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      let classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
      const className = typeof req.query.className === 'string' ? req.query.className : undefined;
      const academicYear =
        typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : 'ACTIVE';

      let resolvedClass: ClassRef | undefined;
      if (!classId && className) {
        const classes = await classService.list(organizationId);
        resolvedClass = matchClassLabel(classes, className);
        classId = resolvedClass?.id;
      } else if (classId) {
        try {
          const full = await classService.getById(classId, organizationId);
          resolvedClass = {
            id: full.id,
            name: full.name,
            stream: full.stream,
            grade: full.grade,
          };
        } catch {
          resolvedClass = undefined;
        }
      }

      if ((className || req.query.classId) && !classId) {
        res.json({
          success: true,
          data: [],
          meta: { classId: null, classLabel: className ?? null, matched: false },
        });
        return;
      }

      const students = await studentService.list(organizationId, {
        classId,
        status,
        academicYear,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      });

      const data = students.map((s, index) => {
        const enrollment = s.enrollments?.[0];
        const cls = enrollment?.class ?? resolvedClass;
        return {
          id: s.id,
          studentCode: s.studentCode || s.studentUid || s.id,
          fullName: [s.firstName, s.lastName].filter(Boolean).join(' ').trim(),
          firstName: s.firstName,
          lastName: s.lastName,
          gender: s.gender === 'FEMALE' ? 'F' : s.gender === 'MALE' ? 'M' : s.gender,
          photoUrl: s.studentPhoto ?? null,
          classId: cls?.id ?? classId ?? null,
          className: cls ? classLabel(cls) : className ?? null,
          stream: cls?.stream ?? null,
          rollNumber: String(index + 1),
          status: s.status,
        };
      });

      res.json({
        success: true,
        data,
        meta: {
          classId: classId ?? null,
          classLabel: resolvedClass ? classLabel(resolvedClass) : className ?? null,
          matched: Boolean(classId),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /** Service-to-service: published marks + class assessment schedule (ParentMIS). */
  async parentCoursePerformance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      const studentCode =
        typeof req.query.studentCode === 'string' ? req.query.studentCode.trim() : '';
      if (!studentCode) throw new AppError(400, 'studentCode is required');

      const academicYear =
        typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
      const term = typeof req.query.term === 'string' ? req.query.term : undefined;
      const className =
        typeof req.query.className === 'string' ? req.query.className.trim() : undefined;
      const subject = typeof req.query.subject === 'string' ? req.query.subject.trim() : undefined;
      const studentName =
        typeof req.query.studentName === 'string' ? req.query.studentName.trim() : undefined;
      const studentId =
        typeof req.query.studentId === 'string' ? req.query.studentId.trim() : undefined;

      const data = await parentPortalAcademicsService.getCoursePerformance(organizationId, studentCode, {
        academicYear,
        term,
        className,
        subject,
        studentName,
        studentId,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async parentAcademics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      const studentCode =
        typeof req.query.studentCode === 'string' ? req.query.studentCode.trim() : '';
      if (!studentCode) throw new AppError(400, 'studentCode is required');

      const academicYear =
        typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
      const term = typeof req.query.term === 'string' ? req.query.term : undefined;
      const className =
        typeof req.query.className === 'string' ? req.query.className.trim() : undefined;
      const studentName =
        typeof req.query.studentName === 'string' ? req.query.studentName.trim() : undefined;
      const studentId =
        typeof req.query.studentId === 'string' ? req.query.studentId.trim() : undefined;

      const data = await parentPortalAcademicsService.getForStudent(organizationId, studentCode, {
        academicYear,
        term,
        className,
        studentName,
        studentId,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listReportPublications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      const q = req.query as Record<string, string>;
      const data = await reportCardPublicationService.list(organizationId, {
        academicYear: q.academicYear,
        term: q.term,
        classId: q.classId,
        className: q.className,
        search: q.search,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async parentReportCard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      const q = req.query as Record<string, string>;
      if (!q.academicYear || !q.term) throw new AppError(400, 'academicYear and term are required');
      const reportKind = normalizeReportKind(q.reportKind);
      const data = await reportCardPublicationService.getPublishedReportForParent(organizationId, {
        studentId: q.studentId,
        studentCode: q.studentCode,
        classId: q.classId,
        academicYear: q.academicYear,
        term: q.term,
        reportKind,
        enforceFeesPolicy: true,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /** Service-to-service: parents with their linked students (ShuleKit etc. master-data sync). */
  async listParents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;

      const rows = await parentService.listWithStudents(organizationId);

      const data = rows
        .map((p) => ({
          id: p.id,
          fullName: [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone,
          email: p.email,
          nationalId: p.nationalId,
          occupation: p.occupation,
          address: p.address,
          students: (p.studentParents ?? []).map((sp) => {
            const enrollment = sp.student?.enrollments?.[0];
            const cls = enrollment?.class;
            return {
              studentId: sp.student?.id,
              studentCode: sp.student?.studentCode || sp.student?.studentUid || sp.student?.id,
              studentName: sp.student
                ? [sp.student.firstName, sp.student.lastName].filter(Boolean).join(' ').trim()
                : null,
              className: cls ? classLabel(cls) : null,
              role: sp.role,
            };
          }),
        }))
        .filter((p) => !studentId || p.students.some((s) => s.studentId === studentId));

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};
