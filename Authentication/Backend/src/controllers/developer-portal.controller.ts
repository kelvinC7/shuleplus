import { Request, Response, NextFunction } from 'express';
import { DeveloperAccessType, DeveloperEnvironment } from '../generated/prisma';
import { developerPortalService } from '../services/developer-portal.service';
import { developerGatewayService } from '../services/developer-gateway.service';
import { DeveloperAuthenticatedRequest } from '../middleware/developer-auth.middleware';
import { GatewayRequest } from '../middleware/developer-gateway.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const developerPortalController = {
  // Auth
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as { email?: string; password?: string; rememberMe?: boolean };
      const data = await developerPortalService.login({
        email: String(body.email ?? ''),
        password: String(body.password ?? ''),
        rememberMe: body.rememberMe,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async completeMfa(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as { mfaSessionToken?: string; code?: string };
      const data = await developerPortalService.completeMfaLogin(
        String(body.mfaSessionToken ?? ''),
        String(body.code ?? ''),
        req.ip,
        req.headers['user-agent']
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as { refreshToken?: string };
      const data = await developerPortalService.refreshToken(String(body.refreshToken ?? ''));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async validateActivation(req: Request, res: Response, next: NextFunction) {
    try {
      const token = String(req.query.token ?? '');
      const data = await developerPortalService.validateActivationToken(token);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as { token?: string; password?: string };
      const data = await developerPortalService.activateAccount(
        String(body.token ?? ''),
        String(body.password ?? '')
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async me(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.getMe(req.developer!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async setupMfa(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.setupMfa(req.developer!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async verifyMfaSetup(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as { code?: string };
      const data = await developerPortalService.verifyMfaSetup(req.developer!.sub, String(body.code ?? ''));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  // Dashboard
  async dashboard(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const days = Math.min(Math.max(parseInt(String(req.query.days ?? '7'), 10) || 7, 1), 30);
      const [stats, chart] = await Promise.all([
        developerPortalService.getDashboardStats(req.developer!.partnerId),
        developerPortalService.getApiHealthChart(req.developer!.partnerId, days),
      ]);
      res.json({ success: true, data: { stats, chart } });
    } catch (e) {
      next(e);
    }
  },

  async endpointStats(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const days = Math.min(Math.max(parseInt(String(req.query.days ?? '7'), 10) || 7, 1), 30);
      const data = await developerPortalService.getEndpointStats(req.developer!.partnerId, days);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async developerNotifications(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.listDeveloperNotifications(req.developer!.partnerId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  // Applications
  async listApplications(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.listApplications(req.developer!.partnerId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async createApplication(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as {
        name?: string;
        description?: string;
        environment?: DeveloperEnvironment;
        scopes?: string[];
      };
      const data = await developerPortalService.createApplication({
        partnerId: req.developer!.partnerId,
        name: String(body.name ?? ''),
        description: body.description,
        environment: body.environment ?? DeveloperEnvironment.SANDBOX,
        scopes: body.scopes ?? [],
        createdByUserId: req.developer!.sub,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async rotateSecret(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.rotateApplicationSecret(
        String(req.params.applicationId),
        req.developer!.partnerId
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  // Docs
  async apiCatalog(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.getApiCatalog(req.developer!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  // Logs
  async apiLogs(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.listApiLogs(req.developer!.partnerId, {
        applicationId: typeof req.query.applicationId === 'string' ? req.query.applicationId : undefined,
        status: req.query.status ? Number(req.query.status) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  // Webhooks
  async listWebhooks(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.listWebhooks(req.developer!.partnerId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async createWebhook(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as { applicationId?: string; name?: string; url?: string; events?: string[] };
      const data = await developerPortalService.createWebhook({
        applicationId: String(body.applicationId ?? ''),
        partnerId: req.developer!.partnerId,
        name: String(body.name ?? ''),
        url: String(body.url ?? ''),
        events: body.events ?? [],
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  // Security
  async securityOverview(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.getSecurityOverview(req.developer!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async sessions(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.listSessions(req.developer!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async revokeSessions(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.revokeOtherSessions(
        req.developer!.sub,
        req.developer!.sessionId
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  // OAuth
  async oauthToken(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as { client_id?: string; client_secret?: string; grant_type?: string };
      if (body.grant_type !== 'client_credentials') {
        res.status(400).json({ success: false, message: 'Unsupported grant_type' });
        return;
      }
      const data = await developerPortalService.issueOAuthToken(
        String(body.client_id ?? ''),
        String(body.client_secret ?? '')
      );
      res.json(data);
    } catch (e) {
      next(e);
    }
  },

  // Super Admin
  async adminListPartners(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.listPartners();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminCreatePartner(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const body = req.body as { name?: string; description?: string; organizationId?: string };
      const data = await developerPortalService.createPartner({
        name: String(body.name ?? ''),
        description: body.description,
        organizationId: body.organizationId,
        actorId: authReq.user?.sub,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminLinkPartnerSandbox(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const body = req.body as { organizationId?: string };
      const data = await developerPortalService.linkPartnerSandbox(
        String(req.params.id),
        String(body.organizationId ?? ''),
        authReq.user!.sub
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminListDevelopers(req: Request, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const data = await developerPortalService.listDevelopers(search);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminGetDeveloper(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.getDeveloperById(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminCreateDeveloper(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const body = req.body as {
        partnerId?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        accessType?: DeveloperAccessType;
        allowedModules?: Record<string, Record<string, boolean>>;
        allowedEnvironments?: DeveloperEnvironment[];
        ipRestrictions?: string[];
      };
      const data = await developerPortalService.createDeveloperAccess({
        partnerId: String(body.partnerId ?? ''),
        firstName: String(body.firstName ?? ''),
        lastName: String(body.lastName ?? ''),
        email: String(body.email ?? ''),
        accessType: body.accessType ?? DeveloperAccessType.DEVELOPER,
        allowedModules: body.allowedModules ?? {},
        allowedEnvironments: body.allowedEnvironments ?? [DeveloperEnvironment.SANDBOX],
        ipRestrictions: body.ipRestrictions,
        createdByUserId: authReq.user?.sub,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminSuspendDeveloper(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.suspendDeveloper(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminActivateDeveloper(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.activateDeveloper(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminUpdateDeveloper(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const body = req.body as {
        accessType?: DeveloperAccessType;
        allowedModules?: Record<string, Record<string, boolean>>;
        allowedEnvironments?: DeveloperEnvironment[];
        ipRestrictions?: string[] | null;
      };
      const data = await developerPortalService.updateDeveloperAccess(String(req.params.id), {
        accessType: body.accessType,
        allowedModules: body.allowedModules,
        allowedEnvironments: body.allowedEnvironments,
        ipRestrictions: body.ipRestrictions,
        actorId: authReq.user?.sub,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminResendDeveloperActivation(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.resendDeveloperActivationEmail(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminDeleteDeveloper(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const data = await developerPortalService.deleteDeveloper(
        String(req.params.id),
        authReq.user?.sub
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminBankOnboardingEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.getBankOnboardingEmail(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminPermissionConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = developerPortalService.getModulePermissionsConfig();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async openApiSpec(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = typeof req.params.moduleSlug === 'string' ? req.params.moduleSlug : undefined;
      const data = developerPortalService.getOpenApiSpec(slug);
      res.json(data);
    } catch (e) {
      next(e);
    }
  },

  async gatewayProxy(req: GatewayRequest, res: Response, next: NextFunction) {
    try {
      if (!req.gatewayContext) {
        res.status(401).json({ success: false, message: 'Gateway context missing' });
        return;
      }
      const moduleSlug = String(req.params.moduleSlug ?? '');
      const pathParam = (req.params as { path?: string | string[] }).path;
      const path = Array.isArray(pathParam)
        ? `/${pathParam.join('/')}`
        : pathParam
          ? `/${pathParam}`
          : '/';
      const data = await developerGatewayService.proxyRequest({
        ctx: req.gatewayContext,
        moduleSlug,
        method: req.method,
        path: path || '/',
        query: req.query as Record<string, string | string[] | undefined>,
        body: req.body,
        ipAddress: req.ip,
      });
      res.status(data.status).json({
        success: data.status >= 200 && data.status < 300,
        requestId: data.requestId,
        responseTime: data.responseTime,
        data: data.body,
      });
    } catch (e) {
      next(e);
    }
  },

  async gatewayProxyPost(req: GatewayRequest, res: Response, next: NextFunction) {
    try {
      if (!req.gatewayContext) {
        res.status(401).json({ success: false, message: 'Gateway context missing' });
        return;
      }
      const body = req.body as {
        moduleSlug?: string;
        method?: string;
        path?: string;
        query?: Record<string, string>;
        body?: unknown;
        environment?: DeveloperEnvironment;
      };

      let ctx = req.gatewayContext;
      if (body.environment && req.developer) {
        ctx = await developerGatewayService.resolveContextFromDeveloperUser(
          req.developer.sub,
          body.environment
        );
      }

      const data = await developerGatewayService.proxyRequest({
        ctx,
        moduleSlug: String(body.moduleSlug ?? ''),
        method: String(body.method ?? 'GET').toUpperCase(),
        path: String(body.path ?? '/'),
        query: body.query ?? {},
        body: body.body,
        ipAddress: req.ip,
      });
      res.status(data.status).json({
        success: data.status >= 200 && data.status < 300,
        requestId: data.requestId,
        responseTime: data.responseTime,
        organizationId: data.organizationId,
        environment: data.environment,
        data: data.body,
      });
    } catch (e) {
      next(e);
    }
  },

  async sandboxOverview(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.getSandbox(
        req.developer!.partnerId,
        req.developer!.sub
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async requestProduction(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as { requestedModules?: string[]; businessJustification?: string };
      const data = await developerPortalService.requestProductionAccess({
        partnerId: req.developer!.partnerId,
        userId: req.developer!.sub,
        requestedModules: body.requestedModules ?? [],
        businessJustification: body.businessJustification,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async postmanExport(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.getPostmanExport(req.developer!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminListProductionRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const data = await developerPortalService.listProductionAccessRequests(status);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminApproveProduction(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const body = req.body as { notes?: string };
      const data = await developerPortalService.approveProductionAccess(
        String(req.params.id),
        authReq.user!.sub,
        body.notes
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminRejectProduction(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const body = req.body as { notes?: string };
      const data = await developerPortalService.rejectProductionAccess(
        String(req.params.id),
        authReq.user!.sub,
        body.notes
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminGetPortalSettings(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await developerPortalService.getPortalSettings();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async adminUpdatePortalSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const body = req.body as { publicApiUrl?: string | null };
      const data = await developerPortalService.updatePortalSettings({
        publicApiUrl: body.publicApiUrl ?? null,
        updatedById: authReq.user!.sub,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
