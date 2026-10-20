import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { actionPlanController } from '../controllers/action-plan.controller';
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
  requirePermission,
} from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { evidenceUpload } from '../middleware/upload.middleware';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'action-plan-module-service',
    module: 'action-plan',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

/** First-access self-heal: org users can create their own tenant if IAM provision was skipped. */
router.post('/tenant/ensure', authenticate, requireModuleLicense, (req, res, next) =>
  tenantController.ensure(req, res, next)
);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

// Dashboard
protectedRouter.get('/dashboard', (req, res, next) => actionPlanController.dashboard(req, res, next));
protectedRouter.get('/constants', (req, res) => actionPlanController.constants(req, res));
protectedRouter.get('/permissions', (req, res, next) => actionPlanController.permissions(req, res, next));
protectedRouter.post('/notifications/sync', requirePermission('plan.view_all'), (req, res, next) =>
  actionPlanController.syncNotifications(req, res, next)
);

// Action Plans CRUD
protectedRouter.get('/plans', (req, res, next) => actionPlanController.list(req, res, next));
protectedRouter.get('/plans/:id', (req, res, next) => actionPlanController.getById(req, res, next));
protectedRouter.post('/plans', requirePermission('plan.create'), (req, res, next) => actionPlanController.create(req, res, next));
protectedRouter.put('/plans/:id', requirePermission('plan.edit'), (req, res, next) => actionPlanController.update(req, res, next));
protectedRouter.delete('/plans/:id', requirePermission('plan.delete'), (req, res, next) => actionPlanController.delete(req, res, next));

// Approvals
protectedRouter.post('/plans/:id/submit', requirePermission('plan.edit'), (req, res, next) => actionPlanController.submitForApproval(req, res, next));
protectedRouter.post('/plans/:id/approve/:level', requirePermission('plan.approve'), (req, res, next) => actionPlanController.approve(req, res, next));

// Tasks
protectedRouter.get('/tasks', (req, res, next) => actionPlanController.listTasks(req, res, next));
protectedRouter.post('/plans/:actionPlanId/tasks', (req, res, next) => actionPlanController.createTask(req, res, next));
protectedRouter.put('/tasks/:id', (req, res, next) => actionPlanController.updateTask(req, res, next));
protectedRouter.delete('/tasks/:id', (req, res, next) => actionPlanController.deleteTask(req, res, next));
protectedRouter.post('/tasks/dependencies', (req, res, next) => actionPlanController.createDependency(req, res, next));

// Comments
protectedRouter.post('/plans/:actionPlanId/comments', (req, res, next) => actionPlanController.addComment(req, res, next));

// Milestones
protectedRouter.post('/plans/:actionPlanId/milestones', (req, res, next) => actionPlanController.createMilestone(req, res, next));
protectedRouter.put('/milestones/:id', (req, res, next) => actionPlanController.updateMilestone(req, res, next));

// Budget
protectedRouter.get('/budget-lines', requirePermission('budget.manage'), (req, res, next) =>
  actionPlanController.budgetLines(req, res, next)
);
protectedRouter.post('/plans/:actionPlanId/budget', requirePermission('budget.manage'), (req, res, next) =>
  actionPlanController.upsertBudget(req, res, next)
);

// Expenses
protectedRouter.get('/plans/:actionPlanId/expenses', requirePermission('expense.record'), (req, res, next) =>
  actionPlanController.listExpenses(req, res, next)
);
protectedRouter.post('/plans/:actionPlanId/expenses', requirePermission('expense.record'), (req, res, next) =>
  actionPlanController.createExpense(req, res, next)
);

// Evidence / Attachments
protectedRouter.post(
  '/plans/:actionPlanId/attachments',
  requirePermission('evidence.upload'),
  evidenceUpload.single('file'),
  (req, res, next) => actionPlanController.uploadAttachment(req, res, next)
);
protectedRouter.post('/attachments/:id/verify', requirePermission('evidence.verify'), (req, res, next) =>
  actionPlanController.verifyAttachment(req, res, next)
);
protectedRouter.delete('/attachments/:id', requirePermission('evidence.upload'), (req, res, next) =>
  actionPlanController.deleteAttachment(req, res, next)
);

// Period Reviews
protectedRouter.get('/reviews', (req, res, next) => actionPlanController.listReviews(req, res, next));
protectedRouter.post('/reviews', requirePermission('review.record'), (req, res, next) =>
  actionPlanController.createReview(req, res, next)
);

// Risks
protectedRouter.post('/plans/:actionPlanId/risks', requirePermission('risk.manage'), (req, res, next) => actionPlanController.createRisk(req, res, next));
protectedRouter.put('/risks/:id', requirePermission('risk.manage'), (req, res, next) => actionPlanController.updateRisk(req, res, next));

// Issues
protectedRouter.post('/plans/:actionPlanId/issues', (req, res, next) => actionPlanController.createIssue(req, res, next));
protectedRouter.put('/issues/:id/resolve', (req, res, next) => actionPlanController.resolveIssue(req, res, next));

// KPIs
protectedRouter.post('/plans/:actionPlanId/kpis', requirePermission('kpi.update'), (req, res, next) => actionPlanController.createKpi(req, res, next));
protectedRouter.put('/kpis/:id/value', requirePermission('kpi.update'), (req, res, next) => actionPlanController.updateKpiValue(req, res, next));

// Categories
protectedRouter.get('/categories', (req, res, next) => actionPlanController.listCategories(req, res, next));
protectedRouter.post('/categories', (req, res, next) => actionPlanController.createCategory(req, res, next));
protectedRouter.post('/categories/seed-defaults', (req, res, next) => actionPlanController.seedDefaultCategories(req, res, next));

// Staff (IAM + HR + teachers)
protectedRouter.get('/staff', (req, res, next) => actionPlanController.listStaff(req, res, next));

// Organization academic settings (from Authentication/IAM)
protectedRouter.get('/academic-settings', (req, res, next) => actionPlanController.getAcademicSettings(req, res, next));
protectedRouter.get('/organization/profile', (req, res, next) =>
  actionPlanController.getOrganizationProfile(req, res, next)
);

// Notifications
protectedRouter.get('/notifications', (req, res, next) => actionPlanController.listNotifications(req, res, next));
protectedRouter.put('/notifications/:id/read', (req, res, next) => actionPlanController.markNotificationRead(req, res, next));

// Activities
protectedRouter.get('/activities', (req, res, next) => actionPlanController.listActivities(req, res, next));

// Templates
protectedRouter.get('/templates/catalog', (req, res, next) => actionPlanController.getTemplateCatalog(req, res, next));
protectedRouter.get('/templates/recommended', (req, res, next) => actionPlanController.getRecommendedTemplates(req, res, next));
protectedRouter.post('/templates/seed-official', (req, res, next) => actionPlanController.seedOfficialTemplates(req, res, next));
protectedRouter.get('/templates', (req, res, next) => actionPlanController.listTemplates(req, res, next));
protectedRouter.get('/templates/:id', (req, res, next) => actionPlanController.getTemplate(req, res, next));
protectedRouter.post('/templates', (req, res, next) => actionPlanController.createTemplate(req, res, next));
protectedRouter.put('/templates/:id', (req, res, next) => actionPlanController.updateTemplate(req, res, next));
protectedRouter.post('/templates/from-plan/:planId', (req, res, next) => actionPlanController.createTemplateFromPlan(req, res, next));
protectedRouter.post('/templates/:id/apply', requirePermission('plan.create'), (req, res, next) => actionPlanController.applyTemplate(req, res, next));
protectedRouter.delete('/templates/:id', (req, res, next) => actionPlanController.deleteTemplate(req, res, next));

// Meetings
protectedRouter.get('/meetings', (req, res, next) => actionPlanController.listMeetings(req, res, next));
protectedRouter.post('/meetings', (req, res, next) => actionPlanController.createMeeting(req, res, next));
protectedRouter.post('/meetings/:meetingId/minutes', (req, res, next) => actionPlanController.addMeetingMinute(req, res, next));

// Recurring Plans
protectedRouter.post('/recurring-plans', (req, res, next) => actionPlanController.createRecurringPlan(req, res, next));

// Resource Allocations
protectedRouter.post('/plans/:actionPlanId/resources', (req, res, next) => actionPlanController.createResourceAllocation(req, res, next));

router.use(protectedRouter);

export default router;
