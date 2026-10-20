import { Response, NextFunction } from 'express';
import { TenantStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from './error.middleware';
import type { AuthenticatedRequest } from './auth.middleware';

/**
 * Ensure the caller's org exists as a Timetable tenant.
 * Lazy-creates on first Teacher Portal / Timetable access so schedule APIs work
 * without a separate provisioning round-trip.
 */
export async function requireTenant(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) throw new AppError(401, 'Authentication required');

    let tenant = await prisma.tenant.findUnique({ where: { organizationId: orgId } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          organizationId: orgId,
          organizationName: `Organization ${orgId.slice(0, 8)}`,
          status: TenantStatus.ACTIVE,
        },
      });
    }

    req.organizationRef = orgId;
    next();
  } catch (err) {
    next(err);
  }
}
