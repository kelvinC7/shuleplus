import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { shuleAvanceService } from '../services/shule-avance.service';

const createRequestSchema = z.object({
  request_type: z.enum(['cashout', 'service']),
  amount_rwf: z.number().int().positive(),
  repayment_term_months: z.number().int().min(1).max(18),
  reason: z.string().optional(),
  cashout_category_slug: z.string().optional(),
  service_category: z.string().optional(),
  service_payload: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateRequestSchema = z.object({
  amount_rwf: z.number().int().positive().optional(),
  repayment_term_months: z.number().int().min(1).max(18).optional(),
  reason: z.string().optional(),
  service_payload: z.record(z.unknown()).optional(),
});

export class ShuleAvanceController {
  async catalog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await shuleAvanceService.getCatalog(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async eligibility(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await shuleAvanceService.buildEligibility(
        req.organizationRef!,
        req.user!.sub,
        { email: req.user!.email }
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async myAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await shuleAvanceService.resolveUserAccess(
        req.organizationRef!,
        req.user!.sub,
        req.user!.roles ?? []
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async myRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const rows = await shuleAvanceService.listMyRequests(
        req.organizationRef!,
        req.user!.sub
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  }

  async createRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createRequestSchema.parse(req.body);
      const data = await shuleAvanceService.createRequest(
        req.organizationRef!,
        req.user!.sub,
        body
      );
      res.status(201).json({
        success: true,
        data,
        message: data.autoApproved
          ? 'Request auto-approved'
          : 'Request submitted for review',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateRequestSchema.parse(req.body);
      const id = String(req.params.id);
      const data = await shuleAvanceService.updateRequest(
        req.organizationRef!,
        req.user!.sub,
        id,
        body
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async cancelRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const data = await shuleAvanceService.cancelRequest(
        req.organizationRef!,
        req.user!.sub,
        id
      );
      res.json({ success: true, data, message: 'Request cancelled' });
    } catch (error) {
      next(error);
    }
  }

  async myPayroll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await shuleAvanceService.getPayrollSummary(
        req.organizationRef!,
        req.user!.sub
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async financeRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await shuleAvanceService.listFinanceRequests(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async financeSendToManager(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z.object({ note: z.string().optional() }).parse(req.body ?? {});
      const data = await shuleAvanceService.financeSendToManager(
        req.organizationRef!,
        String(req.params.id),
        req.user!.sub,
        body.note
      );
      res.json({ success: true, data, message: 'Forwarded to manager' });
    } catch (error) {
      next(error);
    }
  }

  async financeReject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z.object({ note: z.string().optional() }).parse(req.body ?? {});
      const data = await shuleAvanceService.financeReject(
        req.organizationRef!,
        String(req.params.id),
        req.user!.sub,
        body.note
      );
      res.json({ success: true, data, message: 'Request rejected' });
    } catch (error) {
      next(error);
    }
  }

  async managerPending(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await shuleAvanceService.listManagerPending(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async managerDecision(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z.object({
        decision: z.enum(['approve', 'reject']),
        manager_note: z.string().optional(),
      }).parse(req.body);
      const data = await shuleAvanceService.managerDecision(
        req.organizationRef!,
        String(req.params.id),
        req.user!.sub,
        body.decision,
        body.manager_note
      );
      res.json({
        success: true,
        data,
        message: body.decision === 'approve' ? 'Request approved' : 'Request rejected',
      });
    } catch (error) {
      next(error);
    }
  }

  async listApprovers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await shuleAvanceService.listApprovers(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async addApprover(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z.object({
        userId: z.string().min(1),
        email: z.string().optional(),
        displayName: z.string().optional(),
        role: z.enum(['manager', 'accountant']),
      }).parse(req.body);
      const data = await shuleAvanceService.addApprover(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async removeApprover(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await shuleAvanceService.removeApprover(
        req.organizationRef!,
        String(req.params.id)
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const shuleAvanceController = new ShuleAvanceController();
