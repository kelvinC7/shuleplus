import { Router, Request, Response } from 'express';
import { tenantController, payrollController } from '../controllers/payroll.controller';
import { authenticate, requireModuleLicense, requireServiceAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, service: 'payroll-module-service', module: 'payroll', version: '1.0.0' });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) => tenantController.create(req, res, next));
router.post('/staff/sync', requireServiceAuth, (req, res, next) => payrollController.syncStaffFromHr(req, res, next));
router.get('/staff/for-kazi-sync', requireServiceAuth, (req, res, next) => payrollController.listForKaziSync(req, res, next));

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

protectedRouter.get('/dashboard', (req, res, next) => payrollController.dashboard(req, res, next));
protectedRouter.post('/seed', (req, res, next) => payrollController.seed(req, res, next));

protectedRouter.get('/templates/active', (req, res, next) => payrollController.getTemplate(req, res, next));
protectedRouter.put('/templates/active', (req, res, next) => payrollController.saveTemplate(req, res, next));
protectedRouter.post('/templates/activate', (req, res, next) => payrollController.activateTemplate(req, res, next));
protectedRouter.post('/templates/deactivate', (req, res, next) => payrollController.deactivateTemplate(req, res, next));
protectedRouter.get('/templates/preview', (req, res, next) => payrollController.previewTemplate(req, res, next));
protectedRouter.get('/templates/history', (req, res, next) => payrollController.templateHistory(req, res, next));

protectedRouter.get('/settings', (req, res, next) => payrollController.getSettings(req, res, next));
protectedRouter.put('/settings', (req, res, next) => payrollController.saveSettings(req, res, next));

protectedRouter.get('/advance-check/:staffId', (req, res, next) => payrollController.advanceCheck(req, res, next));

protectedRouter.get('/employee-deductions', (req, res, next) => payrollController.listDeductions(req, res, next));
protectedRouter.post('/employee-deductions', (req, res, next) => payrollController.createDeduction(req, res, next));
protectedRouter.patch('/employee-deductions/:id', (req, res, next) => payrollController.updateDeduction(req, res, next));
protectedRouter.delete('/employee-deductions/:id', (req, res, next) => payrollController.deleteDeduction(req, res, next));

protectedRouter.get('/staff/directory', (req, res, next) => payrollController.staffDirectory(req, res, next));
protectedRouter.post('/staff/sync-from-hr', (req, res, next) => payrollController.syncAllFromHr(req, res, next));
protectedRouter.get('/hr/departments', (req, res, next) => payrollController.listHrDepartments(req, res, next));
protectedRouter.get('/staff', (req, res, next) => payrollController.listStaff(req, res, next));
protectedRouter.post('/staff', (req, res, next) => payrollController.createStaff(req, res, next));
protectedRouter.post('/staff/import/validate', (req, res, next) => payrollController.validateStaffImport(req, res, next));
protectedRouter.post('/staff/import', (req, res, next) => payrollController.importStaff(req, res, next));
protectedRouter.post('/staff/bulk-delete', (req, res, next) => payrollController.bulkDeleteStaff(req, res, next));
protectedRouter.get('/staff/:id/profile', (req, res, next) => payrollController.getStaffProfile(req, res, next));
protectedRouter.put('/staff/:id/profile', (req, res, next) => payrollController.saveStaffProfile(req, res, next));
protectedRouter.get('/staff/:id', (req, res, next) => payrollController.getStaff(req, res, next));
protectedRouter.put('/staff/:id', (req, res, next) => payrollController.updateStaff(req, res, next));
protectedRouter.delete('/staff/:id', (req, res, next) => payrollController.deleteStaff(req, res, next));

protectedRouter.get('/runs', (req, res, next) => payrollController.listRuns(req, res, next));
protectedRouter.get('/runs/:id', (req, res, next) => payrollController.getRun(req, res, next));
protectedRouter.post('/runs/preview', (req, res, next) => payrollController.previewRun(req, res, next));
protectedRouter.post('/runs/trigger', (req, res, next) => payrollController.triggerRun(req, res, next));
protectedRouter.patch('/runs/:id/mark-paid', (req, res, next) => payrollController.markPaid(req, res, next));
protectedRouter.delete('/runs/:id', (req, res, next) => payrollController.deleteRun(req, res, next));

protectedRouter.get('/terminations', (req, res, next) => payrollController.listTerminations(req, res, next));
protectedRouter.post('/terminations', (req, res, next) => payrollController.createTermination(req, res, next));
protectedRouter.patch('/terminations/:id/status', (req, res, next) => payrollController.updateTerminationStatus(req, res, next));

protectedRouter.get('/disbursement/rules', (req, res, next) => payrollController.disbursementRules(req, res, next));
protectedRouter.post('/disbursement/rules', (req, res, next) => payrollController.createDisbursementRule(req, res, next));
protectedRouter.get('/disbursement/payments', (req, res, next) => payrollController.paymentRows(req, res, next));
protectedRouter.post('/disbursement/apply-deductions', (req, res, next) => payrollController.applyScheduledDeductions(req, res, next));
protectedRouter.get('/disbursement/audit', (req, res, next) => payrollController.auditTrail(req, res, next));

protectedRouter.get('/payslip-branding', (req, res, next) => payrollController.getBranding(req, res, next));
protectedRouter.put('/payslip-branding', (req, res, next) => payrollController.saveBranding(req, res, next));
protectedRouter.get('/my-payroll', (req, res, next) => payrollController.myPayroll(req, res, next));

router.use(protectedRouter);
export default router;
