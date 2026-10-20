import { Response, NextFunction } from 'express';
import { TenantStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

/**
 * Ensure the caller's org exists as a Teacher Portal tenant.
 * Lazy-creates on first access when the org is licensed — no separate provision step per teacher.
 */
export async function requireTenant(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;
    if (!user) throw new AppError(401, 'Authentication required');

    const orgId = user.organizationId;
    let tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ organizationId: orgId }, { organizationCode: orgId }],
        status: TenantStatus.ACTIVE,
      },
    });

    if (!tenant) {
      try {
        tenant = await prisma.tenant.create({
          data: {
            organizationId: orgId,
            organizationName: `Organization ${orgId.slice(0, 8)}`,
            status: TenantStatus.ACTIVE,
          },
        });
      } catch {
        tenant = await prisma.tenant.findFirst({
          where: { OR: [{ organizationId: orgId }, { organizationCode: orgId }] },
        });
      }
    }

    if (!tenant) throw new AppError(403, 'Teacher Portal tenant could not be created for this school');

    req.organizationRef = tenant.organizationId;
    next();
  } catch (err) {
    next(err);
  }
}
