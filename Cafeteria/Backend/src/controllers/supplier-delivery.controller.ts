import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { supplierDeliveryService } from '../services/supplier-delivery.service';

const deliveryItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().positive().optional(),
  qualityStatus: z.enum(['ACCEPTED', 'REJECTED', 'PARTIAL']),
  notes: z.string().optional(),
});

const createSchema = z.object({
  supplierId: z.string().min(1),
  deliveryDate: z.coerce.date(),
  status: z.enum(['SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'REJECTED']).optional(),
  qualityRating: z.number().int().min(1).max(5).optional(),
  inspectionNotes: z.string().optional(),
  invoiceNumber: z.string().optional(),
  deliveryNoteNumber: z.string().optional(),
  items: z.array(deliveryItemSchema).optional(),
});

const updateSchema = createSchema.partial();

export class SupplierDeliveryController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await supplierDeliveryService.list(req.organizationRef!, req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await supplierDeliveryService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await supplierDeliveryService.create(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await supplierDeliveryService.update(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await supplierDeliveryService.remove(req.organizationRef!, req.params.id);
      res.json({ success: true, message: 'Delivery record deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const supplierDeliveryController = new SupplierDeliveryController();
