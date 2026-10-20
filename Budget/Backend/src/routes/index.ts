import { Router } from "express";
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { AppError } from "../middleware/error.middleware";
import { createTenant } from "../services/tenant.service";
import {
  createBudget,
  deleteBudget,
  getBudget,
  getDashboard,
  getOptions,
  listAuditLogs,
  listBudgets,
  managerOverview,
  reviewBudget,
  updateBudget,
} from "../services/budget.service";
import {
  createLine,
  createUsage,
  departmentView,
  freezeLine,
  lineOptions,
  linesSummary,
  listLines,
  listUsage,
  updateLine,
  vsActual,
} from "../services/lines.service";
import { settingsController } from "../controllers/settings.controller";

const router = Router();

function orgId(req: AuthenticatedRequest) {
  const id = req.organizationRef ?? req.user?.organizationId;
  if (!id) throw new AppError(401, "Missing organization context");
  return id;
}

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function actor(req: AuthenticatedRequest) {
  return {
    id: req.user?.sub,
    email: req.user?.email,
    roles: req.user?.roles,
  };
}

function ok(data: unknown, message?: string) {
  return { success: true, data, ...(message ? { message } : {}) };
}

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "school-budget" });
});

router.post("/tenant/create", requireServiceAuth, async (req, res, next) => {
  try {
    const body = req.body as {
      organizationId?: string;
      organizationName?: string;
      organizationCode?: string;
    };
    if (!body.organizationId || !body.organizationName) {
      throw new AppError(400, "organizationId and organizationName are required");
    }
    const tenant = await createTenant({
      organizationId: body.organizationId,
      organizationName: body.organizationName,
      organizationCode: body.organizationCode,
    });
    return res.status(201).json(ok(tenant));
  } catch (e) {
    return next(e);
  }
});

router.post("/tenant/ensure", authenticate, requireModuleLicense, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = req.user!;
    const tenant = await createTenant({
      organizationId: user.organizationId,
      organizationName: String(req.body?.organizationName ?? "Organization"),
      organizationCode: req.body?.organizationCode,
    });
    return res.json(ok(tenant));
  } catch (e) {
    return next(e);
  }
});

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

protectedRouter.get("/options", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await getOptions(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/settings/academic", (req, res, next) =>
  settingsController.getAcademicSettings(req as AuthenticatedRequest, res, next)
);
protectedRouter.put("/settings/academic", (req, res, next) =>
  settingsController.updateAcademicSettings(req as AuthenticatedRequest, res, next)
);

protectedRouter.get("/dashboard", async (req: AuthenticatedRequest, res, next) => {
  try {
    const budgetId = typeof req.query.budget_id === "string" ? req.query.budget_id : undefined;
    return res.json(ok(await getDashboard(orgId(req), budgetId)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/budgets", async (req: AuthenticatedRequest, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    return res.json(ok(await listBudgets(orgId(req), status)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/budgets/manager-overview", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await managerOverview(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/budgets/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await getBudget(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/budgets", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await createBudget(orgId(req), actor(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.patch("/budgets/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await updateBudget(orgId(req), paramId(req.params.id), actor(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.delete("/budgets/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    await deleteBudget(orgId(req), paramId(req.params.id), actor(req));
    return res.json(ok({ deleted: true }));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.patch("/budgets/:id/review", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await reviewBudget(orgId(req), paramId(req.params.id), actor(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/budget-lines/options", async (_req, res) => {
  res.json(ok(lineOptions()));
});

protectedRouter.get("/budget-lines", async (req: AuthenticatedRequest, res, next) => {
  try {
    const budgetId = typeof req.query.budget_id === "string" ? req.query.budget_id : undefined;
    return res.json(ok(await listLines(orgId(req), budgetId)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/budget-lines/summary", async (req: AuthenticatedRequest, res, next) => {
  try {
    const budgetId = typeof req.query.budget_id === "string" ? req.query.budget_id : undefined;
    return res.json(ok(await linesSummary(orgId(req), budgetId)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/budget-lines", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await createLine(orgId(req), actor(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.patch("/budget-lines/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await updateLine(orgId(req), paramId(req.params.id), actor(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.patch("/budget-lines/:id/freeze", async (req: AuthenticatedRequest, res, next) => {
  try {
    const freeze = Boolean(req.body?.freeze ?? true);
    return res.json(ok(await freezeLine(orgId(req), paramId(req.params.id), actor(req), freeze)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/budget-line-usage", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await createUsage(orgId(req), actor(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/budget-line-usage", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(
        await listUsage(orgId(req), {
          budgetId: typeof req.query.budget_id === "string" ? req.query.budget_id : undefined,
          budgetLineId:
            typeof req.query.budget_line_id === "string" ? req.query.budget_line_id : undefined,
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/departments", async (req: AuthenticatedRequest, res, next) => {
  try {
    const budgetId = typeof req.query.budget_id === "string" ? req.query.budget_id : undefined;
    return res.json(ok(await departmentView(orgId(req), budgetId)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/vs-actual", async (req: AuthenticatedRequest, res, next) => {
  try {
    const budgetId = typeof req.query.budget_id === "string" ? req.query.budget_id : undefined;
    return res.json(ok(await vsActual(orgId(req), budgetId)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/audit-logs", async (req: AuthenticatedRequest, res, next) => {
  try {
    const budgetId = typeof req.query.budget_id === "string" ? req.query.budget_id : undefined;
    return res.json(ok(await listAuditLogs(orgId(req), budgetId)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/analytics", async (req: AuthenticatedRequest, res, next) => {
  try {
    const dash = await getDashboard(
      orgId(req),
      typeof req.query.budget_id === "string" ? req.query.budget_id : undefined
    );
    return res.json(
      ok({
        kpis: dash.kpis,
        byDepartment: dash.byDepartment,
        byCategory: dash.byCategory,
        alerts: dash.alerts,
      })
    );
  } catch (e) {
    return next(e);
  }
});

// Docs-compatible aliases
router.use("/", protectedRouter);
router.use("/accountant/school-budgets", protectedRouter);

export default router;
