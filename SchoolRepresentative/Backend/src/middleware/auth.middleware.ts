import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface DirectorJwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  sessionId: string;
  roles: string[];
  modules: string[];
  name?: string;
  position?: string | null;
}

export interface AuthState {
  mode: 'live' | 'demo' | 'unauthorized';
  token?: string;
  user: DirectorJwtPayload | null;
  demoUser: { sub: string; email: string; name: string; roles: string[] };
}

export const DEMO_USER = {
  sub: 'demo-director',
  email: 'director@stmatthews.rw',
  name: 'Mr. Muramira',
  roles: ['school_representative'],
};

/**
 * Resolve the caller.
 * - Bearer JWT issued by IAM  -> mode "live" (data proxied from IAM).
 * - No token & ALLOW_DEMO     -> mode "demo" (seeded dataset, labelled).
 */
export function resolveAuth(req: Request): AuthState {
  const header = req.headers.authorization;
  const demoUser = DEMO_USER;

  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as DirectorJwtPayload;
      return { mode: 'live', token, user: payload, demoUser };
    } catch {
      // fall through to demo only when explicitly allowed
    }
  }

  if (!env.ALLOW_DEMO) {
    return { mode: 'unauthorized', user: null, demoUser };
  }

  return { mode: 'demo', user: null, demoUser };
}
