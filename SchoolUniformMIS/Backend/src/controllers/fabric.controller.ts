import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { fabricService } from "../services/fabric.service";

const fabricSchema = z.object({
  name: z.string().min(1),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  rollNumber: z.string().optional(),
  metersTotal: z.union([z.string(), z.number()]),
  metersRemaining: z.union([z.string(), z.number()]).optional(),
  cost: z.union([z.string(), z.number()]),
  color: z.string().optional(),
  quality: z.string().optional(),
  warehouse: z.string().optional(),
  academicYear: z.string().optional(),
  purchaseDate: z.string().optional(),
});

const fabricIssueSchema = z.object({
  fabricId: z.string().min(1),
  tailorId: z.string().optional(),
  meters: z.union([z.string(), z.number()]),
  expectedPieces: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const stockInSchema = z
  .object({
    fabricId: z.string().optional(),
    name: z.string().optional(),
    supplierId: z.string().optional(),
    supplierName: z.string().optional(),
    rollNumber: z.string().optional(),
    metersTotal: z.union([z.string(), z.number()]).optional(),
    meters: z.union([z.string(), z.number()]).optional(),
    metersRemaining: z.union([z.string(), z.number()]).optional(),
    cost: z.union([z.string(), z.number()]).default(0),
    color: z.string().optional(),
    quality: z.string().optional(),
    warehouse: z.string().optional(),
    academicYear: z.string().optional(),
    purchaseDate: z.string().optional(),
    notes: z.string().optional(),
    invoiceNo: z.string().optional(),
    otherCosts: z.union([z.string(), z.number()]).optional(),
    tax: z.union([z.string(), z.number()]).optional(),
    discount: z.union([z.string(), z.number()]).optional(),
  })
  .refine((d) => Boolean(d.fabricId) || Boolean(d.name?.trim()), {
    message: "fabricId or name is required",
  })
  .refine((d) => Number(d.meters ?? d.metersTotal ?? 0) > 0, {
    message: "meters must be greater than 0",
  });

export class FabricController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await fabricService.list(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = fabricSchema.parse(req.body);
      const data = await fabricService.create(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = fabricSchema.partial().parse(req.body);
      const data = await fabricService.update(
        req.organizationRef!,
        String(req.params.id),
        body,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await fabricService.remove(
        req.organizationRef!,
        String(req.params.id),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createIssue(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = fabricIssueSchema.parse(req.body);
      const data = await fabricService.createIssue(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listIssues(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await fabricService.listIssues(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateIssue(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = fabricIssueSchema.partial().parse(req.body);
      const data = await fabricService.updateIssue(
        req.organizationRef!,
        String(req.params.id),
        body,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async removeIssue(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await fabricService.removeIssue(
        req.organizationRef!,
        String(req.params.id),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listPurchases(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await fabricService.listPurchases(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async stockIn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = stockInSchema.parse(req.body);
      const data = await fabricService.stockIn(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await fabricService.summary(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const fabricController = new FabricController();
