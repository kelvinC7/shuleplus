import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { ensureMember } from '../middleware/self.middleware';
import { smsController } from '../controllers/sms.controller';

export const smsRouter = Router();

smsRouter.use(authenticate, requireTenant, ensureMember);

smsRouter.get('/usage', (req, res, next) => smsController.usage(req, res, next));
smsRouter.get('/delivery-report', (req, res, next) => smsController.deliveryReport(req, res, next));
smsRouter.get('/parent-history', (req, res, next) => smsController.parentHistory(req, res, next));
smsRouter.get('/students', (req, res, next) => smsController.students(req, res, next));
smsRouter.get('/classes', (req, res, next) => smsController.classes(req, res, next));
smsRouter.post('/preview', (req, res, next) => smsController.preview(req, res, next));
smsRouter.post('/send', (req, res, next) => smsController.send(req, res, next));
smsRouter.get('/campaigns', (req, res, next) => smsController.campaigns(req, res, next));
smsRouter.get('/campaigns/:id/recipients', (req, res, next) =>
  smsController.campaignRecipients(req, res, next)
);
