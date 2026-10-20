import { Router, Request, Response } from "express";
import { tenantController } from "../controllers/tenant.controller";
import { dashboardController } from "../controllers/dashboard.controller";
import { settingsController } from "../controllers/settings.controller";
import { orgProfileController } from "../controllers/org-profile.controller";
import { catalogController } from "../controllers/catalog.controller";
import { inventoryController } from "../controllers/inventory.controller";
import { studentsController } from "../controllers/students.controller";
import { distributionController } from "../controllers/distribution.controller";
import { salesController } from "../controllers/sales.controller";
import { fabricController } from "../controllers/fabric.controller";
import { tailorController } from "../controllers/tailor.controller";
import { reportsController } from "../controllers/reports.controller";
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
} from "../middleware/auth.middleware";
import { requireTenant } from "../middleware/tenant.middleware";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: "school-uniform-module-service",
    module: "school-uniform",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

router.post("/tenant/create", requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next),
);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

protectedRouter.get("/dashboard", (req, res, next) =>
  dashboardController.summary(req, res, next),
);

protectedRouter.get("/settings", (req, res, next) =>
  settingsController.get(req, res, next),
);
protectedRouter.patch("/settings", (req, res, next) =>
  settingsController.update(req, res, next),
);

protectedRouter.get("/org-profile", (req, res, next) =>
  orgProfileController.get(req, res, next),
);

protectedRouter.get("/categories", (req, res, next) =>
  catalogController.listCategories(req, res, next),
);
protectedRouter.post("/categories", (req, res, next) =>
  catalogController.createCategory(req, res, next),
);
protectedRouter.patch("/categories/:id", (req, res, next) =>
  catalogController.updateCategory(req, res, next),
);

protectedRouter.get("/products", (req, res, next) =>
  catalogController.listProducts(req, res, next),
);
protectedRouter.post("/products", (req, res, next) =>
  catalogController.createProduct(req, res, next),
);
protectedRouter.get("/products/:id", (req, res, next) =>
  catalogController.getProduct(req, res, next),
);
protectedRouter.patch("/products/:id", (req, res, next) =>
  catalogController.updateProduct(req, res, next),
);
protectedRouter.delete("/products/:id", (req, res, next) =>
  catalogController.deleteProduct(req, res, next),
);
protectedRouter.post("/products/:id/variants", (req, res, next) =>
  catalogController.createVariant(req, res, next),
);
protectedRouter.patch("/variants/:id", (req, res, next) =>
  catalogController.updateVariant(req, res, next),
);

protectedRouter.get("/packages", (req, res, next) =>
  catalogController.listPackages(req, res, next),
);
protectedRouter.post("/packages", (req, res, next) =>
  catalogController.createPackage(req, res, next),
);
protectedRouter.patch("/packages/:id", (req, res, next) =>
  catalogController.updatePackage(req, res, next),
);

protectedRouter.get("/stock", (req, res, next) =>
  inventoryController.listStock(req, res, next),
);
protectedRouter.post("/stock/adjust", (req, res, next) =>
  inventoryController.adjustStock(req, res, next),
);

protectedRouter.get("/students/academic-search", (req, res, next) =>
  studentsController.academicSearch(req, res, next),
);
protectedRouter.get("/students/academic-status", (req, res, next) =>
  studentsController.academicStatus(req, res, next),
);
protectedRouter.post("/students/sync-academic", (req, res, next) =>
  studentsController.syncAcademic(req, res, next),
);
protectedRouter.post("/students/import", (req, res, next) =>
  studentsController.bulkImport(req, res, next),
);
protectedRouter.get("/students", (req, res, next) =>
  studentsController.list(req, res, next),
);
protectedRouter.post("/students", (req, res, next) =>
  studentsController.create(req, res, next),
);
protectedRouter.get("/students/:id", (req, res, next) =>
  studentsController.getProfile(req, res, next),
);
protectedRouter.patch("/students/:id", (req, res, next) =>
  studentsController.update(req, res, next),
);
protectedRouter.put("/students/:id/measurements", (req, res, next) =>
  studentsController.upsertMeasurement(req, res, next),
);
protectedRouter.put("/students/:id/checklist", (req, res, next) =>
  studentsController.setChecklist(req, res, next),
);

protectedRouter.get("/distributions/receipts", (req, res, next) =>
  distributionController.listReceipts(req, res, next),
);
protectedRouter.get("/distributions/receipts/:id", (req, res, next) =>
  distributionController.getReceipt(req, res, next),
);
protectedRouter.get("/distributions", (req, res, next) =>
  distributionController.list(req, res, next),
);
protectedRouter.post("/distributions", (req, res, next) =>
  distributionController.create(req, res, next),
);
protectedRouter.post("/distributions/issue", (req, res, next) =>
  distributionController.issueBatch(req, res, next),
);

protectedRouter.get("/returns", (req, res, next) =>
  distributionController.listReturns(req, res, next),
);
protectedRouter.get("/returns/analytics", (req, res, next) =>
  distributionController.returnAnalytics(req, res, next),
);
protectedRouter.post("/returns", (req, res, next) =>
  distributionController.createReturn(req, res, next),
);

protectedRouter.get("/sales", (req, res, next) =>
  salesController.list(req, res, next),
);
protectedRouter.post("/sales", (req, res, next) =>
  salesController.create(req, res, next),
);
protectedRouter.post("/sales/:id/payments", (req, res, next) =>
  salesController.addPayment(req, res, next),
);
protectedRouter.get("/payments", (req, res, next) =>
  salesController.listOutstandingPayments(req, res, next),
);

protectedRouter.get("/fabrics/summary", (req, res, next) =>
  fabricController.summary(req, res, next),
);
protectedRouter.get("/fabrics", (req, res, next) =>
  fabricController.list(req, res, next),
);
protectedRouter.post("/fabrics", (req, res, next) =>
  fabricController.create(req, res, next),
);
protectedRouter.patch("/fabrics/:id", (req, res, next) =>
  fabricController.update(req, res, next),
);
protectedRouter.delete("/fabrics/:id", (req, res, next) =>
  fabricController.remove(req, res, next),
);
protectedRouter.get("/fabric-purchases", (req, res, next) =>
  fabricController.listPurchases(req, res, next),
);
protectedRouter.post("/fabric-stock-in", (req, res, next) =>
  fabricController.stockIn(req, res, next),
);
protectedRouter.get("/fabric-issues", (req, res, next) =>
  fabricController.listIssues(req, res, next),
);
protectedRouter.post("/fabric-issues", (req, res, next) =>
  fabricController.createIssue(req, res, next),
);
protectedRouter.patch("/fabric-issues/:id", (req, res, next) =>
  fabricController.updateIssue(req, res, next),
);
protectedRouter.delete("/fabric-issues/:id", (req, res, next) =>
  fabricController.removeIssue(req, res, next),
);

protectedRouter.get("/tailors", (req, res, next) =>
  tailorController.listTailors(req, res, next),
);
protectedRouter.post("/tailors", (req, res, next) =>
  tailorController.createTailor(req, res, next),
);
protectedRouter.patch("/tailors/:id", (req, res, next) =>
  tailorController.updateTailor(req, res, next),
);

protectedRouter.get("/production-orders", (req, res, next) =>
  tailorController.listProductionOrders(req, res, next),
);
protectedRouter.post("/production-orders", (req, res, next) =>
  tailorController.createProductionOrder(req, res, next),
);
protectedRouter.patch("/production-orders/:id", (req, res, next) =>
  tailorController.updateProductionOrder(req, res, next),
);
protectedRouter.post("/production-orders/:id/receive", (req, res, next) =>
  tailorController.receiveProduction(req, res, next),
);

protectedRouter.get("/reports/:type", (req, res, next) =>
  reportsController.run(req, res, next),
);

router.use(protectedRouter);

export default router;
