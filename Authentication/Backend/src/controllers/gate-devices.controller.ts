import { Request, Response, NextFunction } from 'express';
import { gateDevicesService } from '../services/gate-devices.service';

export const gateDevicesController = {
  async schools(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await gateDevicesService.listSchools({
        provinceId: typeof req.query.provinceId === 'string' ? req.query.provinceId : undefined,
        districtId: typeof req.query.districtId === 'string' ? req.query.districtId : undefined,
        sectorId: typeof req.query.sectorId === 'string' ? req.query.sectorId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async listDevices(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const data = await gateDevicesService.listDevices(organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async createDevice(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const body = req.body as {
        deviceCode?: string;
        name?: string;
        location?: string;
        gateName?: string;
        direction?: string;
      };
      const deviceCode =
        typeof body.deviceCode === 'string' && body.deviceCode.trim() ? body.deviceCode.trim() : undefined;
      const data = await gateDevicesService.createDevice(organizationId, {
        deviceCode,
        name: String(body.name ?? 'Gate Reader'),
        location: body.location,
        gateName: body.gateName,
        direction: body.direction,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async rotateApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const deviceId = String(req.params.deviceId ?? '');
      const data = await gateDevicesService.rotateDeviceApiKey(organizationId, deviceId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateDevice(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const deviceId = String(req.params.deviceId ?? '');
      const data = await gateDevicesService.updateDevice(organizationId, deviceId, req.body ?? {});
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async deleteDevice(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const deviceId = String(req.params.deviceId ?? '');
      const data = await gateDevicesService.deleteDevice(organizationId, deviceId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async listDeviceSchools(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const deviceId = String(req.params.deviceId ?? '');
      const data = await gateDevicesService.listDeviceSchools(organizationId, deviceId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async linkDeviceSchool(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const deviceId = String(req.params.deviceId ?? '');
      const body = (req.body ?? {}) as { targetOrganizationId?: string; schoolId?: string };
      const targetOrganizationId = String(body.targetOrganizationId ?? body.schoolId ?? '').trim();
      const data = await gateDevicesService.linkDeviceSchool(organizationId, deviceId, targetOrganizationId);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async unlinkDeviceSchool(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const deviceId = String(req.params.deviceId ?? '');
      const schoolId = String(req.params.schoolId ?? '');
      const data = await gateDevicesService.unlinkDeviceSchool(organizationId, deviceId, schoolId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
