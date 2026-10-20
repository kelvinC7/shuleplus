import { organizationAdminService } from './organization-admin.service';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';
import { UserStatus } from '../generated/prisma';
import { normalizeRwandaPhone, isValidRwandaPhone } from '../utils/phone.utils';
import { validateTeacherPassword, isValidEmail } from '../utils/teacher-password.utils';
import { hashPassword } from '../utils/security';

export type TeacherLoginMethod = 'email' | 'phone' | 'both';

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Teacher' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function syntheticEmailFromPhone(phone: string, organizationId: string): string {
  const digits = phone.replace(/\D/g, '');
  return `teacher.${digits}@${organizationId.slice(0, 8)}.portal.local`;
}

export const teacherAccountInternalService = {
  async checkIdentifier(
    organizationId: string,
    input: { email?: string; phone?: string; excludeUserId?: string }
  ) {
    const email = input.email?.trim().toLowerCase();
    const phone = input.phone ? normalizeRwandaPhone(input.phone) : null;

    if (email) {
      const existing = await prisma.user.findFirst({
        where: {
          email,
          ...(input.excludeUserId ? { id: { not: input.excludeUserId } } : {}),
        },
        select: { id: true, organizationId: true },
      });
      if (existing) {
        const sameOrg = existing.organizationId === organizationId;
        return {
          available: false,
          field: 'email' as const,
          message: sameOrg
            ? 'This email is already associated with another account.'
            : 'This email is already registered on the platform.',
        };
      }
    }

    if (phone) {
      const existing = await prisma.user.findFirst({
        where: {
          phone,
          ...(input.excludeUserId ? { id: { not: input.excludeUserId } } : {}),
        },
        select: { id: true, organizationId: true },
      });
      if (existing) {
        const sameOrg = existing.organizationId === organizationId;
        return {
          available: false,
          field: 'phone' as const,
          message: sameOrg
            ? 'This phone number is already associated with another account.'
            : 'This phone number is already registered on the platform.',
        };
      }
    }

    return { available: true };
  },

  async getAccount(organizationId: string, userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: {
        id: true,
        email: true,
        phone: true,
        employeeId: true,
        status: true,
        lastLoginAt: true,
        mustChangePassword: true,
      },
    });
    if (!user) return null;
    return {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      employeeId: user.employeeId?.trim() || null,
      status: user.status,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      mustChangePassword: user.mustChangePassword,
    };
  },

  async provisionAccount(
    actorId: string,
    organizationId: string,
    input: {
      teacherName: string;
      loginMethod: TeacherLoginMethod;
      email?: string;
      phone?: string;
      password?: string;
      portalEnabled?: boolean;
      existingUserId?: string;
      requirePasswordChange?: boolean;
      sendCredentialsEmail?: boolean;
    }
  ) {
    if (!input.portalEnabled) {
      return { userId: input.existingUserId ?? null, created: false };
    }

    const loginMethod = input.loginMethod ?? 'email';
    const emailRaw = input.email?.trim().toLowerCase() ?? '';
    const phoneNorm = input.phone ? normalizeRwandaPhone(input.phone) : null;

    if (loginMethod === 'email' || loginMethod === 'both') {
      if (!emailRaw || !isValidEmail(emailRaw)) {
        throw new AppError(400, 'A valid login email is required');
      }
    }
    if (loginMethod === 'phone' || loginMethod === 'both') {
      if (!phoneNorm || !isValidRwandaPhone(input.phone ?? '')) {
        throw new AppError(400, 'A valid Rwanda phone number is required (+250 7XX XXX XXX)');
      }
    }

    const resolvedEmail =
      emailRaw ||
      (phoneNorm ? syntheticEmailFromPhone(phoneNorm, organizationId) : '');

    if (!resolvedEmail) {
      throw new AppError(400, 'Login email or phone is required for portal access');
    }

    const check = await this.checkIdentifier(organizationId, {
      email: resolvedEmail,
      phone: phoneNorm ?? undefined,
      excludeUserId: input.existingUserId,
    });
    if (!check.available) {
      throw new AppError(409, check.message ?? 'Identifier not available');
    }

    if (input.password) {
      const policyError = validateTeacherPassword(input.password);
      if (policyError) throw new AppError(400, policyError);
    } else if (!input.existingUserId) {
      throw new AppError(400, 'Password is required when creating a new portal account');
    }

    const { firstName, lastName } = splitName(input.teacherName);

    if (input.existingUserId) {
      const user = await prisma.user.findFirst({
        where: { id: input.existingUserId, organizationId },
      });
      if (!user) throw new AppError(404, 'Teacher account not found');

      await prisma.user.update({
        where: { id: user.id },
        data: {
          email: resolvedEmail,
          phone: phoneNorm,
          firstName,
          lastName,
          ...(input.password
            ? {
                passwordHash: await hashPassword(input.password),
                mustChangePassword: input.requirePasswordChange ?? false,
              }
            : {}),
        },
      });

      await organizationAdminService.setUserModules(actorId, organizationId, user.id, {
        moduleAssignments: [{ slug: 'teacher-portal', accessLevel: 'USER' }],
      });

      const refreshed = await prisma.user.findUnique({
        where: { id: user.id },
        select: { employeeId: true },
      });
      return {
        userId: user.id,
        created: false,
        email: resolvedEmail,
        phone: phoneNorm,
        employeeId: refreshed?.employeeId?.trim() || null,
      };
    }

    const created = await organizationAdminService.createUser(actorId, organizationId, {
      email: resolvedEmail,
      firstName,
      lastName,
      phone: phoneNorm ?? undefined,
      password: input.password,
      position: 'Teacher',
      roleSlug: 'organization_member',
      moduleAssignments: [{ slug: 'teacher-portal', accessLevel: 'USER' }],
      requirePasswordChange: input.requirePasswordChange ?? true,
      sendCredentialsEmail: input.sendCredentialsEmail ?? true,
      status: UserStatus.ACTIVE,
    });

    const createdUser = await prisma.user.findUnique({
      where: { id: created.id },
      select: { employeeId: true },
    });
    return {
      userId: created.id,
      created: true,
      email: created.email,
      phone: phoneNorm,
      employeeId:
        createdUser?.employeeId?.trim() ||
        (created as { employeeId?: string | null }).employeeId?.trim() ||
        null,
      tempPassword: created.tempPassword,
    };
  },

  async resetPassword(
    actorId: string,
    organizationId: string,
    userId: string,
    options?: { password?: string; sendEmail?: boolean }
  ) {
    return organizationAdminService.resetUserPassword(actorId, organizationId, userId, options);
  },

  async setAccountStatus(
    actorId: string,
    organizationId: string,
    userId: string,
    status: UserStatus
  ) {
    return organizationAdminService.updateUserStatus(actorId, organizationId, userId, status);
  },
};
