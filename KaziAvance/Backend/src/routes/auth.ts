import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import {
  authenticate,
  isOrgOrPlatformAdmin,
  requireModuleLicense,
  type AuthenticatedRequest
} from "../middleware/auth";
import { requireEmployee, type EmployeeRequest } from "../middleware/employee";
import { AppError } from "../middleware/error";
import { resolveEmployeeFromAuth } from "../services/employee.service";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  if (!env.ENABLE_LOCAL_LOGIN) {
    return next(new AppError(403, "Local login is disabled. Open KaziAdvance from IAM."));
  }

  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return next(new AppError(400, "email and password are required"));
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { email: email.toLowerCase() } });
    if (!employee?.passwordHash) {
      return next(new AppError(401, "Invalid credentials"));
    }

    const valid = await bcrypt.compare(password, employee.passwordHash);
    if (!valid) {
      return next(new AppError(401, "Invalid credentials"));
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: { lastLoginAt: new Date() }
    });

    return res.json({
      message: "Local login is for development only. Use IAM SSO in production.",
      user: {
        id: employee.id,
        email: employee.email,
        fullName: employee.fullName,
        employeeCode: employee.employeeCode
      }
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.get("/session", authenticate, requireModuleLicense, async (req: AuthenticatedRequest, res, next) => {
  try {
    const roles = req.user!.roles ?? [];
    const iam = {
      sub: req.user!.sub,
      email: req.user!.email,
      organizationId: req.user!.organizationId,
      roles,
      modules: req.user!.modules ?? []
    };

    if (isOrgOrPlatformAdmin(roles)) {
      return res.json({
        portal: "org-admin",
        user: null,
        iam
      });
    }

    const employee = await resolveEmployeeFromAuth(req.user!);
    return res.json({
      portal: "employee",
      user: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        email: employee.email,
        fullName: employee.fullName,
        department: employee.department,
        position: employee.position,
        organizationId: employee.organizationId
      },
      iam
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.get("/me", authenticate, requireModuleLicense, requireEmployee, async (req: AuthenticatedRequest, res, next) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: (req as EmployeeRequest).employeeId },
      select: {
        id: true,
        employeeCode: true,
        email: true,
        fullName: true,
        department: true,
        position: true,
        organizationId: true
      }
    });
    return res.json({ user: employee });
  } catch (error) {
    return next(error);
  }
});
