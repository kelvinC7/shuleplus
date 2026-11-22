import { TripPortalAccountKind } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import type { JwtPayload } from '../middleware/auth.middleware';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  changeIamShuleTripOfficialPassword,
  fetchIamShuleTripOfficialProfile,
  updateIamShuleTripOfficialProfile,
  updateIamUserAvatar,
} from '../clients/iam.client';

export async function getGovernmentAccountProfile(user: JwtPayload) {
  const iam = await fetchIamShuleTripOfficialProfile(user.sub);
  if (iam) return { source: 'iam' as const, ...iam };

  const local = await prisma.tripPortalUser.findUnique({ where: { id: user.sub } });
  if (local?.kind === TripPortalAccountKind.GOVERNMENT) {
    const roles = Array.isArray(local.roles) ? (local.roles as string[]) : [];
    return {
      source: 'portal' as const,
      id: local.id,
      email: local.email,
      firstName: local.displayName?.split(' ')[0] ?? local.username,
      lastName: local.displayName?.split(' ').slice(1).join(' ') ?? '',
      phone: null as string | null,
      roleSlug: roles[0] ?? 'government',
      roleLabel: roles[0]?.replace(/_/g, ' ') ?? 'Government',
      district: local.district,
      sector: null,
      authority: null,
      canFinalApprove: false,
      avatarUrl: null,
    };
  }

  throw new AppError(404, 'Account profile not found');
}

export async function updateGovernmentAccountAvatar(user: JwtPayload, avatarUrl: string | null) {
  const trimmed = avatarUrl?.trim() || null;
  if (trimmed && trimmed.length > 1_500_000) {
    throw new AppError(400, 'Image is too large. Use a smaller photo (under 1 MB).');
  }
  const ok = await updateIamUserAvatar(user.sub, trimmed);
  if (ok) return getGovernmentAccountProfile(user);
  throw new AppError(400, 'Could not update profile photo');
}

export async function updateGovernmentAccountProfile(
  user: JwtPayload,
  input: { firstName?: string; lastName?: string; phone?: string | null }
) {
  const updated = await updateIamShuleTripOfficialProfile(user.sub, input);
  if (updated) return { source: 'iam' as const, ...updated };

  const local = await prisma.tripPortalUser.findUnique({ where: { id: user.sub } });
  if (local?.kind === TripPortalAccountKind.GOVERNMENT) {
    const name = [input.firstName, input.lastName].filter(Boolean).join(' ').trim();
    await prisma.tripPortalUser.update({
      where: { id: local.id },
      data: { displayName: name || local.displayName },
    });
    return getGovernmentAccountProfile(user);
  }

  throw new AppError(404, 'Account profile not found');
}

export async function changeGovernmentAccountPassword(
  user: JwtPayload,
  currentPassword: string,
  newPassword: string
) {
  const iamResult = await changeIamShuleTripOfficialPassword(user.sub, currentPassword, newPassword);
  if (iamResult.ok) return { ok: true };

  const local = await prisma.tripPortalUser.findUnique({ where: { id: user.sub } });
  if (local?.kind === TripPortalAccountKind.GOVERNMENT) {
    if (!verifyPassword(currentPassword, local.passwordHash)) {
      throw new AppError(401, 'Current password is incorrect');
    }
    if (newPassword.length < 8) throw new AppError(400, 'Password must be at least 8 characters');
    await prisma.tripPortalUser.update({
      where: { id: local.id },
      data: { passwordHash: hashPassword(newPassword) },
    });
    return { ok: true };
  }

  const status = (iamResult as { status?: number }).status;
  throw new AppError(status === 401 ? 401 : 400, iamResult.message ?? 'Password change failed');
}
