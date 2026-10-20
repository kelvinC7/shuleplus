import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { fetchSmClasses, fetchSmStudents, fetchSmParents } from '../clients/student-management.client';
import { disciplineMarkService } from '../services/discipline-mark.service';
import { disciplineCaseService } from '../services/discipline-case.service';
import { studentBalanceService } from '../services/student-balance.service';

function canAdjustMarks(req: AuthenticatedRequest) {
  const roles = req.user?.roles ?? [];
  return roles.some((r) =>
    ['ORGANIZATION_ADMIN', 'SCHOOL_MANAGER', 'DISCIPLINE_OFFICER', 'organization_admin'].includes(r)
  );
}

export const disciplineMarkController = {
  async listService(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineMarkService.list(req.organizationRef!, {
        type: typeof req.query.type === 'string' ? req.query.type : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineMarkService.list(req.organizationRef!, {
        type: typeof req.query.type === 'string' ? req.query.type : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async stats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineMarkService.stats(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async seedDefaults(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineMarkService.ensureDefaults(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineMarkService.create(req.organizationRef!, req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineMarkService.update(req.organizationRef!, req.params.id as string, req.body);
      res.json({ success: true, data });
    } catch (e) {
      if ((e as Error).message === 'Mark not found') return next(new AppError(404, 'Mark not found'));
      next(e);
    }
  },

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineMarkService.remove(req.organizationRef!, req.params.id as string);
      res.json({ success: true, data });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'Mark not found') return next(new AppError(404, msg));
      if (msg.includes('used in cases')) return next(new AppError(400, msg));
      next(e);
    }
  },
};

export const integrationController = {
  async classes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await fetchSmClasses(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async students(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await fetchSmStudents(req.organizationRef!, {
        classId: typeof req.query.classId === 'string' ? req.query.classId : undefined,
        className: typeof req.query.className === 'string' ? req.query.className : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async studentProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const studentId = req.params.studentId as string;
      const profile = await studentBalanceService.getProfile(req.organizationRef!, studentId);
      res.json({ success: true, data: profile });
    } catch (e) {
      next(e);
    }
  },

  async studentParents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const studentId = req.params.studentId as string;
      const data = await fetchSmParents(req.organizationRef!, studentId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async previewScore(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { studentId, appliedPoints } = req.body as { studentId: string; appliedPoints: number };
      const data = await disciplineCaseService.previewScore(req.organizationRef!, studentId, appliedPoints);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};

export { canAdjustMarks };
