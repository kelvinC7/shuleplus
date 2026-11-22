import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { governmentRoleAllowList } from '../constants/government-roles';
import { AppError } from './error.middleware';

const GOVERNMENT_ROLES = governmentRoleAllowList(env.GOVERNMENT_ROLES);

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  sessionId: string;
  roles: string[];
  modules: string[];
  /** Set when the token is issued by ShuleTrip public school/gov login (not IAM). */
  authSource?: 'shule_trip_portal' | 'iam';
  name?: string;
  district?: string;
  sector?: string;
  authority?: string;
  canFinalApprove?: boolean;
  tripRoleSlug?: string;
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

export function requireModuleLicense(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');

  if (user.roles?.some((r) => r === 'super_admin' || r === 'root_admin')) {
    return next();
  }

  const accepted = new Set([env.MODULE_SLUG, 'shule-trip']);
  if (![...accepted].some((slug) => user.modules?.includes(slug))) {
    throw new AppError(403, 'ShuleTrip is not licensed for this account. Assign the ShuleTrip module in IAM.');
  }

  next();
}

export function requireGovernmentAccess(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');

  const roleSlugs = new Set(user.roles ?? []);
  if (user.tripRoleSlug) roleSlugs.add(user.tripRoleSlug);
  const hasRole = [...roleSlugs].some((r) => GOVERNMENT_ROLES.has(r));
  if (!hasRole) {
    throw new AppError(403, 'Government console access is not permitted for this account');
  }

  next();
}

export function requireSuperAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');
  const roles = new Set(user.roles ?? []);
  if (!roles.has('super_admin') && !roles.has('root_admin')) {
    throw new AppError(403, 'Super admin access required');
  }
  next();
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
