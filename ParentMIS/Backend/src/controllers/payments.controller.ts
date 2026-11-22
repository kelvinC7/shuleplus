import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { paymentsService } from '../services/payments.service';
import { getRequestedStudent } from '../utils/student-param';

export class PaymentsController {
  async initiateCollection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await paymentsService.initiateCollection(
        req.organizationRef!,
        req.user!.sub,
        req.body,
        getRequestedStudent(req)
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async collectionStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const reference = String(req.params.reference ?? '').trim();
      if (!reference) {
        res.status(400).json({ success: false, message: 'Payment reference is required' });
        return;
      }
      const data = await paymentsService.getCollectionStatus(
        req.organizationRef!,
        req.user!.sub,
        reference
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentsController = new PaymentsController();
