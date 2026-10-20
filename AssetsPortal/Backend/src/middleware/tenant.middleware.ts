import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

export async function requireTenant(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');

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
