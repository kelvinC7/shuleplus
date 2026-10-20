import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { requestService } from '../services/request.service';

const createRequestSchema = z.object({
  organizationId: z.string().min(1).optional(),
  studentCode: z.string().min(1),
  kitId: z.string().min(1),
  items: z
    .array(
      z.object({
        requirementId: z.string().min(1),
        quantity: z.number().int().min(1).max(9999).optional(),
      })
    )
    .optional(),
  parentName: z.string().min(1),
  parentPhone: z.string().optional(),
  parentRelation: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']),
  deliveryMethod: z.enum(['AT_SCHOOL', 'AT_HOME']),
  notes: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'PAID', 'DELIVERED', 'CANCELLED']),
});

const paymentSchema = z.object({
  method: z.enum(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER']).optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  reference: z.string().optional(),
  paidBy: z.string().optional(),
});

export class RequestController {
  /** Protected: admin-created request (org from JWT). */
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createRequestSchema.parse(req.body);
      const data = await requestService.create({
        ...body,
        organizationId: body.organizationId ?? req.organizationRef!,
        recordedBy: req.user?.sub,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /** Public: parent-created request — org resolved from the student lookup server-side. */
  async createPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createRequestSchema.parse(req.body);
      const data = await requestService.create(body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /** Public: parent-facing status lookup by request number. */
  async statusByRequestNo(req: Request, res: Response, next: NextFunction) {
    try {
      const requestNumber = String(req.params.requestNo).trim();
      if (!requestNumber) {
        res.status(400).json({ success: false, message: 'requestNo is required' });
        return;
      }
      const data = await requestService.getPublicStatus(requestNumber);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await requestService.list(req.organizationRef!, req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await requestService.getById(String(req.params.id), req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateStatusSchema.parse(req.body);
      const data = await requestService.updateStatus(
        String(req.params.id),
        req.organizationRef!,
        body.status,
        req.user?.sub
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async recordPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = paymentSchema.parse(req.body);
      const data = await requestService.recordPayment(req.organizationRef!, String(req.params.id), body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const requestController = new RequestController();
