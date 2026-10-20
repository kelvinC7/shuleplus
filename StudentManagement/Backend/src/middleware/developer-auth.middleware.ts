import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { hasStudentManagementAccess } from '../config/developer-api-catalog';

export class DeveloperAuthError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'DeveloperAuthError';
  }
}

export interface DeveloperJwtPayload {
  sub: string;
  email: string;
  partnerId: string;
  sessionId: string;
  accessType: string;
  portal: 'developer';
}

export interface DeveloperSession {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  partnerId: string;
  accessType: string;
  allowedModules: Record<string, Record<string, boolean>>;
  allowedEnvironments: string[];
  partner: { id: string; name: string; slug: string };
}

export interface DeveloperAuthenticatedRequest extends Request {
  developerSession?: DeveloperSession;
}

function extractBearer(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const cookie = req.headers.cookie ?? '';
  const match = cookie.match(/(?:^|;\s*)developerAccessToken=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function verifyDeveloperJwt(token: string): DeveloperJwtPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as DeveloperJwtPayload;
  if (payload.portal !== 'developer') {
    throw new DeveloperAuthError(401, 'Invalid developer token');
  }
  return payload;
}

async function fetchDeveloperSession(token: string): Promise<DeveloperSession> {
  const res = await fetch(`${env.IAM_API_URL}/developers/me`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (res.status === 401) throw new DeveloperAuthError(401, 'Developer authentication required');
  if (!res.ok) throw new DeveloperAuthError(503, 'Unable to verify developer session with IAM');
  const body = (await res.json()) as { success?: boolean; data?: DeveloperSession };
  if (!body.data) throw new DeveloperAuthError(401, 'Invalid developer session');
  return body.data;
}

/**
 * Protects /developer/api/* — requires valid Developer Portal JWT + StudentManagement assignment.
 */
export async function authenticateDeveloperDocs(
  req: DeveloperAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearer(req);
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Developer authentication required',
        loginUrl: `${env.IAM_DEVELOPER_PORTAL_URL}/developers/login`,
      });
      return;
    }

    verifyDeveloperJwt(token);
    const session = await fetchDeveloperSession(token);

    if (!hasStudentManagementAccess(session.allowedModules)) {
      res.status(403).json({
        success: false,
        message: 'StudentManagement API access not assigned to your developer account',
      });
      return;
    }

    req.developerSession = session;
    next();
  } catch (err) {
    if (err instanceof DeveloperAuthError) {
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }
    res.status(401).json({ success: false, message: 'Invalid or expired developer session' });
  }
}

export function requireDeveloperPermission(...permissions: string[]) {
  return (req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction): void => {
    const session = req.developerSession;
    if (!session) {
      res.status(401).json({ success: false, message: 'Developer authentication required' });
      return;
    }
    const studentPerms = session.allowedModules.student ?? session.allowedModules['student-management'] ?? {};
    const ok = permissions.some((p) => studentPerms[p]);
    if (!ok) {
      res.status(403).json({ success: false, message: 'Insufficient API scope for this operation' });
      return;
    }
    next();
  };
}
