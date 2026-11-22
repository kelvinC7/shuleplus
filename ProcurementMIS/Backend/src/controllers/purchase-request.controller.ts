import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { purchaseRequestService } from '../services/purchase-request.service';
import { resolveRequestVisibility, type RequestVisibility } from '../utils/module-access';
import { resolveUserDisplayName } from '../utils/user-display-name';

function bearerToken(req: AuthenticatedRequest): string | undefined {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
}

async function requestVisibility(req: AuthenticatedRequest): Promise<RequestVisibility> {
  return resolveRequestVisibility(req.user!.sub, req.user!.roles ?? [], bearerToken(req));
}

const createPRSchema = z.object({
  requestType: z.string().optional(),
  departmentId: z.string().min(1).optional().nullable(),
  departmentOther: z.string().optional(),
  academicYear: z.string().optional(),
  term: z.string().optional(),
  requestedByName: z.string().optional(),
  purpose: z.string().optional(),
  project: z.string().optional(),
  budgetLine: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  neededDate: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PENDING']).optional(),
  items: z.array(z.object({
    itemName: z.string().min(1),
    description: z.string().optional(),
    unit: z.string().min(1),
    quantity: z.coerce.number().positive(),
    estimatedPrice: z.coerce.number().nonnegative().optional(),
    categoryId: z.string().optional(),
    preferredSupplierId: z.string().optional(),
    warehouseLocation: z.string().optional(),
    availableStock: z.coerce.number().optional(),
  })).min(1),
  departmentHeadId: z.string().optional(),
});

const importPRSchema = z.object({
  departmentIds: z.array(z.string().min(1)).optional(),
  academicYear: z.string().optional(),
  term: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  neededDate: z.string().optional(),
  purpose: z.string().optional(),
  requestType: z.string().optional(),
  departmentHeadId: z.string().optional(),
  items: z.array(z.object({
    itemName: z.string().min(1),
    quantity: z.union([z.string(), z.number()]),
    unit: z.string().optional(),
  })).min(1),
});

export class PurchaseRequestController {
  async itemCatalog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await purchaseRequestService.itemCatalog(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async importRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = importPRSchema.parse(req.body);
      const data = await purchaseRequestService.importRequests(
        req.organizationRef!,
        req.user!.sub,
        body,
        req.user!.email,
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const {
        status, departmentId, priority, search,
        academicYear, term, date, week, dateFrom, dateTo,
      } = req.query as any;
      const visibility = await requestVisibility(req);
      const data = await purchaseRequestService.list(req.organizationRef!, {
        status, departmentId, priority, search,
        academicYear, term, date, week, dateFrom, dateTo,
      }, visibility);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const visibility = await requestVisibility(req);
      const data = await purchaseRequestService.getById(
        req.organizationRef!,
        String(req.params.id),
        visibility,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createPRSchema.parse(req.body);
      const data = await purchaseRequestService.create(
        req.organizationRef!, req.user!.sub, body, req.user!.email
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const visibility = await requestVisibility(req);
      const data = await purchaseRequestService.update(
        req.organizationRef!, String(req.params.id), req.body, visibility
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { comment } = req.body || {};
      const visibility = await requestVisibility(req);
      const userName = await resolveUserDisplayName(req.user!.sub, req.user!.email);
      const data = await purchaseRequestService.approve(
        req.organizationRef!, String(req.params.id), req.user!.sub,
        userName, comment, visibility
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      if (!reason) throw new Error('Rejection reason is required');
      const visibility = await requestVisibility(req);
      const userName = await resolveUserDisplayName(req.user!.sub, req.user!.email);
      const data = await purchaseRequestService.reject(
        req.organizationRef!, String(req.params.id), req.user!.sub,
        userName, reason, visibility
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const visibility = await requestVisibility(req);
      const data = await purchaseRequestService.cancel(
        req.organizationRef!, String(req.params.id), req.user!.sub, visibility
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const visibility = await requestVisibility(req);
      await purchaseRequestService.remove(
        req.organizationRef!,
        String(req.params.id),
        visibility,
      );
      res.json({ success: true, data: null });
    } catch (error) {
      next(error);
    }
  }
}

export const purchaseRequestController = new PurchaseRequestController();
