import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { purchaseOrderService } from '../services/purchase-order.service';

const createPOSchema = z.object({
  prId: z.string().optional(),
  supplierId: z.string().min(1),
  expectedDelivery: z.string().optional(),
  deliveryAddress: z.string().optional(),
  discount: z.coerce.number().optional(),
  tax: z.coerce.number().optional(),
  shippingCost: z.coerce.number().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemName: z.string().min(1),
    description: z.string().optional(),
    unit: z.string().min(1),
    quantity: z.coerce.number().positive(),
    unitPrice: z.coerce.number().positive(),
  })).min(1),
});

const importPOSchema = z.object({
  supplierId: z.string().min(1),
  expectedDelivery: z.string().optional(),
  deliveryAddress: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  rows: z.array(z.object({
    itemName: z.string().min(1),
    quantity: z.union([z.string(), z.number()]),
    unitPrice: z.union([z.string(), z.number()]),
    prCode: z.string().min(1),
    rowNumber: z.coerce.number().optional(),
  })).min(1),
});

export class PurchaseOrderController {
  async importOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = importPOSchema.parse(req.body);
      const data = await purchaseOrderService.importOrders(
        req.organizationRef!, req.user!.sub, req.user!.email ?? '', body
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const {
        status, search, academicYear, term, date, week, dateFrom, dateTo,
      } = req.query as any;
      const data = await purchaseOrderService.list(req.organizationRef!, {
        status, search, academicYear, term, date, week, dateFrom, dateTo,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await purchaseOrderService.getById(req.organizationRef!, String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createPOSchema.parse(req.body);
      const data = await purchaseOrderService.create(
        req.organizationRef!, req.user!.sub, req.user!.email, body
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const data = await purchaseOrderService.updateStatus(
        req.organizationRef!, String(req.params.id), status, req.user!.sub
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updatePaymentStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { paymentStatus } = req.body;
      const data = await purchaseOrderService.updatePaymentStatus(
        req.organizationRef!, String(req.params.id), paymentStatus
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await purchaseOrderService.remove(req.organizationRef!, String(req.params.id));
      res.json({ success: true, data: null });
    } catch (error) {
      next(error);
    }
  }
}

export const purchaseOrderController = new PurchaseOrderController();
