import type { JwtUser } from '@/types';

export function parseJwtPayload(token: string): JwtUser | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const json = atob(segment.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtUser;
  } catch {
    return null;
  }
}

export function getTokenExpiryMs(token: string): number | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const decoded = JSON.parse(atob(segment.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, skewMs = 60_000): boolean {
  const exp = getTokenExpiryMs(token);
  if (!exp) return false;
  return Date.now() >= exp - skewMs;
}
