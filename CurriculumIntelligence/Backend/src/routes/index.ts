import { Router, Request, Response } from 'express';
import platformRoutes from './platform.routes';
import teacherRoutes from './teacher.routes';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'curriculum-intelligence-service',
    module: 'curriculum-intelligence',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.use('/platform', platformRoutes);
router.use('/teacher', teacherRoutes);

export default router;
