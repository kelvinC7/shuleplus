import type { ModuleAccessLevel, ModuleVisibility } from '@/services/iam-api';

const ACCESS_LEVEL_CACHE_PREFIX = 'procurement-mis-access-level:';

function normalizeRole(role: string): string {
  return role.toLowerCase().replace(/-/g, '_');
}

function isPlatformAdmin(roles: string[]): boolean {
  const normalized = roles.map(normalizeRole);
  return normalized.some(
    (r) =>
      r === 'organization_admin' ||
      r === 'super_admin' ||
      r === 'superadmin' ||
      r === 'root_admin' ||
      r === 'system_admin',
  );
}

/** JWT roles that imply module supervisor access when IAM is unavailable. */
function hasSupervisorJwtRole(roles: string[]): boolean {
  if (isPlatformAdmin(roles)) return true;
  const normalized = roles.map(normalizeRole);
  return normalized.some(
    (r) =>
      r.includes('procurement') &&
      (r.includes('supervisor') ||
        r.includes('manager') ||
        r.includes('admin') ||
        r.includes('head') ||
        r.includes('module_head')),
  );
}

export function cacheModuleAccessLevel(userId: string, level: ModuleAccessLevel): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    sessionStorage.setItem(`${ACCESS_LEVEL_CACHE_PREFIX}${userId}`, level);
  } catch {
    /* ignore */
  }
}

export function getCachedModuleAccessLevel(userId: string): ModuleAccessLevel | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const value = sessionStorage.getItem(`${ACCESS_LEVEL_CACHE_PREFIX}${userId}`);
    if (value === 'HEAD' || value === 'USER') return value;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Resolve IAM access level with cache + JWT fallback so supervisors are not
 * downgraded to USER when the IAM visibility call fails intermittently.
 */
export function resolveModuleAccessLevel(
  visibility: ModuleVisibility | null,
  roles: string[] = [],
  userId?: string | null,
): ModuleAccessLevel {
  if (visibility?.accessLevel) {
    if (userId) cacheModuleAccessLevel(userId, visibility.accessLevel);
    return visibility.accessLevel;
  }

  if (userId) {
    const cached = getCachedModuleAccessLevel(userId);
    if (cached) return cached;
  }

  if (hasSupervisorJwtRole(roles)) return 'HEAD';

  return 'USER';
}

/**
 * Module supervisor (HEAD) or org/platform admin — full Procurement MIS access.
 * Manage users (IAM accessLevel USER) are excluded unless they are org admin.
 */
export function isProcurementSupervisor(
  roles: string[] = [],
  moduleAccessLevel?: ModuleAccessLevel | null,
): boolean {
  if (moduleAccessLevel === 'HEAD') return true;
  return hasSupervisorJwtRole(roles);
}

/** IAM module user (manage user) — Purchase Requests only. */
export function isProcurementManageUser(
  roles: string[] = [],
  moduleAccessLevel?: ModuleAccessLevel | null,
): boolean {
  if (isProcurementSupervisor(roles, moduleAccessLevel)) return false;
  return moduleAccessLevel === 'USER';
}

/** Pages a manage user may open. */
export const MANAGE_USER_ALLOWED_PATHS = ['/dashboard', '/purchase-requests'];

export function isManageUserAllowedPath(pathname: string): boolean {
  return MANAGE_USER_ALLOWED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function canCreatePurchaseOrder(
  roles: string[] = [],
  moduleAccessLevel?: ModuleAccessLevel | null,
): boolean {
  return isProcurementSupervisor(roles, moduleAccessLevel);
}

export function canApprovePurchaseRequest(
  roles: string[] = [],
  moduleAccessLevel?: ModuleAccessLevel | null,
): boolean {
  return isProcurementSupervisor(roles, moduleAccessLevel);
}

export function canManageSuppliers(
  roles: string[] = [],
  moduleAccessLevel?: ModuleAccessLevel | null,
): boolean {
  return isProcurementSupervisor(roles, moduleAccessLevel);
}

/** Statuses where a Head of Module / supervisor may open Set Order. */
export function canShowSetOrder(
  status: string,
  isSupervisor: boolean,
): boolean {
  if (!isSupervisor) return false;
  if (['REJECTED', 'CANCELLED', 'CONVERTED_TO_PO', 'DRAFT'].includes(status)) {
    return false;
  }
  return status === 'PENDING' || status.includes('APPROVED');
}

/** @deprecated use canShowSetOrder */
export function canConvertToPurchaseOrder(status: string): boolean {
  return (
    status.includes('APPROVED') &&
    status !== 'CONVERTED_TO_PO' &&
    status !== 'REJECTED' &&
    status !== 'CANCELLED'
  );
}
