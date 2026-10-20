import type { NextFunction, Response } from "express";
import { type AuthenticatedRequest, isOrgOrPlatformAdmin } from "./auth";
import { AppError } from "./error";

export function requireOrgAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const roles = req.user?.roles ?? [];
  if (!isOrgOrPlatformAdmin(roles)) {
    return next(new AppError(403, "Organization admin access required"));
  }
  return next();
}

export function requirePlatformAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const roles = req.user?.roles ?? [];
  if (!roles.some((role) => role === "super_admin" || role === "root_admin")) {
    return next(new AppError(403, "Platform admin access required"));
  }
  return next();
}
