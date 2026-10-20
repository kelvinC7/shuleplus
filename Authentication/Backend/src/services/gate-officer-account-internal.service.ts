import { ModuleAccessLevel, UserStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { organizationAdminService } from './organization-admin.service';
import { hashPassword, validatePasswordPolicy } from '../utils/security';
import { isValidEmail } from '../utils/teacher-password.utils';

const DISCIPLINE_MODULE_SLUG = 'student-discipline';

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Officer' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

async function ensureDisciplineModuleAccess(
  actorId: string,
  organizationId: string,
  userId: string
) {
  const module = await prisma.platformModule.findFirst({
    where: { slug: DISCIPLINE_MODULE_SLUG },
    select: { id: true },
  });
  if (!module) return;

  const existing = await prisma.userModule.findFirst({
    where: { userId, organizationId, moduleId: module.id },
  });
  if (existing) return;

  await prisma.userModule.create({
    data: {
      userId,
      organizationId,
      moduleId: module.id,
      accessLevel: ModuleAccessLevel.USER,
      assignedById: actorId,
    },
  });
}

export const gateOfficerAccountInternalService = {
  async provisionAccount(
    actorId: string,
    organizationId: string,
    input: {
      fullName: string;
      email: string;
      password: string;
      existingUserId?: string;
      requirePasswordChange?: boolean;
    }
  ) {
    const email = input.email.trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      throw new AppError(400, 'A valid login email is required');
    }
    if (!input.password?.trim()) {
      throw new AppError(400, 'Temporary password is required');
    }

    const policyError = validatePasswordPolicy(input.password.trim());
    if (policyError) throw new AppError(400, policyError);

    const { firstName, lastName } = splitName(input.fullName);

    if (input.existingUserId) {
      const user = await prisma.user.findFirst({
        where: { id: input.existingUserId, organizationId },
      });
      if (!user) throw new AppError(404, 'Login account not found in this organization');

      await prisma.user.update({
        where: { id: user.id },
        data: {
          email,
          firstName,
          lastName,
          passwordHash: await hashPassword(input.password.trim()),
          mustChangePassword: input.requirePasswordChange ?? true,
          status: UserStatus.ACTIVE,
        },
      });

      await ensureDisciplineModuleAccess(actorId, organizationId, user.id);
      return { userId: user.id, created: false, email };
    }

    const existing = await prisma.user.findFirst({
      where: { organizationId, email },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName,
          lastName,
          passwordHash: await hashPassword(input.password.trim()),
          mustChangePassword: input.requirePasswordChange ?? true,
          status: UserStatus.ACTIVE,
        },
      });
      await ensureDisciplineModuleAccess(actorId, organizationId, existing.id);
      return { userId: existing.id, created: false, email };
    }

    const created = await organizationAdminService.createUser(actorId, organizationId, {
      email,
      firstName,
      lastName,
      password: input.password.trim(),
      position: 'Gate Officer',
      roleSlug: 'organization_member',
      moduleAssignments: [{ slug: DISCIPLINE_MODULE_SLUG, accessLevel: 'USER' }],
      requirePasswordChange: input.requirePasswordChange ?? true,
      sendCredentialsEmail: false,
      status: UserStatus.ACTIVE,
    });

    return { userId: created.id, created: true, email: created.email };
  },
};
