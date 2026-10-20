import { Response, NextFunction } from 'express';
import { env } from '../config/env';
import {
  filterCatalogByPermissions,
  SM_API_BASE_PATH,
  SM_DEVELOPER_API_GROUPS,
  SM_DEVELOPER_PERMISSIONS,
} from '../config/developer-api-catalog';
import {
  generatePostmanFromCatalog,
  generateStudentManagementOpenApi,
} from '../config/developer-openapi';
import type { DeveloperAuthenticatedRequest } from '../middleware/developer-auth.middleware';

function publicBaseUrl(req: DeveloperAuthenticatedRequest): string {
  if (env.PUBLIC_API_BASE_URL) return env.PUBLIC_API_BASE_URL.replace(/\/$/, '');
  const host = req.get('x-forwarded-host') ?? req.get('host') ?? `localhost:${env.PORT}`;
  const proto = req.get('x-forwarded-proto') ?? (env.NODE_ENV === 'production' ? 'https' : 'http');
  return `${proto}://${host}`;
}

export const developerController = {
  overview(req: DeveloperAuthenticatedRequest, res: Response) {
    const session = req.developerSession!;
    const baseUrl = publicBaseUrl(req);
    res.json({
      success: true,
      data: {
        service: 'StudentManagement API',
        version: 'v1',
        status: 'operational',
        baseUrl: `${baseUrl}${SM_API_BASE_PATH}`,
        documentationUrl: `${baseUrl}/developer/api`,
        authentication: 'OAuth 2.0 Bearer Token (client credentials via ShulePlus Developer Portal)',
        rateLimit: '1,000 requests/minute per application',
        developer: {
          name: `${session.firstName} ${session.lastName}`,
          email: session.email,
          partner: session.partner.name,
        },
        quickStart: [
          'Create a Sandbox Application in the Developer Portal',
          'Generate an OAuth access token (client credentials)',
          'Call API endpoints with Bearer token via the ShulePlus API Gateway',
          'Use X-Developer-Environment: SANDBOX for sandbox data',
        ],
        permissions: SM_DEVELOPER_PERMISSIONS,
        groups: SM_DEVELOPER_API_GROUPS.map((g) => ({
          id: g.id,
          label: g.label,
          description: g.description,
          endpointCount: g.endpoints.length,
        })),
      },
    });
  },

  catalog(req: DeveloperAuthenticatedRequest, res: Response) {
    const session = req.developerSession!;
    const baseUrl = publicBaseUrl(req);
    const groups = filterCatalogByPermissions(session.allowedModules);
    res.json({
      success: true,
      data: {
        baseUrl: `${baseUrl}${SM_API_BASE_PATH}`,
        gatewayBaseUrl: `${env.IAM_API_URL}/developers/gateway/student-management`,
        groups,
      },
    });
  },

  openapi(req: DeveloperAuthenticatedRequest, res: Response) {
    const session = req.developerSession!;
    const spec = generateStudentManagementOpenApi({
      baseUrl: publicBaseUrl(req),
      allowedModules: session.allowedModules,
    });
    res.json(spec);
  },

  postman(req: DeveloperAuthenticatedRequest, res: Response) {
    const session = req.developerSession!;
    const collection = generatePostmanFromCatalog({
      baseUrl: publicBaseUrl(req),
      allowedModules: session.allowedModules,
    });
    res.json({ success: true, data: { collection } });
  },

  async tryRequest(req: DeveloperAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const session = req.developerSession!;
      const body = req.body as {
        method?: string;
        path?: string;
        query?: Record<string, string>;
        body?: unknown;
        environment?: 'SANDBOX' | 'PRODUCTION';
        applicationId?: string;
      };

      const token = req.headers.authorization?.slice(7);
      if (!token) {
        res.status(401).json({ success: false, message: 'Bearer token required' });
        return;
      }

      const gatewayRes = await fetch(`${env.IAM_API_URL}/developers/gateway/proxy`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Developer-Environment': body.environment ?? 'SANDBOX',
        },
        body: JSON.stringify({
          moduleSlug: 'student-management',
          method: body.method ?? 'GET',
          path: body.path ?? '/students',
          query: body.query,
          body: body.body,
        }),
      });

      const data = await gatewayRes.json();
      res.status(gatewayRes.status).json(data);
    } catch (e) {
      next(e);
    }
  },
};
