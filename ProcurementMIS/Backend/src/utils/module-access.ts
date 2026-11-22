import { fetchModuleVisibility } from '../clients/iam.client';

export interface RequestVisibility {
  userId: string;
  /** Module Head (or organization admin) can see every request in the organization. */
  canViewAll: boolean;
}

const CACHE_TTL_MS = 60 * 1000;
const visibilityCache = new Map<string, { value: boolean; expiresAt: number }>();

function normalizeRole(role: string): string {
  return role.toLowerCase().replace(/-/g, '_');
}

function hasHeadRole(roles: string[] = []): boolean {
  const normalized = roles.map(normalizeRole);
  const isPlatformAdmin = normalized.some((role) =>
    ['organization_admin', 'super_admin', 'superadmin', 'root_admin', 'system_admin'].includes(
      role,
    ),
  );
  if (isPlatformAdmin) return true;

  return normalized.some(
    (role) =>
      role.includes('procurement') &&
      (role.includes('supervisor') ||
        role.includes('manager') ||
        role.includes('admin') ||
        role.includes('head') ||
        role.includes('module_head')),
  );
}

/**
 * Resolve the caller's data scope for Procurement MIS.
 * IAM module assignment (HEAD vs USER) is the source of truth; JWT roles are
 * only used as a fallback when IAM cannot be reached.
 */
export async function resolveRequestVisibility(
  userId: string,
  roles: string[] = [],
  accessToken?: string,
): Promise<RequestVisibility> {
  const now = Date.now();
  const cached = visibilityCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return { userId, canViewAll: cached.value };
  }

  let canViewAll: boolean | null = null;
  if (accessToken) {
    const visibility = await fetchModuleVisibility(accessToken);
    if (visibility) {
      canViewAll = visibility.canViewAll || visibility.accessLevel === 'HEAD';
    }
  }

  if (canViewAll === null) {
    canViewAll = hasHeadRole(roles);
  }

  visibilityCache.set(userId, { value: canViewAll, expiresAt: now + CACHE_TTL_MS });
  return { userId, canViewAll };
}
