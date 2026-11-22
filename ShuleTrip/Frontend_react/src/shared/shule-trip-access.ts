import type { JwtUser } from '@/shared/jwt';

/** Match ShuleTrip API requireModuleLicense — do not block org/super admins on empty JWT modules. */
export function hasShuleTripSchoolAccess(user: JwtUser | null): boolean {
  if (!user) return false;
  if (
    user.roles.some((r) => r === 'super_admin' || r === 'root_admin' || r === 'organization_admin')
  ) {
    return true;
  }
  return user.modules?.includes('shule-trip') ?? false;
}
