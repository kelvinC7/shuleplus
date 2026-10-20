import type { AuthUser } from '@/lib/auth';
import type { LicensedModule } from '@/lib/modules';

/** Module SPA entry paths after IAM hands off the session token. */
export function moduleEntryPath(slug: string, isOrgAdmin = false): string {
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
    default:
      return '/dashboard';
  }
}

export function buildModuleLaunchUrl(
  mod: Pick<LicensedModule, 'slug' | 'frontendUrl' | 'name'>,
  token: string,
  options?: { refreshToken?: string | null; isOrgAdmin?: boolean; entryPath?: string }
): string | null {
  if (!mod.frontendUrl) return null;
  const base = mod.frontendUrl.replace(/\/$/, '');
  const path = options?.entryPath ?? moduleEntryPath(mod.slug, options?.isOrgAdmin ?? false);
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
    { refreshToken, entryPath: user.defaultLaunch.entryPath }
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
  return buildModuleLaunchUrl(mod, token, { refreshToken });
}
