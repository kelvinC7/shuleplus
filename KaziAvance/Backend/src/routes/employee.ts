import { Router } from "express";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error";
import { type EmployeeRequest } from "../middleware/employee";
import { getEmployeeDashboard } from "../services/employee-dashboard.service";
import { listEmployeeAdvanceHistory } from "../services/advance-request.service";
import {
  getVapidPublicKey,
  removeEmployeeSubscription,
  saveEmployeeSubscription,
} from "../services/web-push.service";

export const employeeRouter = Router();

employeeRouter.get("/dashboard", async (req: EmployeeRequest, res, next) => {
  try {
    const data = await getEmployeeDashboard(req.employee!, req.headers.authorization);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

employeeRouter.get("/salary-history", async (req: EmployeeRequest, res, next) => {
  try {
    const records = await prisma.payrollRecord.findMany({
      where: { employeeId: req.employeeId! },
      orderBy: { payrollDate: "desc" },
    });

    const data = records.map((record) => ({
      month: record.monthLabel,
      gross: record.grossSalary,
      tax: record.taxAmount,
      deductions: record.deductions,
      advanceDeduction: 0,
      net: record.netSalary,
    }));

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

employeeRouter.get("/push/vapid-key", async (_req: EmployeeRequest, res, next) => {
  try {
    const keys = getVapidPublicKey();
    return res.json({ success: true, publicKey: keys.publicKey });
  } catch (error) {
    return next(error);
  }
});

employeeRouter.post("/push/subscribe", async (req: EmployeeRequest, res, next) => {
  try {
    const body = req.body as { endpoint?: string; keys?: { p256dh?: string; auth?: string }; expirationTime?: number | null };
    if (!body?.endpoint) return next(new AppError(400, "endpoint is required"));
    saveEmployeeSubscription(req.employeeId!, body);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

employeeRouter.post("/push/unsubscribe", async (req: EmployeeRequest, res, next) => {
  try {
    const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : undefined;
    removeEmployeeSubscription(req.employeeId!, endpoint);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

employeeRouter.get("/advance-history", async (req: EmployeeRequest, res, next) => {
  try {
    const result = await listEmployeeAdvanceHistory(req.employeeId!);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

employeeRouter.get("/workflow", async (req: EmployeeRequest, res, next) => {
  try {
    const requests = await prisma.advanceRequest.findMany({
      where: { employeeId: req.employeeId! },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const data = requests.flatMap((item) => {
      const rows = [
        {
          step: `Request ${item.requestNumber} created`,
          date: item.createdAt.toISOString().slice(0, 10),
          time: item.createdAt.toISOString().slice(11, 16),
          officer: "Employee",
          comments: item.purpose,
        },
      ];
      if (item.approvedAt) {
        rows.push({
          step: "Approved",
          date: item.approvedAt.toISOString().slice(0, 10),
          time: item.approvedAt.toISOString().slice(11, 16),
          officer: "Finance",
          comments: item.reviewComment ?? "Approved",
        });
      }
      if (item.rejectedAt) {
        rows.push({
          step: "Rejected",
          date: item.rejectedAt.toISOString().slice(0, 10),
          time: item.rejectedAt.toISOString().slice(11, 16),
          officer: "Finance",
          comments: item.reviewComment ?? "Rejected",
        });
      }
      if (item.disbursedAt) {
        rows.push({
          step: "Disbursed",
          date: item.disbursedAt.toISOString().slice(0, 10),
          time: item.disbursedAt.toISOString().slice(11, 16),
          officer: "Finance",
          comments: "Funds disbursed",
        });
      }
      return rows;
    });

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});
