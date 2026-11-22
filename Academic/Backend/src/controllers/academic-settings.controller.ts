import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import {
  defaultAcademicSettings,
  fetchIamAcademicSettings,
  fetchIamOrgUsersForFooter,
} from '../clients/iam.client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

const reportFooterSchema = z.object({
  mode: z.enum(['head_teacher', 'custom']),
  roleLabel: z.string().trim().min(1).max(100),
  selectedUserId: z.string().trim().nullable().optional(),
  selectedUserName: z.string().trim().min(1).max(200),
  selectedUserEmail: z.string().trim().email().nullable().optional(),
});

export class AcademicSettingsController {
  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const [settings, tenant] = await Promise.all([
        fetchIamAcademicSettings(req.organizationRef!),
        prisma.tenant.findUnique({
          where: { organizationId: req.organizationRef! },
          select: { reportFooterSettings: true },
        }),
      ]);
      res.json({
        success: true,
        data: {
          ...(settings ?? defaultAcademicSettings()),
          reportFooter: tenant?.reportFooterSettings ?? settings?.reportFooter ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async saveReportFooter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = reportFooterSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid report footer settings');
      }
      const reportFooter = {
        ...parsed.data,
        selectedUserId: parsed.data.selectedUserId || null,
        selectedUserEmail: parsed.data.selectedUserEmail || null,
      };
      await prisma.tenant.update({
        where: { organizationId: req.organizationRef! },
        data: { reportFooterSettings: reportFooter },
      });
      res.json({ success: true, data: reportFooter });
    } catch (error) {
      next(error);
    }
  }

  async listReportFooterStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const users = await fetchIamOrgUsersForFooter(req.organizationRef!);
      const staff = users
        .filter((user) => user.status === 'ACTIVE')
        .map((user) => ({
          id: user.id,
          name: user.name || [user.firstName, user.lastName].filter(Boolean).join(' '),
          email: user.email,
          role: user.position || user.roles.join(', '),
        }))
        .filter((user) => user.name)
        .sort((a, b) => a.name.localeCompare(b.name));
      res.json({ success: true, data: staff });
    } catch (error) {
      next(error);
    }
  }
}

export const academicSettingsController = new AcademicSettingsController();
