import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { stockRequestService } from '../services/stock-request.service';
import { prisma } from '../config/database';

const itemSchema = z.object({
  productId: z.string().min(1),
  quantityRequested: z.number().positive(),
  notes: z.string().optional(),
});

const createSchema = z.object({
  storeId: z.string().optional(),
  departmentName: z.string().min(1),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).optional(),
});

const updateSchema = z.object({
  departmentName: z.string().min(1).optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
});

const addItemSchema = z.object({
  productId: z.string().min(1),
  quantityRequested: z.number().positive(),
  notes: z.string().optional(),
});

const updateItemSchema = z.object({
  quantityRequested: z.number().positive().optional(),
  notes: z.string().optional(),
});

export class StockRequestController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await stockRequestService.list(req.organizationRef!, req.query.status as string);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await stockRequestService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await stockRequestService.create(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await stockRequestService.update(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await stockRequestService.remove(req.organizationRef!, req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async addItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = addItemSchema.parse(req.body);
      const data = await stockRequestService.addItem(req.organizationRef!, req.params.id, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateItemSchema.parse(req.body);
      const data = await stockRequestService.updateItem(req.organizationRef!, req.params.id, req.params.itemId, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async removeItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await stockRequestService.removeItem(req.organizationRef!, req.params.id, req.params.itemId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await stockRequestService.approve(req.organizationRef!, req.params.id, req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body || {};
      const data = await stockRequestService.reject(req.organizationRef!, req.params.id, req.user!.sub, reason);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // Service-to-service: create stock request from another module (e.g., Cafeteria)
  async createFromService(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const orgRef = (req as any).organizationRef as string;

      // Validate product IDs exist and filter invalid ones
      if (body.items && body.items.length > 0) {
        const validProductIds = body.items.map(i => i.productId);
        const existingProducts = await prisma.product.findMany({
          where: { id: { in: validProductIds }, organizationId: orgRef },
          select: { id: true },
        });
        const existingIds = new Set(existingProducts.map(p => p.id));
        body.items = body.items.filter(i => existingIds.has(i.productId));

        if (body.items.length === 0) {
          return res.status(400).json({ success: false, message: 'No valid products found — all product IDs are invalid' });
        }
      }

      const data = await stockRequestService.create(orgRef, 'system', body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // Service-to-service: get stock request by ID
  async getByIdFromService(req: Request, res: Response, next: NextFunction) {
    try {
      const orgRef = (req as any).organizationRef as string;
      const data = await stockRequestService.getById(orgRef, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // Service-to-service: list stock requests
  async listFromService(req: Request, res: Response, next: NextFunction) {
    try {
      const orgRef = (req as any).organizationRef as string;
      const data = await stockRequestService.listFromService(orgRef, req.query.status as string);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // Service-to-service: approve stock request
  async approveFromService(req: Request, res: Response, next: NextFunction) {
    try {
      const orgRef = (req as any).organizationRef as string;
      const data = await stockRequestService.approveFromService(orgRef, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // Service-to-service: reject stock request
  async rejectFromService(req: Request, res: Response, next: NextFunction) {
    try {
      const orgRef = (req as any).organizationRef as string;
      const { reason } = req.body || {};
      const data = await stockRequestService.rejectFromService(orgRef, req.params.id, reason);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // Service-to-service: issue stock request
  async issueFromService(req: Request, res: Response, next: NextFunction) {
    try {
      const orgRef = (req as any).organizationRef as string;
      const data = await stockRequestService.issueFromService(orgRef, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const stockRequestController = new StockRequestController();
