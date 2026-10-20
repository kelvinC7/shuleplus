import crypto from 'crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import { MfaMethod } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { sendOtpEmail } from '../utils/email';
import { maskPhone, sendOtpSms } from '../utils/sms';

export interface OtpDeliveryResult {
  sent: boolean;
  devMode: boolean;
  emailSent: boolean;
  smsSent: boolean;
  phoneMasked: string | null;
  message: string;
}

export interface MfaSessionData {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  rememberMe?: boolean;
  verificationStep?: number;
}

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export class MfaService {
  async createMfaSession(data: MfaSessionData): Promise<string> {
    const token = crypto.randomUUID();
    await prisma.mfaSession.create({
      data: {
        token,
        userId: data.userId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        rememberMe: data.rememberMe ?? false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    return token;
  }

  async getMfaSession(token: string): Promise<MfaSessionData | null> {
    const session = await prisma.mfaSession.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.mfaSession.delete({ where: { id: session.id } });
      return null;
    }
    return {
      userId: session.userId,
      ipAddress: session.ipAddress ?? undefined,
      userAgent: session.userAgent ?? undefined,
      rememberMe: session.rememberMe,
      verificationStep: session.verificationStep ?? 0,
    };
  }

  async setVerificationStep(token: string, step: number): Promise<void> {
    await prisma.mfaSession.updateMany({
      where: { token },
      data: { verificationStep: step },
    });
  }

  /** Second factor for SEI — SMS-only OTP (separate code from email step). */
  async sendSmsOtp(userId: string): Promise<OtpDeliveryResult> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.phone) {
      return {
        sent: false,
        devMode: true,
        emailSent: false,
        smsSent: false,
        phoneMasked: null,
        message: 'No phone on file — add a mobile number for SMS verification.',
      };
    }

    const otp = generateOtp();
    await prisma.mfaOtp.deleteMany({ where: { userId } });
    await prisma.mfaOtp.create({
      data: {
        userId,
        codeHash: hashOtp(otp),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const smsSent = await sendOtpSms(user.phone, otp);
    const phoneMasked = maskPhone(user.phone);

    return {
      sent: smsSent,
      devMode: !smsSent,
      emailSent: false,
      smsSent,
      phoneMasked,
      message: smsSent
        ? `Step 2: verification code sent via SMS to ${phoneMasked}`
        : 'SMS OTP logged to server console (SMS not configured)',
    };
  }

  async deleteMfaSession(token: string): Promise<void> {
    await prisma.mfaSession.deleteMany({ where: { token } });
  }

  async sendEmailOtp(userId: string, email: string): Promise<OtpDeliveryResult> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const otp = generateOtp();

    await prisma.mfaOtp.deleteMany({ where: { userId } });

    await prisma.mfaOtp.create({
      data: {
        userId,
        codeHash: hashOtp(otp),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const emailSent = await sendOtpEmail(email, otp, user.firstName);

    let smsSent = false;
    if (user.phone) {
      smsSent = await sendOtpSms(user.phone, otp);
    }

    const sent = emailSent || smsSent;
    const phoneMasked = user.phone ? maskPhone(user.phone) : null;

    let message = 'Verification code sent';
    if (emailSent && smsSent && phoneMasked) {
      message = `Verification code sent to your email and SMS (${phoneMasked})`;
    } else if (smsSent && phoneMasked) {
      message = `Verification code sent via SMS to ${phoneMasked}`;
    } else if (emailSent) {
      message = 'Verification code sent to your email';
    } else if (user.phone && !smsSent) {
      message = 'Could not deliver OTP. Check SMS configuration or backend console.';
    } else {
      message = 'OTP logged to server console (email/SMS not configured)';
    }

    return {
      sent,
      devMode: !sent,
      emailSent,
      smsSent,
      phoneMasked,
      message,
    };
  }

  async verifyEmailOtp(userId: string, code: string): Promise<boolean> {
    const stored = await prisma.mfaOtp.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!stored) return false;

    const valid = stored.codeHash === hashOtp(code);
    if (valid) await prisma.mfaOtp.delete({ where: { id: stored.id } });
    return valid;
  }

  async verifyAuthenticatorCode(userId: string, code: string): Promise<boolean> {
    const mfaSecret = await prisma.mfaSecret.findUnique({ where: { userId } });
    if (!mfaSecret?.isVerified || mfaSecret.method !== MfaMethod.AUTHENTICATOR_APP) {
      return false;
    }
    const result = await verify({ token: code, secret: mfaSecret.secret });
    return result.valid;
  }

  async setupAuthenticator(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secret = generateSecret();
    const otpauthUrl = generateURI({ issuer: 'ShulePlus', label: user.email, secret });

    await prisma.mfaSecret.upsert({
      where: { userId },
      update: { secret, method: MfaMethod.AUTHENTICATOR_APP, isVerified: false },
      create: {
        userId,
        secret,
        method: MfaMethod.AUTHENTICATOR_APP,
        isVerified: false,
      },
    });

    return { secret, otpauthUrl };
  }

  async confirmAuthenticator(userId: string, code: string): Promise<boolean> {
    const mfaSecret = await prisma.mfaSecret.findUnique({ where: { userId } });
    if (!mfaSecret) throw new AppError(400, 'Authenticator not initialized');

    const result = await verify({ token: code, secret: mfaSecret.secret });
    if (!result.valid) return false;

    await prisma.$transaction([
      prisma.mfaSecret.update({
        where: { userId },
        data: { isVerified: true },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true },
      }),
    ]);

    return true;
  }

  async getMfaStatus(userId: string) {
    const mfaSecret = await prisma.mfaSecret.findUnique({ where: { userId } });
    return {
      emailOtp: true,
      authenticatorEnabled: mfaSecret?.isVerified ?? false,
    };
  }
}

export const mfaService = new MfaService();
