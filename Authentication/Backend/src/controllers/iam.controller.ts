import { Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class IamController {
  async myModules(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const data = await authService.getMyModules(user.sub, user.organizationId, user.roles);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const iamController = new IamController();
