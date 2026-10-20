export const PLATFORM_ORG_SLUG = 'babyeyi-platform';

export const ROLES = {
  ROOT_ADMIN: 'root_admin',
  SUPER_ADMIN: 'super_admin',
  ORGANIZATION_ADMIN: 'organization_admin',
  ORGANIZATION_MEMBER: 'organization_member',
  /** National/system users with direct module access — no school organization. */
  MODULE_OPERATOR: 'module_operator',
  /** Multi-school oversight — assigned organizations via IAM. */
  SCHOOL_REPRESENTATIVE: 'school_representative',
  /** Multi-school finance operations — assigned organizations via SuperAdmin. */
  CHIEF_ACCOUNTANT: 'chief_accountant',
  /** Sector Education Inspector — Sector MIS attendance intelligence. */
  SECTOR_EDUCATION_INSPECTOR: 'sector_education_inspector',
  /** District Education Officer — District MIS attendance oversight. */
  DISTRICT_EDUCATION_OFFICER: 'district_education_officer',
} as const;

export const ROOT_ADMIN_PERMISSIONS = [
  'platform.super_admins.create',
  'platform.organizations.enable',
  'platform.organizations.disable',
  'platform.organizations.suspend',
  'platform.organizations.archive',
  'platform.modules.enable',
  'platform.modules.disable',
  'platform.analytics.view',
  'platform.audit.view',
  'platform.emergency.control',
  'platform.subscriptions.manage',
  'platform.settings.manage',
] as const;

export const SUPER_ADMIN_PERMISSIONS = [
  'organizations.manage',
  'modules.manage',
  'users.manage',
  'reports.view',
  'roles.manage',
] as const;

export const DASHBOARD_ROUTES: Record<string, string> = {
  [ROLES.ROOT_ADMIN]: '/root-admin',
  [ROLES.SUPER_ADMIN]: '/super-admin',
  [ROLES.ORGANIZATION_ADMIN]: '/organization-admin',
  [ROLES.SCHOOL_REPRESENTATIVE]: '/school-representative',
  [ROLES.CHIEF_ACCOUNTANT]: '/chief-accountant',
  [ROLES.SECTOR_EDUCATION_INSPECTOR]: '/post-login',
  [ROLES.DISTRICT_EDUCATION_OFFICER]: '/post-login',
};

export function resolveDashboardRoute(roles: string[]): string {
  if (roles.includes(ROLES.ROOT_ADMIN)) return DASHBOARD_ROUTES[ROLES.ROOT_ADMIN];
  if (roles.includes(ROLES.SUPER_ADMIN)) return DASHBOARD_ROUTES[ROLES.SUPER_ADMIN];
  if (roles.includes(ROLES.ORGANIZATION_ADMIN)) return DASHBOARD_ROUTES[ROLES.ORGANIZATION_ADMIN];
  if (roles.includes(ROLES.SCHOOL_REPRESENTATIVE)) return DASHBOARD_ROUTES[ROLES.SCHOOL_REPRESENTATIVE];
  if (roles.includes(ROLES.CHIEF_ACCOUNTANT)) return DASHBOARD_ROUTES[ROLES.CHIEF_ACCOUNTANT];
  if (roles.includes(ROLES.SECTOR_EDUCATION_INSPECTOR)) return DASHBOARD_ROUTES[ROLES.SECTOR_EDUCATION_INSPECTOR];
  if (roles.includes(ROLES.DISTRICT_EDUCATION_OFFICER)) return DASHBOARD_ROUTES[ROLES.DISTRICT_EDUCATION_OFFICER];
  return '/post-login';
}
