import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from './error.middleware';
import type { AuthenticatedRequest, JwtPayload } from './auth.middleware';
import { fetchIamModuleVisibility } from '../clients/iam.client';

/**
 * Part-1 IAM data isolation for the Academic module.
 *
 * Source of truth is IAM `UserModule`:
 *   - `accessLevel = HEAD` → sees every record in the organization.
 *   - `accessLevel = USER` → sees only records they own.
 *   - Organization admins are always HEAD.
 *
 * The access level arrives in the JWT (`moduleAccess`) and, for tokens issued
 * before that claim existed, is resolved live from IAM and cached briefly.
 */

export type AcademicAccessLevel = 'USER' | 'HEAD';
export type AcademicCategory = 'GENERAL_REB' | 'TVET' | 'ALL';

export interface AcademicScope {
  userId: string;
  organizationId: string;
  /** true = module head / organization user: sees the whole organization. */
  seeAll: boolean;
  accessLevel: AcademicAccessLevel;
  dataScope: string;
  /**
   * Marks/records access. `true` (default) = all academic categories and any
   * class; `false` = only the teacher's `academicCategory`.
   */
  wide: boolean;
  /** GENERAL_REB (Nursery/Primary/Secondary) or TVET; ALL when wide. */
  academicCategory: AcademicCategory;
  /** Where the decision came from (diagnostics). */
  source: 'jwt' | 'iam' | 'fallback';
}

export function normalizeAcademicCategory(value: unknown, wide = false): AcademicCategory {
  if (wide) return 'ALL';
  const key = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (key === 'TVET') return 'TVET';
  if (key === 'ALL' || key === 'WIDE') return 'ALL';
  return 'GENERAL_REB';
}

/** Roles that always see full organizational academic data. */
const ORG_WIDE_ROLES = new Set([
  'organization_admin',
  'organization-admin',
  'org_admin',
  'org-admin',
  'organization_user',
  'organization-user',
  'org_user',
  'org-user',
  'school_admin',
  'school-admin',
  'director',
  'principal',
]);

/** Explicit academic leadership roles (module head equivalents). */
const MODULE_HEAD_ROLES = new Set([
  'module_head',
  'module-head',
  'modulehead',
  'academic_head',
  'academic-head',
  'head_of_academic',
  'head-of-academic',
  'academic_admin',
  'academic-admin',
  'academics_admin',
  'academics-admin',
  'dos',
  'dod',
  'head_teacher',
  'headteacher',
]);

/** Module slugs IAM may use for Academic. */
const MODULE_SLUGS = ['academic', 'academic-1', 'academics'];

const scopeStorage = new AsyncLocalStorage<AcademicScope>();

/** Request-scoped scope, available anywhere in the async call chain. */
export function currentAcademicScope(): AcademicScope | null {
  return scopeStorage.getStore() ?? null;
}

function normalizeRole(role: string): string {
  return String(role).trim().toLowerCase().replace(/\s+/g, '_');
}

function hasOrgWideRole(user?: JwtPayload | null): boolean {
  const roles = (user?.roles ?? []).map(normalizeRole);
  if (roles.some((r) => ORG_WIDE_ROLES.has(r))) return true;
  if (roles.some((r) => MODULE_HEAD_ROLES.has(r))) return true;
  // IAM may expose module-head as a module-scoped role e.g. "academic:module_head".
  return roles.some((r) => /module[_-]?head/.test(r));
}

/** Sync role-based fallback. Prefer `resolveAcademicScope` (IAM aware). */
export function canSeeAllAcademic(user?: JwtPayload | null): boolean {
  if (!user) return false;
  for (const slug of MODULE_SLUGS) {
    const access = user.moduleAccess?.[slug];
    if (access) {
      return access.accessLevel === 'HEAD' || hasOrgWideRole(user);
    }
  }
  return hasOrgWideRole(user);
}

export function academicUserId(user?: JwtPayload | null): string | undefined {
  return user?.sub ? String(user.sub) : undefined;
}

type CachedScope = {
  accessLevel: AcademicAccessLevel;
  dataScope: string;
  wide: boolean;
  academicCategory: AcademicCategory;
  expiresAt: number;
};
const visibilityCache = new Map<string, CachedScope>();
const CACHE_TTL_MS = 60 * 1000;

function fromCache(userId: string): CachedScope | null {
  const hit = visibilityCache.get(userId);
  if (hit && hit.expiresAt > Date.now()) return hit;
  if (hit) visibilityCache.delete(userId);
  return null;
}

function toCache(
  userId: string,
  value: {
    accessLevel: AcademicAccessLevel;
    dataScope: string;
    wide: boolean;
    academicCategory: AcademicCategory;
  },
) {
  visibilityCache.set(userId, { ...value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Clear a cached decision (e.g. after IAM access changes). */
export function invalidateAcademicScope(userId?: string) {
  if (userId) visibilityCache.delete(userId);
  else visibilityCache.clear();
}

/**
 * Resolve the caller's Academic scope.
 * Order: JWT `moduleAccess` claim → IAM visibility endpoint → role fallback.
 * Fail-closed: when nothing resolves, the caller is treated as USER (own data only).
 */
export async function resolveAcademicScope(req: AuthenticatedRequest): Promise<AcademicScope> {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');

  const userId = String(user.sub);
  const organizationId = String(req.organizationRef || user.organizationId || '');
  const orgWide = hasOrgWideRole(user);

  const claim = MODULE_SLUGS.map((slug) => user.moduleAccess?.[slug]).find(Boolean);
  if (claim) {
    const accessLevel: AcademicAccessLevel =
      claim.accessLevel === 'HEAD' || orgWide ? 'HEAD' : 'USER';
    const wide = claim.wide !== false;
    return {
      userId,
      organizationId,
      seeAll: accessLevel === 'HEAD',
      accessLevel,
      dataScope: claim.dataScope || (accessLevel === 'HEAD' ? 'ORGANIZATION' : 'SELF'),
      wide,
      academicCategory: normalizeAcademicCategory(claim.academicCategory, wide),
      source: 'jwt',
    };
  }

  if (orgWide) {
    return {
      userId,
      organizationId,
      seeAll: true,
      accessLevel: 'HEAD',
      dataScope: 'ORGANIZATION',
      wide: true,
      academicCategory: 'ALL',
      source: 'fallback',
    };
  }

  const cached = fromCache(userId);
  if (cached) {
    const accessLevel: AcademicAccessLevel = cached.accessLevel === 'HEAD' ? 'HEAD' : 'USER';
    return {
      userId,
      organizationId,
      seeAll: accessLevel === 'HEAD',
      accessLevel,
      dataScope: cached.dataScope,
      wide: cached.wide,
      academicCategory: cached.academicCategory,
      source: 'iam',
    };
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  for (const slug of MODULE_SLUGS) {
    const visibility = await fetchIamModuleVisibility(token, slug);
    if (visibility) {
      const accessLevel: AcademicAccessLevel =
        visibility.canViewAll || visibility.accessLevel === 'HEAD' ? 'HEAD' : 'USER';
      const dataScope = visibility.dataScope || (accessLevel === 'HEAD' ? 'ORGANIZATION' : 'SELF');
      const wide = visibility.wide !== false;
      const academicCategory = normalizeAcademicCategory(visibility.academicCategory, wide);
      toCache(userId, { accessLevel, dataScope, wide, academicCategory });
      return {
        userId,
        organizationId,
        seeAll: accessLevel === 'HEAD',
        accessLevel,
        dataScope,
        wide,
        academicCategory,
        source: 'iam',
      };
    }
  }

  // IAM unreachable or no assignment row: fail closed to own-data, but keep the
  // historical wide default so marks keep working for legacy tokens.
  return {
    userId,
    organizationId,
    seeAll: false,
    accessLevel: 'USER',
    dataScope: 'SELF',
    wide: true,
    academicCategory: 'ALL',
    source: 'fallback',
  };
}

/** Express middleware: resolve the scope, attach it, and run the request inside it. */
export async function attachAcademicScope(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const scope = await resolveAcademicScope(req);
    req.academicScope = scope;
    scopeStorage.run(scope, () => next());
  } catch (e) {
    next(e);
  }
}

/** Scope already attached by middleware, or the current async-store value. */
export function academicScopeOf(req?: Request): AcademicScope | null {
  const attached = (req as AuthenticatedRequest | undefined)?.academicScope;
  return attached ?? currentAcademicScope();
}

/**
 * Where fragment for models with an owner column (`createdBy` by default).
 * - HEAD / organization user → no filter.
 * - USER → own records plus legacy unowned rows (visible, read-only).
 */
export function ownDataWhere(field = 'createdBy'): Record<string, unknown> {
  const scope = currentAcademicScope();
  if (!scope || scope.seeAll) return {};
  return { OR: [{ [field]: scope.userId }, { [field]: null }] };
}

/** Strict own-only filter (no legacy rows). */
export function strictOwnDataWhere(field = 'createdBy'): Record<string, unknown> {
  const scope = currentAcademicScope();
  if (!scope || scope.seeAll) return {};
  return { [field]: scope.userId };
}

/**
 * Safely merge the own-data filter into an existing Prisma `where` object.
 * Uses `AND` so it never clobbers an existing `OR`/`AND`.
 */
export function mergeOwnData<T extends Record<string, unknown>>(where: T, field = 'createdBy'): T {
  const own = ownDataWhere(field);
  if (!Object.keys(own).length) return where;
  const existingAnd = (where as Record<string, unknown>).AND;
  const AND = Array.isArray(existingAnd) ? [...existingAnd, own] : existingAnd ? [existingAnd, own] : [own];
  return { ...where, AND } as T;
}

export function isOwnRecord(ownerId: string | null | undefined): boolean {
  const scope = currentAcademicScope();
  if (!scope || scope.seeAll) return true;
  return Boolean(ownerId) && ownerId === scope.userId;
}

/** Throw 403 when a USER tries to change a record they do not own. */
export function assertOwnRecord(ownerId: string | null | undefined, label = 'record'): void {
  if (!isOwnRecord(ownerId)) {
    throw new AppError(403, `You can only modify your own ${label}`);
  }
}

/**
 * Marks submission rule: `wide` users may submit for any class in their
 * category; non-wide users only for their own records. HEAD/org users always.
 */
export function assertOwnRecordUnlessWide(ownerId: string | null | undefined, label = 'record'): void {
  const scope = currentAcademicScope();
  if (!scope || scope.seeAll || scope.wide) return;
  assertOwnRecord(ownerId, label);
}

/** Throw 403 when a USER attempts an organization-wide action. */
export function assertCanSeeAll(action: string): void {
  const scope = currentAcademicScope();
  if (scope && !scope.seeAll) {
    throw new AppError(
      403,
      `Only an Academic module head or organization user can ${action}`,
    );
  }
}

/** true when the caller may see every academic category (wide, HEAD or org user). */
export function seesAllAcademicCategories(): boolean {
  const scope = currentAcademicScope();
  return !scope || scope.seeAll || scope.wide || scope.academicCategory === 'ALL';
}

/** Prisma filter for `classes.category` based on the caller's category partition. */
export function classCategoryWhere(): Record<string, unknown> {
  if (seesAllAcademicCategories()) return {};
  const scope = currentAcademicScope();
  const tvet = scope?.academicCategory === 'TVET';
  if (tvet) {
    return {
      OR: [
        { category: { equals: 'TVET', mode: 'insensitive' } },
        { name: { contains: 'TVET', mode: 'insensitive' } },
      ],
    };
  }
  // GENERAL_REB = Nursery / Primary / Secondary (anything not marked TVET).
  return {
    AND: [
      { OR: [{ category: null }, { category: { not: 'TVET' } }] },
      { NOT: { name: { contains: 'TVET', mode: 'insensitive' } } },
    ],
  };
}

/** Merge the class-category filter into a Prisma `where` object. */
export function mergeClassCategory<T extends Record<string, unknown>>(
  where: T,
  filter?: Record<string, unknown>,
): T {
  const category = classCategoryWhere();
  if (!Object.keys(category).length) return where;
  const condition = filter ?? category;
  const existingAnd = (where as Record<string, unknown>).AND;
  const AND = Array.isArray(existingAnd)
    ? [...existingAnd, condition]
    : existingAnd
      ? [existingAnd, condition]
      : [condition];
  return { ...where, AND } as T;
}

/**
 * Prisma filter for students: a current enrollment in a class that belongs to
 * the caller's category. Empty when the caller sees every category.
 */
export function studentCategoryWhere(): Record<string, unknown> {
  const category = classCategoryWhere();
  if (!Object.keys(category).length) return {};
  return {
    enrollments: {
      some: {
        isCurrent: true,
        class: category,
      },
    },
  };
}

/** Merge the class-category filter through a relation (e.g. assessment.class). */
export function mergeRelatedClassCategory<T extends Record<string, unknown>>(
  where: T,
  relation: string,
): T {
  const category = classCategoryWhere();
  if (!Object.keys(category).length) return where;
  return mergeClassCategory(where, { [relation]: category } as Record<string, unknown>);
}

/** SQL fragment restricting `class_id` to the caller's category (raw queries). */
export function classCategorySql(organizationParam = '$1'): string {
  if (seesAllAcademicCategories()) return '';
  const scope = currentAcademicScope();
  if (scope?.academicCategory === 'TVET') {
    return `class_id IN (SELECT id FROM classes WHERE organization_id = ${organizationParam} AND (UPPER(COALESCE(category, '')) = 'TVET' OR name ILIKE '%TVET%'))`;
  }
  return `class_id IN (SELECT id FROM classes WHERE organization_id = ${organizationParam} AND (category IS NULL OR UPPER(category) <> 'TVET') AND name NOT ILIKE '%TVET%')`;
}

/** Merge the student-category filter into a Prisma `where` object. */
export function mergeStudentCategory<T extends Record<string, unknown>>(where: T): T {
  const category = studentCategoryWhere();
  if (!Object.keys(category).length) return where;
  const existingAnd = (where as Record<string, unknown>).AND;
  const AND = Array.isArray(existingAnd)
    ? [...existingAnd, category]
    : existingAnd
      ? [existingAnd, category]
      : [category];
  return { ...where, AND } as T;
}

/** Middleware: block when the caller is not an org-wide / module-head academic user. */
export async function requireAcademicOrgWide(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const scope = req.academicScope ?? (await resolveAcademicScope(req));
    if (!scope.seeAll) {
      throw new AppError(403, 'Only an Academic module head or organization user can perform this action');
    }
    next();
  } catch (e) {
    next(e);
  }
}

/** Expose the caller's scope so the frontend can label "your data" vs organization. */
export function scopeSummary(scope: AcademicScope) {
  return {
    userId: scope.userId,
    accessLevel: scope.accessLevel,
    dataScope: scope.dataScope,
    seeAll: scope.seeAll,
    wide: scope.wide,
    academicCategory: scope.academicCategory,
  };
}

/**
 * Middleware factory: block state-changing requests for plain module USERs.
 * Reads stay available so the UI can still render organization-wide reference data.
 */
export async function requireAcademicOrgWideForWrites(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }
  return requireAcademicOrgWide(req, res, next);
}
