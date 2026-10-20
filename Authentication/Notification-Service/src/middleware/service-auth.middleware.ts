import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from './error.middleware';

/**
 * Authenticates inter-service calls (IAM, Finance, Education, HR, RFID).
 * Header: x-service-key: <SERVICE_API_KEY>
 * Header: x-source-service: IAM | Finance | Education | HR | RFID
 */
export function requireServiceAuth(req: Request, _res: Response, next: NextFunction) {
  if (env.NODE_ENV === 'development' && !env.SERVICE_API_KEY) {
    req.sourceService = (req.headers['x-source-service'] as string) ?? 'UNKNOWN';
    return next();
  }

  const key = req.headers['x-service-key'];
  if (!key || key !== env.SERVICE_API_KEY) {
    return next(new AppError(401, 'Invalid or missing service API key'));
  }

  req.sourceService = (req.headers['x-source-service'] as string) ?? 'UNKNOWN';
  next();
}

declare global {
  namespace Express {
    interface Request {
      sourceService?: string;
    }
  }
}
