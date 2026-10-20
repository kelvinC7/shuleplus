import { Router } from 'express';
import { smController } from '../controllers/student-management.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/classes', smController.listClasses);
router.get('/students', smController.listStudents);
router.get('/subjects', smController.listSubjects);
router.get('/student-profile', smController.getStudentProfile);
router.patch('/students/:id/status', smController.updateStudentStatus);

export default router;
