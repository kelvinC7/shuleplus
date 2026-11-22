import { UserStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { PLATFORM_ORG_SLUG } from '../constants/roles';
import { SHULE_TRIP_ROLE_LABELS } from '../constants/shule-trip-roles';
import { AppError } from '../middleware/error.middleware';
import { comparePassword, hashPassword, validatePasswordPolicy } from '../utils/security';

const SHULE_TRIP_SLUG = 'shule-trip';

export type ShuleTripOfficialLoginResult = {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  roles: string[];
  modules: string[];
  district?: string;
  sector?: string;
  tripRoleSlug: string;
  canFinalApprove: boolean;
};

export async function verifyShuleTripOfficialPortalLogin(
  identifier: string,
  password: string
): Promise<ShuleTripOfficialLoginResult | null> {
  const loginId = identifier.trim().toLowerCase();
  if (!loginId || !password) return null;

  const platformOrg = await prisma.organization.findUnique({
    where: { slug: PLATFORM_ORG_SLUG },
    select: { id: true },
  });
  if (!platformOrg) return null;

  const user = await prisma.user.findFirst({
    where: {
      organizationId: platformOrg.id,
      shuleTripOfficialProfile: { isNot: null },
      email: { equals: loginId, mode: 'insensitive' },
    },
    include: {
      shuleTripOfficialProfile: true,
      userRoles: { include: { role: { select: { slug: true } } } },
      userModules: { include: { module: { select: { slug: true } } } },
    },
  });

  if (!user?.shuleTripOfficialProfile) return null;
  if (user.status !== UserStatus.ACTIVE) return null;
  if (!(await comparePassword(password, user.passwordHash))) return null;

  const licensed = user.userModules.some((m) => m.module.slug === SHULE_TRIP_SLUG);
  if (!licensed) return null;

  const profile = user.shuleTripOfficialProfile;
  const roles = new Set(user.userRoles.map((r) => r.role.slug));
  roles.add(profile.tripRoleSlug);

  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`.trim() || user.email,
    organizationId: platformOrg.id,
    roles: [...roles],
    modules: [SHULE_TRIP_SLUG],
    district: profile.districtName?.trim() || undefined,
    sector: profile.sectorName?.trim() || undefined,
    tripRoleSlug: profile.tripRoleSlug,
    canFinalApprove: profile.canFinalApprove,
  };
}

async function loadOfficialUser(userId: string) {
  const platformOrg = await prisma.organization.findUnique({
    where: { slug: PLATFORM_ORG_SLUG },
    select: { id: true },
  });
  if (!platformOrg) return null;

  return prisma.user.findFirst({
    where: {
      id: userId,
      organizationId: platformOrg.id,
      shuleTripOfficialProfile: { isNot: null },
    },
    include: {
      shuleTripOfficialProfile: true,
      userRoles: { include: { role: { select: { slug: true, name: true } } } },
    },
  });
}

export async function getShuleTripOfficialProfile(userId: string) {
  const user = await loadOfficialUser(userId);
  if (!user?.shuleTripOfficialProfile) return null;
  const profile = user.shuleTripOfficialProfile;
  const tripRoleSlug = profile.tripRoleSlug;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    roleSlug: tripRoleSlug,
    roleLabel: SHULE_TRIP_ROLE_LABELS[tripRoleSlug] ?? tripRoleSlug,
    district: profile.districtName,
    sector: profile.sectorName,
    authority: profile.authority,
    canFinalApprove: profile.canFinalApprove,
  };
}

export async function updateShuleTripOfficialProfile(
  userId: string,
  data: { firstName?: string; lastName?: string; phone?: string | null }
) {
  const user = await loadOfficialUser(userId);
  if (!user) throw new AppError(404, 'Official account not found');

  await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: data.firstName?.trim() || user.firstName,
      lastName: data.lastName?.trim() || user.lastName,
      phone: data.phone === undefined ? user.phone : data.phone?.trim() || null,
    },
  });

  return getShuleTripOfficialProfile(userId);
}

export async function changeShuleTripOfficialPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await loadOfficialUser(userId);
  if (!user) throw new AppError(404, 'Official account not found');

  if (!(await comparePassword(currentPassword, user.passwordHash))) {
    throw new AppError(401, 'Current password is incorrect');
  }

  const policyErr = validatePasswordPolicy(newPassword);
  if (policyErr) throw new AppError(400, policyErr);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
    },
  });

  return { ok: true };
}
