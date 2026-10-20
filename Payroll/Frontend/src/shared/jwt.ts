export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export function parseJwtPayload(token: string): JwtUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return {
      sub: payload.sub ?? '',
      email: payload.email ?? '',
      organizationId: payload.organizationId ?? '',
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      modules: Array.isArray(payload.modules) ? payload.modules : [],
    };
  } catch {
    return null;
  }
}
