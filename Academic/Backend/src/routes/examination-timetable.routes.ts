import { Router } from 'express';
import { examinationTimetableController } from '../controllers/examination-timetable.controller';
import { authenticate, requireModuleLicense, requireAcademicPublishAccess } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();
router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/types', (req, res, next) => examinationTimetableController.listExaminationTypes(req, res, next));
router.get('/types/stats', (req, res, next) => examinationTimetableController.examinationTypeStats(req, res, next));
router.get('/types/rows', (req, res, next) => examinationTimetableController.examinationTypeRows(req, res, next));
router.get('/types/:id', (req, res, next) => examinationTimetableController.getExaminationType(req, res, next));
// Creating/editing examination types + timetables is own-data for a module USER;
// module heads / org users see everything. Publishing results is guarded separately.
router.post('/types', (req, res, next) => examinationTimetableController.createExaminationType(req, res, next));
router.put('/types/:id', (req, res, next) => examinationTimetableController.updateExaminationType(req, res, next));
router.patch('/types/:id', (req, res, next) => examinationTimetableController.updateExaminationType(req, res, next));
router.delete('/types/:id', (req, res, next) => examinationTimetableController.deleteExaminationType(req, res, next));

router.post('/generate', (req, res, next) => examinationTimetableController.generate(req, res, next));
router.post('/', (req, res, next) => examinationTimetableController.save(req, res, next));
router.put('/:id', (req, res, next) => examinationTimetableController.save(req, res, next));

router.get('/context', (req, res, next) => examinationTimetableController.context(req, res, next));
router.get('/', (req, res, next) => examinationTimetableController.list(req, res, next));
router.post('/:id/copy', (req, res, next) => examinationTimetableController.copy(req, res, next));
router.get('/:id/impact', (req, res, next) => examinationTimetableController.impact(req, res, next));
router.get('/:id', (req, res, next) => examinationTimetableController.getById(req, res, next));
router.delete('/:id', (req, res, next) => examinationTimetableController.remove(req, res, next));

// Publishing an examination list is a privileged result-publishing action.
export { requireAcademicPublishAccess };

export default router;
