import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from './auth.middleware';
import { AppError } from './error.middleware';

export async function requireTenant(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');
  const tenant = await prisma.tenant.findFirst({
    where: { organizationId: user.organizationId, status: 'ACTIVE' },
  });
  if (!tenant) throw new AppError(403, 'Tenant not provisioned');
  req.organizationRef = tenant.organizationId;
  next();
}
