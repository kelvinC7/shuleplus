import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./auth";
import { AppError } from "./error";
import { ensureTenant } from "../services/tenant.service";

export async function requireTenant(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const organizationId = req.user?.organizationId;
  if (!organizationId) {
    return next(new AppError(401, "Token is missing organizationId claim"));
  }

  try {
    const tenant = await ensureTenant(organizationId);
    req.organizationRef = tenant.organizationId;
    return next();
  } catch (error) {
    return next(error);
  }
}
