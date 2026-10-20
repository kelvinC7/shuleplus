import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  approveTeacherPermission,
  listTeacherPermissionRequests,
  rejectTeacherPermission,
} from '../clients/ticha-portal.client';
import { paramOne } from '../utils/params';

function orgId(req: AuthenticatedRequest) {
  return req.organizationRef || req.user?.organizationId || '';
}

export const teacherPermissionController = {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = orgId(req);
      const q = req.query as Record<string, string | undefined>;
      const data = await listTeacherPermissionRequests(organizationId, {
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 20,
        status: q.status,
        permission_type: q.permission_type || q.type,
        q: q.q || q.search,
        date_from: q.date_from || q.dateFrom,
        date_to: q.date_to || q.dateTo,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = orgId(req);
      const reviewedBy = req.user?.email || req.user?.sub || 'academic';
      const notes = typeof req.body?.reviewNotes === 'string' ? req.body.reviewNotes : undefined;
      const data = await approveTeacherPermission(organizationId, paramOne(req.params.id), reviewedBy, notes);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = orgId(req);
      const reviewedBy = req.user?.email || req.user?.sub || 'academic';
      const notes = typeof req.body?.reviewNotes === 'string' ? req.body.reviewNotes.trim() : '';
      if (!notes) {
        return res.status(400).json({ success: false, message: 'Rejection reason is required' });
      }
      const data = await rejectTeacherPermission(organizationId, paramOne(req.params.id), reviewedBy, notes);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
