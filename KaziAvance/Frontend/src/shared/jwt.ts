export type JwtUser = {
  sub: string;
  email: string;
  organizationId?: string;
  roles: string[];
  modules: string[];
};

const ADMIN_ROLES = new Set(["organization_admin", "super_admin", "root_admin"]);

export function parseJwtPayload(token: string): JwtUser | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return {
      sub: decoded.sub,
      email: decoded.email,
      organizationId: decoded.organizationId,
      roles: decoded.roles ?? [],
      modules: decoded.modules ?? []
    };
  } catch {
    return null;
  }
}

export function isOrgOrPlatformAdmin(user: JwtUser | null | undefined) {
  if (!user?.roles?.length) return false;
  return user.roles.some((role) => ADMIN_ROLES.has(role));
}

export function hasKaziAdvanceAccess(user: JwtUser | null | undefined) {
  if (!user) return false;
  if (isOrgOrPlatformAdmin(user)) return true;
  return user.modules?.includes("kaziavance");
}
