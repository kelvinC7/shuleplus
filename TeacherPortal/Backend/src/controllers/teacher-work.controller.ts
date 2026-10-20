import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import * as work from '../services/teacher-work.service';

function orgId(req: AuthenticatedRequest) {
  const id = req.organizationRef ?? req.user?.organizationId;
  if (!id) throw new AppError(401, 'Missing organization context');
  return id;
}

function userId(req: AuthenticatedRequest) {
  const id = req.user?.sub;
  if (!id) throw new AppError(401, 'Authentication required');
  return id;
}

export const teacherWorkController = {
  async attendanceSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await work.myAttendanceSummary(orgId(req), userId(req), {
        month: req.query.month ? Number(req.query.month) : undefined,
        year: req.query.year ? Number(req.query.year) : undefined,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async attendanceHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await work.myAttendanceHistory(orgId(req), userId(req), {
        month: req.query.month ? Number(req.query.month) : undefined,
        year: req.query.year ? Number(req.query.year) : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async attendanceToday(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await work.myAttendanceToday(orgId(req), userId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async createCorrection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await work.createAttendanceCorrection(orgId(req), userId(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async listCorrections(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await work.listAttendanceCorrections(orgId(req), userId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async permissionSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await work.permissionSummary(orgId(req), userId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async listPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await work.listPermissions(orgId(req), userId(req), {
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        type: typeof req.query.type === 'string' ? req.query.type : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async createPermission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await work.createPermission(orgId(req), userId(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async permissionTypes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: work.permissionTypeOptions() });
    } catch (e) {
      next(e);
    }
  },

  async calendarEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await work.listCalendarEvents(orgId(req), userId(req), {
        start: typeof req.query.start === 'string' ? req.query.start : undefined,
        end: typeof req.query.end === 'string' ? req.query.end : undefined,
        eventType: typeof req.query.eventType === 'string' ? req.query.eventType : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        myEventsOnly: req.query.myEventsOnly === 'true',
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async calendarEventGet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await work.getCalendarEvent(orgId(req), String(req.params.eventId));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
