import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { contractService } from '../services/contract.service';

const createContractSchema = z.object({
  supplierId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  value: z.coerce.number().optional(),
  signedBy: z.string().optional(),
  renewalTerms: z.string().optional(),
  notes: z.string().optional(),
  documentUrl: z.string().optional(),
  contractNumber: z.string().optional(),
});

export class ContractController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await contractService.list(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await contractService.getById(req.organizationRef!, String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createContractSchema.parse(req.body);
      const data = await contractService.create(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createContractSchema.partial().parse(req.body);
      const data = await contractService.update(req.organizationRef!, String(req.params.id), body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getExpiring(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const days = Number(String(req.query.days)) || 30;
      const data = await contractService.getExpiring(req.organizationRef!, days);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const contractController = new ContractController();
