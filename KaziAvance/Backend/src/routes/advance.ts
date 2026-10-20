import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { type EmployeeRequest } from "../middleware/employee";
import { AppError } from "../middleware/error";
import { TICHA_CASHOUT_CATALOG } from "../data/ticha-catalog";
import { listDeals, toPublicDeal } from "../services/deals-catalog.service";
import { recordRequestFee } from "../services/platform-policy.service";
import {
  buildReceiptForRequest,
  deleteEmployeeAdvanceRequest,
  updateEmployeeAdvanceRequest,
} from "../services/advance-request.service";
import {
  activeAdvanceCount,
  computeAdvanceSnapshot,
  deriveSalarySource,
  outstandingFromAdvances,
} from "../services/advance-eligibility.service";
import { isPayrollConfigured } from "../services/payroll.service";

type CalculatorInput = {
  desiredAmount: number;
  repaymentMonths: number;
};

const interestRateByMonths: Record<number, number> = {
  3: 2.5,
  6: 4.5,
  9: 6.5,
  12: 8.0,
};

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
    cb(null, `${uuid()}-signature-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    cb(null, allowed.includes(file.mimetype));
  },
});

export const advanceRouter = Router();

advanceRouter.get("/catalog", (_req, res) => {
  const deals = listDeals().map(toPublicDeal);
  return res.json({
    success: true,
    data: {
      cashouts: TICHA_CASHOUT_CATALOG,
      deals,
      services: TICHA_CASHOUT_CATALOG,
    },
  });
});

advanceRouter.get("/deals", (_req, res) => {
  return res.json({ success: true, data: listDeals().map(toPublicDeal) });
});

advanceRouter.post("/calculator", (req, res) => {
  const body = req.body as Partial<CalculatorInput>;
  const desiredAmount = Number(body.desiredAmount ?? 0);
  const repaymentMonths = Number(body.repaymentMonths ?? 0);

  if (!desiredAmount || !repaymentMonths) {
    return res.status(400).json({ message: "desiredAmount and repaymentMonths are required." });
  }

  const annualized = interestRateByMonths[repaymentMonths] ?? 9.5;
  const interest = Math.round((desiredAmount * annualized) / 100);
  const processingFee = Math.round(desiredAmount * 0.01);
  const totalRepayment = desiredAmount + interest + processingFee;
  const monthlyDeduction = Math.round(totalRepayment / repaymentMonths);
  const netAmountToReceive = desiredAmount - processingFee;

  const firstDeductionDate = new Date();
  firstDeductionDate.setMonth(firstDeductionDate.getMonth() + 1);
  const finalRepaymentDate = new Date(firstDeductionDate);
  finalRepaymentDate.setMonth(finalRepaymentDate.getMonth() + repaymentMonths - 1);

  return res.json({
    desiredAmount,
    repaymentMonths,
    interestRate: annualized,
    monthlyDeduction,
    interest,
    processingFee,
    netAmountToReceive,
    totalRepayment,
    firstDeductionDate: firstDeductionDate.toISOString(),
    finalRepaymentDate: finalRepaymentDate.toISOString(),
    progress: { paidPercent: 0, remainingPercent: 100 },
  });
});

advanceRouter.post(
  "/requests",
  upload.single("signature"),
  async (req: EmployeeRequest, res, next) => {
    try {
      const amount = Number(req.body?.amount ?? 0);
      const months = Number(req.body?.months ?? 0);
      const purposeRaw = String(req.body?.purpose ?? "").trim();
      const purposeOther = String(req.body?.purposeOther ?? "").trim();
      const description = String(req.body?.description ?? "").trim() || null;

      if (!amount || !months || !purposeRaw) {
        return next(new AppError(400, "amount, months and purpose are required"));
      }

      const purpose =
        purposeRaw.toLowerCase() === "others" || purposeRaw.toLowerCase() === "other"
          ? purposeOther
            ? `Others: ${purposeOther}`
            : "Others"
          : purposeRaw;

      if (
        (purposeRaw.toLowerCase() === "others" || purposeRaw.toLowerCase() === "other") &&
        !purposeOther
      ) {
        return next(new AppError(400, "Please specify the purpose when selecting Others"));
      }

      const employee = req.employee!;
      const organizationId = employee.organizationId ?? "";
      const policy = organizationId
        ? await prisma.orgPolicy.upsert({
            where: { organizationId },
            update: {},
            create: { organizationId },
          })
        : null;
      if (policy) {
        const advances = await prisma.advanceRequest.findMany({ where: { employeeId: employee.id } });
        const snapshot = computeAdvanceSnapshot({
          employee,
          policy,
          outstanding: outstandingFromAdvances(advances),
          activeCount: activeAdvanceCount(advances),
          payrollEnabled: isPayrollConfigured(),
          salarySource: deriveSalarySource(employee),
        });
        if (snapshot.status !== "Eligible") {
          return next(
            new AppError(
              400,
              snapshot.status === "Salary Missing" || snapshot.status === "Net Salary Missing"
                ? "Your salary is not on file yet. Ask your school admin to set it so you can request an advance."
                : snapshot.status === "Disabled"
                  ? "Advance requests are paused on your account."
                  : snapshot.status === "Advance Outstanding"
                    ? "You have reached your advance limit. Finish repayment before requesting more."
                    : "You are not currently eligible for an advance."
            )
          );
        }
      }

      const requestNumber = `ADV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const created = await prisma.advanceRequest.create({
        data: {
          requestNumber,
          employeeId: req.employeeId!,
          amount,
          repaymentMonths: months,
          purpose,
          description,
          signatureFile: req.file?.filename ?? null,
          signatureMimeType: req.file?.mimetype ?? null,
          signature: req.file?.originalname ?? null,
          status: "Pending",
        },
      });
      const fee = recordRequestFee(created.id, amount);

      return res.status(201).json({
        message: "Advance request submitted successfully.",
        requestNumber: created.requestNumber,
        id: created.id,
        status: created.status,
        platformFee: fee,
      });
    } catch (error) {
      return next(error);
    }
  }
);

advanceRouter.patch(
  "/requests/:id",
  upload.single("signature"),
  async (req: EmployeeRequest, res, next) => {
    try {
      const amount = req.body?.amount != null ? Number(req.body.amount) : undefined;
      const months = req.body?.months != null ? Number(req.body.months) : undefined;
      const purpose = req.body?.purpose != null ? String(req.body.purpose) : undefined;
      const purposeOther =
        req.body?.purposeOther != null ? String(req.body.purposeOther) : undefined;
      const description =
        req.body?.description !== undefined ? String(req.body.description) : undefined;

      const updated = await updateEmployeeAdvanceRequest(req.employeeId!, req.params.id, {
        amount,
        months,
        purpose,
        purposeOther,
        description,
        signatureFile: req.file?.filename,
        signatureMimeType: req.file?.mimetype,
        signatureName: req.file?.originalname,
      });

      return res.json({
        message: "Advance request updated.",
        requestNumber: updated.requestNumber,
        id: updated.id,
        status: updated.status,
      });
    } catch (error) {
      return next(error);
    }
  }
);

advanceRouter.delete("/requests/:id", async (req: EmployeeRequest, res, next) => {
  try {
    const result = await deleteEmployeeAdvanceRequest(req.employeeId!, req.params.id);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

advanceRouter.get("/requests/:id/receipt", async (req: EmployeeRequest, res, next) => {
  try {
    const request = await prisma.advanceRequest.findFirst({
      where: { id: req.params.id, employeeId: req.employeeId! },
      include: {
        employee: true,
        repayments: { orderBy: { installmentNumber: "asc" } },
      },
    });
    if (!request) return next(new AppError(404, "Request not found"));

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
