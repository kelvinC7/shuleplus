import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { smsPackagesService } from '../services/sms-packages.service';

export class SmsPackagesController {
  async config(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await smsPackagesService.config(req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await smsPackagesService.summary(req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async purchases(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const data = await smsPackagesService.purchases(req, status);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async messages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const data = await smsPackagesService.messages(req, status);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createPurchase(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await smsPackagesService.createPurchase(req, req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async submitPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await smsPackagesService.submitPayment(req, req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const smsPackagesController = new SmsPackagesController();
