import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { UserStatus } from '../generated/prisma';
import type { SmartAccessStaff } from '../clients/smart-access-module.client';
import { staffDisplayCode } from '../utils/staff-id';

function userCode(user: { id: string; employeeId: string | null; email: string }) {
  return staffDisplayCode(user);
}

function normalizeRfidUid(uid: string | null | undefined): string | null {
  if (uid == null) return null;
  const trimmed = uid.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

export async function listIamUsersForSmartAccess(
  organizationId: string,
  opts?: { search?: string }
): Promise<SmartAccessStaff[]> {
  const where = {
    organizationId,
    status: {
      in: [
        UserStatus.ACTIVE,
        UserStatus.SUSPENDED,
        UserStatus.LOCKED,
        UserStatus.PENDING_VERIFICATION,
      ],
    },
  };

  const baseSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    avatarUrl: true,
    department: true,
    position: true,
    employeeId: true,
    userRoles: { include: { role: { select: { name: true, slug: true } } } },
  } as const;

  type UserRow = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
    department: string | null;
    position: string | null;
    employeeId: string | null;
    rfidUid?: string | null;
    fingerprintId?: string | null;
    identityRemarks?: string | null;
    userRoles: Array<{ role: { name: string; slug: string } }>;
  };

  let users: UserRow[];
  try {
    users = await prisma.user.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        ...baseSelect,
        rfidUid: true,
        fingerprintId: true,
        identityRemarks: true,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/rfid_uid|fingerprint_id|identity_remarks|does not exist|Unknown field/i.test(message)) {
      throw err;
    }
    users = await prisma.user.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: baseSelect,
    });
  }

  let rows: SmartAccessStaff[] = users.map((user) => {
    const roleName = user.userRoles[0]?.role.name;
    const position =
      user.position?.trim() ||
      roleName ||
      user.department?.trim() ||
      'Organization user';

    return {
      id: user.id,
      source: 'iam' as const,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      employeeNumber: userCode(user),
      position,
      photoUrl: user.avatarUrl,
      rfidUid: user.rfidUid ?? null,
      fingerprintId: user.fingerprintId ?? null,
    };
  });

  const q = opts?.search?.trim();
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(
      (row) =>
        row.fullName.toLowerCase().includes(needle) ||
        row.employeeNumber.toLowerCase().includes(needle) ||
        row.position.toLowerCase().includes(needle) ||
        (row.email?.toLowerCase().includes(needle) ?? false)
    );
  }

  return rows;
}

export async function findIamUserByRfid(rfidUid: string) {
  const normalized = normalizeRfidUid(rfidUid);
  if (!normalized) return null;

  try {
    const user = await prisma.user.findFirst({
      where: { rfidUid: normalized },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        organizationId: true,
        rfidUid: true,
        organization: { select: { name: true, organizationCode: true } },
      },
    });
    if (!user?.rfidUid) return null;
    return {
      kind: 'staff' as const,
      source: 'iam' as const,
      organizationId: user.organizationId,
      organizationName: user.organization.name ?? null,
      organizationCode: user.organization.organizationCode ?? null,
      id: user.id,
      code: user.employeeId ?? user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
      rfidUid: user.rfidUid,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/rfid_uid|does not exist|Unknown field/i.test(message)) return null;
    throw err;
  }
}

export async function updateIamUserIdentity(
  organizationId: string,
  userId: string,
  data: { rfidUid?: string | null; fingerprintId?: string | null; identityRemarks?: string | null }
) {
  const existing = await prisma.user.findFirst({
    where: { id: userId, organizationId },
  });
  if (!existing) throw new AppError(404, 'User not found');

  const rfidUid = data.rfidUid !== undefined ? normalizeRfidUid(data.rfidUid) : undefined;

  try {
    if (rfidUid) {
      const duplicate = await prisma.user.findFirst({
        where: {
          id: { not: userId },
          rfidUid,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          organization: { select: { name: true, organizationCode: true } },
        },
      });
      if (duplicate) {
        const schoolName =
          duplicate.organization.name ?? duplicate.organization.organizationCode ?? 'another school';
        const staffName = [duplicate.firstName, duplicate.lastName].filter(Boolean).join(' ').trim();
        const staffRef = duplicate.employeeId ? ` (${duplicate.employeeId})` : '';
        throw new AppError(
          409,
          `Card ${rfidUid} is already assigned to ${staffName}${staffRef} at ${schoolName}.`
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(rfidUid !== undefined ? { rfidUid } : {}),
        ...(data.fingerprintId !== undefined ? { fingerprintId: data.fingerprintId || null } : {}),
        ...(data.identityRemarks !== undefined ? { identityRemarks: data.identityRemarks || null } : {}),
      },
    });

    return {
      id: updated.id,
      rfidUid: updated.rfidUid ?? null,
      fingerprintId: updated.fingerprintId ?? null,
      identityRemarks: updated.identityRemarks ?? null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/rfid_uid|fingerprint_id|identity_remarks|does not exist|Unknown field/i.test(message)) {
      throw new AppError(
        503,
        'Digital ID fields are not available on IAM users yet. Run IAM database migrations and restart the backend.'
      );
    }
    throw err;
  }
}
