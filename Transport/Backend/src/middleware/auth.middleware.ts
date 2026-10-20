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

  const licensed =
    user.modules?.includes(env.MODULE_SLUG) ||
    user.modules?.includes('transport') ||
    user.modules?.includes('school-transport');
  if (!licensed) {
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
