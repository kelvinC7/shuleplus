import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { getTeacherAccount } from '../clients/iam.client';
import { isModernStaffId, normalizeStaffIdInput } from '../utils/staff-id';

async function staffCodeFromProfile(
  organizationId: string,
  profile: { id: string; teacherUserId: string; employeeNumber?: string | null }
): Promise<string> {
  const stored = normalizeStaffIdInput(profile.employeeNumber);
  if (stored && isModernStaffId(stored)) return stored;

  if (profile.teacherUserId && !profile.teacherUserId.startsWith('teacher-')) {
    const account = await getTeacherAccount(organizationId, profile.teacherUserId);
    const fromIam = account?.employeeId?.trim() ? normalizeStaffIdInput(account.employeeId) : '';
    if (fromIam && isModernStaffId(fromIam)) return fromIam;
  }

  if (stored) return stored.toUpperCase();
  return `T${profile.id.replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

export class SmartAccessStaffService {
  async listForSmartAccess(organizationId: string, opts?: { search?: string }) {
    const profiles = await prisma.timetableTeacherProfile.findMany({
      where: { organizationId },
      orderBy: { teacherName: 'asc' },
    });

    let rows = await Promise.all(
      profiles.map(async (p) => ({
        id: p.id,
        source: 'timetable' as const,
        fullName: p.teacherName,
        employeeNumber: await staffCodeFromProfile(organizationId, p),
        position: 'Teacher',
        email: p.loginEmail,
        photoUrl: null as string | null,
        rfidUid: p.rfidUid,
        fingerprintId: p.fingerprintId,
      }))
    );

    const q = opts?.search?.trim();
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.fullName.toLowerCase().includes(needle) ||
          r.employeeNumber.toLowerCase().includes(needle) ||
          (r.email?.toLowerCase().includes(needle) ?? false) ||
          r.position.toLowerCase().includes(needle)
      );
    }

    return rows;
  }

  private normalizeRfidUid(uid: string | null | undefined): string | null {
    if (uid == null) return null;
    const trimmed = uid.trim();
    return trimmed ? trimmed.toUpperCase() : null;
  }

  async updateIdentity(
    organizationId: string,
    id: string,
    data: { rfidUid?: string | null; fingerprintId?: string | null; identityRemarks?: string | null }
  ) {
    const existing = await prisma.timetableTeacherProfile.findFirst({
      where: {
        organizationId,
        OR: [{ id }, { teacherUserId: id }],
      },
    });
    if (!existing) throw new AppError(404, 'Teacher profile not found');

    const rfidUid = data.rfidUid !== undefined ? this.normalizeRfidUid(data.rfidUid) : undefined;
    if (rfidUid) {
      const duplicate = await prisma.timetableTeacherProfile.findFirst({
        where: {
          organizationId,
          id: { not: existing.id },
          rfidUid,
        },
      });
      if (duplicate) {
        throw new AppError(
          409,
          `This Digital ID is already assigned to ${duplicate.teacherName}`
        );
      }
    }

    const updated = await prisma.timetableTeacherProfile.update({
      where: { id: existing.id },
      data: {
        ...(rfidUid !== undefined ? { rfidUid } : {}),
        ...(data.fingerprintId !== undefined ? { fingerprintId: data.fingerprintId || null } : {}),
        ...(data.identityRemarks !== undefined ? { identityRemarks: data.identityRemarks || null } : {}),
      },
    });

    return {
      id: updated.id,
      rfidUid: updated.rfidUid,
      fingerprintId: updated.fingerprintId,
      identityRemarks: updated.identityRemarks,
    };
  }

  /** Cross-module RFID uniqueness: find teacher who already holds this card. */
  async lookupRfidOwner(rfidUid: string) {
    const normalized = this.normalizeRfidUid(rfidUid);
    if (!normalized) return null;

    const profile = await prisma.timetableTeacherProfile.findFirst({
      where: { rfidUid: normalized },
      select: {
        id: true,
        teacherName: true,
        teacherUserId: true,
        organizationId: true,
        rfidUid: true,
        employeeNumber: true,
      },
    });
    if (!profile?.rfidUid) return null;

    return {
      kind: 'staff' as const,
      source: 'timetable' as const,
      organizationId: profile.organizationId,
      organizationName: null as string | null,
      organizationCode: null as string | null,
      id: profile.id,
      code: profile.employeeNumber ?? profile.teacherUserId,
      name: profile.teacherName,
      rfidUid: profile.rfidUid,
    };
  }
}

export const smartAccessStaffService = new SmartAccessStaffService();
