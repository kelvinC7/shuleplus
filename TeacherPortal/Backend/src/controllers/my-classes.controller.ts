import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { myClassesService } from '../services/my-classes.service';
import { classAttendanceService } from '../services/class-attendance.service';
import { resolveTimetableTeacherLink } from '../services/teacher-link.service';

function orgId(req: AuthenticatedRequest) {
  const id = req.organizationRef ?? req.user?.organizationId;
  if (!id) throw new AppError(401, 'Missing organization context');
  return id;
}

function teacherContext(req: AuthenticatedRequest) {
  const userId = req.user?.sub;
  if (!userId) throw new AppError(401, 'Authentication required');
  return {
    userId,
    email: req.user?.email ?? null,
    name: req.user?.email ?? 'Teacher',
  };
}

const attendanceSessionSchema = z.object({
  className: z.string().min(1),
  classLabel: z.string().optional(),
  sessionDate: z.string().min(1),
  academicYear: z.string().min(1),
  term: z.string().min(1),
});

const saveDraftSchema = z.object({
  rows: z
    .array(
      z.object({
        studentCode: z.string(),
        status: z.string(),
        notes: z.string().nullable().optional(),
      })
    )
    .optional(),
  sessionNotes: z.string().optional(),
});

export const myClassesController = {
  async academicContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await myClassesService.academicContext(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, email } = teacherContext(req);
      const data = await myClassesService.listForTeacher(orgId(req), userId, email, {
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async students(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const classId = req.params.classId as string;
      const className = typeof req.query.className === 'string' ? req.query.className : '';
      const data = await myClassesService.studentsForClass(
        orgId(req),
        classId,
        className,
        typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined
      );
      res.json({ success: true, data: data.students, meta: data.meta });
    } catch (e) {
      next(e);
    }
  },

  async gateAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const classId = req.params.classId as string;
      const { userId, email } = teacherContext(req);
      const className = typeof req.query.className === 'string' ? req.query.className : '';
      if (!className) throw new AppError(400, 'className is required');
      const data = await myClassesService.gateAttendanceForClass(
        orgId(req),
        userId,
        email,
        classId,
        className,
        {
          date: typeof req.query.date === 'string' ? req.query.date : undefined,
          from: typeof req.query.from === 'string' ? req.query.from : undefined,
          to: typeof req.query.to === 'string' ? req.query.to : undefined,
          q: typeof req.query.q === 'string' ? req.query.q : undefined,
          term: typeof req.query.term === 'string' ? req.query.term : undefined,
          academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        }
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async discipline(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const classId = req.params.classId as string;
      const { userId, email } = teacherContext(req);
      const className = typeof req.query.className === 'string' ? req.query.className : '';
      if (!className) throw new AppError(400, 'className is required');
      const data = await myClassesService.disciplineForClass(
        orgId(req),
        userId,
        email,
        classId,
        className,
        {
          status: typeof req.query.status === 'string' ? req.query.status : undefined,
          search: typeof req.query.search === 'string' ? req.query.search : undefined,
          term: typeof req.query.term === 'string' ? req.query.term : undefined,
          academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        }
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async classAttendanceGet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const classId = req.params.classId as string;
      const { userId, email, name } = teacherContext(req);
      const body = attendanceSessionSchema.parse({
        className: req.query.className,
        classLabel: req.query.classLabel,
        sessionDate: req.query.sessionDate,
        academicYear: req.query.academicYear,
        term: req.query.term,
      });
      await myClassesService.assertHeadOfClass(orgId(req), userId, email, classId, {
        term: body.term,
        academicYear: body.academicYear,
      });
      const link = await resolveTimetableTeacherLink(orgId(req), userId, email);
      const teacherName = link.profile?.teacherName ?? name;
      const data = await classAttendanceService.getOrCreateSession(
        orgId(req),
        userId,
        teacherName,
        { classId, ...body }
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async classAttendanceHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const classId = req.params.classId as string;
      const { userId, email } = teacherContext(req);
      await myClassesService.assertHeadOfClass(orgId(req), userId, email, classId, {
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
      });
      const data = await classAttendanceService.listHistory(orgId(req), classId, userId, {
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async classAttendanceSave(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;
      const { userId } = teacherContext(req);
      const body = saveDraftSchema.parse(req.body);
      const data = await classAttendanceService.saveDraft(orgId(req), sessionId, userId, body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async classAttendanceComplete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;
      const { userId } = teacherContext(req);
      const data = await classAttendanceService.complete(orgId(req), sessionId, userId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
