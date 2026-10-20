import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';
import * as smart from '../services/smart.service';
import { assignmentService } from '../services/assignment.service';
import { classConfigService } from '../services/class-config.service';
import { courseConfigService } from '../services/course-config.service';
import { teacherProfileService } from '../services/teacher-profile.service';
import { teacherAccountService } from '../services/teacher-account.service';
import { smartAccessStaffService } from '../services/smart-access-staff.service';
import { getParentStudentWeek, listClassTeachers } from '../services/parent-read.service';

/** Service-to-service (Teacher Portal) — bypasses JWT module license checks. */
function qStr(req: Request, key: string) {
  return typeof req.query[key] === 'string' ? req.query[key] : undefined;
}

export const internalSmartController = {
  async teacherToday(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      const teacherUserId = String(req.query.teacherUserId ?? '');
      if (!organizationId || !teacherUserId) {
        throw new AppError(400, 'organizationId and teacherUserId are required');
      }
      res.json({
        success: true,
        data: await smart.teacherToday(organizationId, teacherUserId, {
          term: qStr(req, 'term'),
          academicYear: qStr(req, 'academicYear'),
          email: qStr(req, 'email'),
          teacherName: qStr(req, 'teacherName'),
          date: qStr(req, 'date'),
        }),
      });
    } catch (e) {
      next(e);
    }
  },

  async teacherSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      const teacherUserId = String(req.query.teacherUserId ?? '');
      if (!organizationId || !teacherUserId) {
        throw new AppError(400, 'organizationId and teacherUserId are required');
      }
      res.json({
        success: true,
        data: await smart.teacherSchedule(organizationId, teacherUserId, {
          term: qStr(req, 'term'),
          academicYear: qStr(req, 'academicYear'),
          view: qStr(req, 'view') || 'weekly',
          className: qStr(req, 'className'),
          day: qStr(req, 'day'),
          course: qStr(req, 'course'),
          email: qStr(req, 'email'),
          teacherName: qStr(req, 'teacherName'),
        }),
      });
    } catch (e) {
      next(e);
    }
  },

  async startLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.body.organizationId ?? '');
      const teacherUserId = String(req.body.teacherUserId ?? '');
      const teacherName = String(req.body.teacherName ?? 'Teacher');
      if (!organizationId || !teacherUserId) {
        throw new AppError(400, 'organizationId and teacherUserId are required');
      }
      const data = await smart.startLesson(organizationId, teacherUserId, teacherName, {
        timetableId: String(req.body.timetableId ?? ''),
        qrCode: req.body.qrCode,
        device: req.body.device,
        location: req.body.location,
        skipQr: Boolean(req.body.skipQr),
        email: req.body.email,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async scanQr(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.body.organizationId ?? '');
      const teacherUserId = String(req.body.teacherUserId ?? '');
      const teacherName = String(req.body.teacherName ?? 'Teacher');
      const qrCode = String(req.body.qrCode ?? '');
      if (!organizationId || !teacherUserId || !qrCode) {
        throw new AppError(400, 'organizationId, teacherUserId and qrCode are required');
      }
      const data = await smart.scanClassroomQr(organizationId, teacherUserId, teacherName, qrCode, {
        device: req.body.device,
        location: req.body.location,
        email: typeof req.body.email === 'string' ? req.body.email : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async attendanceGet(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      const teacherUserId =
        typeof req.query.teacherUserId === 'string' ? req.query.teacherUserId : undefined;
      if (!organizationId) throw new AppError(400, 'organizationId is required');
      res.json({
        success: true,
        data: await smart.getAttendance(
          organizationId,
          String(req.params.sessionId),
          teacherUserId,
          typeof req.query.email === 'string' ? req.query.email : undefined
        ),
      });
    } catch (e) {
      next(e);
    }
  },

  async attendanceHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      const teacherUserId = String(req.query.teacherUserId ?? '');
      if (!organizationId || !teacherUserId) {
        throw new AppError(400, 'organizationId and teacherUserId are required');
      }
      res.json({
        success: true,
        data: await smart.attendanceHistory(organizationId, teacherUserId, {
          term: typeof req.query.term === 'string' ? req.query.term : undefined,
          academicYear:
            typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
          email: qStr(req, 'email'),
          teacherName: qStr(req, 'teacherName'),
          limit: req.query.limit ? Number(req.query.limit) : undefined,
        }),
      });
    } catch (e) {
      next(e);
    }
  },

  async checkInHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      const teacherUserId = String(req.query.teacherUserId ?? '');
      if (!organizationId || !teacherUserId) {
        throw new AppError(400, 'organizationId and teacherUserId are required');
      }
      res.json({
        success: true,
        data: await smart.teacherCheckInHistory(organizationId, teacherUserId, {
          term: typeof req.query.term === 'string' ? req.query.term : undefined,
          academicYear:
            typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
          email: qStr(req, 'email'),
          teacherName: qStr(req, 'teacherName'),
          date: qStr(req, 'date'),
          limit: req.query.limit ? Number(req.query.limit) : undefined,
        }),
      });
    } catch (e) {
      next(e);
    }
  },

  async attendanceSave(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.body.organizationId ?? '');
      const teacherUserId = String(req.body.teacherUserId ?? '');
      if (!organizationId || !teacherUserId) {
        throw new AppError(400, 'organizationId and teacherUserId are required');
      }
      const rows = (req.body.rows ?? req.body.students ?? []) as Array<Record<string, unknown>>;
      const data = await smart.saveAttendance(
        organizationId,
        String(req.params.sessionId),
        teacherUserId,
        rows as never,
        {
          submit: Boolean(req.body.submit),
          email: typeof req.body.email === 'string' ? req.body.email : undefined,
        }
      );
      const session = await smart.getAttendance(
        organizationId,
        String(req.params.sessionId),
        teacherUserId,
        typeof req.body.email === 'string' ? req.body.email : undefined
      );
      res.json({
        success: true,
        data: {
          rows: data,
          session: session.session,
          reference: session.session.attendanceReference,
          submittedAt: session.session.attendanceSubmittedAt,
        },
      });
    } catch (e) {
      next(e);
    }
  },

  async completeLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.body.organizationId ?? '');
      const teacherUserId = String(req.body.teacherUserId ?? '');
      if (!organizationId || !teacherUserId) {
        throw new AppError(400, 'organizationId and teacherUserId are required');
      }
      const data = await smart.completeLesson(
        organizationId,
        String(req.params.sessionId),
        teacherUserId,
        req.body
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async teacherAccountProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      const teacherUserId = String(req.query.teacherUserId ?? '');
      if (!organizationId || !teacherUserId) {
        throw new AppError(400, 'organizationId and teacherUserId are required');
      }
      res.json({
        success: true,
        data: await smart.teacherAccountProfile(
          organizationId,
          teacherUserId,
          typeof req.query.email === 'string' ? req.query.email : undefined
        ),
      });
    } catch (e) {
      next(e);
    }
  },

  async listStaffForSmartAccess(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      if (!organizationId) {
        throw new AppError(400, 'organizationId is required');
      }
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const data = await smartAccessStaffService.listForSmartAccess(organizationId, { search });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateStaffIdentity(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      const id = String(req.params.id ?? '');
      if (!organizationId || !id) {
        throw new AppError(400, 'organizationId and staff id are required');
      }
      const data = await smartAccessStaffService.updateIdentity(organizationId, id, req.body ?? {});
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async lookupRfidOwner(req: Request, res: Response, next: NextFunction) {
    try {
      const rfidUid = String(req.query.rfidUid ?? '').trim();
      if (!rfidUid) {
        throw new AppError(400, 'rfidUid is required');
      }
      const data = await smartAccessStaffService.lookupRfidOwner(rfidUid);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async teacherProfiles(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      if (!organizationId) {
        throw new AppError(400, 'organizationId is required');
      }
      const profiles = await teacherProfileService.list(organizationId);
      const data = await teacherAccountService.enrichProfiles(organizationId, profiles);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async upsertTeacherFromIam(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.body?.organizationId ?? '');
      const teacherUserId = String(req.body?.iamUserId ?? req.body?.teacherUserId ?? '').trim();
      const teacherName = String(req.body?.fullName ?? req.body?.teacherName ?? '').trim();
      if (!organizationId || !teacherUserId || !teacherName) {
        throw new AppError(400, 'organizationId, iamUserId and fullName are required');
      }
      const data = await teacherProfileService.upsert(organizationId, {
        teacherUserId,
        teacherName,
        employeeNumber:
          typeof req.body?.employeeNumber === 'string'
            ? req.body.employeeNumber
            : typeof req.body?.employeeId === 'string'
              ? req.body.employeeId
              : null,
        portalEnabled: true,
        loginMethod: req.body?.phone ? 'both' : 'email',
        loginEmail: typeof req.body?.email === 'string' ? req.body.email : null,
        loginPhone: typeof req.body?.phone === 'string' ? req.body.phone : null,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async teacherAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      const teacherUserId = String(req.query.teacherUserId ?? '');
      if (!organizationId || !teacherUserId) {
        throw new AppError(400, 'organizationId and teacherUserId are required');
      }
      const data = await assignmentService.list(organizationId, {
        teacherUserId,
        email: qStr(req, 'email'),
        teacherName: qStr(req, 'teacherName'),
        term: qStr(req, 'term'),
        academicYear: qStr(req, 'academicYear'),
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async courseConfigFlags(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      if (!organizationId) throw new AppError(400, 'organizationId is required');
      const rows = await courseConfigService.list(organizationId);
      res.json({
        success: true,
        data: rows.map((c) => ({
          subjectName: c.subjectName,
          isCore: c.isCore !== false,
        })),
      });
    } catch (e) {
      next(e);
    }
  },

  async courseConfigCatalog(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      if (!organizationId) throw new AppError(400, 'organizationId is required');
      const rows = await courseConfigService.list(organizationId);
      res.json({
        success: true,
        data: rows.map((c) => ({
          id: c.id,
          subjectName: c.subjectName,
          courseCode: c.courseCode,
          isCore: c.isCore !== false,
          periodsPerWeek: c.periodsPerWeek,
          priority: c.priority,
          color: c.color,
          requiresLab: c.requiresLab,
          prefersDoublePeriod: c.prefersDoublePeriod,
        })),
      });
    } catch (e) {
      next(e);
    }
  },

  async classConfigCatalog(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      const term = typeof req.query.term === 'string' ? req.query.term : 'Term 1';
      const academicYear =
        typeof req.query.academicYear === 'string'
          ? req.query.academicYear
          : typeof req.query.academic_year === 'string'
            ? req.query.academic_year
            : `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
      if (!organizationId) throw new AppError(400, 'organizationId is required');
      const data = await classConfigService.catalog(organizationId, term, academicYear);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async parentStudentWeek(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      const studentCode = String(req.query.studentCode ?? '');
      const className = String(req.query.className ?? '');
      const from = String(req.query.from ?? '');
      const to = String(req.query.to ?? '');
      if (!organizationId || !studentCode || !className || !from || !to) {
        throw new AppError(
          400,
          'organizationId, studentCode, className, from and to are required'
        );
      }
      const data = await getParentStudentWeek({
        organizationId,
        studentCode,
        className,
        from,
        to,
        term: qStr(req, 'term'),
        academicYear: qStr(req, 'academicYear') ?? qStr(req, 'academic_year'),
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async classTeachers(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      const className = String(req.query.className ?? '');
      if (!organizationId || !className) {
        throw new AppError(400, 'organizationId and className are required');
      }
      const data = await listClassTeachers({
        organizationId,
        className,
        term: qStr(req, 'term'),
        academicYear: qStr(req, 'academicYear') ?? qStr(req, 'academic_year'),
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
