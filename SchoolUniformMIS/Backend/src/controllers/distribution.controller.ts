import { Response, NextFunction } from "express";
import { z } from "zod";
import {
  DistributionStatus,
  PaymentMethod,
  ReturnCondition,
} from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { distributionService } from "../services/distribution.service";

const distributionSchema = z.object({
  studentId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().positive(),
  academicYear: z.string().optional(),
  status: z.nativeEnum(DistributionStatus).optional(),
  notes: z.string().optional(),
});

const issueBatchSchema = z.object({
  studentId: z.string().min(1),
  academicYear: z.string().optional(),
  term: z.string().optional(),
  notes: z.string().optional(),
  status: z.nativeEnum(DistributionStatus).optional(),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive(),
        unitPrice: z.union([z.string(), z.number()]).optional(),
      }),
    )
    .min(1),
  payment: z
    .object({
      amount: z.union([z.string(), z.number()]),
      method: z.nativeEnum(PaymentMethod),
      discount: z.union([z.string(), z.number()]).optional(),
      scholarship: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),
});

const returnSchema = z.object({
  receiptId: z.string().min(1),
  reason: z.string().optional(),
  condition: z.nativeEnum(ReturnCondition).optional(),
  restock: z.boolean().optional(),
  replaceItem: z.boolean().optional(),
  exchange: z.boolean().optional(),
  refundAmount: z.union([z.string(), z.number()]).optional(),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({
        distributionId: z.string().optional(),
        variantId: z.string().min(1),
        quantity: z.number().int().positive(),
        reason: z.string().optional(),
        exchangeVariantId: z.string().optional(),
      }),
    )
    .min(1),
});

export class DistributionController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.query;
      const data = await distributionService.list(req.organizationRef!, {
        studentId: typeof studentId === "string" ? studentId : undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listReceipts(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { studentId, search } = req.query;
      const data = await distributionService.listReceipts(
        req.organizationRef!,
        {
          studentId: typeof studentId === "string" ? studentId : undefined,
          search: typeof search === "string" ? search : undefined,
        },
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getReceipt(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await distributionService.getReceipt(
        req.organizationRef!,
        String(req.params.id),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = distributionSchema.parse(req.body);
      const data = await distributionService.create(req.organizationRef!, {
        ...body,
        issuedBy: req.user?.sub,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async issueBatch(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = issueBatchSchema.parse(req.body);
      const data = await distributionService.issueBatch(req.organizationRef!, {
        ...body,
        issuedBy: req.user?.sub,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listReturns(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await distributionService.listReturns(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createReturn(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = returnSchema.parse(req.body);
      const data = await distributionService.createReturn(
        req.organizationRef!,
        {
          ...body,
          processedBy: req.user?.sub,
        },
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async returnAnalytics(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await distributionService.returnAnalytics(
        req.organizationRef!,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const distributionController = new DistributionController();
