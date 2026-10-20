import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { listHrStaffForOrg } from '../clients/hr.client';
import {
  formatModernStaffId,
  nextSequenceFromExistingIds,
  parseOrganizationStaffPrefix,
  resolveStaffRolePrefix,
} from '../utils/staff-id';

/** Next staff code for teachers (TR prefix); sequence is shared with HR/IAM at the same school. */
export const teacherStaffIdService = {
  async allocateForOrganization(organizationId: string, position?: string | null): Promise<string> {
    const rolePrefix = resolveStaffRolePrefix({ position: position ?? 'Teacher' });
    const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
    const { districtCode, schoolCode, prefix } = parseOrganizationStaffPrefix(tenant?.organizationCode);

    const profiles = await prisma.timetableTeacherProfile.findMany({
      where: { organizationId },
      select: { employeeNumber: true },
    });
    const hrStaff = await listHrStaffForOrg(organizationId);
    const existingIds = [
      ...profiles.map((p) => p.employeeNumber),
      ...hrStaff.map((s) => s.employeeNumber),
    ];
    const seq = nextSequenceFromExistingIds(existingIds, districtCode, schoolCode);
    if (seq > 999) {
      throw new AppError(409, `Staff ID sequence exhausted for school ${prefix} (max 999)`);
    }
    return formatModernStaffId(rolePrefix, districtCode, schoolCode, seq);
  },
};
