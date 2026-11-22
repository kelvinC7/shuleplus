import { Router } from 'express';
import { examinationInvigilatorController } from '../controllers/examination-invigilator.controller';
import { authenticate, requireModuleLicense, requireAcademicPublishAccess } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();
router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/context', (req, res, next) => examinationInvigilatorController.context(req, res, next));
router.get('/dashboard', (req, res, next) => examinationInvigilatorController.dashboard(req, res, next));
router.get('/', (req, res, next) => examinationInvigilatorController.list(req, res, next));
router.get('/available-teachers', (req, res, next) => examinationInvigilatorController.availableTeachers(req, res, next));
router.post('/generate', requireAcademicPublishAccess, (req, res, next) => examinationInvigilatorController.generate(req, res, next));
router.post('/assignments', requireAcademicPublishAccess, (req, res, next) => examinationInvigilatorController.add(req, res, next));
router.delete('/assignments', requireAcademicPublishAccess, (req, res, next) => examinationInvigilatorController.clear(req, res, next));
router.put('/:id', requireAcademicPublishAccess, (req, res, next) => examinationInvigilatorController.update(req, res, next));
router.get('/attendance/records', (req, res, next) => examinationInvigilatorController.listAttendance(req, res, next));
router.get('/attendance', (req, res, next) => examinationInvigilatorController.getAttendance(req, res, next));
router.post('/attendance', (req, res, next) => examinationInvigilatorController.markAttendance(req, res, next));
router.get('/teacher-assignments', (req, res, next) => examinationInvigilatorController.teacherAssignments(req, res, next));

export default router;
