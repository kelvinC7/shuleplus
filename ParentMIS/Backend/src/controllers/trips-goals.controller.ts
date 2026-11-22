import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { tripsGoalsService } from '../services/trips-goals.service';
import { getRequestedStudent } from '../utils/student-param';
import { prisma } from '../config/database';

export class TripsGoalsController {
  async getTrips(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await tripsGoalsService.getTrips(
        req.organizationRef!,
        req.user!.sub,
        getRequestedStudent(req)
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async submitTripConsent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parent = await prisma.parentAccount.findUnique({ where: { id: req.user!.sub } });
      const parentName = parent ? `${parent.firstName} ${parent.lastName}`.trim() : 'Parent';
      const data = await tripsGoalsService.submitTripConsent(
        req.organizationRef!,
        req.user!.sub,
        String(req.params.id),
        parentName,
        {
          declined: Boolean(req.body?.declined),
          confirmations: req.body?.confirmations,
        },
        parent?.phone
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async payTrip(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const amount = Number(req.body.amount || 0);
      const data = await tripsGoalsService.payTripFee(
        req.organizationRef!,
        req.user!.sub,
        String(req.params.id),
        amount
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getGoals(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await tripsGoalsService.getGoals(req.organizationRef!, req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createGoal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await tripsGoalsService.createGoal(req.organizationRef!, req.user!.sub, req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async topUpGoal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const amount = Number(req.body.amount || 0);
      const data = await tripsGoalsService.topUpGoal(
        req.organizationRef!,
        req.user!.sub,
        String(req.params.id),
        amount
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async toggleAutoSave(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await tripsGoalsService.toggleGoalAutoSave(
        req.organizationRef!,
        req.user!.sub,
        String(req.params.id)
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getWalletLimits(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const studentId = String(req.query.studentId || req.params.studentId || '');
      const data = await tripsGoalsService.getWalletLimits(req.organizationRef!, studentId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async saveWalletLimits(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const studentId = String(req.body.studentId || req.query.studentId || '');
      const data = await tripsGoalsService.saveWalletLimits(req.organizationRef!, studentId, req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async requestSizeExchange(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await tripsGoalsService.requestSizeExchange(
        req.organizationRef!,
        String(req.params.id),
        req.body
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const tripsGoalsController = new TripsGoalsController();
