import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { printCardController } from '../controllers/print-card.controller';
import { photoImportController } from '../controllers/photo-import.controller';
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
    service: 'print-card-service',
    module: 'print-card',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

protectedRouter.get('/session', (req, res, next) => printCardController.session(req, res, next));
protectedRouter.get('/schools', (req, res, next) => printCardController.schools(req, res, next));
protectedRouter.get('/stats', (req, res, next) => printCardController.stats(req, res, next));

protectedRouter.get('/schools/:organizationId/students', (req, res, next) =>
  printCardController.students(req, res, next)
);
protectedRouter.get('/schools/:organizationId/classes', (req, res, next) =>
  printCardController.classes(req, res, next)
);
protectedRouter.get('/schools/:organizationId/staff', (req, res, next) =>
  printCardController.staff(req, res, next)
);

protectedRouter.post('/print-batches', (req, res, next) => printCardController.createBatch(req, res, next));
protectedRouter.get('/print-batches/queue', (req, res, next) => printCardController.queue(req, res, next));
protectedRouter.get('/print-batches/history', (req, res, next) => printCardController.history(req, res, next));
protectedRouter.get('/print-batches/:batchId', (req, res, next) => printCardController.getBatch(req, res, next));
protectedRouter.post('/print-batches/:batchId/start', (req, res, next) =>
  printCardController.startBatch(req, res, next)
);
protectedRouter.post('/print-batches/:batchId/confirm', (req, res, next) =>
  printCardController.confirmBatch(req, res, next)
);
protectedRouter.post('/print-batches/:batchId/cancel', (req, res, next) =>
  printCardController.cancelBatch(req, res, next)
);
protectedRouter.patch('/print-batches/:batchId/reorder', (req, res, next) =>
  printCardController.reorderBatch(req, res, next)
);
protectedRouter.delete('/print-batches/:batchId/items/:itemId', (req, res, next) =>
  printCardController.removeBatchItem(req, res, next)
);

protectedRouter.get('/card-records/:cardRecordId/events', (req, res, next) =>
  printCardController.cardEvents(req, res, next)
);
protectedRouter.post('/card-records/:cardRecordId/action', (req, res, next) =>
  printCardController.cardAction(req, res, next)
);

protectedRouter.get('/reprint-requests', (req, res, next) =>
  printCardController.listReprintRequests(req, res, next)
);
protectedRouter.post('/reprint-requests', (req, res, next) =>
  printCardController.createReprintRequest(req, res, next)
);
protectedRouter.post('/reprint-requests/:requestId/review', (req, res, next) =>
  printCardController.reviewReprintRequest(req, res, next)
);
protectedRouter.post('/reprint-requests/:requestId/complete', (req, res, next) =>
  printCardController.completeReprintRequest(req, res, next)
);

protectedRouter.post(
  '/photo-import/jobs',
  photoImportController.uploadMiddleware,
  (req, res, next) => photoImportController.create(req, res, next)
);
protectedRouter.get('/photo-import/jobs', (req, res, next) =>
  photoImportController.list(req, res, next)
);
protectedRouter.get('/photo-import/jobs/:id', (req, res, next) =>
  photoImportController.get(req, res, next)
);
protectedRouter.post('/photo-import/jobs/:id/confirm', (req, res, next) =>
  photoImportController.confirm(req, res, next)
);
protectedRouter.get('/photo-import/jobs/:id/report.xlsx', (req, res, next) =>
  photoImportController.report(req, res, next)
);

router.use(protectedRouter);

export default router;
