import { Response, NextFunction } from "express";
import { z } from "zod";
import { ProductionStatus } from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { tailorService } from "../services/tailor.service";

const tailorSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

const productionOrderSchema = z.object({
  tailorId: z.string().min(1),
  fabricId: z.string().optional(),
  metersIssued: z.union([z.string(), z.number()]),
  expectedOutput: z.number().int().positive(),
  deliveryDate: z.string().optional(),
  tailoringCost: z.union([z.string(), z.number()]),
  status: z.nativeEnum(ProductionStatus).optional(),
  productId: z.string().optional(),
  notes: z.string().optional(),
});

const receiptSchema = z.object({
  receivedQty: z.number().int().nonnegative(),
  damagedQty: z.number().int().nonnegative().optional(),
  unfinishedQty: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

export class TailorController {
  async listTailors(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await tailorService.listTailors(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createTailor(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = tailorSchema.parse(req.body);
      const data = await tailorService.createTailor(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateTailor(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = tailorSchema.partial().parse(req.body);
      const data = await tailorService.updateTailor(
        req.organizationRef!,
        String(req.params.id),
        body,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listProductionOrders(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { status } = req.query;
      const data = await tailorService.listProductionOrders(
        req.organizationRef!,
        {
          status:
            typeof status === "string"
              ? (status as ProductionStatus)
              : undefined,
        },
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createProductionOrder(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = productionOrderSchema.parse(req.body);
      const data = await tailorService.createProductionOrder(
        req.organizationRef!,
        body,
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateProductionOrder(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = productionOrderSchema.partial().parse(req.body);
      const data = await tailorService.updateProductionOrder(
        req.organizationRef!,
        String(req.params.id),
        body,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async receiveProduction(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = receiptSchema.parse(req.body);
      const data = await tailorService.receiveProduction(
        req.organizationRef!,
        String(req.params.id),
        body,
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const tailorController = new TailorController();
