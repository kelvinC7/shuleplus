import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrgSubscriptionStatus, SubscriptionPeriod } from '../generated/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { subscriptionService } from '../services/subscription.service';

const planSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  period: z.nativeEnum(SubscriptionPeriod).optional(),
  amount: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const assignSchema = z.object({
  planId: z.string().uuid(),
  notes: z.string().optional(),
  status: z.nativeEnum(OrgSubscriptionStatus).optional(),
});

const actionSchema = z.object({
  action: z.enum(['activate', 'suspend', 'renew', 'upgrade', 'downgrade', 'cancel']),
  planId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export class SubscriptionController {
  async listPlans(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subscriptionService.listPlans();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = planSchema.parse(req.body);
      const data = await subscriptionService.createPlan(req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updatePlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = planSchema.partial().parse(req.body);
      const data = await subscriptionService.updatePlan(String(req.params.id), req.user!.sub, body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listOrgSubscriptions(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subscriptionService.listOrgSubscriptions();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getOrgSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subscriptionService.getOrgSubscription(String(req.params.orgId));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async assignPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = assignSchema.parse(req.body);
      const data = await subscriptionService.assignPlan(
        String(req.params.orgId),
        req.user!.sub,
        body.planId,
        { notes: body.notes, status: body.status }
      );
      res.json({ success: true, data, message: 'Subscription assigned.' });
    } catch (e) {
      next(e);
    }
  }

  async subscriptionAction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = actionSchema.parse(req.body);
      const data = await subscriptionService.subscriptionAction(
        String(req.params.orgId),
        req.user!.sub,
        body.action,
        { planId: body.planId, notes: body.notes }
      );
      res.json({ success: true, data, message: `Subscription ${body.action} applied.` });
    } catch (e) {
      next(e);
    }
  }
}

export const subscriptionController = new SubscriptionController();
