import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { marksSubmissionService } from '../services/marks-submission.service';

function orgId(req: Request) {
  const r = req as AuthenticatedRequest;
  return r.organizationRef || r.user?.organizationId || '';
}

function actor(req: Request) {
  const r = req as AuthenticatedRequest;
  return { id: r.user?.sub, name: r.user?.email, roles: r.user?.roles || [] };
}

export const marksSubmissionController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query as Record<string, string>;
      const data = await marksSubmissionService.list(orgId(req), {
        academicYear: q.academicYear,
        term: q.term,
        classId: q.classId,
        status: q.status,
        assessmentId: q.assessmentId,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },
  async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await marksSubmissionService.createOrUpdate(orgId(req), actor(req), req.body || {});
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },
  async transition(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await marksSubmissionService.transition(orgId(req), String(req.params.id), actor(req), req.body || {});
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },
};
