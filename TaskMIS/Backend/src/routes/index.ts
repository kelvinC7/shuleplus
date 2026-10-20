import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { dashboardController } from '../controllers/dashboard.controller';
import { taskController } from '../controllers/task.controller';
import { workflowController } from '../controllers/workflow.controller';
import { notificationController, timeTrackingController } from '../controllers/notification.controller';
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
    service: 'task-module-service',
    module: 'task-module',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

router.post('/tenant/ensure', authenticate, requireModuleLicense, (req, res, next) =>
  tenantController.ensure(req, res, next)
);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

protectedRouter.get('/dashboard', (req, res, next) => dashboardController.summary(req, res, next));

protectedRouter.get('/tasks', (req, res, next) => taskController.list(req, res, next));
protectedRouter.get('/tasks/board', (req, res, next) => taskController.board(req, res, next));
protectedRouter.get('/tasks/:id', (req, res, next) => taskController.getById(req, res, next));
protectedRouter.post('/tasks', (req, res, next) => taskController.create(req, res, next));
protectedRouter.put('/tasks/:id', (req, res, next) => taskController.update(req, res, next));
protectedRouter.delete('/tasks/:id', (req, res, next) => taskController.delete(req, res, next));
protectedRouter.patch('/tasks/:id/status', (req, res, next) => taskController.updateStatus(req, res, next));
protectedRouter.get('/tasks/:id/subtasks', (req, res, next) => taskController.getSubtasks(req, res, next));
protectedRouter.post('/tasks/:id/subtasks', (req, res, next) => taskController.createSubtask(req, res, next));
protectedRouter.get('/tasks/:id/comments', (req, res, next) => taskController.getComments(req, res, next));
protectedRouter.post('/tasks/:id/comments', (req, res, next) => taskController.addComment(req, res, next));

protectedRouter.get('/workflows', (req, res, next) => workflowController.list(req, res, next));
protectedRouter.get('/workflows/templates', (req, res, next) => workflowController.getTemplates(req, res, next));
protectedRouter.get('/workflows/:id', (req, res, next) => workflowController.getById(req, res, next));
protectedRouter.post('/workflows', (req, res, next) => workflowController.create(req, res, next));
protectedRouter.put('/workflows/:id', (req, res, next) => workflowController.update(req, res, next));
protectedRouter.delete('/workflows/:id', (req, res, next) => workflowController.delete(req, res, next));
protectedRouter.post('/workflows/:id/start', (req, res, next) => workflowController.startInstance(req, res, next));
protectedRouter.post('/workflows/from-template', (req, res, next) => workflowController.createFromTemplate(req, res, next));
protectedRouter.get('/workflows/instances/all', (req, res, next) => workflowController.listInstances(req, res, next));
protectedRouter.get('/workflows/instances/:instanceId', (req, res, next) => workflowController.getInstance(req, res, next));
protectedRouter.post('/workflows/:id/decide/:stepId', (req, res, next) => workflowController.decideStep(req, res, next));

protectedRouter.get('/notifications', (req, res, next) => notificationController.list(req, res, next));
protectedRouter.get('/notifications/unread-count', (req, res, next) => notificationController.unreadCount(req, res, next));
protectedRouter.patch('/notifications/:id/read', (req, res, next) => notificationController.markRead(req, res, next));
protectedRouter.post('/notifications/read-all', (req, res, next) => notificationController.markAllRead(req, res, next));

protectedRouter.post('/time-tracking/start', (req, res, next) => timeTrackingController.startTimer(req, res, next));
protectedRouter.patch('/time-tracking/:id/stop', (req, res, next) => timeTrackingController.stopTimer(req, res, next));
protectedRouter.get('/time-tracking/running', (req, res, next) => timeTrackingController.getRunningTimer(req, res, next));
protectedRouter.get('/time-tracking/summary', (req, res, next) => timeTrackingController.getUserSummary(req, res, next));
protectedRouter.get('/time-tracking/task/:taskId', (req, res, next) => timeTrackingController.getTaskTimeEntries(req, res, next));
protectedRouter.post('/time-tracking/task/:taskId', (req, res, next) => timeTrackingController.addManualEntry(req, res, next));

router.use(protectedRouter);

export default router;
