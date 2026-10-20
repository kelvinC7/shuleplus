export type DeveloperAccessType = 'DEVELOPER' | 'TECHNICAL_ADMIN' | 'API_VIEWER';

export interface DeveloperUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accessType: DeveloperAccessType;
  mfaEnabled: boolean;
  allowedModules: Record<string, Record<string, boolean>>;
  allowedEnvironments: ('SANDBOX' | 'PRODUCTION')[];
  partner: { id: string; name: string; slug: string };
  lastLoginAt?: string | null;
}

const DEV_TOKEN = 'developerAccessToken';
const DEV_REFRESH = 'developerRefreshToken';
const DEV_USER = 'developerUser';

export function getDeveloperToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DEV_TOKEN);
}

export function getDeveloperRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DEV_REFRESH);
}

export function getDeveloperUser(): DeveloperUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(DEV_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DeveloperUser;
  } catch {
    return null;
  }
}

export function setDeveloperSession(accessToken: string, refreshToken: string, user: DeveloperUser) {
  localStorage.setItem(DEV_TOKEN, accessToken);
  localStorage.setItem(DEV_REFRESH, refreshToken);
  localStorage.setItem(DEV_USER, JSON.stringify(user));
}

export function clearDeveloperSession() {
  localStorage.removeItem(DEV_TOKEN);
  localStorage.removeItem(DEV_REFRESH);
  localStorage.removeItem(DEV_USER);
  sessionStorage.removeItem('devMfaSessionToken');
}

export function hasDeveloperSession(): boolean {
  return Boolean(getDeveloperToken() && getDeveloperUser());
}

export function developerAccessLabel(type: DeveloperAccessType): string {
  switch (type) {
    case 'TECHNICAL_ADMIN':
      return 'Technical Administrator';
    case 'API_VIEWER':
      return 'API Viewer';
    default:
      return 'Developer';
  }
}
