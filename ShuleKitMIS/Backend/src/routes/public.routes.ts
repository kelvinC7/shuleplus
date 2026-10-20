import { Router } from 'express';
import { requestController } from '../controllers/request.controller';
import { publicController } from '../controllers/public.controller';

const router = Router();

router.get('/students/lookup', (req, res, next) => publicController.lookupStudent(req, res, next));
router.get('/kits', (req, res, next) => publicController.listKits(req, res, next));
router.get('/products', (req, res, next) => publicController.listProducts(req, res, next));
router.get('/standard-kits', (req, res, next) => publicController.listStandardKits(req, res, next));
router.get('/settings', (req, res, next) => publicController.getSettings(req, res, next));
router.get('/academic-settings', (req, res, next) => publicController.getAcademicSettings(req, res, next));
router.post('/parents/claim', (req, res, next) => publicController.claimParent(req, res, next));
router.post('/requests', (req, res, next) => requestController.createPublic(req, res, next));
router.post('/orders', (req, res, next) => publicController.createPlatformOrder(req, res, next));
router.get('/requests/status/:requestNo', (req, res, next) =>
  requestController.statusByRequestNo(req, res, next)
);

export default router;
