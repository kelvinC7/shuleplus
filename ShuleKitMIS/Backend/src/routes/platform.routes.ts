import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth.middleware';
import { platformController } from '../controllers/platform.controller';

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/dashboard', (req, res, next) => platformController.dashboard(req, res, next));
router.get('/reports/dashboard', (req, res, next) => platformController.dashboard(req, res, next));

router.get('/categories', (req, res, next) => platformController.listCategories(req, res, next));
router.post('/categories', (req, res, next) => platformController.createCategory(req, res, next));
router.put('/categories/:id', (req, res, next) => platformController.updateCategory(req, res, next));
router.delete('/categories/:id', (req, res, next) => platformController.deleteCategory(req, res, next));

router.get('/products', (req, res, next) => platformController.listProducts(req, res, next));
router.post('/products', (req, res, next) => platformController.createProduct(req, res, next));
router.get('/products/:id', (req, res, next) => platformController.getProduct(req, res, next));
router.put('/products/:id', (req, res, next) => platformController.updateProduct(req, res, next));
router.delete('/products/:id', (req, res, next) => platformController.deleteProduct(req, res, next));

router.get('/pricing-rules', (req, res, next) => platformController.listPricing(req, res, next));
router.post('/pricing-rules', (req, res, next) => platformController.upsertPricing(req, res, next));
router.put('/pricing-rules/:id', (req, res, next) => {
  req.body = { ...(req.body ?? {}), id: req.params.id };
  return platformController.upsertPricing(req, res, next);
});
router.delete('/pricing-rules/:id', (req, res, next) => platformController.deletePricing(req, res, next));

router.get('/standard-kits', (req, res, next) => platformController.listStandardKits(req, res, next));
router.get('/standard-kits/:id', (req, res, next) => platformController.getStandardKit(req, res, next));
router.put('/standard-kits/:id', (req, res, next) => platformController.updateStandardKit(req, res, next));
router.delete('/standard-kits/:id', (req, res, next) => platformController.deleteStandardKit(req, res, next));

router.get('/district-kits/districts', (req, res, next) => platformController.districtOptions(req, res, next));
router.get('/district-kits/districts/:district/schools', (req, res, next) =>
  platformController.districtSchools(req, res, next)
);
router.get('/district-kits/schools/:organizationId/circulars', (req, res, next) =>
  platformController.schoolCirculars(req, res, next)
);
router.get('/district-kits/circulars/:circularId/preview', (req, res, next) =>
  platformController.previewImport(req, res, next)
);
router.post('/district-kits/import', (req, res, next) => platformController.importCircular(req, res, next));
router.post('/district-kits/circulars/:circularId/import', (req, res, next) =>
  platformController.importCircular(req, res, next)
);

router.get('/orders', (req, res, next) => platformController.listOrders(req, res, next));
router.get('/orders/:id', (req, res, next) => platformController.getOrder(req, res, next));
router.patch('/orders/:id/status', (req, res, next) => platformController.updateOrderStatus(req, res, next));
router.post('/orders/:id/refund', (req, res, next) => platformController.refundOrder(req, res, next));

router.get('/deliveries', (req, res, next) => platformController.listDeliveries(req, res, next));
router.patch('/deliveries/:id', (req, res, next) => platformController.updateDelivery(req, res, next));

router.get('/settings', (req, res, next) => platformController.getSettings(req, res, next));
router.put('/settings', (req, res, next) => platformController.updateSettings(req, res, next));

export default router;
