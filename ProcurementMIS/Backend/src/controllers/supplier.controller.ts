import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { supplierService } from '../services/supplier.service';

const createSupplierSchema = z.object({
  companyName: z.string().min(1),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  alternativePhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  tinNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  website: z.string().optional(),
  paymentTerms: z.string().optional(),
  paymentMethod: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  mobileMoneyNumber: z.string().optional(),
  rating: z.coerce.number().optional(),
  notes: z.string().optional(),
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
      const data = await supplierService.getById(req.organizationRef!, String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSupplierSchema.parse(req.body);
      const data = await supplierService.create(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSupplierSchema.partial().parse(req.body);
      const data = await supplierService.update(req.organizationRef!, String(req.params.id), body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getPerformance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await supplierService.getPerformance(req.organizationRef!, String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async addPerformance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await supplierService.addPerformance(req.organizationRef!, String(req.params.id), req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await supplierService.summary(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const supplierController = new SupplierController();
