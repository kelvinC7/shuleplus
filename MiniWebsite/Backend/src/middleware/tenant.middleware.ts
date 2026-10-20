import { Request, Response, NextFunction } from 'express';
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

/** Service-to-service: resolve tenant from organizationId in body or query. */
export async function requireServiceTenant(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const body = req.body as Record<string, unknown> | undefined;
  const organizationId =
    (typeof body?.organizationId === 'string' && body.organizationId) ||
    (typeof req.query.organizationId === 'string' && req.query.organizationId) ||
    '';

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
