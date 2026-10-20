import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import { kindForRoles } from '../services/member.service';

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

const SUPER_ADMIN_ROLES = new Set(['super_admin', 'root_admin']);

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

  const roles = user.roles ?? [];
  if (roles.some((r) => SUPER_ADMIN_ROLES.has(r))) {
    return next();
  }

  const accepted = new Set([env.MODULE_SLUG]);
  if (![...accepted].some((slug) => user.modules?.includes(slug))) {
    throw new AppError(403, 'Module Not Licensed');
  }

  next();
}

/** Parents log into the chat without needing the staff module license. */
export function requireParent(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');
  if (kindForRoles(user.roles) !== 'PARENT') {
    throw new AppError(403, 'Parent access required');
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
