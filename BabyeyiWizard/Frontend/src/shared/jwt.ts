import type { JwtUser } from '@/types';

export function parseJwtPayload(token: string): JwtUser | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return {
      sub: decoded.sub,
      email: decoded.email,
      organizationId: decoded.organizationId,
      roles: decoded.roles ?? [],
      modules: decoded.modules ?? [],
      name: decoded.name,
    };
  } catch {
    return null;
  }
}
