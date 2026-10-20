import type { NextFunction, Response } from "express";
import type { Employee } from "../generated/prisma";
import { type AuthenticatedRequest } from "./auth";
import { AppError } from "./error";
import { resolveEmployeeFromAuth } from "../services/employee.service";

export type EmployeeRequest = AuthenticatedRequest & {
  employee?: Employee;
  employeeId?: string;
};

export async function requireEmployee(req: EmployeeRequest, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError(401, "Authentication required"));
  }

  try {
    const employee = await resolveEmployeeFromAuth(req.user);
    req.employee = employee;
    req.employeeId = employee.id;
    return next();
  } catch (error) {
    return next(error);
  }
}
