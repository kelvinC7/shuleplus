import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { dashboardController } from '../controllers/dashboard.controller';
import { categoryController } from '../controllers/category.controller';
import { productController } from '../controllers/product.controller';
import { storeController } from '../controllers/store.controller';
import { supplierController } from '../controllers/supplier.controller';
import { receivingController } from '../controllers/receiving.controller';
import { issueController } from '../controllers/issue.controller';
import { transferController } from '../controllers/transfer.controller';
import { adjustmentController } from '../controllers/adjustment.controller';
import { stockRequestController } from '../controllers/stock-request.controller';
import { physicalCountController } from '../controllers/physical-count.controller';
import { disposalController } from '../controllers/disposal.controller';
import { analyticsController } from '../controllers/analytics.controller';
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
} from '../middleware/auth.middleware';
import { requireTenant, requireServiceTenant } from '../middleware/tenant.middleware';
import { requirePermission } from '../middleware/permissions.middleware';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'inventory-mis-service',
    module: 'inventory-mis',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

// Service-to-service endpoint: Cafeteria (and other modules) can create stock requests
router.post('/service/stock-requests', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  stockRequestController.createFromService(req, res, next)
);

router.get('/service/stock-requests', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  stockRequestController.listFromService(req, res, next)
);

router.get('/service/stock-requests/:id', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  stockRequestController.getByIdFromService(req, res, next)
);

router.put('/service/stock-requests/:id/approve', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  stockRequestController.approveFromService(req, res, next)
);

router.put('/service/stock-requests/:id/reject', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  stockRequestController.rejectFromService(req, res, next)
);

router.put('/service/stock-requests/:id/issue', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  stockRequestController.issueFromService(req, res, next)
);

router.get('/service/products', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  productController.listFromService(req, res, next)
);

router.get('/service/stock-requests/:id/grn', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  receivingController.getByStockRequestIdFromService(req, res, next)
);

router.post('/service/stock-requests/:id/grn', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  receivingController.createFromStockRequestService(req, res, next)
);

const p = Router();
p.use(authenticate, requireModuleLicense, requireTenant);

p.get('/dashboard', (req, res, next) => dashboardController.summary(req, res, next));
p.get('/analytics/dashboard', (req, res, next) => analyticsController.dashboard(req, res, next));
p.get('/analytics/category-consumption', (req, res, next) => analyticsController.categoryConsumption(req, res, next));
p.get('/analytics/stock-movement', (req, res, next) => analyticsController.stockMovement(req, res, next));

p.get('/categories', (req, res, next) => categoryController.list(req, res, next));
p.get('/categories/:id', (req, res, next) => categoryController.getById(req, res, next));
p.post('/categories', requirePermission('create'), (req, res, next) => categoryController.create(req, res, next));
p.put('/categories/:id', requirePermission('edit'), (req, res, next) => categoryController.update(req, res, next));
p.delete('/categories/:id', requirePermission('delete'), (req, res, next) => categoryController.remove(req, res, next));

p.get('/products', (req, res, next) => productController.list(req, res, next));
p.get('/products/stock-summary', (req, res, next) => productController.getStockSummary(req, res, next));
p.get('/products/:id', (req, res, next) => productController.getById(req, res, next));
p.post('/products', requirePermission('create'), (req, res, next) => productController.create(req, res, next));
p.put('/products/:id', requirePermission('edit'), (req, res, next) => productController.update(req, res, next));
p.delete('/products/:id', requirePermission('delete'), (req, res, next) => productController.remove(req, res, next));

p.get('/stores', (req, res, next) => storeController.list(req, res, next));
p.get('/stores/:id', (req, res, next) => storeController.getById(req, res, next));
p.post('/stores', requirePermission('create'), (req, res, next) => storeController.create(req, res, next));
p.put('/stores/:id', requirePermission('edit'), (req, res, next) => storeController.update(req, res, next));
p.delete('/stores/:id', requirePermission('delete'), (req, res, next) => storeController.remove(req, res, next));
p.get('/stores/:id/shelves', (req, res, next) => storeController.listShelves(req, res, next));
p.post('/stores/:id/shelves', requirePermission('create'), (req, res, next) => storeController.createShelf(req, res, next));

p.get('/suppliers', (req, res, next) => supplierController.list(req, res, next));
p.get('/suppliers/:id', (req, res, next) => supplierController.getById(req, res, next));
p.post('/suppliers', requirePermission('create'), (req, res, next) => supplierController.create(req, res, next));
p.put('/suppliers/:id', requirePermission('edit'), (req, res, next) => supplierController.update(req, res, next));

p.get('/receivings', (req, res, next) => receivingController.list(req, res, next));
p.get('/receivings/:id', (req, res, next) => receivingController.getById(req, res, next));
p.post('/receivings', requirePermission('create'), (req, res, next) => receivingController.create(req, res, next));
p.put('/receivings/:id', requirePermission('edit'), (req, res, next) => receivingController.update(req, res, next));
p.delete('/receivings/:id', requirePermission('delete'), (req, res, next) => receivingController.remove(req, res, next));
p.post('/receivings/from-stock-request', requirePermission('create'), (req, res, next) => receivingController.createFromStockRequest(req, res, next));
p.get('/stock-requests/:stockRequestId/grn', (req, res, next) => receivingController.getByStockRequestId(req, res, next));

p.get('/issues', (req, res, next) => issueController.list(req, res, next));
p.get('/issues/:id', (req, res, next) => issueController.getById(req, res, next));
p.post('/issues', requirePermission('create'), (req, res, next) => issueController.create(req, res, next));
p.put('/issues/:id/approve', requirePermission('approve'), (req, res, next) => issueController.approve(req, res, next));
p.put('/issues/:id/reject', requirePermission('reject'), (req, res, next) => issueController.reject(req, res, next));

p.get('/transfers', (req, res, next) => transferController.list(req, res, next));
p.get('/transfers/:id', (req, res, next) => transferController.getById(req, res, next));
p.post('/transfers', requirePermission('create'), (req, res, next) => transferController.create(req, res, next));
p.put('/transfers/:id/approve', requirePermission('approve'), (req, res, next) => transferController.approve(req, res, next));
p.put('/transfers/:id/receive', requirePermission('receive'), (req, res, next) => transferController.receive(req, res, next));
p.put('/transfers/:id/reject', requirePermission('reject'), (req, res, next) => transferController.reject(req, res, next));

p.get('/adjustments', (req, res, next) => adjustmentController.list(req, res, next));
p.get('/adjustments/:id', (req, res, next) => adjustmentController.getById(req, res, next));
p.post('/adjustments', requirePermission('create'), (req, res, next) => adjustmentController.create(req, res, next));

p.get('/stock-requests', (req, res, next) => stockRequestController.list(req, res, next));
p.get('/stock-requests/:id', (req, res, next) => stockRequestController.getById(req, res, next));
p.post('/stock-requests', requirePermission('create'), (req, res, next) => stockRequestController.create(req, res, next));
p.put('/stock-requests/:id', requirePermission('edit'), (req, res, next) => stockRequestController.update(req, res, next));
p.delete('/stock-requests/:id', requirePermission('delete'), (req, res, next) => stockRequestController.remove(req, res, next));
p.post('/stock-requests/:id/items', requirePermission('create'), (req, res, next) => stockRequestController.addItem(req, res, next));
p.put('/stock-requests/:id/items/:itemId', requirePermission('edit'), (req, res, next) => stockRequestController.updateItem(req, res, next));
p.delete('/stock-requests/:id/items/:itemId', requirePermission('delete'), (req, res, next) => stockRequestController.removeItem(req, res, next));
p.put('/stock-requests/:id/approve', requirePermission('approve'), (req, res, next) => stockRequestController.approve(req, res, next));
p.put('/stock-requests/:id/reject', requirePermission('reject'), (req, res, next) => stockRequestController.reject(req, res, next));

p.get('/physical-counts', (req, res, next) => physicalCountController.list(req, res, next));
p.get('/physical-counts/:id', (req, res, next) => physicalCountController.getById(req, res, next));
p.post('/physical-counts', requirePermission('create'), (req, res, next) => physicalCountController.create(req, res, next));
p.put('/physical-counts/:id/complete', requirePermission('count'), (req, res, next) => physicalCountController.complete(req, res, next));

p.get('/disposals', (req, res, next) => disposalController.list(req, res, next));
p.get('/disposals/:id', (req, res, next) => disposalController.getById(req, res, next));
p.post('/disposals', requirePermission('create'), (req, res, next) => disposalController.create(req, res, next));

router.use(p);

export default router;
