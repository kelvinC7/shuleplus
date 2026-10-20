import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { transferService } from '../services/transfer.service';

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  batchId: z.string().optional(),
  unitCost: z.number().optional(),
});

const createSchema = z.object({
  fromStoreId: z.string().min(1),
  toStoreId: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

export class TransferController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await transferService.list(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await transferService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await transferService.create(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await transferService.approve(req.organizationRef!, req.params.id, req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async receive(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await transferService.receive(req.organizationRef!, req.params.id, req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body || {};
      const data = await transferService.reject(req.organizationRef!, req.params.id, reason);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const transferController = new TransferController();
