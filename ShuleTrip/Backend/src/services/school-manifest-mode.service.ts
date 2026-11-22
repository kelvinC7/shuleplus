import { prisma } from '../config/database';
import type { JwtPayload } from '../middleware/auth.middleware';

export type SchoolManifestMode = 'student_management_sync' | 'manual';

/** IAM module users sync SM; ShuleTrip portal school login uses manual manifest only. */
export async function resolveSchoolManifestMode(user: JwtPayload): Promise<SchoolManifestMode> {
  if (user.authSource === 'shule_trip_portal') {
    return 'manual';
  }
  const reg = await prisma.schoolRegistration.findUnique({
    where: { id: user.sub },
    select: { id: true },
  });
  if (reg) {
    return 'manual';
  }
  return 'student_management_sync';
}
