import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { defaultAcademicSettings, fetchIamAcademicSettings } from '../clients/iam.client';
import * as timetable from '../clients/timetable.client';

function orgId(req: AuthenticatedRequest) {
  const id = req.organizationRef ?? req.user?.organizationId;
  if (!id) throw new AppError(401, 'Missing organization context');
  return id;
}

function teacher(req: AuthenticatedRequest) {
  const user = req.user!;
  return {
    id: user.sub,
    email: user.email,
    name: user.email?.split('@')[0] ?? 'Teacher',
  };
}

export const timetableController = {
  async academicSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data =
        (await fetchIamAcademicSettings(orgId(req))) ?? defaultAcademicSettings();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async teacherToday(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const t = teacher(req);
      const data = await timetable.fetchTeacherToday({
        organizationId: orgId(req),
        teacherUserId: t.id,
        email: t.email,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        academicYear:
          typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async teacherSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const t = teacher(req);
      const data = await timetable.fetchTeacherSchedule({
        organizationId: orgId(req),
        teacherUserId: t.id,
        email: t.email,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        academicYear:
          typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        view: typeof req.query.view === 'string' ? req.query.view : 'weekly',
        className: typeof req.query.className === 'string' ? req.query.className : undefined,
        day: typeof req.query.day === 'string' ? req.query.day : undefined,
        course: typeof req.query.course === 'string' ? req.query.course : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async startLesson(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const t = teacher(req);
      const data = await timetable.startLesson({
        organizationId: orgId(req),
        teacherUserId: t.id,
        teacherName: t.name,
        email: t.email,
        ...req.body,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async scanQr(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const t = teacher(req);
      const data = await timetable.scanClassroomQr({
        organizationId: orgId(req),
        teacherUserId: t.id,
        teacherName: t.name,
        email: t.email,
        qrCode: req.body.qrCode,
        device: req.body.device,
        location: req.body.location,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async attendanceGet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const t = teacher(req);
      const data = await timetable.fetchLessonAttendance(
        orgId(req),
        String(req.params.sessionId),
        t.id,
        t.email
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async attendanceHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const t = teacher(req);
      const data = await timetable.fetchAttendanceHistory({
        organizationId: orgId(req),
        teacherUserId: t.id,
        email: t.email,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        academicYear:
          typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async checkInHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const t = teacher(req);
      const data = await timetable.fetchCheckInHistory({
        organizationId: orgId(req),
        teacherUserId: t.id,
        email: t.email,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        academicYear:
          typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async attendanceSave(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const t = teacher(req);
      const rows = (req.body.rows ?? req.body.students ?? []) as unknown[];
      const data = await timetable.saveLessonAttendance(
        orgId(req),
        t.id,
        String(req.params.sessionId),
        rows,
        Boolean(req.body.submit),
        t.email
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async completeLesson(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const t = teacher(req);
      const data = await timetable.completeLesson(
        orgId(req),
        t.id,
        String(req.params.sessionId),
        req.body
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
