import { Router } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { logAudit } from "../services/audit.service";
import {
  createEmployee,
  createEmployeeLogin,
  disableEmployeeLogin,
  enableEmployeeLogin,
  getAuditWorkspace,
  getDashboard,
  getEmployee,
  getEmployeeProfile,
  getNotificationsWorkspace,
  getPolicies,
  getReportsWorkspace,
  listActiveAdvances,
  listAuditLogs,
  listEmployees,
  lookupEmployees,
  setupEmployeeForAdvance,
  refreshStaffDirectory,
  listNotifications,
  getRepaymentsWorkspace,
  listRepayments,
  createManualRequest,
  getRequestDetail,
  getRequestForReceipt,
  getRequestsWorkspace,
  listRequests,
  resetEmployeeLogin,
  updateEmployeeEligibility,
  updateEmployeePhone,
  updateEmployeeProfile,
  updateEmployeeSalary,
  fetchEmployeeSalaryFromPayroll,
  refreshOrgPayrollSalaries,
  updatePolicies,
  updateRequest,
} from "../services/org-admin.service";
import { buildReceiptForRequest } from "../services/advance-request.service";

export const orgAdminRouter = Router();

function orgId(req: AuthenticatedRequest) {
  const id = req.organizationRef ?? req.user?.organizationId;
  if (!id) throw new AppError(401, "Missing organization context");
  return id;
}

orgAdminRouter.get("/dashboard", async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await getDashboard(orgId(req));
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/employees", async (req: AuthenticatedRequest, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const data = await listEmployees(orgId(req), search);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/employees/lookup", async (req: AuthenticatedRequest, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const id = typeof req.query.id === "string" ? req.query.id : undefined;
    const employeeCode = typeof req.query.employeeCode === "string" ? req.query.employeeCode : undefined;
    const email = typeof req.query.email === "string" ? req.query.email : undefined;
    const iamUserId = typeof req.query.iamUserId === "string" ? req.query.iamUserId : undefined;
    const phone = typeof req.query.phone === "string" ? req.query.phone : undefined;
    const data = await lookupEmployees(orgId(req), { q, id, employeeCode, email, iamUserId, phone });
    return res.json({ data, count: data.length });
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.post("/employees/sync-directory", async (req: AuthenticatedRequest, res, next) => {
  try {
    const sync = await refreshStaffDirectory(orgId(req));
    const data = await listEmployees(orgId(req));
    return res.json({ sync, data });
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/employees/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await getEmployee(orgId(req), req.params.id);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.post("/employees", async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body as {
      fullName?: string;
      email?: string;
      department?: string;
      position?: string;
      phone?: string;
      netSalary?: number;
      grossSalary?: number;
    };
    if (!body.fullName || !body.email || !body.department || !body.position) {
      return next(new AppError(400, "fullName, email, department and position are required"));
    }
    const created = await createEmployee(orgId(req), {
      fullName: body.fullName,
      email: body.email,
      department: body.department,
      position: body.position,
      phone: body.phone,
      netSalary: Number(body.netSalary ?? 0),
      grossSalary: body.grossSalary ? Number(body.grossSalary) : undefined,
    });
    await logAudit({
      organizationId: orgId(req),
      userEmail: req.user!.email,
      action: "Employee Created",
      target: created.fullName,
    });
    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.patch("/employees/:id/phone", async (req: AuthenticatedRequest, res, next) => {
  try {
    const phone = typeof req.body?.phone === "string" ? req.body.phone : null;
    const updated = await updateEmployeePhone(orgId(req), req.params.id, phone);
    await logAudit({
      organizationId: orgId(req),
      userEmail: req.user!.email,
      action: "Employee Phone Updated",
      target: updated.fullName,
    });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.patch("/employees/:id/salary", async (req: AuthenticatedRequest, res, next) => {
  try {
    const updated = await updateEmployeeSalary(orgId(req), req.params.id, req.body);
    await logAudit({
      organizationId: orgId(req),
      userEmail: req.user!.email,
      action: "Employee Salary Updated",
      target: updated.fullName,
    });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.post("/employees/:id/advance-setup", async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body as {
      grossSalary?: number;
      netSalary?: number;
      allowances?: number;
      deductions?: number;
      allowAdvance?: boolean;
      eligibilityStatus?: string;
      maxAdvanceAmount?: number;
      maxSalaryPercent?: number;
      maxActiveAdvances?: number;
      repaymentPeriodMonths?: number;
      waitingPeriodDays?: number;
      requireDocuments?: boolean;
      reason?: string;
      effectiveDate?: string;
    };
    if (body.grossSalary == null || Number(body.grossSalary) <= 0) {
      return next(new AppError(400, "grossSalary is required and must be greater than zero"));
    }
    const updated = await setupEmployeeForAdvance(orgId(req), req.params.id, {
      grossSalary: Number(body.grossSalary),
      netSalary: body.netSalary != null ? Number(body.netSalary) : undefined,
      allowances: body.allowances != null ? Number(body.allowances) : undefined,
      deductions: body.deductions != null ? Number(body.deductions) : undefined,
      allowAdvance: body.allowAdvance,
      eligibilityStatus: body.eligibilityStatus,
      maxAdvanceAmount: body.maxAdvanceAmount != null ? Number(body.maxAdvanceAmount) : undefined,
      maxSalaryPercent: body.maxSalaryPercent != null ? Number(body.maxSalaryPercent) : undefined,
      maxActiveAdvances: body.maxActiveAdvances != null ? Number(body.maxActiveAdvances) : undefined,
      repaymentPeriodMonths:
        body.repaymentPeriodMonths != null ? Number(body.repaymentPeriodMonths) : undefined,
      waitingPeriodDays: body.waitingPeriodDays != null ? Number(body.waitingPeriodDays) : undefined,
      requireDocuments: body.requireDocuments,
      reason: body.reason,
      effectiveDate: body.effectiveDate,
    });
    await logAudit({
      organizationId: orgId(req),
      userEmail: req.user!.email,
      action: "TichaAvance Setup",
      target: updated.fullName,
    });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.patch("/employees/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const updated = await updateEmployeeProfile(orgId(req), req.params.id, req.body);
    await logAudit({
      organizationId: orgId(req),
      userEmail: req.user!.email,
      action: "Employee Updated",
      target: updated.fullName,
    });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.post("/employees/sync-payroll", async (req: AuthenticatedRequest, res, next) => {
  try {
    const sync = await refreshOrgPayrollSalaries(orgId(req), req.headers.authorization);
    const data = await listEmployees(orgId(req));
    await logAudit({
      organizationId: orgId(req),
      userEmail: req.user!.email,
      action: "Payroll Salaries Synced",
      target: `${sync.updated} employees`,
    });
    return res.json({ sync, data });
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.post("/employees/:id/fetch-payroll-salary", async (req: AuthenticatedRequest, res, next) => {
  try {
    const updated = await fetchEmployeeSalaryFromPayroll(
      orgId(req),
      req.params.id,
      req.headers.authorization
    );
    await logAudit({
      organizationId: orgId(req),
      userEmail: req.user!.email,
      action: "Payroll Salary Fetched",
      target: updated.fullName,
    });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/employees/:id/profile", async (req: AuthenticatedRequest, res, next) => {
  try {
    const token = req.headers.authorization ?? "";
    const data = await getEmployeeProfile(orgId(req), req.params.id, token);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.post("/employees/:id/login", async (req: AuthenticatedRequest, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) return next(new AppError(401, "Authentication required"));
    const body = req.body as { password?: string; sendCredentialsEmail?: boolean };
    const data = await createEmployeeLogin(orgId(req), req.params.id, token, body);
    await logAudit({
      organizationId: orgId(req),
      userEmail: req.user!.email,
      action: "Login Created",
      target: req.params.id,
    });
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.post("/employees/:id/reset-password", async (req: AuthenticatedRequest, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) return next(new AppError(401, "Authentication required"));
    const body = req.body as { password?: string; sendEmail?: boolean };
    const data = await resetEmployeeLogin(orgId(req), req.params.id, token, body);
    await logAudit({
      organizationId: orgId(req),
      userEmail: req.user!.email,
      action: "Password Reset",
      target: req.params.id,
    });
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.post("/employees/:id/disable-login", async (req: AuthenticatedRequest, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) return next(new AppError(401, "Authentication required"));
    const data = await disableEmployeeLogin(orgId(req), req.params.id, token);
    await logAudit({
      organizationId: orgId(req),
      userEmail: req.user!.email,
      action: "Login Disabled",
      target: req.params.id,
    });
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.post("/employees/:id/enable-login", async (req: AuthenticatedRequest, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) return next(new AppError(401, "Authentication required"));
    const data = await enableEmployeeLogin(orgId(req), req.params.id, token);
    await logAudit({
      organizationId: orgId(req),
      userEmail: req.user!.email,
      action: "Login Enabled",
      target: req.params.id,
    });
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.patch("/employees/:id/eligibility", async (req: AuthenticatedRequest, res, next) => {
  try {
    const updated = await updateEmployeeEligibility(orgId(req), req.params.id, req.body);
    await logAudit({
      organizationId: orgId(req),
      userEmail: req.user!.email,
      action: "Eligibility Updated",
      target: updated.fullName,
    });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/requests", async (req: AuthenticatedRequest, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const data = await listRequests(orgId(req), status);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/requests/workspace", async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await getRequestsWorkspace(orgId(req));
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.post("/requests", async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body as {
      employeeId?: string;
      amount?: number;
      months?: number;
      purpose?: string;
      description?: string;
    };
    if (!body.employeeId) return next(new AppError(400, "employeeId is required"));
    const created = await createManualRequest(orgId(req), {
      employeeId: body.employeeId,
      amount: Number(body.amount),
      months: Number(body.months),
      purpose: String(body.purpose ?? ""),
      description: body.description,
    });
    await logAudit({
      organizationId: orgId(req),
      userEmail: req.user!.email,
      action: "Manual request created",
      target: created.requestNumber,
    });
    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/requests/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await getRequestDetail(orgId(req), req.params.id);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/requests/:id/receipt", async (req: AuthenticatedRequest, res, next) => {
  try {
    const request = await getRequestForReceipt(orgId(req), req.params.id);
    const html = await buildReceiptForRequest(request);
    const inline = req.query.view === "1" || req.query.print === "1";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `${inline ? "inline" : "attachment"}; filename="advance-receipt-${request.requestNumber}.html"`
    );
    return res.send(html);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.patch("/requests/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body as { action?: string; amount?: number; comment?: string };
    if (!body.action) return next(new AppError(400, "action is required"));
    const updated = await updateRequest(
      orgId(req),
      req.params.id,
      body.action as "approve" | "reject" | "review" | "disburse",
      { amount: body.amount, comment: body.comment }
    );
    await logAudit({
      organizationId: orgId(req),
      userEmail: req.user!.email,
      action: `Request ${body.action}`,
      target: updated.requestNumber,
    });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/active-advances", async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await listActiveAdvances(orgId(req));
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/repayments", async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await listRepayments(orgId(req));
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/repayments/workspace", async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await getRepaymentsWorkspace(orgId(req));
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/policies", async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await getPolicies(orgId(req));
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.put("/policies", async (req: AuthenticatedRequest, res, next) => {
  try {
    const updated = await updatePolicies(orgId(req), req.body);
    await logAudit({
      organizationId: orgId(req),
      userEmail: req.user!.email,
      action: "Policy Changed",
      target: "Organization policies",
    });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/audit-logs", async (req: AuthenticatedRequest, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const user = typeof req.query.user === "string" ? req.query.user : undefined;
    if (req.query.workspace === "1") {
      const data = await getAuditWorkspace(orgId(req));
      return res.json(data);
    }
    const data = await listAuditLogs(orgId(req), { search, action, user });
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/audit-logs/workspace", async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await getAuditWorkspace(orgId(req));
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/notifications", async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.query.workspace === "1") {
      const data = await getNotificationsWorkspace(orgId(req));
      return res.json(data);
    }
    const data = await listNotifications(orgId(req));
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/notifications/workspace", async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await getNotificationsWorkspace(orgId(req));
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

orgAdminRouter.get("/reports/workspace", async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await getReportsWorkspace(orgId(req));
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});
