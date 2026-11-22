import { prisma } from '../config/database';
import { JwtPayload } from '../middleware/auth.middleware';

export async function withShuleTripJwtScope(userId: string, payload: JwtPayload): Promise<JwtPayload> {
  const [profile, user] = await Promise.all([
    prisma.shuleTripOfficialProfile.findUnique({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    }),
  ]);

  const name = user ? `${user.firstName} ${user.lastName}`.trim() : undefined;

  if (!profile) {
    return { ...payload, name };
  }

  const roles = [...(payload.roles ?? [])];
  const tripRoleSlug = profile.tripRoleSlug?.trim();
  if (tripRoleSlug && !roles.includes(tripRoleSlug)) {
    roles.push(tripRoleSlug);
  }

  return {
    ...payload,
    roles,
    name,
    district: profile.districtName ?? undefined,
    sector: profile.sectorName ?? undefined,
    authority: profile.authority ?? undefined,
    canFinalApprove: profile.canFinalApprove === true,
    tripRoleSlug,
  };
}
