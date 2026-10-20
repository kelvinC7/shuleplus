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
  position?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError(401, 'Authentication required'));
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired access token — please sign in again'));
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user?.roles?.some((r) => allowedRoles.includes(r))) {
      next(new AppError(403, 'Insufficient role privileges'));
      return;
    }
    next();
  };
}
