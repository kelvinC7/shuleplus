import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest, hasPlatformPrintScope } from './auth.middleware';
import { AppError } from './error.middleware';

export async function requireTenant(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');

  if (hasPlatformPrintScope(user)) {
    req.organizationRef = user.organizationId;
    return next();
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ organizationId: user.organizationId }, { organizationCode: user.organizationId }],
      status: 'ACTIVE',
    },
  });

  if (!tenant) {
    throw new AppError(403, 'Tenant not provisioned for this organization');
  }

  req.organizationRef = tenant.organizationId;
  next();
}
