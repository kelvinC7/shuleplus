import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { purchaseRequestService } from '../services/purchase-request.service';

const createPRSchema = z.object({
  requestType: z.string().optional(),
  departmentId: z.string().min(1),
  departmentOther: z.string().optional(),
  academicYear: z.string().optional(),
  term: z.string().optional(),
  requestedByName: z.string().optional(),
  purpose: z.string().optional(),
  project: z.string().optional(),
  budgetLine: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  neededDate: z.string().min(1),
  items: z.array(z.object({
    itemName: z.string().min(1),
    description: z.string().optional(),
    unit: z.string().min(1),
    quantity: z.coerce.number().positive(),
    estimatedPrice: z.coerce.number().nonnegative().optional(),
    categoryId: z.string().optional(),
    preferredSupplierId: z.string().optional(),
    warehouseLocation: z.string().optional(),
    availableStock: z.coerce.number().optional(),
  })).min(1),
  departmentHeadId: z.string().optional(),
});

export class PurchaseRequestController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status, departmentId, priority, search, dateFrom, dateTo } = req.query as any;
      const data = await purchaseRequestService.list(req.organizationRef!, {
        status, departmentId, priority, search, dateFrom, dateTo,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await purchaseRequestService.getById(req.organizationRef!, String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createPRSchema.parse(req.body);
      const data = await purchaseRequestService.create(
        req.organizationRef!, req.user!.sub, body
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await purchaseRequestService.update(
        req.organizationRef!, String(req.params.id), req.body
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { comment } = req.body || {};
      const data = await purchaseRequestService.approve(
        req.organizationRef!, String(req.params.id), req.user!.sub,
        req.user!.email, comment
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      if (!reason) throw new Error('Rejection reason is required');
      const data = await purchaseRequestService.reject(
        req.organizationRef!, String(req.params.id), req.user!.sub,
        req.user!.email, reason
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await purchaseRequestService.cancel(
        req.organizationRef!, String(req.params.id), req.user!.sub
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await purchaseRequestService.remove(req.organizationRef!, String(req.params.id));
      res.json({ success: true, data: null });
    } catch (error) {
      next(error);
    }
  }
}

export const purchaseRequestController = new PurchaseRequestController();
