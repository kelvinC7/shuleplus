import { Router } from 'express';
import { assessmentTemplateController } from '../controllers/assessment-template.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/', (req, res, next) => assessmentTemplateController.list(req, res, next));
router.get('/:id', (req, res, next) => assessmentTemplateController.getById(req, res, next));
router.post('/', (req, res, next) => assessmentTemplateController.create(req, res, next));
router.put('/:id', (req, res, next) => assessmentTemplateController.update(req, res, next));
router.post('/:id/approve', (req, res, next) => assessmentTemplateController.approve(req, res, next));
router.post('/:id/reject', (req, res, next) => assessmentTemplateController.reject(req, res, next));
router.delete('/:id', (req, res, next) => assessmentTemplateController.delete(req, res, next));

router.put('/:id/components/sync', (req, res, next) => assessmentTemplateController.syncComponents(req, res, next));
router.post('/:id/components', (req, res, next) => assessmentTemplateController.addComponent(req, res, next));
router.put('/components/:componentId', (req, res, next) => assessmentTemplateController.updateComponent(req, res, next));
router.delete('/components/:componentId', (req, res, next) => assessmentTemplateController.deleteComponent(req, res, next));

router.post('/:id/assign', (req, res, next) => assessmentTemplateController.assignToClass(req, res, next));

export default router;
