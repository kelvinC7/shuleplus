import { Router, Request, Response } from 'express';
import { tenantService } from '../services/tenant.service';
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
  requireSuperAdmin,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireDeviceAuth, DeviceAuthRequest } from '../middleware/device-auth.middleware';
import * as dashboard from '../services/dashboard.service';
import * as devices from '../services/device.service';
import * as superadmin from '../services/superadmin.service';
import * as ingestion from '../services/ingestion.service';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'device-module-service',
    module: 'device',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, async (req, res, next) => {
  try {
    const tenant = await tenantService.createTenant(req.body);
    res.status(201).json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
});

const ingestRouter = Router();
ingestRouter.use(requireDeviceAuth);

ingestRouter.post('/heartbeat', async (req: DeviceAuthRequest, res, next) => {
  try {
    const device = await ingestion.ingestHeartbeat(req.device!.id, req.body);
    res.json({ success: true, data: { deviceId: device.id, receivedAt: new Date().toISOString() } });
  } catch (e) {
    next(e);
  }
});

ingestRouter.post('/events', async (req: DeviceAuthRequest, res, next) => {
  try {
    const result = await ingestion.ingestCardEvent(req.device!.id, req.body);
    res.status(result.duplicate ? 200 : 201).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

ingestRouter.post('/events/batch', async (req: DeviceAuthRequest, res, next) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    const results = await ingestion.ingestCardEventBatch(req.device!.id, events);
    res.json({ success: true, data: { processed: results.length, results } });
  } catch (e) {
    next(e);
  }
});

router.use('/ingest', ingestRouter);

const superRouter = Router();
superRouter.use(authenticate, requireSuperAdmin);

superRouter.get('/overview', async (_req, res, next) => {
  try {
    const data = await superadmin.getSuperAdminOverview();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

superRouter.get('/schools', async (req, res, next) => {
  try {
    const data = await superadmin.listSchools({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      province: req.query.province as string | undefined,
    });
    res.json({ success: true, ...data });
  } catch (e) {
    next(e);
  }
});

superRouter.get('/schools/:orgId/devices', async (req, res, next) => {
  try {
    const data = await superadmin.getSchoolDevices(String(req.params.orgId));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

superRouter.get('/map', async (_req, res, next) => {
  try {
    const data = await superadmin.getRegionMap();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

superRouter.get('/devices', async (req, res, next) => {
  try {
    const data = await superadmin.listAllDevices({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      status: req.query.status as string | undefined,
    });
    res.json({ success: true, ...data });
  } catch (e) {
    next(e);
  }
});

superRouter.get('/events', async (req, res, next) => {
  try {
    const data = await superadmin.listGlobalEvents({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 30,
    });
    res.json({ success: true, ...data });
  } catch (e) {
    next(e);
  }
});

superRouter.get('/firmware', async (_req, res, next) => {
  try {
    const data = await superadmin.listGlobalFirmware();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

superRouter.get('/profiles', async (_req, res, next) => {
  try {
    const data = await superadmin.listGlobalProfiles();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

router.use('/super-admin', superRouter);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

function orgId(req: AuthenticatedRequest) {
  return req.user!.organizationId;
}

protectedRouter.get('/dashboard', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await dashboard.getDashboard(orgId(req));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.get('/attendance/live', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await dashboard.getLiveAttendance(orgId(req));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.get('/offline-status', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await dashboard.getOfflineStatus(orgId(req));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.get('/devices/next-code', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await devices.previewNextDeviceCode(orgId(req));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.get('/devices', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await devices.listDevices(orgId(req), {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      status: req.query.status as string | undefined,
    });
    res.json({ success: true, ...data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.get('/devices/:id/credentials', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await devices.getDeviceCredentials(orgId(req), String(req.params.id));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.get('/devices/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await devices.getDevice(orgId(req), String(req.params.id));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.post('/devices', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await devices.createDevice(orgId(req), req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.patch('/devices/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await devices.updateDevice(orgId(req), String(req.params.id), req.body);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.delete('/devices/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await devices.deleteDevice(orgId(req), String(req.params.id));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.post('/devices/:id/commands', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await devices.issueCommand(orgId(req), String(req.params.id), {
      ...req.body,
      issuedBy: req.user?.email,
    });
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.post('/devices/bulk-command', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await devices.bulkCommand(orgId(req), req.body.deviceIds ?? [], {
      command: req.body.command,
      issuedBy: req.user?.email,
      confirmed: req.body.confirmed,
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.get('/devices/:id/logs', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await devices.listLogs(orgId(req), String(req.params.id), {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
      category: req.query.category as string | undefined,
    });
    res.json({ success: true, ...data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.get('/events', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await dashboard.listEvents(orgId(req), {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 30,
      deviceId: req.query.deviceId as string | undefined,
      eventType: req.query.eventType as string | undefined,
    });
    res.json({ success: true, ...data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.get('/unknown-cards', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await dashboard.listUnknownCards(orgId(req), {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json({ success: true, ...data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.post('/unknown-cards/:id/action', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await dashboard.resolveUnknownCard(orgId(req), String(req.params.id), req.body.action, {
      studentId: req.body.studentId,
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.get('/students/search', async (req: AuthenticatedRequest, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const data = await dashboard.searchStudents(orgId(req), q);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.get('/alerts', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await devices.listAlerts(orgId(req), {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json({ success: true, ...data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.get('/commands', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await devices.listCommands(orgId(req), req.query.deviceId as string | undefined, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json({ success: true, ...data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.get('/profiles', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await devices.listProfiles(orgId(req));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

protectedRouter.get('/firmware', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await devices.listFirmware(orgId(req));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

router.use(protectedRouter);

export default router;
