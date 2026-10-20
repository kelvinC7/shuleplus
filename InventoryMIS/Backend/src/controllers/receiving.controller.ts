import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { receivingService } from '../services/receiving.service';
import { prisma } from '../config/database';
import { optionalNumber } from '../utils/zod-helpers';

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return val;
    const n = typeof val === 'number' ? val : Number(val);
    return Number.isFinite(n) ? n : val;
  }, z.number().positive('Quantity must be greater than 0')),
  unitCost: optionalNumber,
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  manufacturingDate: z.string().optional(),
});

const updateSchema = z.object({
  supplierId: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  deliveryNoteNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  receivedDate: z.string().optional(),
});

const createSchema = z.object({
  storeId: z.string().min(1),
  supplierId: z.string().optional(),
  stockRequestId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  deliveryNoteNumber: z.string().optional(),
  notes: z.string().optional(),
  receivedDate: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});

const grnForRequestSchema = z.object({
  stockRequestId: z.string().min(1),
  notes: z.string().optional(),
  receivedDate: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().positive(),
    unitCost: z.number().optional(),
    batchNumber: z.string().optional(),
    expiryDate: z.string().optional(),
    manufacturingDate: z.string().optional(),
  })).min(1),
});

export class ReceivingController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await receivingService.list(req.organizationRef!, {
        search: req.query.search as string | undefined,
        supplierId: req.query.supplierId as string | undefined,
        storeId: req.query.storeId as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await receivingService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      if (!body.supplierId) delete body.supplierId;
      const data = await receivingService.create(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await receivingService.update(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await receivingService.remove(req.organizationRef!, req.params.id);
      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  }

  async createFromStockRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = grnForRequestSchema.parse(req.body);
      const data = await receivingService.createFromStockRequest(
        req.organizationRef!, body.stockRequestId, req.user!.sub, {
          notes: body.notes,
          receivedDate: body.receivedDate,
          items: body.items,
        }
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // Service-to-service: create GRN for stock request
  async createFromStockRequestService(req: Request, res: Response, next: NextFunction) {
    try {
      const body = grnForRequestSchema.omit({ stockRequestId: true }).parse(req.body);
      const orgRef = (req as any).organizationRef as string;
      const data = await receivingService.createFromStockRequest(
        orgRef, req.params.id, 'system', {
          notes: body.notes,
          receivedDate: body.receivedDate,
          items: body.items,
        }
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getByStockRequestId(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const receiving = await prisma.stockReceiving.findFirst({
        where: { stockRequestId: req.params.stockRequestId, organizationId: req.organizationRef },
        include: {
          store: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      });
      res.json({ success: true, data: receiving });
    } catch (error) {
      next(error);
    }
  }

  // Service-to-service: get GRN by stock request ID
  async getByStockRequestIdFromService(req: Request, res: Response, next: NextFunction) {
    try {
      const orgRef = (req as any).organizationRef as string;
      const receiving = await prisma.stockReceiving.findFirst({
        where: { stockRequestId: req.params.id, organizationId: orgRef },
        include: {
          store: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      });
      res.json({ success: true, data: receiving });
    } catch (error) {
      next(error);
    }
  }
}

export const receivingController = new ReceivingController();
