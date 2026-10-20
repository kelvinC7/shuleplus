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

export function isOrganizationAdmin(token: string | null): boolean {
  if (!token) return false;
  const payload = parseJwtPayload(token);
  return payload?.roles?.includes('organization_admin') ?? false;
}
