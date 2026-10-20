import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  getRoundRollCallAnalytics,
  getRoundRollCallSession,
  listRoundRollCallHistory,
} from '../clients/ticha-portal.client';
import { paramOne } from '../utils/params';

function orgId(req: AuthenticatedRequest) {
  return req.organizationRef || req.user?.organizationId || '';
}

export const roundRollCallController = {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = orgId(req);
      const q = req.query as Record<string, string | undefined>;
      const data = await listRoundRollCallHistory(organizationId, {
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 20,
        class_name: q.class_name || q.className,
        date: q.date,
        date_from: q.date_from || q.dateFrom,
        date_to: q.date_to || q.dateTo,
        academic_year: q.academic_year || q.academicYear,
        q: q.q || q.search,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async session(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = orgId(req);
      const data = await getRoundRollCallSession(organizationId, paramOne(req.params.sessionId));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async analytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = orgId(req);
      const q = req.query as Record<string, string | undefined>;
      const data = await getRoundRollCallAnalytics(organizationId, {
        class_name: q.class_name || q.className,
        date: q.date,
        date_from: q.date_from || q.dateFrom,
        date_to: q.date_to || q.dateTo,
        academic_year: q.academic_year || q.academicYear,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
