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

  let tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ organizationId: user.organizationId }, { organizationCode: user.organizationId }],
      status: 'ACTIVE',
    },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        organizationId: user.organizationId,
        organizationName: 'School',
        status: 'ACTIVE',
      },
    });
  }

  req.organizationRef = tenant.organizationId;
  next();
}
