export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
  name?: string;
  canFinalApprove?: boolean;
  district?: string;
  authority?: string;
}

export function parseJwtPayload(token: string): JwtUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const roles = [...(payload.roles ?? [])];
    const tripRoleSlug =
      typeof payload.tripRoleSlug === 'string' ? payload.tripRoleSlug.trim() : '';
    if (tripRoleSlug && !roles.includes(tripRoleSlug)) roles.push(tripRoleSlug);
    return {
      sub: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId,
      roles,
      modules: payload.modules ?? [],
      name: payload.name,
      canFinalApprove: payload.canFinalApprove === true,
      district: typeof payload.district === 'string' ? payload.district : undefined,
      authority: typeof payload.authority === 'string' ? payload.authority : undefined,
    };
  } catch {
    return null;
  }
}
