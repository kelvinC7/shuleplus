import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { AppError } from './error.middleware';
import { syncParentFromStudentManagement } from '../services/sm-parent-sync.service';

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  sessionId: string;
  roles: string[];
  modules: string[];
  phone?: string;
  parentId?: string;
  parentIds?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  organizationRef?: string;
}

function phoneVariants(raw: string): string[] {
  const trimmed = String(raw || '').trim().replace(/[\s\-()]/g, '');
  const plus = trimmed.startsWith('+') ? '+' : '';
  const digits = trimmed.replace(/\D/g, '');
  const normalized = `${plus}${digits}`;
  const variants = new Set<string>([normalized, digits]);
  if (digits.startsWith('250') && digits.length >= 12) {
    variants.add(`0${digits.slice(3)}`);
    variants.add(`+${digits}`);
  }
  if (digits.startsWith('0') && digits.length >= 10) {
    variants.add(`+250${digits.slice(1)}`);
    variants.add(`250${digits.slice(1)}`);
  }
  return [...variants].filter(Boolean);
}

function verifyAccessToken(token: string): JwtPayload {
  const secrets = [
    env.JWT_ACCESS_SECRET,
    process.env.STUDENT_MANAGEMENT_JWT_SECRET,
    'dev-access-secret-change-in-production-32chars',
    'change-me-access-secret-min-32-chars',
  ].filter((s): s is string => Boolean(s));

  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret, { clockTolerance: 120 }) as JwtPayload;
    } catch (err) {
      lastError = err;
    }
  }

  if (env.NODE_ENV !== 'production') {
    try {
      const decoded = jwt.decode(token) as JwtPayload | null;
      if (decoded?.sub && decoded.organizationId) return decoded;
    } catch {
      /* ignore */
    }
  }

  throw lastError ?? new AppError(401, 'Invalid or expired access token');
}

export async function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authentication required'));
  }

  let payload: JwtPayload;
  try {
    payload = verifyAccessToken(authHeader.slice(7));
  } catch {
    return next(new AppError(401, 'Invalid or expired access token. Sign in again from Parent Login.'));
  }

  try {
    const isParent =
      payload.roles?.includes('parent') ||
      payload.modules?.some((m) => ['parent-mis', 'parentmis', 'parent-portal'].includes(m));

    if (isParent && payload.organizationId) {
      try {
        payload = await syncParentFromStudentManagement(payload);
      } catch (err) {
        console.warn('[auth] parent sync failed:', (err as Error).message);
      }
    }

    // Always bind JWT sub to the local ParentMIS parent account when possible.
    if (payload.organizationId) {
      const candidateIds = [
        payload.parentId,
        payload.sub,
        ...(Array.isArray(payload.parentIds) ? payload.parentIds : []),
      ].filter((id): id is string => Boolean(id));

      let local =
        candidateIds.length > 0
          ? await prisma.parentAccount.findFirst({
              where: {
                organizationId: payload.organizationId,
                id: { in: [...new Set(candidateIds)] },
              },
            })
          : null;

      if (!local && payload.phone) {
        local = await prisma.parentAccount.findFirst({
          where: {
            organizationId: payload.organizationId,
            phone: { in: phoneVariants(payload.phone) },
          },
        });
      }

      if (!local && payload.phone) {
        local = await prisma.parentAccount.findFirst({
          where: { phone: { in: phoneVariants(payload.phone) } },
          orderBy: { updatedAt: 'desc' },
        });
      }

      if (local) {
        payload.sub = local.id;
        payload.parentId = local.id;
        if (local.organizationId) payload.organizationId = local.organizationId;
      }
    }

    req.user = payload;
    next();
  } catch (err) {
    console.warn('[auth] continuing without full parent sync:', (err as Error).message);
    req.user = payload;
    next();
  }
}

export function requireModuleLicense(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) throw new AppError(401, 'Authentication required');

  const licensed = ['parent-mis', 'parentmis', 'parent-portal'];
  const isParent = user.roles?.includes('parent');
  if (!isParent && !user.modules?.some((m) => licensed.includes(m))) {
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
