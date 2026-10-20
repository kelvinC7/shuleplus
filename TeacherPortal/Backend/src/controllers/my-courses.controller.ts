import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { myCoursesService } from '../services/my-courses.service';

function orgId(req: AuthenticatedRequest) {
  const id = req.organizationRef ?? req.user?.organizationId;
  if (!id) throw new AppError(401, 'Missing organization context');
  return id;
}

function teacherContext(req: AuthenticatedRequest) {
  const userId = req.user?.sub;
  if (!userId) throw new AppError(401, 'Authentication required');
  return {
    userId,
    email: req.user?.email ?? null,
  };
}

export const myCoursesController = {
  async academicContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await myCoursesService.academicContext(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, email } = teacherContext(req);
      const data = await myCoursesService.listForTeacher(orgId(req), userId, email, {
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
