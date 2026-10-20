import { Response, NextFunction } from "express";
import { z } from "zod";
import { StockMovementType } from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { inventoryService } from "../services/inventory.service";

const adjustSchema = z.object({
  variantId: z.string().min(1),
  type: z.nativeEnum(StockMovementType),
  quantity: z.number().int().positive(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export class InventoryController {
  async listStock(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const lowStockOnly = req.query.lowStockOnly === "true";
      const data = await inventoryService.listStock(req.organizationRef!, {
        lowStockOnly,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async adjustStock(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = adjustSchema.parse(req.body);
      const data = await inventoryService.adjustStock(req.organizationRef!, {
        ...body,
        createdBy: req.user?.sub,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const inventoryController = new InventoryController();
