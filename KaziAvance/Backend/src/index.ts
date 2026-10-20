import cors from "cors";
import express from "express";
import path from "node:path";
import { env } from "./config/env";
import { authenticate, requireEmployeeModule, requireModuleLicense, requireServiceAuth } from "./middleware/auth";
import { requireEmployee } from "./middleware/employee";
import { requireTenant } from "./middleware/tenant";
import { errorHandler, notFound } from "./middleware/error";
import { advanceRouter } from "./routes/advance";
import { authRouter } from "./routes/auth";
import { documentsRouter } from "./routes/documents";
import { employeeRouter } from "./routes/employee";
import { orgAdminRouter } from "./routes/org-admin";
import { tenantRouter } from "./routes/tenant";
import { internalRouter } from "./routes/internal";
import { platformRouter } from "./routes/platform";
import { requireOrgAdmin, requirePlatformAdmin } from "./middleware/org-admin";
import { startPushReminderLoop } from "./services/web-push.service";

const app = express();
const port = env.PORT;

app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use("/uploads", express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", module: "KaziAdvance Backend API" });
});

/** IAM provisioning: POST /api/tenant/create with x-service-key */
app.use("/api/tenant", requireServiceAuth, tenantRouter);

/** Payroll / platform service integrations */
app.use("/api/internal", requireServiceAuth, internalRouter);

app.use("/api/auth", authRouter);
app.use(
  "/api/org-admin",
  authenticate,
  requireModuleLicense,
  requireTenant,
  requireOrgAdmin,
  orgAdminRouter
);
app.use("/api/platform", authenticate, requirePlatformAdmin, platformRouter);
app.use(
  "/api/employee",
  authenticate,
  requireEmployeeModule,
  requireTenant,
  requireEmployee,
  employeeRouter
);
app.use(
  "/api/advance",
  authenticate,
  requireEmployeeModule,
  requireTenant,
  requireEmployee,
  advanceRouter
);
app.use(
  "/api/documents",
  authenticate,
  requireModuleLicense,
  requireTenant,
  requireEmployee,
  documentsRouter
);
app.use(notFound);
app.use(errorHandler);

const server = app.listen(port, () => {
  startPushReminderLoop();
  // eslint-disable-next-line no-console
  console.log(`KaziAdvance backend running on http://localhost:${port}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  // eslint-disable-next-line no-console
  console.error(`[KaziAdvance] listen failed on port ${port}:`, err.code || err.message);
  process.exit(1);
});
