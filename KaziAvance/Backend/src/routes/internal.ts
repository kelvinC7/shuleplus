import { Router } from "express";
import { AppError } from "../middleware/error";
import {
  applyPayrollDeductions,
  listAdvancesForPayroll,
} from "../services/payroll-bridge.service";
import { upsertDirectoryPerson } from "../services/staff-directory.service";
import { ensureTenant } from "../services/tenant.service";

export const internalRouter = Router();

/** IAM Users & Access → upsert a Kazi employee (eligibility still depends on salary/policy). */
internalRouter.post("/employees/from-iam", async (req, res, next) => {
  try {
    const body = req.body as {
      organizationId?: string;
      iamUserId?: string;
      fullName?: string;
      email?: string | null;
      phone?: string | null;
      position?: string | null;
      department?: string | null;
      employeeNumber?: string | null;
    };
    const organizationId = String(body.organizationId ?? "").trim();
    const fullName = String(body.fullName ?? "").trim();
    if (!organizationId || !fullName) {
      return next(new AppError(400, "organizationId and fullName are required"));
    }
    await ensureTenant(organizationId);
    const employee = await upsertDirectoryPerson(organizationId, {
      source: "iam",
      iamUserId: body.iamUserId?.trim() || null,
      fullName,
      email: body.email ?? null,
      phone: body.phone ?? null,
      position: body.position ?? "Staff",
      department: body.department ?? "Organization",
      employeeNumber: body.employeeNumber ?? body.iamUserId ?? null,
    });
    return res.status(201).json({ success: true, data: { id: employee?.id ?? null } });
  } catch (error) {
    return next(error);
  }
});

/** Payroll → GET active advances to deduct on run */
internalRouter.get("/advances/for-payroll", async (req, res, next) => {
  try {
    const organizationId =
      typeof req.query.organizationId === "string" ? req.query.organizationId : "";
    if (!organizationId) return next(new AppError(400, "organizationId is required"));
    const data = await listAdvancesForPayroll(organizationId);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

/** Payroll → POST apply deductions after run marked paid */
internalRouter.post("/advances/apply-payroll-deductions", async (req, res, next) => {
  try {
    const body = req.body as {
      organizationId?: string;
      month?: number;
      year?: number;
      paymentRef?: string;
      items?: Array<{
        employeeCode?: string;
        email?: string;
        amount: number;
        requestNumber?: string;
        advanceId?: string;
      }>;
    };
    if (!body.organizationId) return next(new AppError(400, "organizationId is required"));
    if (!Array.isArray(body.items)) return next(new AppError(400, "items array is required"));

    const result = await applyPayrollDeductions(body.organizationId, {
      month: body.month,
      year: body.year,
      paymentRef: body.paymentRef,
      items: body.items,
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});
