import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { dashboardController } from '../controllers/dashboard.controller';
import { purchaseRequestController } from '../controllers/purchase-request.controller';
import { purchaseOrderController } from '../controllers/purchase-order.controller';
import { supplierController } from '../controllers/supplier.controller';
import { contractController } from '../controllers/contract.controller';
import { budgetController } from '../controllers/budget.controller';
import { goodsReceivingController } from '../controllers/goods-receiving.controller';
import { goodsReturnController } from '../controllers/goods-return.controller';
import { notificationController } from '../controllers/notification.controller';
import { departmentController } from '../controllers/department.controller';
import { analyticsController } from '../controllers/analytics.controller';
import { settingsController } from '../controllers/settings.controller';
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
} from '../middleware/auth.middleware';
import { requireTenant, requireServiceTenant } from '../middleware/tenant.middleware';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'procurement-mis-service',
    module: 'procurement-mis',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

router.post('/tenant/ensure', authenticate, requireModuleLicense, (req, res, next) =>
  tenantController.ensure(req, res, next)
);

const p = Router();
p.use(authenticate, requireModuleLicense, requireTenant);

p.get('/dashboard', (req, res, next) => dashboardController.summary(req, res, next));

p.get('/departments', (req, res, next) => departmentController.list(req, res, next));

p.get('/analytics/procurement', (req, res, next) => analyticsController.procurement(req, res, next));
p.get('/analytics/department-spending', (req, res, next) => analyticsController.departmentSpending(req, res, next));
p.get('/analytics/department-spending/:departmentId', (req, res, next) => analyticsController.departmentDetail(req, res, next));
p.get('/analytics/requester-analysis', (req, res, next) => analyticsController.requesterAnalysis(req, res, next));
p.get('/analytics/requester-analysis/:requesterId', (req, res, next) => analyticsController.requesterProfile(req, res, next));

p.get('/settings/receipt', (req, res, next) => settingsController.getReceiptSettings(req, res, next));
p.put('/settings/receipt', (req, res, next) => settingsController.updateReceiptSettings(req, res, next));
p.get('/settings/academic', (req, res, next) => settingsController.getAcademicSettings(req, res, next));
p.put('/settings/academic', (req, res, next) => settingsController.updateAcademicSettings(req, res, next));
p.get('/settings/org-profile', (req, res, next) => settingsController.getOrgProfile(req, res, next));

p.get('/purchase-requests', (req, res, next) => purchaseRequestController.list(req, res, next));
p.get('/purchase-requests/:id', (req, res, next) => purchaseRequestController.getById(req, res, next));
p.post('/purchase-requests', (req, res, next) => purchaseRequestController.create(req, res, next));
p.put('/purchase-requests/:id', (req, res, next) => purchaseRequestController.update(req, res, next));
p.put('/purchase-requests/:id/approve', (req, res, next) => purchaseRequestController.approve(req, res, next));
p.put('/purchase-requests/:id/reject', (req, res, next) => purchaseRequestController.reject(req, res, next));
p.put('/purchase-requests/:id/cancel', (req, res, next) => purchaseRequestController.cancel(req, res, next));
p.delete('/purchase-requests/:id', (req, res, next) => purchaseRequestController.remove(req, res, next));

p.get('/purchase-orders', (req, res, next) => purchaseOrderController.list(req, res, next));
p.get('/purchase-orders/:id', (req, res, next) => purchaseOrderController.getById(req, res, next));
p.post('/purchase-orders', (req, res, next) => purchaseOrderController.create(req, res, next));
p.put('/purchase-orders/:id/status', (req, res, next) => purchaseOrderController.updateStatus(req, res, next));
p.put('/purchase-orders/:id/payment', (req, res, next) => purchaseOrderController.updatePaymentStatus(req, res, next));
p.delete('/purchase-orders/:id', (req, res, next) => purchaseOrderController.remove(req, res, next));

p.get('/suppliers', (req, res, next) => supplierController.list(req, res, next));
p.get('/suppliers/summary', (req, res, next) => supplierController.summary(req, res, next));
p.get('/suppliers/:id', (req, res, next) => supplierController.getById(req, res, next));
p.post('/suppliers', (req, res, next) => supplierController.create(req, res, next));
p.put('/suppliers/:id', (req, res, next) => supplierController.update(req, res, next));
p.get('/suppliers/:id/performance', (req, res, next) => supplierController.getPerformance(req, res, next));
p.post('/suppliers/:id/performance', (req, res, next) => supplierController.addPerformance(req, res, next));

p.get('/contracts', (req, res, next) => contractController.list(req, res, next));
p.get('/contracts/expiring', (req, res, next) => contractController.getExpiring(req, res, next));
p.get('/contracts/:id', (req, res, next) => contractController.getById(req, res, next));
p.post('/contracts', (req, res, next) => contractController.create(req, res, next));
p.put('/contracts/:id', (req, res, next) => contractController.update(req, res, next));

p.get('/budgets', (req, res, next) => budgetController.list(req, res, next));
p.get('/budgets/summary', (req, res, next) => budgetController.summary(req, res, next));
p.get('/budgets/:id', (req, res, next) => budgetController.getById(req, res, next));
p.post('/budgets', (req, res, next) => budgetController.create(req, res, next));
p.put('/budgets/:id', (req, res, next) => budgetController.update(req, res, next));

p.get('/goods-receivings/summary', (req, res, next) => goodsReceivingController.summary(req, res, next));
p.get('/goods-receivings/po/:poId/context', (req, res, next) => goodsReceivingController.poContext(req, res, next));
p.get('/goods-receivings/po/:poId', (req, res, next) => goodsReceivingController.getByPoId(req, res, next));
p.get('/goods-receivings', (req, res, next) => goodsReceivingController.list(req, res, next));
p.get('/goods-receivings/:id', (req, res, next) => goodsReceivingController.getById(req, res, next));
p.post('/goods-receivings', (req, res, next) => goodsReceivingController.create(req, res, next));

p.get('/returns/summary', (req, res, next) => goodsReturnController.summary(req, res, next));
p.get('/returns/grn/:grnId/context', (req, res, next) => goodsReturnController.grnContext(req, res, next));
p.get('/returns', (req, res, next) => goodsReturnController.list(req, res, next));
p.get('/returns/:id', (req, res, next) => goodsReturnController.getById(req, res, next));
p.post('/returns', (req, res, next) => goodsReturnController.create(req, res, next));
p.put('/returns/:id/status', (req, res, next) => goodsReturnController.updateStatus(req, res, next));

p.get('/notifications', (req, res, next) => notificationController.list(req, res, next));
p.get('/notifications/unread-count', (req, res, next) => notificationController.unreadCount(req, res, next));
p.put('/notifications/:id/read', (req, res, next) => notificationController.markAsRead(req, res, next));
p.put('/notifications/read-all', (req, res, next) => notificationController.markAllAsRead(req, res, next));

router.use(p);

export default router;
