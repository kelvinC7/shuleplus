import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { permissionService } from '../services/permission.service';

export const permissionController = {
  async stats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await permissionService.stats(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await permissionService.list(req.organizationRef!, {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        className: typeof req.query.className === 'string' ? req.query.className : undefined,
        permissionType: typeof req.query.permissionType === 'string' ? req.query.permissionType : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        dateFilter: typeof req.query.dateFilter === 'string' ? req.query.dateFilter : undefined,
        from: typeof req.query.from === 'string' ? req.query.from : undefined,
        to: typeof req.query.to === 'string' ? req.query.to : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async listService(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await permissionService.serviceList(req.organizationRef!, {
        studentCode: typeof req.query.studentCode === 'string' ? req.query.studentCode : undefined,
        studentId: typeof req.query.studentId === 'string' ? req.query.studentId : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await permissionService.getById(req.organizationRef!, req.params.id as string);
      res.json({ success: true, data });
    } catch (e) {
      if ((e as Error).message === 'Permission request not found') return next(new AppError(404, 'Not found'));
      next(e);
    }
  },

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await permissionService.create(req.organizationRef!, req.user!.sub, req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async action(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const action = req.params.action as 'approve' | 'reject' | 'cancel' | 'checkout' | 'return';
      const data = await permissionService.updateStatus(req.organizationRef!, req.params.id as string, action, {
        name: req.user?.email?.split('@')[0],
        role: req.user?.roles?.[0],
        notes: typeof req.body?.notes === 'string' ? req.body.notes : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      if ((e as Error).message === 'Permission request not found') return next(new AppError(404, 'Not found'));
      next(e);
    }
  },
};
