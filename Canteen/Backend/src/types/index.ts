import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  sessionId: string;
  roles: string[];
  modules: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  organizationRef?: string;
}

export const PLATFORM_ADMIN_ROLES = ['super_admin', 'root_admin'];

export function isPlatformAdmin(user?: JwtPayload): boolean {
  if (!user) return false;
  return user.roles.some((r) => PLATFORM_ADMIN_ROLES.includes(r));
}

/** Returns the org scope to filter queries with, or null for platform admins (see everything). */
export function orgScope(user?: JwtPayload): string | null {
  if (!user) return null;
  if (isPlatformAdmin(user)) return null;
  return user.organizationId;
}

/** Route params are typed `string | string[]` under Express 5 — normalize to a single string. */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}
