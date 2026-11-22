import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  fetchClassesList,
  fetchStudentsList,
  isStudentManagementConfigured,
} from '../clients/student-management.client';
export class StudentsController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      const search = typeof req.query.q === 'string' ? req.query.q : undefined;
      const className = typeof req.query.className === 'string' ? req.query.className : undefined;
      const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;

      if (!isStudentManagementConfigured()) {
        res.json({
          success: true,
          data: [],
          meta: { studentManagement: false, message: 'Student Management API is not configured' },
        });
        return;
      }

      const data = await fetchStudentsList(organizationId, { search, className, classId });
      res.json({ success: true, data, meta: { studentManagement: true, count: data.length } });
    } catch (error) {
      next(error);
    }
  }

  async classes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      if (!isStudentManagementConfigured()) {
        res.json({ success: true, data: [], meta: { studentManagement: false } });
        return;
      }
      const data = await fetchClassesList(organizationId);
      res.json({ success: true, data, meta: { studentManagement: true } });
    } catch (error) {
      next(error);
    }
  }
}

export const studentsController = new StudentsController();
