import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createParentPurchase,
  getParentPortalConfig,
  getParentUsageSummary,
  listParentMessages,
  listParentPurchases,
  submitParentPayment,
} from '../services/sms/parent-sms-packages.service';

const configQuerySchema = z.object({
  parentId: z.string().min(1),
  organizationId: z.string().min(1),
  parentPhone: z.string().optional(),
});

const summaryQuerySchema = z.object({
  parentId: z.string().min(1),
  parentPhone: z.string().min(9),
  phones: z.string().optional(),
});

const purchaseSchema = z.object({
  parentId: z.string().min(1),
  parentPhone: z.string().min(9),
  payerPhone: z.string().min(9),
  allocation: z.enum(['CHILD', 'FAMILY']).default('CHILD'),
  lines: z
    .array(
      z.object({
        studentId: z.string().min(1),
        studentName: z.string().min(1),
        studentCode: z.string().optional(),
        className: z.string().optional(),
        schoolName: z.string().optional(),
        organizationId: z.string().min(1),
        packageId: z.string().min(1),
      })
    )
    .min(1),
});

export const parentSmsPackagesController = {
  async config(req: Request, res: Response, next: NextFunction) {
    try {
      const q = configQuerySchema.parse(req.query);
      const data = await getParentPortalConfig(q.organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const q = summaryQuerySchema.parse(req.query);
      const phones = q.phones ? q.phones.split(',').map((s) => s.trim()) : [q.parentPhone];
      const data = await getParentUsageSummary(q.parentId, phones);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async purchases(req: Request, res: Response, next: NextFunction) {
    try {
      const parentId = z.string().min(1).parse(req.query.parentId);
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const data = await listParentPurchases(parentId, status);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async messages(req: Request, res: Response, next: NextFunction) {
    try {
      const parentId = z.string().min(1).parse(req.query.parentId);
      const phonesRaw = z.string().min(9).parse(req.query.phones ?? req.query.parentPhone);
      const phones = phonesRaw.split(',').map((s) => s.trim());
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      void parentId;
      const data = await listParentMessages(phones, status);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async createPurchase(req: Request, res: Response, next: NextFunction) {
    try {
      const body = purchaseSchema.parse(req.body);
      const data = await createParentPurchase(body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async submitPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          parentId: z.string().min(1),
          purchaseId: z.string().min(1),
          momoReference: z.string().min(4),
        })
        .parse(req.body);
      const data = await submitParentPayment(body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
