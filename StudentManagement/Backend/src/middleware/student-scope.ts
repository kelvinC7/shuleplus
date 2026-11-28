import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Response } from 'express';
import { AppError } from './error.middleware';
import type { AuthenticatedRequest, JwtPayload } from './auth.middleware';
import { env } from '../config/env';

export type StudentAccessLevel = 'USER' | 'HEAD';
export type StudentCategory = 'GENERAL_REB' | 'TVET' | 'ALL';

export interface StudentScope {
  userId: string;
  organizationId: string;
  seeAll: boolean;
  accessLevel: StudentAccessLevel;
  wide: boolean;
  academicCategory: StudentCategory;
  source: 'jwt' | 'iam' | 'fallback';
}

const MODULE_SLUGS = ['student-management', 'academic', 'academic-1', 'academics'];
const ORG_WIDE_ROLES = new Set([
  'organization_admin', 'organization-admin', 'org_admin', 'org-admin',
  'organization_user', 'organization-user', 'org_user', 'org-user',
  'school_admin', 'school-admin', 'director', 'principal',
]);
const MODULE_HEAD_ROLES = new Set([
  'module_head', 'module-head', 'modulehead', 'academic_head', 'academic-head',
  'head_of_academic', 'head-of-academic', 'academic_admin', 'academic-admin',
]);

const storage = new AsyncLocalStorage<StudentScope>();
const cache = new Map<string, { scope: Omit<StudentScope, 'userId' | 'organizationId'>; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export function currentStudentScope(): StudentScope | null {
  return storage.getStore() ?? null;
}

function normalizeRole(role: string): string {
  return String(role).trim().toLowerCase().replace(/\s+/g, '_');
}

function hasOrgWideRole(user?: JwtPayload | null): boolean {
  const roles = (user?.roles ?? []).map(normalizeRole);
  return roles.some((r) => ORG_WIDE_ROLES.has(r) || MODULE_HEAD_ROLES.has(r) || /module[_-]?head/.test(r));
}

function normalizeCategory(value: unknown, wide = false): StudentCategory {
  if (wide) return 'ALL';
  const key = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (key === 'TVET') return 'TVET';
  if (key === 'ALL' || key === 'WIDE') return 'ALL';
  return 'GENERAL_REB';
}

async function fetchIamVisibility(token: string, slug: string) {
  const base = env.IAM_API_URL?.replace(/\/$/, '');
  if (!base || !token) return null;
  try {
    const res = await fetch(`${base}/iam/me/modules/${encodeURIComponent(slug)}/visibility`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: any };
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export async function resolveStudentScope(req: AuthenticatedRequest): Promise<StudentScope> {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');
  const userId = String(user.sub);
  const organizationId = String(req.organizationRef || user.organizationId || '');
  const orgWide = hasOrgWideRole(user);

  const claim = MODULE_SLUGS.map((slug) => user.moduleAccess?.[slug]).find(Boolean);
  if (claim) {
    const accessLevel: StudentAccessLevel = claim.accessLevel === 'HEAD' || orgWide ? 'HEAD' : 'USER';
    const wide = claim.wide !== false;
    return {
      userId, organizationId, accessLevel,
      seeAll: accessLevel === 'HEAD',
      wide,
      academicCategory: normalizeCategory(claim.academicCategory, wide),
      source: 'jwt',
    };
  }

  if (orgWide) {
    return { userId, organizationId, accessLevel: 'HEAD', seeAll: true, wide: true, academicCategory: 'ALL', source: 'fallback' };
  }

  const cached = cache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { userId, organizationId, ...cached.scope };
  }

  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  for (const slug of MODULE_SLUGS) {
    const visibility = await fetchIamVisibility(token, slug);
    if (visibility) {
      const accessLevel: StudentAccessLevel = visibility.canViewAll || visibility.accessLevel === 'HEAD' ? 'HEAD' : 'USER';
      const wide = visibility.wide !== false;
      const scope = {
        accessLevel,
        seeAll: accessLevel === 'HEAD',
        wide,
        academicCategory: normalizeCategory(visibility.academicCategory, wide),
        source: 'iam' as const,
      };
      cache.set(userId, { scope, expiresAt: Date.now() + CACHE_TTL_MS });
      return { userId, organizationId, ...scope };
    }
  }

  return { userId, organizationId, accessLevel: 'USER', seeAll: false, wide: true, academicCategory: 'ALL', source: 'fallback' };
}

export async function attachStudentScope(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const scope = await resolveStudentScope(req);
    (req as any).studentScope = scope;
    storage.run(scope, () => next());
  } catch (e) {
    next(e);
  }
}

export function seesAllStudentCategories(): boolean {
  const scope = currentStudentScope();
  return !scope || scope.seeAll || scope.wide || scope.academicCategory === 'ALL';
}

export function classCategoryWhere(): Record<string, unknown> {
  if (seesAllStudentCategories()) return {};
  const scope = currentStudentScope();
  if (scope?.academicCategory === 'TVET') {
    return {
      OR: [
        { category: { equals: 'TVET', mode: 'insensitive' } },
        { name: { contains: 'TVET', mode: 'insensitive' } },
      ],
    };
  }
  return {
    AND: [
      { OR: [{ category: null }, { category: { not: 'TVET' } }] },
      { NOT: { name: { contains: 'TVET', mode: 'insensitive' } } },
    ],
  };
}

export function mergeClassCategory<T extends Record<string, unknown>>(where: T): T {
  const category = classCategoryWhere();
  if (!Object.keys(category).length) return where;
  const existingAnd = (where as Record<string, unknown>).AND;
  const AND = Array.isArray(existingAnd) ? [...existingAnd, category] : existingAnd ? [existingAnd, category] : [category];
  return { ...where, AND } as T;
}

export function studentCategoryWhere(): Record<string, unknown> {
  const category = classCategoryWhere();
  if (!Object.keys(category).length) return {};
  return { enrollments: { some: { isCurrent: true, class: category } } };
}

export function mergeStudentCategory<T extends Record<string, unknown>>(where: T): T {
  const category = studentCategoryWhere();
  if (!Object.keys(category).length) return where;
  const existingAnd = (where as Record<string, unknown>).AND;
  const AND = Array.isArray(existingAnd) ? [...existingAnd, category] : existingAnd ? [existingAnd, category] : [category];
  return { ...where, AND } as T;
}
