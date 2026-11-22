import { Response, NextFunction } from 'express';
import { AppError } from './error.middleware';
import { AuthenticatedRequest } from './auth.middleware';

export function requireSuperAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');
  if (!user.roles?.includes('super_admin')) {
    throw new AppError(403, 'Super Admin access required');
  }
  next();
}
