import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest, orgScope, param } from '../types';
import { AppError } from '../middleware/error.middleware';

export const applicationController = {
  /** Public application status lookup (landing page) — no auth required. */
  async getByIdPublic(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = param(req, 'id');
      const application = await prisma.onboardingRequest.findFirst({
        where: {
          OR: [
            { id },
            { supplierId: id },
            { schoolCode: id },
          ],
        },
        select: {
          id: true,
          entityType: true,
          status: true,
          schoolCode: true,
          isLive: true,
          createdAt: true,
          updatedAt: true,
          metadata: true,
        },
      });
      if (!application) throw new AppError(404, 'Application not found');
      res.json({ success: true, data: application });
    } catch (error) {
      next(error);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const org = orgScope(req.user);
      const applications = await prisma.onboardingRequest.findMany({
        where: org ? { organizationId: org } : {},
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { supplier: true },
      });
      res.json({ success: true, data: applications });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const application = await prisma.onboardingRequest.findUnique({
        where: { id: param(req, 'id') },
        include: { supplier: true },
      });
      if (!application) throw new AppError(404, 'Application not found');
      res.json({ success: true, data: application });
    } catch (error) {
      next(error);
    }
  },

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const application = await prisma.onboardingRequest.findUnique({ where: { id: param(req, 'id') } });
      if (!application) throw new AppError(404, 'Application not found');

      const updated = await prisma.onboardingRequest.update({
        where: { id: application.id },
        data: {
          status: 'APPROVED',
          approvedById: req.user?.sub ?? null,
          approvedAt: new Date(),
          isLive: true,
        },
      });

      if (application.supplierId) {
        await prisma.supplier.update({
          where: { id: application.supplierId },
          data: { status: 'ACTIVE', approvedAt: new Date() },
        });
      }

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const application = await prisma.onboardingRequest.findUnique({ where: { id: param(req, 'id') } });
      if (!application) throw new AppError(404, 'Application not found');

      const updated = await prisma.onboardingRequest.update({
        where: { id: application.id },
        data: { status: 'REJECTED', approvedById: req.user?.sub ?? null, approvedAt: new Date() },
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },
};
