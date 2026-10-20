import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { gateService } from '../services/gate.service';
import { tenantService } from '../services/tenant.service';

function officerName(req: AuthenticatedRequest) {
  return req.user?.email?.split('@')[0] ?? 'Gate Officer';
}

export const gateController = {
  async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const gateId = typeof req.query.gateId === 'string' ? req.query.gateId : undefined;
      const data = await gateService.dashboard(req.organizationRef!, gateId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async gates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await gateService.listGates(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async createGate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await gateService.createGate(req.organizationRef!, req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateGate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await gateService.updateGate(req.organizationRef!, req.params.id as string, req.body);
      res.json({ success: true, data });
    } catch (e) {
      if ((e as Error).message === 'Gate not found') return next(new AppError(404, 'Not found'));
      next(e);
    }
  },

  async officers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await gateService.listOfficers(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.json({ success: true, data: null });
      let data = await gateService.getOfficerForUser(req.organizationRef!, {
        sub: req.user.sub,
        email: req.user.email,
      });
      if (data && !data.userId) {
        data = await gateService.linkOfficerUser(req.organizationRef!, data.id, req.user.sub);
      }
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async checkOfficerInternal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId =
        typeof req.query.organizationId === 'string' ? req.query.organizationId.trim() : '';
      const email = typeof req.query.email === 'string' ? req.query.email.trim() : '';
      const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
      if (!organizationId || !email) {
        return next(new AppError(400, 'organizationId and email are required'));
      }

      let orgRef = organizationId;
      try {
        const tenant = await tenantService.getTenant(organizationId);
        orgRef = tenant.organizationId;
      } catch {
        /* org id may already match tenant */
      }

      const officer = await gateService.getOfficerForUser(orgRef, { sub: userId, email });
      res.json({
        success: true,
        data: {
          isGateOfficer: Boolean(officer),
          entryPath: '/gate',
        },
      });
    } catch (e) {
      next(e);
    }
  },

  async createOfficer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await gateService.createOfficer(
        req.organizationRef!,
        req.user?.sub ?? 'system',
        req.body
      );
      res.status(201).json({ success: true, data });
    } catch (e) {
      if (e instanceof AppError) return next(e);
      const message = (e as Error).message;
      if (message.includes('login') || message.includes('password') || message.includes('email')) {
        return next(new AppError(400, message));
      }
      next(e);
    }
  },

  async updateOfficer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await gateService.updateOfficer(req.organizationRef!, req.params.id as string, req.body);
      res.json({ success: true, data });
    } catch (e) {
      if ((e as Error).message === 'Gate officer not found') return next(new AppError(404, 'Not found'));
      next(e);
    }
  },

  async deleteOfficer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await gateService.deleteOfficer(req.organizationRef!, req.params.id as string);
      res.json({ success: true, data });
    } catch (e) {
      if ((e as Error).message === 'Gate officer not found') return next(new AppError(404, 'Not found'));
      next(e);
    }
  },

  async scan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const code = typeof req.query.code === 'string' ? req.query.code : req.body?.code;
      if (!code) return next(new AppError(400, 'Scan code is required'));
      const data = await gateService.scan(req.organizationRef!, code);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async verifyExit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await gateService.verifyExit(req.organizationRef!, req.params.permissionId as string);
      res.json({ success: true, data });
    } catch (e) {
      if ((e as Error).message === 'Permission not found') return next(new AppError(404, 'Not found'));
      next(e);
    }
  },

  async checkout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await gateService.checkout(req.organizationRef!, req.params.permissionId as string, {
        gateId: req.body.gateId,
        method: req.body.method ?? 'Manual',
        officerId: req.body.officerId,
        officerName: req.body.officerName ?? officerName(req),
      });
      res.json({ success: true, data });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'Permission not found' || msg === 'Gate not found') return next(new AppError(404, msg));
      if (msg.includes('not allowed') || msg.includes('already checked')) return next(new AppError(403, msg));
      next(e);
    }
  },

  async checkin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await gateService.checkin(req.organizationRef!, req.params.permissionId as string, {
        gateId: req.body.gateId,
        method: req.body.method ?? 'Manual',
        officerId: req.body.officerId,
        officerName: req.body.officerName ?? officerName(req),
      });
      res.json({ success: true, data });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'Permission not found' || msg === 'Gate not found') return next(new AppError(404, msg));
      if (msg.includes('not currently outside')) return next(new AppError(403, msg));
      next(e);
    }
  },

  async emergencyExit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await gateService.emergencyExit(req.organizationRef!, {
        ...req.body,
        officerName: req.body.officerName ?? officerName(req),
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'Gate not found') return next(new AppError(404, msg));
      if (msg.includes('Invalid override PIN')) return next(new AppError(403, msg));
      next(e);
    }
  },

  async outside(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await gateService.listOutside(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async overdue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await gateService.listOverdue(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async logs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await gateService.listLogs(req.organizationRef!, {
        gateId: typeof req.query.gateId === 'string' ? req.query.gateId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        eventType: typeof req.query.eventType === 'string' ? req.query.eventType : undefined,
        from: typeof req.query.from === 'string' ? req.query.from : undefined,
        to: typeof req.query.to === 'string' ? req.query.to : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async todayPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await gateService.todayPermissions(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async processOverdue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await gateService.processOverdueNotifications(req.organizationRef!, req.user?.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
