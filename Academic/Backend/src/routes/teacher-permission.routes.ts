import { Router } from 'express';
import { teacherPermissionController } from '../controllers/teacher-permission.controller';

const router = Router();

router.get('/', (req, res, next) => teacherPermissionController.list(req, res, next));
router.post('/:id/approve', (req, res, next) => teacherPermissionController.approve(req, res, next));
router.post('/:id/reject', (req, res, next) => teacherPermissionController.reject(req, res, next));

export default router;
