import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  formatModernStaffId,
  isLegacyStaffId,
  isModernStaffId,
  nextSequenceFromExistingIds,
  normalizeStaffIdInput,
  parseOrganizationStaffPrefix,
  resolveStaffRolePrefix,
} from '../utils/staff-id';

export const staffIdService = {
  async allocateForOrganization(
    organizationId: string,
    opts?: {
      position?: string | null;
      roleSlug?: string | null;
      roleName?: string | null;
    }
  ): Promise<string> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        organizationCode: true,
        district: { select: { code: true } },
      },
    });
    if (!org) throw new AppError(404, 'Organization not found');

    const rolePrefix = resolveStaffRolePrefix(opts ?? {});
    const districtFallback = org.district?.code ?? null;
    const { districtCode, schoolCode, prefix } = parseOrganizationStaffPrefix(
      org.organizationCode,
      districtFallback
    );

    const users = await prisma.user.findMany({
      where: { organizationId },
      select: { employeeId: true },
    });
    const seq = nextSequenceFromExistingIds(
      users.map((u) => u.employeeId),
      districtCode,
      schoolCode
    );
    if (seq > 999) {
      throw new AppError(409, `Staff ID sequence exhausted for school ${prefix} (max 999)`);
    }
    return formatModernStaffId(rolePrefix, districtCode, schoolCode, seq);
  },

  /** Assign ID only when missing; never change an existing ID when position changes. */
  async ensureModernEmployeeId(
    userId: string,
    organizationId: string,
    opts?: {
      position?: string | null;
      roleSlug?: string | null;
      roleName?: string | null;
    }
  ): Promise<string> {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { employeeId: true },
    });
    if (!user) throw new AppError(404, 'User not found');

    const current = normalizeStaffIdInput(user.employeeId);
    if (current && (isModernStaffId(current) || isLegacyStaffId(current))) {
      return current;
    }

    const modernId = await this.allocateForOrganization(organizationId, opts);
    await prisma.user.update({
      where: { id: userId },
      data: { employeeId: modernId },
    });
    return modernId;
  },
};
