import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import iamRoutes from './iam.routes';
import mfaRoutes from './mfa.routes';
import rootAdminRoutes from './root-admin.routes';
import superAdminRoutes from './super-admin.routes';
import notificationProxyRoutes from './notification-proxy.routes';
import notificationsRoutes from './notifications.routes';
import internalRoutes from './internal.routes';
import publicRoutes from './public.routes';
import developerPortalRoutes, { developerAdminRouter } from './developer-portal.routes';

const router = Router();


/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 service:
 *                   type: string
 *                   example: shuleplus-iam
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'shuleplus-iam',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/iam', iamRoutes);
router.use('/auth/mfa', mfaRoutes);
router.use('/root-admin', rootAdminRoutes);
router.use('/super-admin', superAdminRoutes);
// User JWT routes must register before service-key proxy (same paths like GET /in-app).
router.use('/notifications', notificationsRoutes);
router.use('/notifications', notificationProxyRoutes);
router.use('/internal', internalRoutes);
router.use('/public', publicRoutes);
router.use('/developers', developerPortalRoutes);
router.use('/super-admin/developer-access', developerAdminRouter);

export default router;
