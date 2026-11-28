import { Router } from 'express';
import { examinationListController } from '../controllers/examination-list.controller';
import { authenticate, requireModuleLicense, requireAcademicPublishAccess } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

// Public QR endpoint - no auth required. Returns limited room allocation data.
router.get('/public/:id/rooms/:roomId', (req, res, next) => examinationListController.publicRoom(req, res, next));

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/dashboard', (req, res, next) => examinationListController.dashboard(req, res, next));
router.get('/context', (req, res, next) => examinationListController.context(req, res, next));
router.get('/', (req, res, next) => examinationListController.list(req, res, next));
router.post('/generate', requireAcademicPublishAccess, (req, res, next) => examinationListController.generate(req, res, next));
router.get('/:id/impact', (req, res, next) => examinationListController.impact(req, res, next));
router.post('/:id/publish', requireAcademicPublishAccess, (req, res, next) => examinationListController.publish(req, res, next));
router.post('/:id/unpublish', requireAcademicPublishAccess, (req, res, next) => examinationListController.unpublish(req, res, next));
router.get('/:id/available-students', (req, res, next) => examinationListController.availableStudents(req, res, next));
router.get('/:id/search-students', (req, res, next) => examinationListController.searchStudents(req, res, next));
router.get('/:id', (req, res, next) => examinationListController.getById(req, res, next));
router.post('/:id/move-student', requireAcademicPublishAccess, (req, res, next) => examinationListController.moveStudent(req, res, next));
router.post('/:id/allocations', requireAcademicPublishAccess, (req, res, next) => examinationListController.addStudent(req, res, next));
router.post('/:id/allocations/bulk', requireAcademicPublishAccess, (req, res, next) => examinationListController.addStudents(req, res, next));
router.post('/:id/rooms/manual', requireAcademicPublishAccess, (req, res, next) => examinationListController.addManualRoom(req, res, next));
router.patch('/:id/rooms/:roomId', requireAcademicPublishAccess, (req, res, next) => examinationListController.updateRoom(req, res, next));
router.delete('/:id/allocations/:allocationId', requireAcademicPublishAccess, (req, res, next) => examinationListController.removeAllocation(req, res, next));
router.delete('/:id', requireAcademicPublishAccess, (req, res, next) => examinationListController.remove(req, res, next));

export default router;
