import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { supplierService } from '../services/supplier.service';

const createSchema = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  tinNumber: z.string().optional(),
  paymentMethod: z.enum(['MOMO', 'BANK']).optional(),
  mobileMoneyNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  contractUrl: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export class SupplierController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await supplierService.list(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await supplierService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await supplierService.create(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await supplierService.update(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const supplierController = new SupplierController();
