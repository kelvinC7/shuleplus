import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error.middleware';

const createTenantSchema = z.object({
  organizationId: z.string().min(1),
  organizationName: z.string().min(1),
  organizationCode: z.string().optional(),
  schoolProfile: z
    .object({
      district: z.string().nullable().optional(),
      schoolCode: z.string().nullable().optional(),
      organizationCode: z.string().nullable().optional(),
    })
    .passthrough()
    .optional()
    .nullable(),
});

export const tenantController = {
  /** Service-to-service: IAM provisions a tenant for an organization. */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createTenantSchema.parse(req.body);
      const schoolCode =
        body.schoolProfile?.schoolCode ?? body.schoolProfile?.organizationCode ?? body.organizationCode;

      const tenant = await prisma.tenant.upsert({
        where: { organizationId: body.organizationId },
        create: {
          organizationId: body.organizationId,
          organizationCode: body.organizationCode ?? schoolCode,
          organizationName: body.organizationName,
          schoolCode: schoolCode ?? null,
          schoolProfile:
            body.schoolProfile != null ? (body.schoolProfile as unknown as object) : undefined,
        },
        update: {
          organizationCode: body.organizationCode ?? schoolCode,
          organizationName: body.organizationName,
          schoolCode: schoolCode ?? undefined,
          schoolProfile:
            body.schoolProfile != null ? (body.schoolProfile as unknown as object) : undefined,
        },
      });

      res.status(201).json({ success: true, data: tenant });
    } catch (error) {
      next(error);
    }
  },

  /** Authenticated: ensure the caller's organization has a tenant row (first-access bootstrap). */
  async ensure(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const existing = await prisma.tenant.findFirst({
        where: {
          OR: [{ organizationId: user.organizationId }, { organizationCode: user.organizationId }],
        },
      });
      if (existing) {
        res.json({ success: true, data: existing });
        return;
      }

      const tenant = await prisma.tenant.create({
        data: {
          organizationId: user.organizationId,
          organizationName: 'Organization',
        },
      });
      res.status(201).json({ success: true, data: tenant });
    } catch (error) {
      next(error);
    }
  },

  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { organizationId: req.organizationRef! },
            { organizationCode: req.organizationRef! },
          ],
        },
      });
      if (!tenant) throw new AppError(404, 'Tenant not found');
      res.json({ success: true, data: tenant });
    } catch (error) {
      next(error);
    }
  },
};
