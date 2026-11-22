/** Must stay aligned with IAM `shule-trip-roles` and Authentication Super Admin officials. */
export const SHULE_TRIP_GOVERNMENT_ROLE_SLUGS = [
  'super_admin',
  'root_admin',
  'national_administrator',
  'intake_reviewer',
  'education_reviewer',
  'transport_reviewer',
  'checkpoint_inspector',
  'final_approval_officer',
  'monitoring_officer',
  'district_education_officer',
  'sector_education_inspector',
  'organization_admin',
] as const;

export function governmentRoleAllowList(envRoles: string[]): Set<string> {
  return new Set([...SHULE_TRIP_GOVERNMENT_ROLE_SLUGS, ...envRoles.map((r) => r.trim()).filter(Boolean)]);
}
