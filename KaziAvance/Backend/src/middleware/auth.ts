import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./error";

export type JwtPayload = {
  sub: string;
  email: string;
  organizationId?: string;
  sessionId?: string;
  roles?: string[];
  modules?: string[];
  position?: string | null;
};

export type AuthenticatedRequest = Request & {
  user?: JwtPayload;
  organizationRef?: string;
};

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError(401, "Authentication required"));
  }

  try {
    const payload = jwt.verify(authHeader.slice(7), env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = payload;
    return next();
  } catch {
    return next(new AppError(401, "Invalid or expired access token"));
  }
}

const ADMIN_ROLES = new Set(["organization_admin", "super_admin", "root_admin"]);

export function isOrgOrPlatformAdmin(roles: string[] = []) {
  return roles.some((role) => ADMIN_ROLES.has(role));
}

export function requireModuleLicense(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const roles = req.user?.roles ?? [];
  if (isOrgOrPlatformAdmin(roles)) {
    return next();
  }

  const modules = req.user?.modules ?? [];
  if (!modules.includes(env.MODULE_SLUG)) {
    return next(new AppError(403, "Module Not Licensed. Ask your organization admin to assign KaziAdvance."));
  }
  return next();
}

/** Teachers from TichaPortal (teacher-portal JWT) can submit advances/deals. */
export function requireEmployeeModule(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const roles = req.user?.roles ?? [];
  if (isOrgOrPlatformAdmin(roles)) {
    return next();
  }

  const modules = req.user?.modules ?? [];
  if (modules.includes(env.MODULE_SLUG) || modules.includes("teacher-portal")) {
    return next();
  }
  return next(
    new AppError(403, "Teacher Portal or KaziAdvance access is required to request an advance.")
  );
}

/** IAM calls this when provisioning a tenant (`x-service-key`). */
export function requireServiceAuth(req: Request, _res: Response, next: NextFunction) {
  const key = req.headers["x-service-key"];

  if (!env.SERVICE_API_KEY) {
    return next();
  }

  if (!key || key !== env.SERVICE_API_KEY) {
    return next(
      new AppError(
        401,
        "Invalid or missing service API key. Set SERVICE_API_KEY to match IAM MODULE_PROVISIONING_KEY (default: dev-service-key)."
      )
    );
  }

  return next();
}
