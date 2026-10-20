import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { requireServiceAuth } from '../middleware/service-auth.middleware';

const router = Router();

router.get('/health', notificationController.health);

router.use(requireServiceAuth);

// Channel delivery
router.post('/email', (req, res, next) => notificationController.sendEmail(req, res, next));
router.post('/sms', (req, res, next) => notificationController.sendSms(req, res, next));
router.post('/push', (req, res, next) => notificationController.sendPush(req, res, next));
router.post('/in-app', (req, res, next) => notificationController.sendInApp(req, res, next));

// OTP / MFA
router.post('/otp/send', (req, res, next) => notificationController.sendOtp(req, res, next));
router.post('/otp/verify', (req, res, next) => notificationController.verifyOtp(req, res, next));

// In-app notification center
router.get('/in-app', (req, res, next) => notificationController.listInApp(req, res, next));
router.get('/in-app/unread-count', (req, res, next) => notificationController.unreadCount(req, res, next));
router.patch('/in-app/:id/read', (req, res, next) => notificationController.markInAppRead(req, res, next));
router.patch('/in-app/read-all', (req, res, next) => notificationController.markAllInAppRead(req, res, next));
router.patch('/in-app/:id/archive', (req, res, next) => notificationController.archiveInApp(req, res, next));

// Templates & logs
router.get('/templates', (req, res, next) => notificationController.listTemplates(req, res, next));
router.get('/logs', (req, res, next) => notificationController.listLogs(req, res, next));

// User preferences
router.get('/preferences/:userId', (req, res, next) => notificationController.getPreferences(req, res, next));
router.patch('/preferences/:userId', (req, res, next) => notificationController.updatePreferences(req, res, next));

export default router;
