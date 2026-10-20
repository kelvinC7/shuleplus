import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { departmentService } from '../services/department.service';

export class DepartmentController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await departmentService.seedDefaults(req.organizationRef!);
      const data = await departmentService.list(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const departmentController = new DepartmentController();
