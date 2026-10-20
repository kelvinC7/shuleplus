import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { issueService } from '../services/issue.service';

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  batchId: z.string().optional(),
  unitCost: z.number().optional(),
});

const createSchema = z.object({
  storeId: z.string().min(1),
  issuedTo: z.string().min(1),
  issuedToType: z.string().min(1),
  issuedToName: z.string().min(1),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

export class IssueController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await issueService.list(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await issueService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await issueService.create(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await issueService.approve(req.organizationRef!, req.params.id, req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body || {};
      const data = await issueService.reject(req.organizationRef!, req.params.id, req.user!.sub, reason);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const issueController = new IssueController();
