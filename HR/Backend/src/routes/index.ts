import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { hrController } from '../controllers/hr.controller';
import { publicStaffLookupController } from '../controllers/public-staff-lookup.controller';
import { documentUpload } from '../config/upload';
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
    service: 'hr-module-service',
    module: 'hr',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);
router.post('/employees/sync', requireServiceAuth, (req, res, next) =>
  hrController.syncEmployeeFromPayroll(req, res, next)
);
router.get('/employees/for-payroll-sync', requireServiceAuth, (req, res, next) =>
  hrController.listForPayrollSync(req, res, next)
);
router.get('/internal/teachers', requireServiceAuth, (req, res, next) =>
  hrController.listTeachersForSync(req, res, next)
);
router.get('/internal/staff', requireServiceAuth, (req, res, next) =>
  hrController.listStaffForSmartAccess(req, res, next)
);
router.get('/internal/staff/rfid-lookup', requireServiceAuth, (req, res, next) =>
  hrController.lookupRfidOwner(req, res, next)
);
router.get('/public/staff/lookup', (req, res, next) =>
  publicStaffLookupController.lookup(req, res, next)
);
router.post('/internal/staff/from-iam', requireServiceAuth, (req, res, next) =>
  hrController.upsertStaffFromIam(req, res, next)
);
router.put('/internal/staff/:id/identity', requireServiceAuth, (req, res, next) =>
  hrController.updateStaffIdentity(req, res, next)
);
router.get('/departments/for-sync', requireServiceAuth, (req, res, next) =>
  hrController.listDepartmentsForSync(req, res, next)
);
router.post('/internal/departments', requireServiceAuth, (req, res, next) =>
  hrController.createDepartmentForSync(req, res, next)
);
router.delete('/internal/departments/:id', requireServiceAuth, (req, res, next) =>
  hrController.deleteDepartmentForSync(req, res, next)
);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

protectedRouter.get('/dashboard', (req, res, next) => hrController.dashboard(req, res, next));
protectedRouter.get('/constants', (req, res) => hrController.constants(req, res));

protectedRouter.get('/directory', (req, res, next) => hrController.directory(req, res, next));
protectedRouter.get('/employees/:id', (req, res, next) => hrController.getEmployee(req, res, next));
protectedRouter.post('/employees', (req, res, next) => hrController.createEmployee(req, res, next));
protectedRouter.put('/employees/:id', (req, res, next) => hrController.updateEmployee(req, res, next));
protectedRouter.delete('/employees/:id', (req, res, next) => hrController.deleteEmployee(req, res, next));
protectedRouter.post('/employees/bulk-delete', (req, res, next) =>
  hrController.bulkDeleteEmployees(req, res, next)
);
protectedRouter.post('/employees/delete-all-deletable', (req, res, next) =>
  hrController.deleteAllDeletable(req, res, next)
);
protectedRouter.post('/employees/seed-samples', (req, res, next) =>
  hrController.seedSamples(req, res, next)
);
protectedRouter.post('/employees/import/validate', (req, res, next) =>
  hrController.validateImport(req, res, next)
);
protectedRouter.post('/employees/import', (req, res, next) =>
  hrController.importEmployees(req, res, next)
);

protectedRouter.get('/contracts', (req, res, next) => hrController.contracts(req, res, next));
protectedRouter.get('/organization', (req, res, next) => hrController.organization(req, res, next));

protectedRouter.get('/departments/stats', (req, res, next) => hrController.departmentStats(req, res, next));
protectedRouter.get('/departments', (req, res, next) => hrController.listDepartments(req, res, next));
protectedRouter.get('/departments/:id', (req, res, next) => hrController.getDepartment(req, res, next));
protectedRouter.post('/departments', (req, res, next) => hrController.createDepartment(req, res, next));
protectedRouter.put('/departments/:id', (req, res, next) => hrController.updateDepartment(req, res, next));
protectedRouter.post('/departments/bulk-status', (req, res, next) =>
  hrController.bulkDepartmentStatus(req, res, next)
);
protectedRouter.post('/departments/:id/duplicate', (req, res, next) =>
  hrController.duplicateDepartment(req, res, next)
);
protectedRouter.delete('/departments/:id', (req, res, next) => hrController.deleteDepartment(req, res, next));
protectedRouter.post('/departments/seed-defaults', (req, res, next) =>
  hrController.seedDepartments(req, res, next)
);

protectedRouter.get('/categories', (req, res, next) => hrController.listCategories(req, res, next));
protectedRouter.post('/categories', (req, res, next) => hrController.createCategory(req, res, next));
protectedRouter.put('/categories/:id', (req, res, next) => hrController.updateCategory(req, res, next));
protectedRouter.delete('/categories/:id', (req, res, next) => hrController.deleteCategory(req, res, next));
protectedRouter.post('/categories/seed-defaults', (req, res, next) =>
  hrController.seedCategories(req, res, next)
);

protectedRouter.get('/leave', (req, res, next) => hrController.listLeave(req, res, next));
protectedRouter.get('/leave/kpis', (req, res, next) => hrController.leaveKpis(req, res, next));
protectedRouter.get('/leave/charts', (req, res, next) => hrController.leaveCharts(req, res, next));
protectedRouter.get('/leave/requests', (req, res, next) => hrController.leaveRequests(req, res, next));
protectedRouter.get('/leave/employees', (req, res, next) => hrController.leaveEmployeeLookup(req, res, next));
protectedRouter.get('/leave/holidays', (req, res, next) => hrController.publicHolidays(req, res, next));
protectedRouter.get('/leave/balance/:employeeId', (req, res, next) => hrController.leaveBalance(req, res, next));
protectedRouter.get('/leave/policies', (req, res, next) => hrController.listLeavePolicies(req, res, next));
protectedRouter.post('/leave/policies', (req, res, next) => hrController.createLeavePolicy(req, res, next));
protectedRouter.put('/leave/policies/:id', (req, res, next) => hrController.updateLeavePolicy(req, res, next));
protectedRouter.delete('/leave/policies/:id', (req, res, next) => hrController.deleteLeavePolicy(req, res, next));
protectedRouter.get('/leave/:id', (req, res, next) => hrController.getLeaveRequest(req, res, next));
protectedRouter.post('/leave', (req, res, next) => hrController.createLeave(req, res, next));
protectedRouter.put('/leave/:id', (req, res, next) => hrController.updateLeaveRequest(req, res, next));
protectedRouter.patch('/leave/:id/status', (req, res, next) => hrController.updateLeaveStatus(req, res, next));
protectedRouter.post('/leave/:id/approve', (req, res, next) => hrController.approveLeave(req, res, next));
protectedRouter.post('/leave/:id/reject', (req, res, next) => hrController.rejectLeave(req, res, next));
protectedRouter.post('/leave/:id/cancel', (req, res, next) => hrController.cancelLeave(req, res, next));

protectedRouter.get('/documents', (req, res, next) => hrController.documents(req, res, next));
protectedRouter.post('/documents/upload', documentUpload.single('file'), (req, res, next) =>
  hrController.uploadDocument(req, res, next)
);
protectedRouter.get('/documents/:id/file', (req, res, next) => hrController.downloadDocument(req, res, next));
protectedRouter.post('/documents', (req, res, next) => hrController.createDocument(req, res, next));

protectedRouter.get('/qualifications', (req, res, next) => hrController.qualifications(req, res, next));
protectedRouter.patch('/qualifications/:id/verify', (req, res, next) =>
  hrController.verifyQualification(req, res, next)
);

router.use(protectedRouter);

export default router;
