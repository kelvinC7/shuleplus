import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { tenantController } from '../controllers/tenant.controller';
import { feesController } from '../controllers/fees.controller';
import { loanController } from '../controllers/loan.controller';
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
} from '../middleware/auth.middleware';
import { requireTenant, requireServiceTenant } from '../middleware/tenant.middleware';

const router = Router();

router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      service: 'school-fees-module-service',
      module: 'school-fees',
      version: '1.0.0',
      database: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/public/student-fees',
  (req, res, next) => feesController.publicStudentFees(req, res, next)
);

router.post('/public/payments/initiate', (req, res, next) =>
  feesController.publicInitiatePayment(req, res, next)
);

router.get('/public/payments/:reference/status', (req, res, next) =>
  feesController.publicPaymentStatus(req, res, next)
);


router.get('/public/receipts/:receiptNumber', (req, res, next) =>
  feesController.publicReceipt(req, res, next)
);

router.get('/public/loans/types', (req, res, next) =>
  loanController.publicListTypes(req, res, next)
);
router.post('/public/loans/applications', (req, res, next) =>
  loanController.publicSubmit(req, res, next)
);
router.get('/public/loans/:applicationNumber/status', (req, res, next) =>
  loanController.publicStatus(req, res, next)
);

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

/** First-access self-heal when IAM provisioning was skipped or failed. */
router.post('/tenant/ensure', authenticate, requireModuleLicense, (req, res, next) =>
  tenantController.ensure(req, res, next)
);

router.get(
  '/service/parent-fees-summary',
  requireServiceAuth,
  requireServiceTenant,
  (req, res, next) => feesController.parentSummary(req, res, next)
);
router.get(
  '/service/parent-fees-transactions',
  requireServiceAuth,
  requireServiceTenant,
  (req, res, next) => feesController.parentTransactions(req, res, next)
);

router.get(
  '/service/examination-eligibility',
  requireServiceAuth,
  requireServiceTenant,
  (req, res, next) => feesController.examEligibilityLookup(req, res, next)
);
router.get(
  '/service/report-card-access',
  requireServiceAuth,
  requireServiceTenant,
  (req, res, next) => feesController.reportCardAccessLookup(req, res, next)
);

router.get(
  '/service/representative/overview',
  requireServiceAuth,
  requireServiceTenant,
  (req, res, next) => feesController.representativeOverview(req, res, next)
);
router.get(
  '/service/representative/transactions',
  requireServiceAuth,
  requireServiceTenant,
  (req, res, next) => feesController.representativeTransactions(req, res, next)
);
router.get(
  '/service/representative/balances',
  requireServiceAuth,
  requireServiceTenant,
  (req, res, next) => feesController.representativeBalances(req, res, next)
);
router.get(
  '/service/representative/filter-options',
  requireServiceAuth,
  requireServiceTenant,
  (req, res, next) => feesController.representativeFilterOptions(req, res, next)
);
router.get(
  '/service/representative/class-analytics',
  requireServiceAuth,
  requireServiceTenant,
  (req, res, next) => feesController.representativeClassAnalytics(req, res, next)
);
router.get(
  '/service/representative/fee-structures',
  requireServiceAuth,
  requireServiceTenant,
  (req, res, next) => feesController.representativeFeeStructures(req, res, next)
);
router.get(
  '/service/representative/student-bills',
  requireServiceAuth,
  requireServiceTenant,
  (req, res, next) => feesController.representativeStudentBills(req, res, next)
);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

protectedRouter.get('/dashboard', (req, res, next) => feesController.dashboard(req, res, next));
protectedRouter.get('/organization/branding', (req, res, next) =>
  feesController.organizationBranding(req, res, next)
);
protectedRouter.get('/analytics', (req, res, next) => feesController.analytics(req, res, next));
protectedRouter.get('/reports', (req, res, next) => feesController.reports(req, res, next));

protectedRouter.get('/structures/summary', (req, res, next) =>
  feesController.structuresSummary(req, res, next)
);
protectedRouter.get('/structures/academic-context', (req, res, next) =>
  feesController.academicContext(req, res, next)
);
protectedRouter.get('/structures/babyeyi-items', (req, res, next) =>
  feesController.babyeyiFeeItems(req, res, next)
);
protectedRouter.get('/structures/export', (req, res, next) =>
  feesController.exportStructures(req, res, next)
);
protectedRouter.get('/structures', (req, res, next) => feesController.listStructures(req, res, next));
protectedRouter.get('/structures/:id', (req, res, next) => feesController.getStructure(req, res, next));
protectedRouter.post('/structures', (req, res, next) => feesController.createStructure(req, res, next));
protectedRouter.put('/structures/:id', (req, res, next) => feesController.updateStructure(req, res, next));
protectedRouter.delete('/structures/:id', (req, res, next) => feesController.deleteStructure(req, res, next));
protectedRouter.post('/structures/:id/duplicate', (req, res, next) =>
  feesController.duplicateStructure(req, res, next)
);

protectedRouter.get('/categories', (req, res, next) => feesController.listCategories(req, res, next));

protectedRouter.get('/bills', (req, res, next) => feesController.listBills(req, res, next));
protectedRouter.post('/bills', (req, res, next) => feesController.createBill(req, res, next));

protectedRouter.get('/payments', (req, res, next) => feesController.listPayments(req, res, next));
protectedRouter.post('/payments', (req, res, next) => feesController.createPayment(req, res, next));

protectedRouter.get('/collections/fee-collection', (req, res, next) =>
  feesController.feeCollectionOverview(req, res, next)
);
protectedRouter.get('/collections/fee-collection/export', (req, res, next) =>
  feesController.feeCollectionExport(req, res, next)
);
protectedRouter.get('/collections/fee-collection/lookup', (req, res, next) =>
  feesController.feeCollectionLookup(req, res, next)
);
protectedRouter.get('/collections/fee-collection/student-account', (req, res, next) =>
  feesController.feeCollectionStudentAccount(req, res, next)
);
protectedRouter.post('/collections/fee-collection/payments', (req, res, next) =>
  feesController.feeCollectionRecordPayment(req, res, next)
);
protectedRouter.get('/collections/command-center', (req, res, next) =>
  feesController.collectionsCommandCenter(req, res, next)
);
protectedRouter.get('/collections/insights', (req, res, next) =>
  feesController.collectionsInsights(req, res, next)
);
protectedRouter.get('/students/:studentId/financial-profile', (req, res, next) =>
  feesController.studentFinancialProfile(req, res, next)
);

protectedRouter.get('/installments', (req, res, next) =>
  feesController.listInstallments(req, res, next)
);
protectedRouter.post('/installments/plans', (req, res, next) =>
  feesController.createInstallmentPlan(req, res, next)
);
protectedRouter.get('/installments/plans/:id', (req, res, next) =>
  feesController.getInstallmentPlan(req, res, next)
);
protectedRouter.get('/scholarships', (req, res, next) =>
  feesController.listScholarships(req, res, next)
);
protectedRouter.post('/scholarships', (req, res, next) =>
  feesController.createScholarship(req, res, next)
);
protectedRouter.post('/scholarships/preview-impact', (req, res, next) =>
  feesController.previewScholarshipImpact(req, res, next)
);
protectedRouter.post('/scholarships/:id/approve', (req, res, next) =>
  feesController.approveScholarship(req, res, next)
);
protectedRouter.post('/scholarships/:id/reject', (req, res, next) =>
  feesController.rejectScholarship(req, res, next)
);
protectedRouter.get('/sponsors', (req, res, next) => feesController.listSponsors(req, res, next));
protectedRouter.get('/receipts/verify/:receiptNumber', (req, res, next) =>
  feesController.verifyReceipt(req, res, next)
);
protectedRouter.get('/receipts/:id/pdf', (req, res, next) => feesController.receiptPdf(req, res, next));
protectedRouter.post('/receipts/:id/send', (req, res, next) => feesController.sendReceipt(req, res, next));
protectedRouter.post('/receipts/:id/void', (req, res, next) => feesController.voidReceipt(req, res, next));
protectedRouter.get('/receipts/:id', (req, res, next) => feesController.getReceipt(req, res, next));
protectedRouter.get('/receipts', (req, res, next) => feesController.listReceipts(req, res, next));
protectedRouter.get('/outstanding', (req, res, next) =>
  feesController.listOutstanding(req, res, next)
);
protectedRouter.get('/reminders/dashboard', (req, res, next) =>
  feesController.remindersDashboard(req, res, next)
);
protectedRouter.get('/reminders/classes', (req, res, next) =>
  feesController.reminderClasses(req, res, next)
);
protectedRouter.get('/reminders/recipients', (req, res, next) =>
  feesController.reminderRecipients(req, res, next)
);
protectedRouter.get('/reminders/triggers', (req, res, next) =>
  feesController.reminderTriggerTypes(req, res, next)
);
protectedRouter.get('/reminders/automations', (req, res, next) =>
  feesController.listReminderAutomations(req, res, next)
);
protectedRouter.post('/reminders/automations', (req, res, next) =>
  feesController.createReminderAutomation(req, res, next)
);
protectedRouter.put('/reminders/automations/:id', (req, res, next) =>
  feesController.updateReminderAutomation(req, res, next)
);
protectedRouter.patch('/reminders/automations/:id/status', (req, res, next) =>
  feesController.setReminderAutomationStatus(req, res, next)
);
protectedRouter.post('/reminders/automations/:id/run', (req, res, next) =>
  feesController.runReminderAutomation(req, res, next)
);
protectedRouter.delete('/reminders/automations/:id', (req, res, next) =>
  feesController.deleteReminderAutomation(req, res, next)
);
protectedRouter.get('/reminders/templates', (req, res, next) =>
  feesController.listReminderTemplates(req, res, next)
);
protectedRouter.post('/reminders/templates', (req, res, next) =>
  feesController.createReminderTemplate(req, res, next)
);
protectedRouter.get('/reminders/history', (req, res, next) =>
  feesController.reminderHistory(req, res, next)
);
protectedRouter.get('/reminders/analytics', (req, res, next) =>
  feesController.reminderAnalytics(req, res, next)
);
protectedRouter.post('/reminders/preview', (req, res, next) =>
  feesController.reminderPreview(req, res, next)
);
protectedRouter.post('/reminders/test', (req, res, next) =>
  feesController.reminderTestSend(req, res, next)
);
protectedRouter.post('/reminders/send-now', (req, res, next) =>
  feesController.reminderSendNow(req, res, next)
);
protectedRouter.post('/reminders/process', (req, res, next) =>
  feesController.processReminders(req, res, next)
);
protectedRouter.get('/notifications', (req, res, next) =>
  feesController.listNotifications(req, res, next)
);
protectedRouter.get('/approvals', (req, res, next) => feesController.listApprovals(req, res, next));
protectedRouter.get('/audit-logs', (req, res, next) => feesController.listAuditLogs(req, res, next));

protectedRouter.get('/examination-eligibility', (req, res, next) =>
  feesController.examEligibilityPreview(req, res, next)
);
protectedRouter.get('/examination-eligibility/classes', (req, res, next) =>
  feesController.examEligibilityClasses(req, res, next)
);
protectedRouter.post('/examination-eligibility/exception', (req, res, next) =>
  feesController.examEligibilityException(req, res, next)
);
protectedRouter.post('/examination-eligibility/publish', (req, res, next) =>
  feesController.examEligibilityPublish(req, res, next)
);
protectedRouter.post('/examination-eligibility/notify', (req, res, next) =>
  feesController.examEligibilityNotify(req, res, next)
);

protectedRouter.get('/report-cards/access', (req, res, next) =>
  feesController.reportCardAccessPreview(req, res, next)
);
protectedRouter.get('/report-cards/access/policy', (req, res, next) =>
  feesController.reportCardAccessPolicy(req, res, next)
);
protectedRouter.put('/report-cards/access/policy', (req, res, next) =>
  feesController.reportCardAccessPolicy(req, res, next)
);
protectedRouter.post('/report-cards/access/exception', (req, res, next) =>
  feesController.reportCardAccessException(req, res, next)
);

router.use(protectedRouter);

export default router;
