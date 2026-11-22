import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  activatePurchaseOnce,
  getAdminPurchaseStats,
  listParentPurchasesForAdmin,
  rejectParentPurchase,
} from '../services/sms/parent-sms-packages.service';

export const parentSmsAdminController = {
  async stats(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await getAdminPurchaseStats();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const bucketRaw = typeof req.query.bucket === 'string' ? req.query.bucket : undefined;
      const bucket = z.enum(['review', 'awaiting_payment', 'recent', 'all']).optional().parse(bucketRaw);
      const organizationId =
        typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const data = await listParentPurchasesForAdmin({ bucket, organizationId, search });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const purchaseId = String(req.params.purchaseId);
      const adminId =
        typeof req.headers['x-admin-id'] === 'string'
          ? req.headers['x-admin-id']
          : typeof req.body?.adminId === 'string'
            ? req.body.adminId
            : 'super-admin';
      await activatePurchaseOnce(purchaseId, adminId);
      res.json({ success: true, data: { activated: true, purchaseId } });
    } catch (e) {
      next(e);
    }
  },

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const purchaseId = String(req.params.purchaseId);
      const { reason, adminId } = z
        .object({
          reason: z.string().min(3),
          adminId: z.string().optional(),
        })
        .parse(req.body);
      const verifier =
        adminId ??
        (typeof req.headers['x-admin-id'] === 'string' ? req.headers['x-admin-id'] : 'super-admin');
      const data = await rejectParentPurchase(purchaseId, reason, verifier);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
