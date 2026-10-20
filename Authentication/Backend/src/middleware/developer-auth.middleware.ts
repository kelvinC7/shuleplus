import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import type { DeveloperAccessLevel } from '../constants/developer-access';
import type { DeveloperAccessType } from '../generated/prisma';

export interface DeveloperJwtPayload {
  sub: string;
  email: string;
  partnerId: string;
  sessionId: string;
  accessType: DeveloperAccessType;
  portal: 'developer';
}

export interface DeveloperAuthenticatedRequest extends Request {
  developer?: DeveloperJwtPayload;
}

export function authenticateDeveloper(
  req: DeveloperAuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError(401, 'Developer authentication required'));
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as DeveloperJwtPayload;
    if (payload.portal !== 'developer') {
      next(new AppError(401, 'Invalid developer token'));
      return;
    }
    req.developer = payload;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired developer token'));
  }
}

export function requireDeveloperAccess(...types: (DeveloperAccessType | DeveloperAccessLevel)[]) {
  return (req: DeveloperAuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const dev = req.developer;
    if (!dev || !types.includes(dev.accessType as DeveloperAccessLevel)) {
      next(new AppError(403, 'Insufficient developer privileges'));
      return;
    }
    next();
  };
}
