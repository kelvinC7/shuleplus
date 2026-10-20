export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

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
    };
  } catch {
    return null;
  }
}

export function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
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
