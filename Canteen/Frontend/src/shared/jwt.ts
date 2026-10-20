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

export function isPlatformAdmin(user: JwtUser | null): boolean {
  if (!user) return false;
  return user.roles.some((r) => ['super_admin', 'root_admin'].includes(r));
}

export function hasModule(user: JwtUser | null, slug: string): boolean {
  if (!user) return false;
  if (isPlatformAdmin(user)) return true;
  return (user.modules ?? []).includes(slug);
}
