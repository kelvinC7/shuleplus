import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { dashboardController } from '../controllers/dashboard.controller';
import { authController } from '../controllers/auth.controller';
import { notificationController } from '../controllers/notification.controller';
import {
  academicController,
  reportCardController,
  attendanceController,
  feesController,
  profileController,
  timetableController,
  timelineController,
  walletController,
} from '../controllers/domain.controller';
import {
  communicationController,
  lifeController,
  storeController,
  teacherChatServiceController,
} from '../controllers/life.controller';
import { homeworkController } from '../controllers/homework.controller';
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
} from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'parentmis-service',
    module: 'parentmis',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Parent authentication (public)
router.get('/public/parents/auth/status', (req, res, next) => authController.status(req, res, next));
router.post('/public/parents/auth/login', (req, res, next) => authController.login(req, res, next));
router.post('/public/parents/auth/set-password', (req, res, next) =>
  authController.setPassword(req, res, next)
);

// Tenant provisioning (called by IAM with service key)
router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

// Discipline events pushed by the StudentDiscipline module
router.post('/webhooks/discipline', requireServiceAuth, (req, res, next) =>
  notificationController.ingestDisciplineEvent(req, res, next)
);
router.post('/webhooks/fees', requireServiceAuth, (req, res, next) =>
  notificationController.ingestFeeEvent(req, res, next)
);
router.post('/webhooks/attendance', requireServiceAuth, (req, res, next) =>
  notificationController.ingestAttendanceEvent(req, res, next)
);
router.post('/webhooks/exams', requireServiceAuth, (req, res, next) =>
  notificationController.ingestExamEvent(req, res, next)
);
router.post('/webhooks/homework', requireServiceAuth, (req, res, next) =>
  homeworkController.ingest(req, res, next)
);

// TichaPortal ↔ parent teacher chat (service auth)
router.get('/service/teacher-chat/contacts', requireServiceAuth, (req, res, next) =>
  teacherChatServiceController.contacts(req, res, next)
);
router.post('/service/teacher-chat/threads/open', requireServiceAuth, (req, res, next) =>
  teacherChatServiceController.open(req, res, next)
);
router.get('/service/teacher-chat/threads', requireServiceAuth, (req, res, next) =>
  teacherChatServiceController.list(req, res, next)
);
router.get('/service/teacher-chat/threads/:threadId', requireServiceAuth, (req, res, next) =>
  teacherChatServiceController.get(req, res, next)
);
router.post('/service/teacher-chat/threads/:threadId/messages', requireServiceAuth, (req, res, next) =>
  teacherChatServiceController.send(req, res, next)
);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

// Dashboard
protectedRouter.get('/dashboard', (req, res, next) => dashboardController.summary(req, res, next));

// Academic
protectedRouter.get('/academics', (req, res, next) => academicController.list(req, res, next));
protectedRouter.get('/report-cards', (req, res, next) => reportCardController.list(req, res, next));
protectedRouter.get('/report-cards/view', (req, res, next) => reportCardController.view(req, res, next));

// Attendance
protectedRouter.get('/attendance', (req, res, next) => attendanceController.summary(req, res, next));
protectedRouter.post('/attendance/absence', (req, res, next) =>
  attendanceController.reportAbsence(req, res, next)
);

// Fees
protectedRouter.get('/fees', (req, res, next) => feesController.summary(req, res, next));
protectedRouter.get('/fees/transactions', (req, res, next) =>
  feesController.transactions(req, res, next)
);
protectedRouter.get('/fees/receipts/:receiptNumber', (req, res, next) =>
  feesController.receipt(req, res, next)
);

// Wallet / ShuleCard
protectedRouter.get('/wallet', (req, res, next) => walletController.summary(req, res, next));
protectedRouter.post('/wallet/topup', (req, res, next) => walletController.topUp(req, res, next));

// Communication
protectedRouter.get('/communication', (req, res, next) => communicationController.inbox(req, res, next));
protectedRouter.post('/communication/messages', (req, res, next) =>
  communicationController.send(req, res, next)
);
protectedRouter.put('/communication/messages/:id/read', (req, res, next) =>
  communicationController.markRead(req, res, next)
);
protectedRouter.post('/communication/teacher-chat', (req, res, next) =>
  communicationController.openTeacherChat(req, res, next)
);
protectedRouter.get('/communication/teacher-chat/:threadId', (req, res, next) =>
  communicationController.getTeacherChat(req, res, next)
);
protectedRouter.post('/communication/teacher-chat/:threadId/messages', (req, res, next) =>
  communicationController.sendTeacherChat(req, res, next)
);

// Profile
protectedRouter.get('/profile', (req, res, next) => profileController.get(req, res, next));

// Life modules
protectedRouter.get('/discipline', (req, res, next) => lifeController.discipline(req, res, next));
protectedRouter.get('/documents', (req, res, next) => lifeController.documents(req, res, next));
protectedRouter.get('/events', (req, res, next) => lifeController.events(req, res, next));
protectedRouter.get('/health-records', (req, res, next) => lifeController.health(req, res, next));
protectedRouter.get('/homework', (req, res, next) => homeworkController.list(req, res, next));
protectedRouter.get('/homework/stats', (req, res, next) => homeworkController.stats(req, res, next));
protectedRouter.get('/homework/:id', (req, res, next) => homeworkController.getOne(req, res, next));
protectedRouter.post('/homework/:id/draft', (req, res, next) => homeworkController.saveDraft(req, res, next));
protectedRouter.post('/homework/:id/submit', (req, res, next) => homeworkController.submit(req, res, next));
protectedRouter.get('/permissions', (req, res, next) => lifeController.permissions(req, res, next));
protectedRouter.get('/leave', (req, res, next) => lifeController.leave(req, res, next));
protectedRouter.post('/leave', (req, res, next) => lifeController.submitLeave(req, res, next));

// Store
protectedRouter.get('/store', (req, res, next) => storeController.list(req, res, next));
protectedRouter.post('/store/orders', (req, res, next) => storeController.createOrder(req, res, next));

// Timetable & timeline
protectedRouter.get('/timetable', (req, res, next) => timetableController.get(req, res, next));
protectedRouter.get('/timeline', (req, res, next) => timelineController.list(req, res, next));

// Notifications (in-app + realtime)
protectedRouter.get('/notifications', (req, res, next) => notificationController.list(req, res, next));
protectedRouter.put('/notifications/read-all', (req, res, next) =>
  notificationController.markAllRead(req, res, next)
);
protectedRouter.put('/notifications/:id/read', (req, res, next) =>
  notificationController.markRead(req, res, next)
);
protectedRouter.get('/notifications/stream', (req, res, next) =>
  notificationController.stream(req, res, next)
);
protectedRouter.get('/notification-preferences', (req, res, next) =>
  notificationController.getPreferences(req, res, next)
);
protectedRouter.patch('/notification-preferences', (req, res, next) =>
  notificationController.updatePreferences(req, res, next)
);

router.use(protectedRouter);

export default router;
