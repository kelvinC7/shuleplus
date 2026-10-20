import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { dashboardController } from '../controllers/dashboard.controller';
import { categoryController } from '../controllers/category.controller';
import { subjectController } from '../controllers/subject.controller';
import { shelfController } from '../controllers/shelf.controller';
import { catalogController } from '../controllers/catalog.controller';
import { loanController } from '../controllers/loan.controller';
import { reservationController } from '../controllers/reservation.controller';
import { visitController } from '../controllers/visit.controller';
import { requestController } from '../controllers/request.controller';
import { digitalController } from '../controllers/digital.controller';
import { inventoryController } from '../controllers/inventory.controller';
import { settingsController } from '../controllers/settings.controller';
import { reportController } from '../controllers/report.controller';
import { membersController } from '../controllers/members.controller';
import { integrationsController } from '../controllers/integrations.controller';
import { finesController } from '../controllers/fines.controller';
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
} from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router: Router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'library-module-service',
    module: 'library',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

const p = Router();
p.use(authenticate, requireModuleLicense, requireTenant);

// Dashboard
p.get('/dashboard', (req, res, next) => dashboardController.summary(req, res, next));

// Catalog
p.get('/catalog', (req, res, next) => catalogController.list(req, res, next));
p.get('/catalog/:id', (req, res, next) => catalogController.getOne(req, res, next));
p.post('/catalog', (req, res, next) => catalogController.create(req, res, next));
p.put('/catalog/:id', (req, res, next) => catalogController.update(req, res, next));
p.delete('/catalog/:id', (req, res, next) => catalogController.remove(req, res, next));

// Categories
p.get('/categories', (req, res, next) => categoryController.list(req, res, next));
p.post('/categories', (req, res, next) => categoryController.create(req, res, next));
p.put('/categories/:id', (req, res, next) => categoryController.update(req, res, next));
p.delete('/categories/:id', (req, res, next) => categoryController.remove(req, res, next));

// Subjects
p.get('/subjects', (req, res, next) => subjectController.list(req, res, next));
p.post('/subjects', (req, res, next) => subjectController.create(req, res, next));
p.put('/subjects/:id', (req, res, next) => subjectController.update(req, res, next));
p.delete('/subjects/:id', (req, res, next) => subjectController.remove(req, res, next));

// Shelves
p.get('/shelves', (req, res, next) => shelfController.list(req, res, next));
p.post('/shelves', (req, res, next) => shelfController.create(req, res, next));
p.put('/shelves/:id', (req, res, next) => shelfController.update(req, res, next));
p.delete('/shelves/:id', (req, res, next) => shelfController.remove(req, res, next));

// Circulation - Loans
p.get('/circulation/loans', (req, res, next) => loanController.list(req, res, next));
p.post('/circulation/loans', (req, res, next) => loanController.create(req, res, next));
p.post('/circulation/loans/:id/return', (req, res, next) => loanController.returnBook(req, res, next));
p.post('/circulation/loans/:id/renew', (req, res, next) => loanController.renew(req, res, next));
p.get('/circulation/overdue', (req, res, next) => loanController.overdue(req, res, next));

// Circulation - Reservations
p.get('/circulation/reservations', (req, res, next) => reservationController.list(req, res, next));
p.post('/circulation/reservations', (req, res, next) => reservationController.create(req, res, next));
p.post('/circulation/reservations/:id/cancel', (req, res, next) => reservationController.cancel(req, res, next));
p.post('/circulation/reservations/:id/fulfill', (req, res, next) => reservationController.fulfill(req, res, next));

// Members
p.get('/members', (req, res, next) => membersController.list(req, res, next));

// Integrations (Student Management, search helpers)
p.get('/integrations/students/search', (req, res, next) => integrationsController.searchStudents(req, res, next));
p.get('/integrations/teachers/search', (req, res, next) => integrationsController.searchTeachers(req, res, next));
p.get('/integrations/copies/search', (req, res, next) => integrationsController.searchAvailableCopies(req, res, next));
p.get('/integrations/resources/search', (req, res, next) => integrationsController.searchResources(req, res, next));

// Fines
p.get('/fines', (req, res, next) => finesController.list(req, res, next));
p.post('/fines', (req, res, next) => finesController.create(req, res, next));
p.post('/fines/:id/pay', (req, res, next) => finesController.markPaid(req, res, next));
p.post('/fines/:id/waive', (req, res, next) => finesController.waive(req, res, next));
p.delete('/fines/:id', (req, res, next) => finesController.remove(req, res, next));

// Visits
p.get('/visits', (req, res, next) => visitController.list(req, res, next));
p.post('/visits/check-in', (req, res, next) => visitController.checkIn(req, res, next));
p.post('/visits/:id/check-out', (req, res, next) => visitController.checkOut(req, res, next));
p.get('/visits/stats', (req, res, next) => visitController.stats(req, res, next));

// Requests
p.get('/requests', (req, res, next) => requestController.list(req, res, next));
p.post('/requests', (req, res, next) => requestController.create(req, res, next));
p.post('/requests/:id/review', (req, res, next) => requestController.review(req, res, next));

// Digital
p.get('/digital', (req, res, next) => digitalController.list(req, res, next));
p.post('/digital', (req, res, next) => digitalController.create(req, res, next));
p.put('/digital/:id', (req, res, next) => digitalController.update(req, res, next));
p.delete('/digital/:id', (req, res, next) => digitalController.remove(req, res, next));
p.post('/digital/:id/download', (req, res, next) => digitalController.incrementDownload(req, res, next));

// Inventory
p.get('/inventory', (req, res, next) => inventoryController.copies(req, res, next));
p.put('/inventory/:id/status', (req, res, next) => inventoryController.updateStatus(req, res, next));
p.get('/inventory/damaged', (req, res, next) => inventoryController.damages(req, res, next));
p.get('/inventory/lost', (req, res, next) => inventoryController.lost(req, res, next));
p.get('/inventory/transfers', (req, res, next) => inventoryController.transfers(req, res, next));
p.post('/inventory/transfers', (req, res, next) => inventoryController.createTransfer(req, res, next));
p.post('/inventory/transfers/:id/approve', (req, res, next) => inventoryController.approveTransfer(req, res, next));

// Settings
p.get('/settings/library', (req, res, next) => settingsController.get(req, res, next));
p.put('/settings/library', (req, res, next) => settingsController.update(req, res, next));

// Reports
p.get('/reports', (req, res, next) => reportController.summary(req, res, next));

router.use(p);

export default router;
