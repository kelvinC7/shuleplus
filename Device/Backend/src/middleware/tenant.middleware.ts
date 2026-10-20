import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from './error.middleware';
import { AuthenticatedRequest } from './auth.middleware';

export async function requireTenant(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const orgId = req.user?.organizationId;
  if (!orgId) throw new AppError(401, 'Authentication required');

  const tenant = await prisma.tenant.findFirst({
    where: { organizationId: orgId, status: 'ACTIVE' },
  });

  if (!tenant) {
    throw new AppError(403, 'Tenant not provisioned for this organization');
  }

  req.organizationRef = tenant.organizationId;
  next();
}
