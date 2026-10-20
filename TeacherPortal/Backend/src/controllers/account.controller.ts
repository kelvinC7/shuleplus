import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getAccountProfile } from '../services/account.service';

export class AccountController {
  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const data = await getAccountProfile(
        req.organizationRef!,
        user.sub,
        user.email,
        user.roles ?? [],
        user.modules ?? []
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const accountController = new AccountController();
