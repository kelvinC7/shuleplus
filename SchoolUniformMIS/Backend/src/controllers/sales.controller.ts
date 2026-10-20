import { Response, NextFunction } from "express";
import { z } from "zod";
import { CustomerType, PaymentMethod, PaymentStatus } from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { salesService } from "../services/sales.service";

const saleSchema = z.object({
  customerType: z.nativeEnum(CustomerType),
  studentId: z.string().optional(),
  customerName: z.string().optional(),
  discount: z.union([z.string(), z.number()]).optional(),
  tax: z.union([z.string(), z.number()]).optional(),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive(),
        unitPrice: z.union([z.string(), z.number()]),
      }),
    )
    .min(1),
  initialPayment: z
    .object({
      amount: z.union([z.string(), z.number()]),
      method: z.nativeEnum(PaymentMethod),
      notes: z.string().optional(),
    })
    .optional(),
});

const paymentSchema = z.object({
  amount: z.union([z.string(), z.number()]),
  method: z.nativeEnum(PaymentMethod),
  notes: z.string().optional(),
});

export class SalesController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { studentId, paymentStatus } = req.query;
      const data = await salesService.list(req.organizationRef!, {
        studentId: typeof studentId === "string" ? studentId : undefined,
        paymentStatus:
          typeof paymentStatus === "string"
            ? (paymentStatus as PaymentStatus)
            : undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = saleSchema.parse(req.body);
      const data = await salesService.create(req.organizationRef!, {
        ...body,
        createdBy: req.user?.sub,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async addPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = paymentSchema.parse(req.body);
      const data = await salesService.addPayment(
        req.organizationRef!,
        String(req.params.id),
        body,
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listOutstandingPayments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await salesService.listOutstandingPayments(
        req.organizationRef!,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const salesController = new SalesController();
