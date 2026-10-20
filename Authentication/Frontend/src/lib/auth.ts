export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  modules?: string[];
  mustChangePassword?: boolean;
  mfaRequired?: boolean;
  dashboardRoute?: string;
  position?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  /** Present when user has exactly one assigned app — login may open it directly. */
  defaultLaunch?: {
    slug: string;
    name: string;
    frontendUrl: string | null;
    entryPath?: string;
  } | null;
  /** Gate officer in Student Discipline — skip module picker and open /gate. */
  gateOfficerLaunch?: {
    slug: string;
    name: string;
    frontendUrl: string;
    entryPath: string;
  } | null;
  organization?: {
    id: string;
    name: string;
    slug: string;
    type: string;
    modules?: unknown;
  };
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

/** Decode JWT exp without verification (client-side expiry hint only). */
export function isAccessTokenExpired(bufferSeconds = 30): boolean {
  const token = getAccessToken();
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp !== 'number') return false;
    return Date.now() >= payload.exp * 1000 - bufferSeconds * 1000;
  } catch {
    return true;
  }
}

/** True when user is logged in and can authenticate (valid access token or refresh token). */
export function hasActiveSession(): boolean {
  const user = getStoredUser();
  const accessToken = getAccessToken();
  if (!user || !accessToken) return false;
  if (!isAccessTokenExpired()) return true;
  return Boolean(getRefreshToken());
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.removeItem('mfaSessionToken');
  sessionStorage.removeItem('mfaDeliveryHint');
  sessionStorage.removeItem('mfaOtpDelivery');
  sessionStorage.removeItem('mfaDevHint');
}

export function resolvePostLoginRoute(user: AuthUser): string {
  if (user.mustChangePassword) return '/change-password';
  return user.dashboardRoute ?? '/post-login';
}

export function isRootAdmin(user: AuthUser | null): boolean {
  return user?.roles?.includes('root_admin') ?? false;
}

export function isSuperAdmin(user: AuthUser | null): boolean {
  return user?.roles?.includes('super_admin') ?? false;
}

export function isPlatformAdmin(user: AuthUser | null): boolean {
  return isRootAdmin(user) || isSuperAdmin(user);
}

export function isOrganizationAdmin(user: AuthUser | null): boolean {
  return user?.roles?.includes('organization_admin') ?? false;
}

export function isSchoolRepresentative(user: AuthUser | null): boolean {
  return user?.roles?.includes('school_representative') ?? false;
}

export function isChiefAccountant(user: AuthUser | null): boolean {
  return user?.roles?.includes('chief_accountant') ?? false;
}

export function isSeiOfficer(user: AuthUser | null): boolean {
  return user?.roles?.includes('sector_education_inspector') ?? false;
}
