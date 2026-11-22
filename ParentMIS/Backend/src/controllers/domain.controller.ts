import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { academicService } from '../services/academic.service';
import { reportCardService } from '../services/report-card.service';
import { attendanceService } from '../services/attendance.service';
import { feesService } from '../services/fees.service';
import { walletService } from '../services/wallet.service';
import { profileService } from '../services/profile.service';
import { timetableService } from '../services/timetable.service';
import { timelineService } from '../services/timeline.service';
import { getRequestedStudent } from '../utils/student-param';

export class ReportCardController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const academicYear =
        typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
      const term = typeof req.query.term === 'string' ? req.query.term : undefined;
      const data = await reportCardService.listForParent(
        req.organizationRef!,
        req.user!.sub,
        getRequestedStudent(req),
        { academicYear, term }
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async view(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const classId = String(req.query.classId ?? '');
      const academicYear = String(req.query.academicYear ?? '');
      const term = String(req.query.term ?? '');
      const rk = String(req.query.reportKind ?? '').toLowerCase();
      const reportKind =
        rk === 'midterm' ? ('midterm' as const) : rk === 'beginning' ? ('beginning' as const) : ('standard' as const);
      if (!classId || !academicYear || !term) {
        res.status(400).json({ success: false, message: 'classId, academicYear, term required' });
        return;
      }
      const data = await reportCardService.getReport(
        req.organizationRef!,
        req.user!.sub,
        getRequestedStudent(req),
        { classId, academicYear, term, reportKind }
      );
      const report = (data as { report?: unknown }).report ?? data;
      res.json({ success: true, data: { report } });
    } catch (error) {
      next(error);
    }
  }
}

export class AcademicController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const academicYear =
        typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
      const term = typeof req.query.term === 'string' ? req.query.term : undefined;
      const data = await academicService.list(
        req.organizationRef!,
        req.user!.sub,
        getRequestedStudent(req),
        { academicYear, term }
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async coursePerformance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const academicYear =
        typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
      const term = typeof req.query.term === 'string' ? req.query.term : undefined;
      const subject = typeof req.query.subject === 'string' ? req.query.subject : undefined;
      const data = await academicService.getCoursePerformance(
        req.organizationRef!,
        req.user!.sub,
        getRequestedStudent(req),
        { academicYear, term, subject }
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export class AttendanceController {
  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await attendanceService.getSummary(req.organizationRef!, req.user!.sub, getRequestedStudent(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async reportAbsence(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await attendanceService.reportAbsence(
        req.organizationRef!,
        req.user!.sub,
        req.body,
        getRequestedStudent(req)
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async reportFromParent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as { date?: string; reason?: string; kind?: 'ABSENT' | 'LATE'; detail?: string };
      const data = await attendanceService.reportFromParent(
        req.organizationRef!,
        req.user!.sub,
        {
          date: body.date ?? '',
          reason: body.reason ?? '',
          kind: body.kind,
          detail: body.detail,
        },
        getRequestedStudent(req)
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listParentReportsService(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { parentAttendanceReportService } = await import('../services/parent-attendance-report.service');
      const org =
        (typeof req.query.organizationId === 'string' ? req.query.organizationId : '') ||
        req.organizationRef ||
        '';
      const className = String(req.query.className ?? '');
      const data = await parentAttendanceReportService.listForClass({
        organizationId: org,
        className,
        from: typeof req.query.from === 'string' ? req.query.from : undefined,
        to: typeof req.query.to === 'string' ? req.query.to : undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export class FeesController {
  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feesService.getSummary(req.organizationRef!, req.user!.sub, getRequestedStudent(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async transactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const requested = getRequestedStudent(req);
      const data = await feesService.getTransactions(req.organizationRef!, req.user!.sub, {
        studentId: requested.studentId,
        studentCode: requested.studentCode,
        academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
        term: req.query.term ? String(req.query.term) : undefined,
        allChildren: req.query.allChildren ? String(req.query.allChildren) : undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async receipt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feesService.getReceipt(String(req.params.receiptNumber));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export class WalletController {
  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await walletService.getSummary(req.organizationRef!, req.user!.sub, getRequestedStudent(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async topUp(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await walletService.topUp(req.organizationRef!, req.user!.sub, req.body, getRequestedStudent(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export class ProfileController {
  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await profileService.get(req.organizationRef!, req.user!.sub, getRequestedStudent(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export class TimetableController {
  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;
      const term = typeof req.query.term === 'string' ? req.query.term : undefined;
      const academicYear =
        typeof req.query.academicYear === 'string'
          ? req.query.academicYear
          : typeof req.query.academic_year === 'string'
            ? req.query.academic_year
            : undefined;
      const data = await timetableService.get(
        req.organizationRef!,
        req.user!.sub,
        getRequestedStudent(req),
        { from, to, term, academicYear }
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export class TimelineController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await timelineService.list(req.organizationRef!, req.user!.sub, getRequestedStudent(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const reportCardController = new ReportCardController();
export const academicController = new AcademicController();
export const attendanceController = new AttendanceController();
export const feesController = new FeesController();
export const walletController = new WalletController();
export const profileController = new ProfileController();
export const timetableController = new TimetableController();
export const timelineController = new TimelineController();
