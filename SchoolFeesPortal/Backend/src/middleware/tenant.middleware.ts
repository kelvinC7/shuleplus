import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { tenantService } from '../services/tenant.service';

export async function requireTenant(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');
  if (!user.organizationId) throw new AppError(401, 'Token is missing organizationId');

  if (user.roles?.includes('root_admin') || user.roles?.includes('super_admin')) {
    req.organizationRef = user.organizationId;
    return next();
  }

  try {
    let tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ organizationId: user.organizationId }, { organizationCode: user.organizationId }],
        status: 'ACTIVE',
      },
    });

    if (!tenant) {
      tenant = await tenantService.createTenant({
        organizationId: user.organizationId,
        organizationName: 'Organization',
      });
    }

    req.organizationRef = tenant.organizationId;
    next();
  } catch (err) {
    console.error('[School Fees] requireTenant failed; continuing with JWT organizationId:', err);
    req.organizationRef = user.organizationId;
    next();
  }
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
