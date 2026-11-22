import { api } from '@/lib/api';
import type { AuthUser } from '@/lib/auth';
import type { LicensedModule } from '@/lib/modules';

const SHULE_TRIP_GOV_ROLE_SLUGS = new Set([
  'intake_reviewer',
  'education_reviewer',
  'transport_reviewer',
  'checkpoint_inspector',
  'final_approval_officer',
  'monitoring_officer',
  'national_administrator',
  'district_education_officer',
  'sector_education_inspector',
  'super_admin',
]);

export function isShuleTripGovernmentRole(roles: string[]): boolean {
  return roles.some((r) => SHULE_TRIP_GOV_ROLE_SLUGS.has(r));
}

/** Module SPA entry paths after IAM hands off the session token. */
export function moduleEntryPath(slug: string, isOrgAdmin = false, roles: string[] = []): string {
  switch (slug) {
    case 'nesa':
      return '/nesa/dashboard';
    case 'academic':
    case 'academic-1':
      return '/home';
    case 'mini-website':
    case 'mini-website-mis':
      return '/home';
    case 'babyeyi':
    case 'circulars':
      return '/dashboard';
    case 'teacher-portal':
      return '/';
    case 'kaziavance':
      return isOrgAdmin ? '/org-admin/dashboard' : '/dashboard';
    case 'hr':
      return '/dashboard';
    case 'payroll':
      return '/dashboard';
    case 'student-discipline':
      return '/';
    case 'print-card':
      return '/cards';
    case 'shule-trip':
      return isShuleTripGovernmentRole(roles) ? '/government/overview' : '/school/dashboard';
    default:
      return '/dashboard';
  }
}

const POST_LOGIN_MODULE_KEY = 'postLoginModule';

export function stashPostLoginModule(slug: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(POST_LOGIN_MODULE_KEY, slug);
}

export function takePostLoginModule(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const slug = sessionStorage.getItem(POST_LOGIN_MODULE_KEY);
  sessionStorage.removeItem(POST_LOGIN_MODULE_KEY);
  return slug;
}

/** After IAM login, open a licensed module SPA (e.g. transport PWA) with token handoff. */
export async function tryLaunchModuleBySlug(
  slug: string,
  accessToken: string,
  refreshToken?: string | null,
  roles: string[] = []
): Promise<boolean> {
  try {
    const { data } = await api.get<{ success: boolean; data: LicensedModule[] }>('/iam/me/modules');
    const mod = (data.data ?? []).find((m) => m.slug === slug && m.frontendUrl);
    if (!mod) return false;
    const url = buildModuleLaunchUrl(mod, accessToken, { refreshToken, roles });
    if (!url) return false;
    window.location.href = url;
    return true;
  } catch {
    return false;
  }
}

export async function tryLaunchPendingModule(
  accessToken: string,
  refreshToken: string | null | undefined,
  user: AuthUser,
  moduleSlugFromQuery?: string | null
): Promise<boolean> {
  const slug = moduleSlugFromQuery?.trim() || takePostLoginModule();
  if (!slug) return false;
  return tryLaunchModuleBySlug(slug, accessToken, refreshToken, user.roles ?? []);
}

export const DIRECTOR_CONSOLE_URL =
  process.env.NEXT_PUBLIC_DIRECTOR_CONSOLE_URL?.replace(/\/$/, '') || 'https://director.shuleplus.rw';

/** School representatives work in the Director Console, with the IAM token handed over. */
export function tryLaunchDirectorConsole(user: AuthUser, accessToken: string): boolean {
  if (!user.roles?.includes('school_representative')) return false;
  if (user.mustChangePassword) return false;
  const url = new URL(`${DIRECTOR_CONSOLE_URL}/dashboard`);
  url.searchParams.set('token', accessToken);
  window.location.href = url.toString();
  return true;
}

export function buildModuleLaunchUrl(
  mod: Pick<LicensedModule, 'slug' | 'frontendUrl' | 'name'>,
  token: string,
  options?: { refreshToken?: string | null; isOrgAdmin?: boolean; entryPath?: string; roles?: string[] }
): string | null {
  if (!mod.frontendUrl) return null;
  const base = mod.frontendUrl.replace(/\/$/, '');
  const path =
    options?.entryPath ?? moduleEntryPath(mod.slug, options?.isOrgAdmin ?? false, options?.roles ?? []);
  const url = new URL(`${base}${path}`);
  url.searchParams.set('token', token);
  if (options?.refreshToken) {
    url.searchParams.set('refresh', options.refreshToken);
  }
  return url.toString();
}

/**
 * Gate officers go straight to Student Discipline /gate (skip module picker).
 */
export function tryLaunchGateOfficerPortal(
  user: AuthUser,
  accessToken: string,
  refreshToken?: string | null
): boolean {
  if (user.mustChangePassword) return false;
  if (!user.gateOfficerLaunch?.frontendUrl) return false;
  const launch = user.gateOfficerLaunch;
  const url = buildModuleLaunchUrl(
    { slug: launch.slug, name: launch.name, frontendUrl: launch.frontendUrl },
    accessToken,
    { refreshToken, entryPath: launch.entryPath ?? '/gate' }
  );
  if (!url) return false;
  window.location.href = url;
  return true;
}

/**
 * If this user has exactly one module (defaultLaunch), navigate there immediately.
 */
export function tryLaunchDefaultModule(
  user: AuthUser,
  accessToken: string,
  refreshToken?: string | null
): boolean {
  if (tryLaunchGateOfficerPortal(user, accessToken, refreshToken)) return true;
  if (user.mustChangePassword) return false;
  if (!user.defaultLaunch?.frontendUrl) return false;
  const url = buildModuleLaunchUrl(
    {
      slug: user.defaultLaunch.slug,
      name: user.defaultLaunch.name,
      frontendUrl: user.defaultLaunch.frontendUrl,
    },
    accessToken,
    { refreshToken, entryPath: user.defaultLaunch.entryPath, roles: user.roles ?? [] }
  );
  if (!url) return false;
  window.location.href = url;
  return true;
}

/** Launch student-discipline for gate officers from the module picker. */
export function buildGateOfficerModuleUrl(
  mod: LicensedModule,
  token: string,
  refreshToken?: string | null,
  user?: AuthUser | null
): string | null {
  const entryPath = user?.gateOfficerLaunch?.entryPath ?? '/gate';
  if (user?.gateOfficerLaunch && mod.slug === 'student-discipline') {
    return buildModuleLaunchUrl(mod, token, { refreshToken, entryPath });
  }
  return buildModuleLaunchUrl(mod, token, { refreshToken, roles: user?.roles ?? [] });
}
