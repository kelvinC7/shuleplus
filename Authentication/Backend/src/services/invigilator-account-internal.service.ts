import { ModuleAccessLevel, UserStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { organizationAdminService } from './organization-admin.service';
import { isValidEmail, validateTeacherPassword } from '../utils/teacher-password.utils';
import { ROLES } from '../constants/roles';

const ACADEMIC_SLUG = 'academic';

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Invigilator' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function uuidOrNull(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

async function ensureModuleAccess(
  actorId: string,
  organizationId: string,
  userId: string,
  slug: string,
) {
  const module = await prisma.platformModule.findFirst({
    where: { slug },
    select: { id: true },
  });
  if (!module) return;
  try {
    await prisma.userModule.upsert({
      where: { userId_moduleId: { userId, moduleId: module.id } },
      update: { organizationId },
      create: {
        userId,
        organizationId,
        moduleId: module.id,
        accessLevel: ModuleAccessLevel.USER,
        assignedById: uuidOrNull(actorId),
      },
    });
  } catch {
    /* already assigned or unique race */
  }
}

async function grantInvigilatorModules(
  actorId: string,
  organizationId: string,
  userId: string,
  position: string | null,
) {
  const roles = await prisma.userRole.findMany({
    where: { userId, user: { organizationId } },
    include: { role: { select: { slug: true } } },
  });
  const isOrgAdmin = roles.some((r) => r.role.slug === ROLES.ORGANIZATION_ADMIN);
  const isTeacher = /^teacher$/i.test((position ?? '').trim());
  if (isOrgAdmin || isTeacher) return;
  await ensureModuleAccess(actorId, organizationId, userId, ACADEMIC_SLUG);
}

export const invigilatorAccountInternalService = {
  async listOrgUsers(organizationId: string) {
    const users = await prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        position: true,
        status: true,
        userRoles: { include: { role: { select: { slug: true, name: true } } } },
        userModules: { include: { module: { select: { slug: true } } } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      name: `${u.firstName} ${u.lastName}`.trim(),
      phone: u.phone,
      position: u.position,
      status: u.status,
      roles: u.userRoles.map((ur) => ur.role.slug),
      modules: u.userModules.map((um) => um.module.slug),
    }));
  },

  async provisionAccount(
    actorId: string,
    organizationId: string,
    input: {
      fullName: string;
      email?: string;
      password?: string;
      existingUserId?: string;
      requirePasswordChange?: boolean;
    },
  ) {
    const name = input.fullName.trim();
    if (!name) throw new AppError(400, 'Invigilator name is required');

    const email = input.email?.trim().toLowerCase() ?? '';
    const { firstName, lastName } = splitName(name);

    if (input.existingUserId) {
      const user = await prisma.user.findFirst({
        where: { id: input.existingUserId, organizationId },
      });
      if (!user) throw new AppError(404, 'User not found in this organization');
      await grantInvigilatorModules(actorId, organizationId, user.id, user.position);
      const isTeacher = /^teacher$/i.test((user.position ?? '').trim());
      const roles = await prisma.userRole.findMany({
        where: { userId: user.id, user: { organizationId } },
        include: { role: { select: { slug: true } } },
      });
      const isOrgAdmin = roles.some((r) => r.role.slug === ROLES.ORGANIZATION_ADMIN);
      if (!isTeacher && !isOrgAdmin && !/^invigilator$/i.test((user.position ?? '').trim())) {
        await prisma.user.update({ where: { id: user.id }, data: { position: 'Invigilator' } });
      }
      return {
        userId: user.id,
        created: false,
        existing: true,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
      };
    }

    if (!email || !isValidEmail(email)) {
      throw new AppError(400, 'A valid login email is required');
    }

    const existing = await prisma.user.findFirst({
      where: { organizationId, email },
    });
    if (existing) {
      await grantInvigilatorModules(actorId, organizationId, existing.id, existing.position);
      const isTeacher = /^teacher$/i.test((existing.position ?? '').trim());
      const roles = await prisma.userRole.findMany({
        where: { userId: existing.id, user: { organizationId } },
        include: { role: { select: { slug: true } } },
      });
      const isOrgAdmin = roles.some((r) => r.role.slug === ROLES.ORGANIZATION_ADMIN);
      if (!isTeacher && !isOrgAdmin && !/^invigilator$/i.test((existing.position ?? '').trim())) {
        await prisma.user.update({ where: { id: existing.id }, data: { position: 'Invigilator' } });
      }
      return {
        userId: existing.id,
        created: false,
        existing: true,
        email: existing.email,
        name: `${existing.firstName} ${existing.lastName}`.trim(),
      };
    }

    const globallyUsed = await prisma.user.findFirst({ where: { email } });
    if (globallyUsed) {
      throw new AppError(409, 'This email is already registered on the platform.');
    }

    if (!input.password?.trim()) {
      throw new AppError(400, 'Password is required when creating a new invigilator login');
    }
    const policyError = validateTeacherPassword(input.password.trim());
    if (policyError) throw new AppError(400, policyError);

    const created = await organizationAdminService.createUser(actorId, organizationId, {
      email,
      firstName,
      lastName,
      password: input.password.trim(),
      position: 'Invigilator',
      roleSlug: 'organization_member',
      moduleAssignments: [{ slug: ACADEMIC_SLUG, accessLevel: 'USER' }],
      requirePasswordChange: input.requirePasswordChange ?? true,
      sendCredentialsEmail: false,
      status: UserStatus.ACTIVE,
    });

    return {
      userId: created.id,
      created: true,
      existing: false,
      email: created.email,
      name,
    };
  },
};

