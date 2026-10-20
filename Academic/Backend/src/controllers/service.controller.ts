import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { classService } from '../services/class.service';
import { parentService } from '../services/parent.service';
import { studentService } from '../services/student.service';
import { parentPortalAcademicsService } from '../services/parent-portal-academics.service';
import { reportCardPublicationService } from '../services/report-card-publication.service';
import { AppError } from '../middleware/error.middleware';

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

export const serviceController = {
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

      const data = await parentPortalAcademicsService.getForStudent(organizationId, studentCode, {
        academicYear,
        term,
        className,
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
      const data = await reportCardPublicationService.getPublishedReportForParent(organizationId, {
        studentId: q.studentId,
        studentCode: q.studentCode,
        classId: q.classId,
        academicYear: q.academicYear,
        term: q.term,
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
