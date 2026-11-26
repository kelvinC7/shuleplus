import jwt from 'jsonwebtoken';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { sendTransactionalSms } from '../clients/notification-sms.client';
import { AppError } from '../middleware/error.middleware';
import { hashPassword, normalizeParentPin, phoneVariants, sanitizePhone, verifyPassword } from '../utils/password';
import {
  isGuardianPhoneInStudentManagement,
  resolvePortalFeaturesForParent,
} from './parent-portal-mode.service';
import { provisionParentFromStudentManagement } from './sm-parent-sync.service';
import { phonesMatch, provisionParentFromPublishedTrips } from './trip-guardian-provision.service';
import { pruneGuardianLinksOutsideManifest } from './manifest-guardian-scope.service';
import { listLinkedStudents } from './parent-context.service';
import {
  assertGuardianEmailMatchesPhone,
  collectRegisteredGuardianEmails,
} from './parent-guardian-email.service';

const PIN_RESET_PURPOSE = 'parent-pin-reset';
const PIN_RESET_TTL = '15m';
const RESET_OTP_TTL_MS = 10 * 60 * 1000;
const RESET_OTP_RESEND_MS = 60 * 1000;
const RESET_OTP_MAX_ATTEMPTS = 5;

function resetDigest(value: string) {
  return createHmac('sha256', env.JWT_ACCESS_SECRET).update(value).digest('hex');
}

function digestMatches(actual: string, expected: string) {
  const actualBytes = Buffer.from(actual, 'hex');
  const expectedBytes = Buffer.from(expected, 'hex');
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function issueToken(parent: { id: string; email: string | null; organizationId: string; phone?: string }) {
  const payload = {
    sub: parent.id,
    parentId: parent.id,
    email: parent.email ?? '',
    phone: parent.phone,
    organizationId: parent.organizationId,
    sessionId: randomUUID(),
    roles: ['parent'],
    modules: [env.MODULE_SLUG],
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: '12h',
    algorithm: 'HS256',
  });
}

async function linkedStudents(parentId: string) {
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId },
    include: { student: true },
  });
  return links.map(({ student, relationship }) => ({
    id: student.id,
    name: `${student.firstName} ${student.lastName}`,
    firstName: student.firstName,
    lastName: student.lastName,
    studentCode: student.shuleCode,
    className: student.className,
    photo: student.avatarUrl,
    role: relationship,
    organizationId: student.organizationId,
  }));
}

function serializeParent(parent: {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  organizationId: string;
}) {
  return {
    id: parent.id,
    firstName: parent.firstName,
    lastName: parent.lastName,
    phone: parent.phone,
    email: parent.email,
    organizationId: parent.organizationId,
  };
}

export class AuthService {
  private async findParentByPhone(phoneRaw: string) {
    const variants = phoneVariants(phoneRaw);
    return prisma.parentAccount.findFirst({
      where: { phone: { in: variants } },
      include: { students: { include: { student: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async portalFeaturesForParent(organizationId: string, parentId: string) {
    return resolvePortalFeaturesForParent(organizationId, parentId);
  }

  private async ensureParentAccountForPhone(phoneRaw: string) {
    await provisionParentFromStudentManagement(phoneRaw);
    let parent = await this.findParentByPhone(phoneRaw);
    if (parent) return parent;

    await provisionParentFromPublishedTrips(phoneRaw);
    return this.findParentByPhone(phoneRaw);
  }

  async status(phoneRaw: string) {
    let parent = await this.ensureParentAccountForPhone(phoneRaw);

    if (parent) {
      const inStudentManagement = await isGuardianPhoneInStudentManagement(phoneRaw);
      if (!inStudentManagement) {
        await provisionParentFromPublishedTrips(phoneRaw);
        await pruneGuardianLinksOutsideManifest(parent.id, parent.phone);
        parent = (await this.findParentByPhone(phoneRaw)) ?? parent;
      } else {
        await provisionParentFromStudentManagement(phoneRaw);
        parent = (await this.findParentByPhone(phoneRaw)) ?? parent;
      }
    }

    if (!parent) {
      const digits = String(phoneRaw).replace(/\D/g, '');
      const hint =
        digits.length > 0 && digits.length < 10
          ? ' This number looks too short — Rwanda mobiles are usually 10 digits (e.g. 0777777777).'
          : '';
      throw new AppError(
        404,
        `No parent account found for this phone number.${hint} Use the guardian phone saved on your child in Student Management, or the number on the ShuleTrip manifest after the school submits the trip.`
      );
    }

    const portalFeatures = await this.portalFeaturesForParent(parent.organizationId, parent.id);

    return {
      phone: parent.phone,
      hasPassword: parent.hasPassword,
      hasPin: parent.hasPassword,
      needsPinSetup: !parent.hasPassword,
      displayName: `${parent.firstName} ${parent.lastName}`,
      portalFeatures,
      students: (
        await listLinkedStudents(parent.id, parent.organizationId)
      ).map((student) => ({
        id: student.id,
        name: student.fullName,
        studentCode: student.shuleCode,
        className: student.className,
        role: student.relationship,
      })),
    };
  }

  async login(phoneRaw: string, password: string) {
    const pin = normalizeParentPin(password);
    const variants = phoneVariants(phoneRaw);
    const parent = await prisma.parentAccount.findFirst({ where: { phone: { in: variants } } });

    if (!parent || !parent.passwordHash || !parent.hasPassword) {
      throw new AppError(401, 'Invalid phone number or PIN');
    }

    if (!verifyPassword(pin, parent.passwordHash)) {
      throw new AppError(401, 'Invalid phone number or PIN');
    }

    await provisionParentFromPublishedTrips(phoneRaw);
    await pruneGuardianLinksOutsideManifest(parent.id, parent.phone);

    const token = issueToken(parent);
    const studentsRaw = await listLinkedStudents(parent.id, parent.organizationId);
    const students = studentsRaw.map((student) => ({
      id: student.id,
      name: student.fullName,
      firstName: student.firstName,
      lastName: student.lastName,
      studentCode: student.shuleCode,
      className: student.className,
      photo: student.avatarUrl,
      role: student.relationship,
      organizationId: student.organizationId,
    }));
    await prisma.activityLog.create({
      data: {
        organizationId: parent.organizationId,
        userId: parent.id,
        action: 'PARENT_LOGIN',
        description: `${parent.firstName} ${parent.lastName} signed in to Parent Portal`,
      },
    });

    const portalFeatures = await this.portalFeaturesForParent(parent.organizationId, parent.id);
    return { token, parent: serializeParent(parent), students, portalFeatures };
  }

  async requestPinResetOtp(phoneRaw: string) {
    const genericResponse = { message: 'If an account exists for this number, a verification code has been sent.' };
    const parent = await this.ensureParentAccountForPhone(phoneRaw);
    if (!parent?.hasPassword) return genericResponse;

    const now = new Date();
    const existing = await prisma.parentPasswordResetOtp.findUnique({ where: { parentId: parent.id } });
    if (existing && now.getTime() - existing.lastSentAt.getTime() < RESET_OTP_RESEND_MS) {
      return genericResponse;
    }

    const code = String(randomInt(100000, 1000000));
    await prisma.parentPasswordResetOtp.upsert({
      where: { parentId: parent.id },
      create: {
        parentId: parent.id,
        phone: parent.phone,
        otpHash: resetDigest(`${parent.id}:${code}`),
        expiresAt: new Date(now.getTime() + RESET_OTP_TTL_MS),
        attempts: 0,
        lastSentAt: now,
      },
      update: {
        phone: parent.phone,
        otpHash: resetDigest(`${parent.id}:${code}`),
        expiresAt: new Date(now.getTime() + RESET_OTP_TTL_MS),
        attempts: 0,
        lastSentAt: now,
        verifiedAt: null,
        resetTokenHash: null,
      },
    });

    const delivered = await sendTransactionalSms(
      sanitizePhone(parent.phone),
      `Your yoShule parent account verification code is ${code}. It expires in 10 minutes. Do not share this code.`
    );
    if (!delivered) console.warn(`[ParentMIS] Password reset OTP was not delivered to ***${parent.phone.slice(-4)}`);
    return genericResponse;
  }

  async verifyPinResetOtp(phoneRaw: string, code: string) {
    const parent = await this.findParentByPhone(phoneRaw);
    const invalidCode = () => new AppError(400, 'Invalid or expired verification code');
    if (!parent?.hasPassword) throw invalidCode();

    const now = new Date();
    const claimed = await prisma.parentPasswordResetOtp.updateMany({
      where: {
        parentId: parent.id,
        expiresAt: { gt: now },
        attempts: { lt: RESET_OTP_MAX_ATTEMPTS },
        verifiedAt: null,
      },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count !== 1) throw invalidCode();

    const challenge = await prisma.parentPasswordResetOtp.findUnique({ where: { parentId: parent.id } });
    if (!challenge || !digestMatches(resetDigest(`${parent.id}:${code}`), challenge.otpHash)) {
      throw invalidCode();
    }

    const resetToken = jwt.sign(
      { sub: parent.id, purpose: PIN_RESET_PURPOSE, phone: parent.phone, method: 'sms', jti: randomUUID() },
      env.JWT_ACCESS_SECRET,
      { expiresIn: PIN_RESET_TTL, algorithm: 'HS256' }
    );
    await prisma.parentPasswordResetOtp.update({
      where: { parentId: parent.id },
      data: { verifiedAt: now, resetTokenHash: resetDigest(resetToken) },
    });
    return { resetToken, expiresInMinutes: 15 };
  }

  async verifyPinResetEmail(phoneRaw: string, email: string) {
    await assertGuardianEmailMatchesPhone(phoneRaw, email);
    let parent = await this.ensureParentAccountForPhone(phoneRaw);
    if (!parent) {
      throw new AppError(404, 'No parent account found for this phone number');
    }

    const resetToken = jwt.sign(
      { sub: parent.id, purpose: PIN_RESET_PURPOSE, phone: parent.phone },
      env.JWT_ACCESS_SECRET,
      { expiresIn: PIN_RESET_TTL, algorithm: 'HS256' }
    );

    return { resetToken, expiresInMinutes: 15 };
  }

  async pinResetEmailHint(phoneRaw: string) {
    const emails = await collectRegisteredGuardianEmails(phoneRaw);
    const first = emails[0];
    if (!first) return { hasEmailOnFile: false as const };
    const [local, domain] = first.split('@');
    const masked =
      local.length <= 2 ? `${local[0] ?? '*'}***@${domain}` : `${local.slice(0, 2)}***@${domain}`;
    return { hasEmailOnFile: true as const, maskedEmail: masked };
  }

  private verifyPinResetToken(phoneRaw: string, resetToken: string, parentId: string) {
    try {
      const payload = jwt.verify(resetToken, env.JWT_ACCESS_SECRET) as {
        sub?: string;
        purpose?: string;
        phone?: string;
      };
      if (payload.purpose !== PIN_RESET_PURPOSE || payload.sub !== parentId) {
        throw new AppError(403, 'PIN reset verification expired. Confirm your email again.');
      }
      if ((payload as { method?: string }).method === 'sms') {
        throw new AppError(403, 'PIN reset verification expired. Confirm your phone number again.');
      }
      if (!phonesMatch(payload.phone, phoneRaw)) {
        throw new AppError(403, 'PIN reset verification does not match this phone number.');
      }
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError(403, 'PIN reset verification expired. Confirm your email again.');
    }
  }

  async setPassword(
    phoneRaw: string,
    password: string,
    confirmPassword: string,
    options?: { reset?: boolean; resetToken?: string; resetMethod?: 'sms' }
  ) {
    const pin = normalizeParentPin(password);
    const confirmPin = normalizeParentPin(confirmPassword);
    if (pin !== confirmPin) {
      throw new AppError(400, 'PINs do not match');
    }

    let parent = await this.ensureParentAccountForPhone(phoneRaw);
    if (!parent) {
      throw new AppError(404, 'No parent account found for this phone number');
    }

    if (options?.resetMethod === 'sms' && !parent.hasPassword) {
      throw new AppError(403, 'SMS PIN reset is only available for an existing PIN');
    }
    const isReset = Boolean(options?.reset && parent.hasPassword);
    let smsResetTokenHash: string | null = null;
    if (isReset) {
      const token = String(options?.resetToken ?? '').trim();
      if (!token) {
        throw new AppError(400, 'Verify your phone number before resetting your PIN');
      }
      if (options?.resetMethod === 'sms') {
        try {
          const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
            sub?: string;
            purpose?: string;
            phone?: string;
            method?: string;
          };
          if (
            payload.purpose !== PIN_RESET_PURPOSE ||
            payload.sub !== parent.id ||
            payload.method !== 'sms' ||
            !phonesMatch(payload.phone, phoneRaw)
          ) throw new Error('Invalid reset token');
          smsResetTokenHash = resetDigest(token);
        } catch {
          throw new AppError(403, 'PIN reset verification expired. Verify your phone number again.');
        }
      } else {
        this.verifyPinResetToken(phoneRaw, token, parent.id);
      }
    }

    const updated = smsResetTokenHash
      ? await prisma.$transaction(async (tx) => {
          const consumed = await tx.parentPasswordResetOtp.deleteMany({
            where: {
              parentId: parent.id,
              resetTokenHash: smsResetTokenHash,
              expiresAt: { gt: new Date() },
              verifiedAt: { not: null },
            },
          });
          if (consumed.count !== 1) {
            throw new AppError(403, 'PIN reset verification expired. Verify your phone number again.');
          }
          return tx.parentAccount.update({
            where: { id: parent.id },
            data: { passwordHash: hashPassword(pin), hasPassword: true },
          });
        })
      : await prisma.parentAccount.update({
          where: { id: parent.id },
          data: { passwordHash: hashPassword(pin), hasPassword: true },
        });

    await provisionParentFromPublishedTrips(phoneRaw);
    await pruneGuardianLinksOutsideManifest(updated.id, updated.phone);

    const token = issueToken(updated);
    const studentsRaw = await listLinkedStudents(updated.id, updated.organizationId);
    const students = studentsRaw.map((student) => ({
      id: student.id,
      name: student.fullName,
      firstName: student.firstName,
      lastName: student.lastName,
      studentCode: student.shuleCode,
      className: student.className,
      photo: student.avatarUrl,
      role: student.relationship,
      organizationId: student.organizationId,
    }));
    await prisma.activityLog.create({
      data: {
        organizationId: updated.organizationId,
        userId: updated.id,
        action: 'PARENT_PASSWORD_SET',
        description: `${updated.firstName} ${updated.lastName} set a Parent Portal password`,
      },
    });

    const portalFeatures = await this.portalFeaturesForParent(updated.organizationId, updated.id);
    return { token, parent: serializeParent(updated), students, portalFeatures };
  }
}

export const authService = new AuthService();
