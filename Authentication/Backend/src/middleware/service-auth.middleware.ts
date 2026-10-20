import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from './error.middleware';

/** Service-to-service auth for modules calling IAM internal APIs. */
export function requireServiceKey(req: Request, _res: Response, next: NextFunction): void {
  const key = String(req.headers['x-service-key'] ?? '').trim();
  const allowed = [
    env.MODULE_PROVISIONING_KEY,
    env.PLATFORM_SERVICE_KEY,
  ]
    .map((v) => String(v ?? '').trim())
    .filter(Boolean);

  // Deduplicate
  const unique = [...new Set(allowed)];

  if (!unique.length) {
    return next();
  }

  if (!key || !unique.includes(key)) {
    return next(new AppError(401, 'Invalid or missing service API key'));
  }

  next();
}
