import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { dashboardController } from '../controllers/dashboard.controller';
import { supplierController } from '../controllers/supplier.controller';
import { canteenController } from '../controllers/canteen.controller';
import { walletController } from '../controllers/wallet.controller';
import { saleController } from '../controllers/sale.controller';
import { cashoutController } from '../controllers/cashout.controller';
import { driverController } from '../controllers/driver.controller';
import { imageController } from '../controllers/image.controller';
import { menuItemController } from '../controllers/menu-item.controller';
import { supplierProductController } from '../controllers/supplier-product.controller';
import { orderController } from '../controllers/order.controller';
import { inventoryController } from '../controllers/inventory.controller';
import { applicationController } from '../controllers/application.controller';
import { notificationController } from '../controllers/notification.controller';
import { reportController } from '../controllers/report.controller';
import { profileController } from '../controllers/profile.controller';
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
    service: 'canteen-service',
    module: 'canteen',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Tenant provisioning (IAM → module)
router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);
router.post('/tenant/ensure', authenticate, (req, res, next) =>
  tenantController.ensure(req, res, next)
);
router.get('/tenant', authenticate, requireModuleLicense, requireTenant, (req, res, next) =>
  tenantController.get(req, res, next)
);

// Service-to-service: Academic roster sync (reverse direction is outbound)
router.get('/service/tenant', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  tenantController.get(req, res, next)
);

// Service-to-service: Parent portal wallet (summary + top-up by student code)
router.get(
  '/service/wallet',
  requireServiceAuth,
  requireServiceTenant,
  (req, res, next) => walletController.parentSummary(req, res, next)
);
router.post(
  '/service/wallet/topup',
  requireServiceAuth,
  requireServiceTenant,
  (req, res, next) => walletController.parentTopUp(req, res, next)
);

// Public registration (landing) — supplier signup does not require a session
router.post('/register/supplier', (req, res, next) => supplierController.register(req, res, next));
router.post('/register/canteen', (req, res, next) => canteenController.registerCanteen(req, res, next));

// Public application tracking
router.get('/public/applications/:id', (req, res, next) =>
  applicationController.getByIdPublic(req, res, next)
);

const p = Router();
p.use(authenticate, requireModuleLicense, requireTenant);

// Auth-agnostic profile lookups (the token is still verified)
p.get('/me/supplier', supplierController.me);
p.get('/me/driver', (req, res, next) => driverController.me(req, res, next));
p.get('/me/profile', (req, res, next) => profileController.me(req, res, next));

// Dashboard
p.get('/dashboard', (req, res, next) => dashboardController.summary(req, res, next));

// Canteen (school)
p.post('/canteen/connect', (req, res, next) => canteenController.connect(req, res, next));
p.post('/canteen/sync', (req, res, next) => canteenController.sync(req, res, next));
p.post('/canteen/provision-staff', (req, res, next) => canteenController.provisionStaff(req, res, next));
p.post('/canteen/configure-operator', (req, res, next) => canteenController.configureOperator(req, res, next));
p.get('/canteen/schools', (req, res, next) => canteenController.schools(req, res, next));
p.get('/canteen/school-stats/:id', (req, res, next) => canteenController.schoolStats(req, res, next));

// Wallets / student cards
p.get('/wallets', (req, res, next) => walletController.list(req, res, next));
p.get('/wallets/ledger', (req, res, next) => walletController.ledger(req, res, next));
p.get('/wallets/by-card/:cardCode', (req, res, next) => walletController.getByCard(req, res, next));
p.get('/wallets/by-code/:studentCode', (req, res, next) => walletController.getByStudentCode(req, res, next));
p.get('/wallets/:id', (req, res, next) => walletController.getById(req, res, next));
p.post('/wallets/:id/topup', (req, res, next) => walletController.topup(req, res, next));
p.get('/wallets/:id/transactions', (req, res, next) => walletController.transactions(req, res, next));
p.patch('/wallets/:id/status', (req, res, next) => walletController.setStatus(req, res, next));

// Sales (POS)
p.post('/sales/process', (req, res, next) => saleController.process(req, res, next));
p.get('/sales', (req, res, next) => saleController.list(req, res, next));
p.get('/sales/:id', (req, res, next) => saleController.getById(req, res, next));

// Menu items (school canteen)
p.get('/menu-items', (req, res, next) => menuItemController.list(req, res, next));
p.get('/menu-items/:id', (req, res, next) => menuItemController.getById(req, res, next));
p.post('/menu-items', (req, res, next) => menuItemController.create(req, res, next));
p.put('/menu-items/:id', (req, res, next) => menuItemController.update(req, res, next));
p.delete('/menu-items/:id', (req, res, next) => menuItemController.remove(req, res, next));

// Suppliers
p.post('/suppliers/register', (req, res, next) => supplierController.register(req, res, next));
p.post('/suppliers/approve', (req, res, next) => supplierController.approve(req, res, next));
p.post('/suppliers/provision-staff', (req, res, next) => supplierController.provisionStaff(req, res, next));
p.get('/suppliers', (req, res, next) => supplierController.list(req, res, next));
p.get('/suppliers/:supplierId', (req, res, next) => supplierController.getById(req, res, next));
p.put('/suppliers/:supplierId', (req, res, next) => supplierController.update(req, res, next));
p.delete('/suppliers/:supplierId', (req, res, next) => supplierController.suspend(req, res, next));
p.get('/suppliers/:supplierId/products', (req, res, next) => supplierProductController.list(req, res, next));
p.post('/suppliers/:supplierId/products', (req, res, next) => supplierProductController.create(req, res, next));
p.put('/suppliers/:supplierId/products/:productId', (req, res, next) => supplierProductController.update(req, res, next));
p.delete('/suppliers/:supplierId/products/:productId', (req, res, next) => supplierProductController.remove(req, res, next));

// Purchase orders
p.post('/orders', (req, res, next) => orderController.create(req, res, next));
p.get('/orders', (req, res, next) => orderController.list(req, res, next));
p.get('/orders/supplier/:supplierId', (req, res, next) => orderController.bySupplier(req, res, next));
p.get('/orders/:id', (req, res, next) => orderController.getById(req, res, next));
p.patch('/orders/:id/status', (req, res, next) => orderController.updateStatus(req, res, next));

// Inventory
p.get('/inventory', (req, res, next) => inventoryController.list(req, res, next));
p.post('/inventory', (req, res, next) => inventoryController.create(req, res, next));
p.patch('/inventory/:id/adjust', (req, res, next) => inventoryController.adjust(req, res, next));
p.delete('/inventory/:id', (req, res, next) => inventoryController.remove(req, res, next));

// Cashouts
p.post('/cashouts', (req, res, next) => cashoutController.request(req, res, next));
p.get('/cashouts', (req, res, next) => cashoutController.list(req, res, next));
p.get('/cashouts/balance', (req, res, next) => cashoutController.balance(req, res, next));
p.get('/cashouts/history', (req, res, next) => cashoutController.history(req, res, next));
p.patch('/cashouts/:id/status', (req, res, next) => cashoutController.updateStatus(req, res, next));

// Drivers & deliveries
p.post('/drivers/register', (req, res, next) => driverController.register(req, res, next));
p.get('/drivers', (req, res, next) => driverController.list(req, res, next));
p.get('/drivers/supplier/:supplierId', (req, res, next) => driverController.bySupplier(req, res, next));
p.get('/drivers/:driverId', (req, res, next) => driverController.getDriver(req, res, next));
p.put('/drivers/:driverId/location', (req, res, next) => driverController.updateLocation(req, res, next));
p.post('/deliveries', (req, res, next) => driverController.createDelivery(req, res, next));
p.get('/deliveries', (req, res, next) => driverController.deliveries(req, res, next));
p.get('/deliveries/supplier/:supplierId', (req, res, next) => driverController.deliveriesBySupplier(req, res, next));
p.get('/deliveries/driver/:driverId', (req, res, next) => driverController.deliveriesByDriver(req, res, next));
p.put('/deliveries/:deliveryId/status', (req, res, next) => driverController.updateDeliveryStatus(req, res, next));

// Onboarding applications
p.get('/applications', (req, res, next) => applicationController.list(req, res, next));
p.get('/applications/:id', (req, res, next) => applicationController.getById(req, res, next));
p.post('/applications/:id/approve', (req, res, next) => applicationController.approve(req, res, next));
p.post('/applications/:id/reject', (req, res, next) => applicationController.reject(req, res, next));

// Notifications
p.get('/notifications', (req, res, next) => notificationController.list(req, res, next));
p.post('/notifications', (req, res, next) => notificationController.create(req, res, next));
p.post('/notifications/:id/read', (req, res, next) => notificationController.markRead(req, res, next));
p.post('/notifications/read-all', (req, res, next) => notificationController.markAllRead(req, res, next));

// Reports
p.get('/reports/sales', (req, res, next) => reportController.sales(req, res, next));
p.get('/reports/top-menu-items', (req, res, next) => reportController.topMenuItems(req, res, next));
p.get('/reports/cashouts', (req, res, next) => reportController.cashouts(req, res, next));
p.get('/reports/wallets', (req, res, next) => reportController.wallets(req, res, next));

// Images
p.post('/images/upload', imageController.upload, (req, res, next) =>
  imageController.uploadSingle(req, res, next)
);
p.post('/images/upload-multiple', imageController.uploadMultiple, (req, res, next) =>
  imageController.uploadMultipleImages(req, res, next)
);
p.delete('/images/delete', (req, res, next) => imageController.delete(req, res, next));

router.use(p);

export default router;
