import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from './auth.middleware';
import { AppError } from './error.middleware';
import { Request } from 'express';

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

// Service-to-service tenant resolution: reads organizationId from body or query
export async function requireServiceTenant(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const body = req.body as Record<string, unknown> | undefined;
  const organizationId = (body?.organizationId as string) || (req.query.organizationId as string);

  if (!organizationId) {
    throw new AppError(400, 'organizationId is required in request body or query');
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ organizationId }, { organizationCode: organizationId }],
      status: 'ACTIVE',
    },
  });

  if (!tenant) {
    throw new AppError(403, 'Tenant not provisioned for this organization');
  }

  (req as AuthenticatedRequest).organizationRef = tenant.organizationId;
  next();
}
