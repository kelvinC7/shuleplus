import { Request, Response, NextFunction } from 'express';
import { loanService } from '../services/loan.service';

export class LoanController {
  async publicListTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      if (!organizationId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const data = await loanService.listTypes(organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async publicSubmit(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.body?.organizationId ?? req.query.organizationId ?? '');
      if (!organizationId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const data = await loanService.submit(organizationId, (req.body ?? {}) as Record<string, unknown>);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async publicStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await loanService.status(String(req.params.applicationNumber ?? ''));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const loanController = new LoanController();
