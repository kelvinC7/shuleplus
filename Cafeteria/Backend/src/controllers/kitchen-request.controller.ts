import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { kitchenRequestService } from '../services/kitchen-request.service';
import { inventoryApi } from '../services/inventory-api';

const requestItemSchema = z.object({
  productId: z.string().min(1),
  quantityRequested: z.number().positive(),
  notes: z.string().optional(),
});

const createSchema = z.object({
  notes: z.string().optional(),
  items: z.array(requestItemSchema).min(1),
});

const grnSchema = z.object({
  notes: z.string().optional(),
  receivedDate: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().positive(),
    unitCost: z.number().optional(),
    batchNumber: z.string().optional(),
  })).min(1),
});

export class KitchenRequestController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await kitchenRequestService.list(req.organizationRef!, req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await kitchenRequestService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await kitchenRequestService.create(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async forward(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await kitchenRequestService.forwardToInventory(req.organizationRef!, req.params.id, req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async receive(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await kitchenRequestService.receive(req.organizationRef!, req.params.id, req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async syncStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await kitchenRequestService.syncStatus(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async syncAllPending(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await kitchenRequestService.syncAllPending(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getInventoryDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await kitchenRequestService.getInventoryDetails(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createGrn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = grnSchema.parse(req.body);
      const data = await kitchenRequestService.createGrn(req.organizationRef!, req.params.id, req.user!.sub, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await kitchenRequestService.remove(req.organizationRef!, req.params.id);
      res.json({ success: true, message: 'Kitchen request deleted' });
    } catch (error) {
      next(error);
    }
  }

  async listProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await inventoryApi.getProducts(req.organizationRef!, req.query.search as string);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const kitchenRequestController = new KitchenRequestController();
