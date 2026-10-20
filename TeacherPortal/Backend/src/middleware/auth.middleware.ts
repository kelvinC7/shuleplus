import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import { FINANCE_ROLES, MANAGER_ROLES } from '../constants/shule-avance.constants';
import { prisma } from '../config/database';

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

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication required');
  }

  try {
    const payload = jwt.verify(authHeader.slice(7), env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired access token');
  }
}

export function requireModuleLicense(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');

  if (user.modules?.includes(env.MODULE_SLUG)) {
    return next();
  }

  // Org-level license: provisioned tenant or any authenticated org member.
  if (req.organizationRef || user.organizationId) {
    return next();
  }

  throw new AppError(403, 'Module Not Licensed');
}

export function requireServiceAuth(req: Request, _res: Response, next: NextFunction): void {
  const key = req.headers['x-service-key'];

  if (!env.SERVICE_API_KEY) {
    return next();
  }

  if (!key || key !== env.SERVICE_API_KEY) {
    const hint =
      env.NODE_ENV === 'development'
        ? ' Set SERVICE_API_KEY in this module .env to match IAM MODULE_PROVISIONING_KEY (default: dev-service-key).'
        : '';
    return next(new AppError(401, `Invalid or missing service API key.${hint}`));
  }

  next();
}

function hasRole(user: JwtPayload, roles: readonly string[]) {
  return user.roles?.some((r) => roles.includes(r)) ?? false;
}

async function isDesignatedApprover(
  organizationId: string,
  userId: string,
  role: 'manager' | 'accountant'
) {
  const row = await prisma.shuleAvanceApprover.findFirst({
    where: { organizationId, userId, role, isActive: true },
  });
  return Boolean(row);
}

export async function requireFinanceAccess(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');

  const orgId = req.organizationRef ?? user.organizationId;
  const allowed =
    hasRole(user, FINANCE_ROLES) ||
    (await isDesignatedApprover(orgId, user.sub, 'accountant'));

  if (!allowed) throw new AppError(403, 'Finance access required');
  next();
}

export async function requireManagerAccess(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');

  const orgId = req.organizationRef ?? user.organizationId;
  const allowed =
    hasRole(user, MANAGER_ROLES) ||
    (await isDesignatedApprover(orgId, user.sub, 'manager'));

  if (!allowed) throw new AppError(403, 'Manager approval access required');
  next();
}

export async function requireOrgAdmin(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');
  if (!user.roles?.includes('organization_admin')) {
    throw new AppError(403, 'Organization admin access required');
  }
  next();
}
