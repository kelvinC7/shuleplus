import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { mfaService } from '../services/mfa.service';
import { authService } from '../services/auth.service';
import { AppError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { ROLES } from '../constants/roles';

const verifySchema = z.object({
  mfaSessionToken: z.string().uuid(),
  code: z.string().min(6).max(8),
  method: z.enum(['email_otp', 'authenticator']),
});

const resendSchema = z.object({
  mfaSessionToken: z.string().uuid(),
});

const setupConfirmSchema = z.object({
  mfaSessionToken: z.string().uuid().optional(),
  code: z.string().length(6),
});

const setupInitSchema = z.object({
  mfaSessionToken: z.string().uuid(),
});

export class MfaController {
  async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { mfaSessionToken } = resendSchema.parse(req.body);
      const session = await mfaService.getMfaSession(mfaSessionToken);
      if (!session) throw new AppError(401, 'MFA session expired. Please login again.');

      const user = await authService.getUserById(session.userId);
      const result = await mfaService.sendEmailOtp(session.userId, user.email);

      res.json({
        success: true,
        message: result.message,
        devMode: result.devMode,
        otpDelivery: {
          email: result.emailSent,
          sms: result.smsSent,
          phoneMasked: result.phoneMasked,
        },
      });
    } catch (e) {
      next(e);
    }
  }

  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const { mfaSessionToken, code, method } = verifySchema.parse(req.body);
      const session = await mfaService.getMfaSession(mfaSessionToken);
      if (!session) throw new AppError(401, 'MFA session expired. Please login again.');

      let valid = false;
      if (method === 'email_otp') {
        valid = await mfaService.verifyEmailOtp(session.userId, code);
      } else {
        valid = await mfaService.verifyAuthenticatorCode(session.userId, code);
      }

      if (!valid) throw new AppError(401, 'Invalid verification code');

      const userRoles = await prisma.userRole.findMany({
        where: { userId: session.userId },
        include: { role: { select: { slug: true } } },
      });
      const roleSlugs = userRoles.map((r) => r.role.slug);
      const seiProfile = roleSlugs.includes(ROLES.SECTOR_EDUCATION_INSPECTOR)
        ? await prisma.seiOfficerProfile.findUnique({
            where: { userId: session.userId },
            select: { requireDualOtp: true },
          })
        : null;
      const deoProfile = roleSlugs.includes(ROLES.DISTRICT_EDUCATION_OFFICER)
        ? await prisma.deoOfficerProfile.findUnique({
            where: { userId: session.userId },
            select: { requireDualOtp: true },
          })
        : null;

      const dualOtpRole =
        (roleSlugs.includes(ROLES.SECTOR_EDUCATION_INSPECTOR) && seiProfile?.requireDualOtp !== false) ||
        (roleSlugs.includes(ROLES.DISTRICT_EDUCATION_OFFICER) && deoProfile?.requireDualOtp !== false);

      const needsSecondOtp =
        dualOtpRole &&
        (session.verificationStep ?? 0) === 0 &&
        method === 'email_otp';

      if (needsSecondOtp) {
        await mfaService.setVerificationStep(mfaSessionToken, 1);
        const smsResult = await mfaService.sendSmsOtp(session.userId);
        return res.json({
          success: true,
          data: {
            requiresSecondOtp: true,
            mfaSessionToken,
            step: 2,
            deliveryMessage: smsResult.message,
            otpDelivery: {
              email: false,
              sms: smsResult.smsSent,
              phoneMasked: smsResult.phoneMasked,
            },
            devOtpHint: smsResult.devMode ? smsResult.message : undefined,
          },
        });
      }

      await mfaService.deleteMfaSession(mfaSessionToken);

      const result = await authService.completeLoginAfterMfa(session.userId, {
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        rememberMe: session.rememberMe,
      });

      const mfaStatus = await mfaService.getMfaStatus(session.userId);

      res.json({
        success: true,
        data: {
          ...result,
          suggestAuthenticatorSetup: !mfaStatus.authenticatorEnabled,
        },
      });
    } catch (e) {
      next(e);
    }
  }

  async setupAuthenticator(req: Request, res: Response, next: NextFunction) {
    try {
      const { mfaSessionToken } = setupInitSchema.parse(req.body);
      const session = await mfaService.getMfaSession(mfaSessionToken);
      if (!session) throw new AppError(401, 'MFA session expired. Please login again.');

      const setup = await mfaService.setupAuthenticator(session.userId);
      res.json({ success: true, data: setup });
    } catch (e) {
      next(e);
    }
  }

  async confirmAuthenticator(req: Request, res: Response, next: NextFunction) {
    try {
      const { mfaSessionToken, code } = setupConfirmSchema.parse(req.body);

      let userId: string;
      if (mfaSessionToken) {
        const session = await mfaService.getMfaSession(mfaSessionToken);
        if (!session) throw new AppError(401, 'MFA session expired');
        userId = session.userId;
      } else {
        userId = (req as AuthenticatedRequest).user!.sub;
      }

      const valid = await mfaService.confirmAuthenticator(userId, code);
      if (!valid) throw new AppError(401, 'Invalid authenticator code');

      res.json({ success: true, message: 'Authenticator app enabled successfully' });
    } catch (e) {
      next(e);
    }
  }

  async status(req: Request, res: Response, next: NextFunction) {
    try {
      const { mfaSessionToken } = setupInitSchema.parse(req.body);
      const session = await mfaService.getMfaSession(mfaSessionToken);
      if (!session) throw new AppError(401, 'MFA session expired');

      const data = await mfaService.getMfaStatus(session.userId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const mfaController = new MfaController();
