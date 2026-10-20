import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { productService } from '../services/product.service';
import { optionalMinZeroNumber, optionalNumber } from '../utils/zod-helpers';

const createSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  categoryId: z.string().min(1),
  unitOfMeasure: z.string().min(1),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
  costPrice: optionalNumber,
  sellingPrice: optionalNumber,
  reorderLevel: optionalNumber,
  minimumStock: optionalNumber,
  maximumStock: optionalNumber,
  supplierId: z.string().optional(),
  storageLocation: z.string().optional(),
  quantity: optionalMinZeroNumber,
  storeId: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED']).optional(),
});

export class ProductController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await productService.list(req.organizationRef!, {
        categoryId: req.query.categoryId as string,
        status: req.query.status as string,
        search: req.query.search as string,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await productService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const { quantity, storeId, ...productData } = body;
      const data = await productService.create(req.organizationRef!, productData, quantity, storeId, req.user!.sub);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await productService.update(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getStockSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await productService.getStockSummary(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await productService.remove(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listFromService(req: Request, res: Response, next: NextFunction) {
    try {
      const orgRef = (req as any).organizationRef as string;
      const data = await productService.list(orgRef, {
        search: req.query.search as string,
        status: req.query.status as string,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
