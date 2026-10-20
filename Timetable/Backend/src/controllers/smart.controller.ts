import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import * as smart from '../services/smart.service';

function orgId(req: AuthenticatedRequest) {
  const id = req.organizationRef ?? req.user?.organizationId;
  if (!id) throw new AppError(401, 'Missing organization context');
  return id;
}

function teacher(req: AuthenticatedRequest) {
  return {
    id: req.user!.sub,
    name: req.user!.email?.split('@')[0] ?? 'Teacher',
    email: req.user!.email,
  };
}

export const smartController = {
  async settingsGet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await smart.getOrCreateSettings(orgId(req)) });
    } catch (e) {
      next(e);
    }
  },

  async settingsPut(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await smart.updateSettings(orgId(req), req.body) });
    } catch (e) {
      next(e);
    }
  },

  async classrooms(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await smart.listClassrooms(orgId(req)) });
    } catch (e) {
      next(e);
    }
  },

  async classroomUpsert(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json({ success: true, data: await smart.upsertClassroom(orgId(req), req.body) });
    } catch (e) {
      next(e);
    }
  },

  async teacherToday(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const t = teacher(req);
      const teacherId =
        typeof req.query.teacherUserId === 'string' ? req.query.teacherUserId : t.id;
      res.json({
        success: true,
        data: await smart.teacherToday(orgId(req), teacherId, {
          term: typeof req.query.term === 'string' ? req.query.term : undefined,
          academicYear:
            typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
          email: t.email,
        }),
      });
    } catch (e) {
      next(e);
    }
  },

  async teacherSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const t = teacher(req);
      res.json({
        success: true,
        data: await smart.teacherSchedule(orgId(req), t.id, {
          term: typeof req.query.term === 'string' ? req.query.term : undefined,
          academicYear:
            typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
          view: typeof req.query.view === 'string' ? req.query.view : 'weekly',
          className: typeof req.query.className === 'string' ? req.query.className : undefined,
          day: typeof req.query.day === 'string' ? req.query.day : undefined,
          course: typeof req.query.course === 'string' ? req.query.course : undefined,
          email: t.email,
        }),
      });
    } catch (e) {
      next(e);
    }
  },

  async startLesson(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const t = teacher(req);
      const data = await smart.startLesson(orgId(req), t.id, t.name, {
        timetableId: String(req.body.timetableId ?? req.params.timetableId),
        qrCode: req.body.qrCode,
        device: req.body.device,
        location: req.body.location,
        skipQr: Boolean(req.body.skipQr),
        email: t.email,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async scanQr(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const t = teacher(req);
      const qrCode = String(req.body.qrCode ?? '');
      if (!qrCode) throw new AppError(400, 'qrCode is required');
      const data = await smart.scanClassroomQr(orgId(req), t.id, t.name, qrCode, {
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
      res.json({
        success: true,
        data: await smart.getAttendance(orgId(req), String(req.params.sessionId)),
      });
    } catch (e) {
      next(e);
    }
  },

  async attendanceSave(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const t = teacher(req);
      const rows = (req.body.rows ?? req.body.students ?? []) as Array<Record<string, unknown>>;
      const data = await smart.saveAttendance(
        orgId(req),
        String(req.params.sessionId),
        t.id,
        rows as never
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async completeLesson(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const t = teacher(req);
      res.json({
        success: true,
        data: await smart.completeLesson(
          orgId(req),
          String(req.params.sessionId),
          t.id,
          req.body
        ),
      });
    } catch (e) {
      next(e);
    }
  },

  async liveMonitor(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: await smart.liveMonitor(orgId(req), {
          term: typeof req.query.term === 'string' ? req.query.term : undefined,
          academicYear:
            typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        }),
      });
    } catch (e) {
      next(e);
    }
  },

  async liveHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: await smart.liveHistory(orgId(req), {
          term: typeof req.query.term === 'string' ? req.query.term : undefined,
          academicYear:
            typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
          date: typeof req.query.date === 'string' ? req.query.date : undefined,
          className: typeof req.query.className === 'string' ? req.query.className : undefined,
          teacherName: typeof req.query.teacherName === 'string' ? req.query.teacherName : undefined,
          status: typeof req.query.status === 'string' ? req.query.status : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
        }),
      });
    } catch (e) {
      next(e);
    }
  },

  async livePeriodReplay(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const date = typeof req.query.date === 'string' ? req.query.date : '';
      const periodLabel = typeof req.query.periodLabel === 'string' ? req.query.periodLabel : '';
      if (!date || !periodLabel) {
        throw new AppError(400, 'date and periodLabel are required');
      }
      res.json({
        success: true,
        data: await smart.livePeriodReplay(orgId(req), {
          date,
          periodLabel,
          term: typeof req.query.term === 'string' ? req.query.term : undefined,
          academicYear:
            typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        }),
      });
    } catch (e) {
      next(e);
    }
  },

  async analytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const teacherUserId =
        typeof req.query.teacherUserId === 'string' ? req.query.teacherUserId : undefined;
      res.json({
        success: true,
        data: await smart.teacherAnalytics(orgId(req), teacherUserId),
      });
    } catch (e) {
      next(e);
    }
  },

  async notifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const audience = typeof req.query.audience === 'string' ? req.query.audience : undefined;
      res.json({
        success: true,
        data: await smart.listNotifications(orgId(req), audience),
      });
    } catch (e) {
      next(e);
    }
  },

  async academicClasses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const term = typeof req.query.term === 'string' ? req.query.term : undefined;
      const academicYear =
        typeof req.query.academic_year === 'string'
          ? req.query.academic_year
          : typeof req.query.academicYear === 'string'
            ? req.query.academicYear
            : undefined;
      res.json({
        success: true,
        data: await smart.listAcademicClasses(orgId(req), { term, academicYear }),
      });
    } catch (e) {
      next(e);
    }
  },

  async academicStudents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: await smart.listAcademicStudents(orgId(req), {
          classId: typeof req.query.classId === 'string' ? req.query.classId : undefined,
          className: typeof req.query.className === 'string' ? req.query.className : undefined,
          academicYear:
            typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        }),
      });
    } catch (e) {
      next(e);
    }
  },

  async classQrList(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await smart.listClassQrCodes(orgId(req)) });
    } catch (e) {
      next(e);
    }
  },

  async classQrSync(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await smart.syncClassQrCodes(orgId(req)) });
    } catch (e) {
      next(e);
    }
  },

  async publicClassQr(req: Request, res: Response, next: NextFunction) {
    try {
      const code = String(req.params.code ?? '');
      res.json({ success: true, data: await smart.getPublicClassQrInfo(code) });
    } catch (e) {
      next(e);
    }
  },
};
