import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { disciplineCaseService } from '../services/discipline-case.service';
import { studentBalanceService } from '../services/student-balance.service';
import { AppError } from '../middleware/error.middleware';

export const disciplineCaseController = {
  async listService(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineCaseService.list(req.organizationRef!, {
        className: typeof req.query.className === 'string' ? req.query.className : undefined,
        studentCode: typeof req.query.studentCode === 'string' ? req.query.studentCode : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        incidentDate: typeof req.query.incidentDate === 'string' ? req.query.incidentDate : undefined,
        caseType: typeof req.query.caseType === 'string' ? req.query.caseType : undefined,
        markId: typeof req.query.markId === 'string' ? req.query.markId : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async createService(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actor =
        (typeof req.body?.recordedBy === 'string' && req.body.recordedBy) ||
        (typeof req.headers['x-teacher-user-id'] === 'string' && req.headers['x-teacher-user-id']) ||
        'service-integration';
      const data = await disciplineCaseService.create(req.organizationRef!, actor, {
        ...req.body,
        allowMarkOverride: false,
        notifyParent: req.body?.notifyParent ?? true,
        notifyMethods: Array.isArray(req.body?.notifyMethods)
          ? req.body.notifyMethods
          : ['sms', 'email', 'inapp'],
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  /**
   * Service-to-service discipline profile. Returns the learner score/max score
   * from Student Discipline settings so ParentMIS does not hardcode /100.
   */
  async profileService(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const studentCode =
        typeof req.query.studentCode === 'string' ? req.query.studentCode.trim() : '';
      const studentId = typeof req.query.studentId === 'string' ? req.query.studentId.trim() : '';
      if (!studentCode && !studentId) {
        throw new AppError(400, 'studentCode or studentId is required');
      }
      const data = studentCode
        ? await studentBalanceService.getProfileByCode(req.organizationRef!, studentCode)
        : await studentBalanceService.getProfile(req.organizationRef!, studentId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineCaseService.list(req.organizationRef!, {
        className: typeof req.query.className === 'string' ? req.query.className : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        incidentDate: typeof req.query.incidentDate === 'string' ? req.query.incidentDate : undefined,
        caseType: typeof req.query.caseType === 'string' ? req.query.caseType : undefined,
        markId: typeof req.query.markId === 'string' ? req.query.markId : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async seedSamples(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineCaseService.seedSamples(req.organizationRef!, req.user!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const roles = req.user?.roles ?? [];
      const allowMarkOverride = roles.some((r) =>
        ['ORGANIZATION_ADMIN', 'SCHOOL_MANAGER', 'DISCIPLINE_OFFICER', 'organization_admin'].includes(r)
      );
      const data = await disciplineCaseService.create(req.organizationRef!, req.user!.sub, {
        ...req.body,
        allowMarkOverride,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async stats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineCaseService.stats(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineCaseService.update(req.organizationRef!, req.params.id as string, req.body);
      res.json({ success: true, data });
    } catch (e) {
      if ((e as Error).message === 'Case not found') return next(new AppError(404, 'Case not found'));
      next(e);
    }
  },

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineCaseService.remove(req.organizationRef!, req.params.id as string);
      res.json({ success: true, data });
    } catch (e) {
      if ((e as Error).message === 'Case not found') return next(new AppError(404, 'Case not found'));
      next(e);
    }
  },

  async notify(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const methods = Array.isArray(req.body?.notifyMethods) ? req.body.notifyMethods : undefined;
      const data = await disciplineCaseService.notify(req.organizationRef!, req.params.id as string, methods);
      res.json({ success: true, data });
    } catch (e) {
      if ((e as Error).message === 'Case not found') return next(new AppError(404, 'Case not found'));
      next(e);
    }
  },
};
