import { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { Prisma } from '../generated/prisma';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { teacherAccountService } from '../services/teacher-account.service';
import { teacherProfileService } from '../services/teacher-profile.service';

function orgId(req: AuthenticatedRequest) {
  const id = req.organizationRef ?? req.user?.organizationId;
  if (!id) throw new AppError(401, 'Missing organization context');
  return id;
}

function actorId(req: AuthenticatedRequest) {
  return req.user!.sub;
}

const accountBodySchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  requirePasswordChange: z.boolean().optional(),
  sendCredentialsEmail: z.boolean().optional(),
});

const profileSchema = z.object({
  teacherUserId: z.string().optional(),
  teacherName: z.string(),
  position: z.string().nullable().optional(),
  employeeNumber: z.string().nullable().optional(),
  maxPeriodsPerDay: z.number().optional(),
  availableDays: z.array(z.string()).optional(),
  preferredSlots: z.array(z.unknown()).optional(),
  unavailableSlots: z.array(z.unknown()).optional(),
  portalEnabled: z.boolean().optional(),
  loginMethod: z.enum(['email', 'phone', 'both']).optional(),
  loginEmail: z.string().nullable().optional(),
  loginPhone: z.string().nullable().optional(),
});

export const teacherAccountController = {
  async checkIdentifier(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          email: z.string().optional(),
          phone: z.string().optional(),
          excludeUserId: z.string().optional(),
        })
        .parse(req.body);
      const data = await teacherAccountService.checkIdentifier(orgId(req), body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async saveProfileWithAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          profile: profileSchema,
          account: accountBodySchema.optional(),
        })
        .parse(req.body);

      let teacherUserId =
        body.profile.teacherUserId?.trim() ||
        `teacher-${body.profile.teacherName.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}`;

      let employeeNumber = body.profile.employeeNumber ?? undefined;

      if (body.profile.portalEnabled) {
        const provisioned = await teacherAccountService.saveAccount(
          orgId(req),
          actorId(req),
          {
            teacherUserId,
            teacherName: body.profile.teacherName,
            portalEnabled: true,
            loginMethod: body.profile.loginMethod,
            loginEmail: body.profile.loginEmail,
            loginPhone: body.profile.loginPhone,
          },
          body.account ?? {},
        );
        teacherUserId = provisioned.teacherUserId;
        if (provisioned.employeeId) {
          employeeNumber = provisioned.employeeId;
        }
      }

      const saved = await teacherProfileService.upsert(orgId(req), {
        ...body.profile,
        teacherUserId,
        employeeNumber,
        preferredSlots: body.profile.preferredSlots as Prisma.InputJsonValue | undefined,
        unavailableSlots: body.profile.unavailableSlots as Prisma.InputJsonValue | undefined,
      });

      const [enriched] = await teacherAccountService.enrichProfiles(orgId(req), [saved]);
      res.json({ success: true, data: enriched });
    } catch (e) {
      next(e);
    }
  },

  async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const teacherUserId = decodeURIComponent(String(req.params.teacherUserId));
      const body = accountBodySchema.parse(req.body ?? {});
      const data = await teacherAccountService.resetPassword(
        orgId(req),
        actorId(req),
        teacherUserId,
        { password: body.password, sendEmail: body.sendCredentialsEmail },
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async disableAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const teacherUserId = decodeURIComponent(String(req.params.teacherUserId));
      const data = await teacherAccountService.disableAccount(
        orgId(req),
        actorId(req),
        teacherUserId,
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async enableAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const teacherUserId = decodeURIComponent(String(req.params.teacherUserId));
      const data = await teacherAccountService.enableAccount(
        orgId(req),
        actorId(req),
        teacherUserId,
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
