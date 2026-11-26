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
import { tripsGoalsController } from '../controllers/trips-goals.controller';
import { homeworkController } from '../controllers/homework.controller';
import { smsPackagesController } from '../controllers/sms-packages.controller';
import { paymentsController } from '../controllers/payments.controller';
import { parentTransportController } from '../controllers/parent-transport.controller';
import { parentTransportServiceController } from '../controllers/parent-transport-service.controller';
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
} from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { shuleTripSyncController } from '../controllers/shule-trip-sync.controller';
import { reportCardPublicController } from '../controllers/report-card-public.controller';

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
router.get('/public/report-cards/verify', (req, res, next) =>
  reportCardPublicController.verify(req, res, next)
);

router.get('/public/parents/auth/status', (req, res, next) => authController.status(req, res, next));
router.post('/public/parents/auth/login', (req, res, next) => authController.login(req, res, next));
router.post('/public/parents/auth/request-reset-otp', (req, res, next) =>
  authController.requestPinResetOtp(req, res, next)
);
router.post('/public/parents/auth/verify-reset-otp', (req, res, next) =>
  authController.verifyPinResetOtp(req, res, next)
);
router.post('/public/parents/auth/set-password', (req, res, next) =>
  authController.setPassword(req, res, next)
);
router.post('/public/parents/auth/verify-reset-email', (req, res, next) =>
  authController.verifyPinResetEmail(req, res, next)
);
router.get('/public/parents/auth/reset-email-hint', (req, res, next) =>
  authController.pinResetEmailHint(req, res, next)
);

// Tenant provisioning (called by IAM with service key)
router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

router.post('/service/shule-trips/sync', requireServiceAuth, (req, res, next) =>
  shuleTripSyncController.sync(req, res, next)
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
router.post('/webhooks/canteen', requireServiceAuth, (req, res, next) =>
  notificationController.ingestCanteenEvent(req, res, next)
);
router.post('/webhooks/transport', requireServiceAuth, (req, res, next) =>
  notificationController.ingestTransportEvent(req, res, next)
);

router.get('/service/transport/change-requests', requireServiceAuth, (req, res, next) =>
  parentTransportServiceController.changeRequests(req, res, next)
);
router.patch('/service/transport/change-requests/:id', requireServiceAuth, (req, res, next) =>
  parentTransportServiceController.respondChangeRequest(req, res, next)
);
router.get('/service/transport/issue-reports', requireServiceAuth, (req, res, next) =>
  parentTransportServiceController.issueReports(req, res, next)
);
router.patch('/service/transport/issue-reports/:id', requireServiceAuth, (req, res, next) =>
  parentTransportServiceController.updateIssueReport(req, res, next)
);
router.post('/webhooks/exams', requireServiceAuth, (req, res, next) =>
  notificationController.ingestExamEvent(req, res, next)
);
router.post('/webhooks/academic-publish', requireServiceAuth, (req, res, next) =>
  notificationController.ingestAcademicEvent(req, res, next)
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
router.get('/service/parent-attendance-reports', requireServiceAuth, (req, res, next) =>
  attendanceController.listParentReportsService(req, res, next)
);

// Public Babyeyi directory
router.get('/public/babyeyi/schools', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        id: 'kgs',
        name: 'Kigali Green Hills School',
        code: 'KGS',
        location: 'Kicukiro, Kigali',
        curriculum: 'Rwanda CBC & Cambridge International',
        termDates: 'Term 1: 8 Sep – 4 Dec 2026',
        fees: 'Day: RWF 260,000 · Boarding: RWF 800,000',
        head: 'Mr. Jean-Claude Habimana',
        phone: '+250 788 123 456',
        email: 'info@greenhills.rw',
      },
      {
        id: 'uss',
        name: 'Umucyo Secondary School',
        code: 'USS',
        location: 'Gasabo, Kigali',
        curriculum: 'Rwanda National Curriculum (REB)',
        termDates: 'Term 1: 8 Sep – 4 Dec 2026',
        fees: 'Day: RWF 200,000 · Boarding: RWF 650,000',
        head: 'Dr. Ange Mukamana',
        phone: '+250 788 654 321',
        email: 'info@umucyo.rw',
      },
    ],
  });
});

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

// Dashboard
protectedRouter.get('/dashboard', (req, res, next) => dashboardController.summary(req, res, next));

// Academic
protectedRouter.get('/academics', (req, res, next) => academicController.list(req, res, next));
protectedRouter.get('/academics/course-performance', (req, res, next) =>
  academicController.coursePerformance(req, res, next)
);
protectedRouter.get('/report-cards', (req, res, next) => reportCardController.list(req, res, next));
protectedRouter.get('/report-cards/view', (req, res, next) => reportCardController.view(req, res, next));

// Attendance
protectedRouter.get('/attendance', (req, res, next) => attendanceController.summary(req, res, next));
protectedRouter.post('/attendance/absence', (req, res, next) =>
  attendanceController.reportAbsence(req, res, next)
);
protectedRouter.post('/attendance/report', (req, res, next) =>
  attendanceController.reportFromParent(req, res, next)
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

// SMS packages (parent-purchased credits via InternalChat)
protectedRouter.get('/sms-packages/config', (req, res, next) => smsPackagesController.config(req, res, next));
protectedRouter.get('/sms-packages/summary', (req, res, next) => smsPackagesController.summary(req, res, next));
protectedRouter.get('/sms-packages/purchases', (req, res, next) => smsPackagesController.purchases(req, res, next));
protectedRouter.get('/sms-packages/messages', (req, res, next) => smsPackagesController.messages(req, res, next));
protectedRouter.post('/sms-packages/purchases', (req, res, next) => smsPackagesController.createPurchase(req, res, next));
protectedRouter.post('/sms-packages/purchases/submit-payment', (req, res, next) =>
  smsPackagesController.submitPayment(req, res, next)
);

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

protectedRouter.get('/transport/portal', (req, res, next) =>
  parentTransportController.portal(req, res, next)
);
protectedRouter.get('/transport/change-requests', (req, res, next) =>
  parentTransportController.changeRequests(req, res, next)
);
protectedRouter.post('/transport/change-requests', (req, res, next) =>
  parentTransportController.submitChangeRequest(req, res, next)
);
protectedRouter.get('/transport/notifications', (req, res, next) =>
  parentTransportController.notifications(req, res, next)
);
protectedRouter.put('/transport/notifications/read-all', (req, res, next) =>
  parentTransportController.markAllTransportNotificationsRead(req, res, next)
);
protectedRouter.post('/transport/issue-reports', (req, res, next) =>
  parentTransportController.submitIssue(req, res, next)
);
protectedRouter.get('/transport/issue-reports', (req, res, next) =>
  parentTransportController.issueReports(req, res, next)
);

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

// Payments (XentriPay mobile money collections)
protectedRouter.post('/payments/collections', (req, res, next) =>
  paymentsController.initiateCollection(req, res, next)
);
protectedRouter.get('/payments/collections/:reference/status', (req, res, next) =>
  paymentsController.collectionStatus(req, res, next)
);

protectedRouter.post('/store/orders/:id/exchange', (req, res, next) =>
  tripsGoalsController.requestSizeExchange(req, res, next)
);

// School Trips & Field Trips
protectedRouter.get('/trips', (req, res, next) => tripsGoalsController.getTrips(req, res, next));
protectedRouter.post('/trips/:id/consent', (req, res, next) =>
  tripsGoalsController.submitTripConsent(req, res, next)
);
protectedRouter.post('/trips/:id/pay', (req, res, next) =>
  tripsGoalsController.payTrip(req, res, next)
);

// Savings Goals
protectedRouter.get('/goals', (req, res, next) => tripsGoalsController.getGoals(req, res, next));
protectedRouter.post('/goals', (req, res, next) => tripsGoalsController.createGoal(req, res, next));
protectedRouter.post('/goals/:id/topup', (req, res, next) =>
  tripsGoalsController.topUpGoal(req, res, next)
);
protectedRouter.patch('/goals/:id/auto-save', (req, res, next) =>
  tripsGoalsController.toggleAutoSave(req, res, next)
);

// Wallet Limits
protectedRouter.get('/wallet/limits', (req, res, next) =>
  tripsGoalsController.getWalletLimits(req, res, next)
);
protectedRouter.post('/wallet/limits', (req, res, next) =>
  tripsGoalsController.saveWalletLimits(req, res, next)
);

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
protectedRouter.post('/notifications/fcm/register', (req, res, next) =>
  notificationController.registerDeviceToken(req, res, next)
);
protectedRouter.post('/notifications/fcm/unregister', (req, res, next) =>
  notificationController.unregisterDeviceToken(req, res, next)
);
protectedRouter.get('/notification-preferences', (req, res, next) =>
  notificationController.getPreferences(req, res, next)
);
protectedRouter.patch('/notification-preferences', (req, res, next) =>
  notificationController.updatePreferences(req, res, next)
);

router.use(protectedRouter);

export default router;
