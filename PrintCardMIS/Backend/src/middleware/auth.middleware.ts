import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './error.middleware';

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
  bearerToken?: string;
}

const SUPER_ADMIN_ROLES = new Set(['super_admin', 'root_admin']);
const MODULE_OPERATOR_ROLE = 'module_operator';

export function isSuperAdmin(user?: JwtPayload): boolean {
  return Boolean(user?.roles?.some((r) => SUPER_ADMIN_ROLES.has(r)));
}

/** Platform Print Card operators — created by Super Admin, not tied to a school org. */
export function isPrintCardOperator(user?: JwtPayload): boolean {
  return Boolean(
    user?.roles?.includes(MODULE_OPERATOR_ROLE) &&
      user?.modules?.includes(env.MODULE_SLUG)
  );
}

/** Can browse and print cards for any school (Super Admin or Print Card operator). */
export function hasPlatformPrintScope(user?: JwtPayload): boolean {
  return isSuperAdmin(user) || isPrintCardOperator(user);
}

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication required');
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = payload;
    req.bearerToken = token;
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired access token');
  }
}

export function requireModuleLicense(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');

  if (isSuperAdmin(user) || isPrintCardOperator(user)) {
    return next();
  }

  if (!user.modules?.includes(env.MODULE_SLUG)) {
    throw new AppError(403, 'Module Not Licensed');
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
