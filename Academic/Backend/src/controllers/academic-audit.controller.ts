import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { academicAuditService } from '../services/academic-audit.service';

function orgId(req: Request) {
  const r = req as AuthenticatedRequest;
  return r.organizationRef || r.user?.organizationId || '';
}

export const academicAuditController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query as Record<string, string>;
      const data = await academicAuditService.list(orgId(req), {
        entityType: q.entityType,
        entityId: q.entityId,
        batchId: q.batchId,
        limit: q.limit ? Number(q.limit) : undefined,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },
  async listOutbox(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query as Record<string, string>;
      const data = await academicAuditService.listOutbox(orgId(req), q.limit ? Number(q.limit) : 100);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },
};
