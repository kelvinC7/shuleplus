const DEV_TOKEN = 'developerAccessToken';
const DEV_REFRESH = 'developerRefreshToken';
const DEV_USER = 'developerUser';

export interface DeveloperUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  allowedModules: Record<string, Record<string, boolean>>;
  partner: { name: string };
}

export function getDeveloperToken(): string | null {
  return localStorage.getItem(DEV_TOKEN);
}

export function setDeveloperSession(accessToken: string, refreshToken: string, user: DeveloperUser) {
  localStorage.setItem(DEV_TOKEN, accessToken);
  localStorage.setItem(DEV_REFRESH, refreshToken);
  localStorage.setItem(DEV_USER, JSON.stringify(user));
}

export function getDeveloperUser(): DeveloperUser | null {
  const raw = localStorage.getItem(DEV_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DeveloperUser;
  } catch {
    return null;
  }
}

export function captureDeveloperTokenFromHash(): boolean {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return false;
  const params = new URLSearchParams(hash);
  const accessToken = params.get('accessToken');
  const refreshToken = params.get('refreshToken');
  const userRaw = params.get('user');
  if (!accessToken) return false;
  let user: DeveloperUser = { id: '', email: '', firstName: 'Developer', lastName: '', allowedModules: {}, partner: { name: '' } };
  if (userRaw) {
    try {
      user = JSON.parse(userRaw) as DeveloperUser;
    } catch {
      /* keep default */
    }
  }
  setDeveloperSession(accessToken, refreshToken ?? '', user);
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return true;
}

export function redirectToDeveloperLogin(returnUrl?: string) {
  const iam = (import.meta.env.VITE_IAM_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const target = returnUrl ?? window.location.href;
  window.location.href = `${iam}/developers/login?returnUrl=${encodeURIComponent(target)}`;
}

export function smApiRoot(): string {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:3052/api';
  return base.replace(/\/api\/?$/, '');
}

export function iamApiRoot(): string {
  return import.meta.env.VITE_IAM_API_URL ?? 'http://localhost:3001/api/v1';
}
