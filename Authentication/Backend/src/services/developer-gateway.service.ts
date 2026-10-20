import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { DeveloperEnvironment } from '../generated/prisma';
import { env } from '../config/env';
import { findRoute } from '../config/developer-module-registry';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';
import { developerSandboxService } from './developer-sandbox.service';

export interface GatewayContext {
  partnerId: string;
  organizationId: string;
  userId?: string;
  applicationId?: string;
  scopes: string[];
  environment: DeveloperEnvironment;
  permissions: Record<string, Record<string, boolean>>;
}

function hasPermission(ctx: GatewayContext, permission: string): boolean {
  for (const mod of Object.values(ctx.permissions)) {
    if (mod[permission]) return true;
  }
  return ctx.scopes.includes(permission);
}

async function createServiceJwt(organizationId: string, environment: DeveloperEnvironment): Promise<string> {
  return jwt.sign(
    {
      sub: 'developer-gateway',
      email: 'gateway@shuleplus.rw',
      organizationId,
      sessionId: crypto.randomUUID(),
      roles: ['organization_admin'],
      modules: [
        'student-management',
        'school-fees',
        'fees',
        'finance',
        'babyeyi',
        'circulars',
        'academic',
        'webpage-babyeyi',
        'payroll',
        'kaziavance',
        'teacher-portal',
      ],
      portal: 'developer_gateway',
      environment,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '5m' }
  );
}

export class DeveloperGatewayService {
  private async buildContext(input: {
    partnerId: string;
    userId?: string;
    applicationId?: string;
    environment: DeveloperEnvironment;
    scopes: string[];
    permissions: Record<string, Record<string, boolean>>;
    organizationId?: string | null;
  }): Promise<GatewayContext> {
    const partner = await prisma.developerPartner.findUniqueOrThrow({
      where: { id: input.partnerId },
    });

    const organizationId =
      input.organizationId ??
      developerSandboxService.resolveOrganizationId(partner, input.environment);

    return {
      partnerId: input.partnerId,
      organizationId,
      userId: input.userId,
      applicationId: input.applicationId,
      scopes: input.scopes,
      environment: input.environment,
      permissions: input.permissions,
    };
  }

  async resolveContextFromDeveloperUser(
    userId: string,
    environment: DeveloperEnvironment = DeveloperEnvironment.SANDBOX
  ): Promise<GatewayContext> {
    const user = await prisma.developerUser.findUniqueOrThrow({
      where: { id: userId },
      include: { partner: true },
    });

    const allowedEnvs = parseAllowedEnvironments(user.allowedEnvironments);
    if (!allowedEnvs.includes(environment)) {
      throw new AppError(403, `Your account does not have access to ${environment} environment`);
    }

    return this.buildContext({
      partnerId: user.partnerId,
      userId: user.id,
      environment,
      scopes: [],
      permissions: (user.allowedModules as Record<string, Record<string, boolean>>) ?? {},
    });
  }

  async resolveContextFromApiClient(applicationId: string): Promise<GatewayContext> {
    const app = await prisma.developerApplication.findUniqueOrThrow({
      where: { id: applicationId },
      include: { partner: true },
    });

    if (app.status !== 'ACTIVE') {
      throw new AppError(403, 'Application is not active');
    }

    const partnerUsers = await prisma.developerUser.findFirst({
      where: { partnerId: app.partnerId, status: 'ACTIVE' },
    });

    return this.buildContext({
      partnerId: app.partnerId,
      applicationId: app.id,
      environment: app.environment,
      organizationId: app.organizationId,
      scopes: (app.scopes as string[]) ?? [],
      permissions: partnerUsers
        ? ((partnerUsers.allowedModules as Record<string, Record<string, boolean>>) ?? {})
        : {},
    });
  }

  async proxyRequest(input: {
    ctx: GatewayContext;
    moduleSlug: string;
    method: string;
    path: string;
    query: Record<string, string | string[] | undefined>;
    body?: unknown;
    ipAddress?: string;
  }) {
    const match = findRoute(input.moduleSlug, input.method, input.path);
    if (!match) {
      throw new AppError(404, `No registered API route: ${input.method} ${input.path}`);
    }

    if (!hasPermission(input.ctx, match.route.permission)) {
      throw new AppError(403, `Missing permission: ${match.route.permission}`);
    }

    const upstreamBase = match.module.resolveUpstreamBase().replace(/\/$/, '');
    const upstreamPath = match.resolvedUpstreamPath.startsWith('/')
      ? match.resolvedUpstreamPath
      : `/${match.resolvedUpstreamPath}`;

    const query = { ...input.query };
    if (!query.organizationId && input.ctx.organizationId) {
      query.organizationId = input.ctx.organizationId;
    }

    const url = new URL(upstreamBase + upstreamPath);
    for (const [key, val] of Object.entries(query)) {
      if (typeof val === 'string') url.searchParams.set(key, val);
      else if (Array.isArray(val) && val[0]) url.searchParams.set(key, val[0]);
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Request-Id': `req_${crypto.randomBytes(8).toString('hex')}`,
      'X-Developer-Gateway': 'shuleplus-iam',
      'X-Partner-Id': input.ctx.partnerId,
      'X-Organization-Id': input.ctx.organizationId,
      'X-Developer-Environment': input.ctx.environment,
    };

    if (match.route.authMode === 'service') {
      headers['x-service-key'] = env.PLATFORM_SERVICE_KEY;
      headers['x-organization-id'] = input.ctx.organizationId;
      const serviceJwt = await createServiceJwt(input.ctx.organizationId, input.ctx.environment);
      headers['Authorization'] = `Bearer ${serviceJwt}`;
    }

    let requestBody = input.body;
    if (
      requestBody &&
      typeof requestBody === 'object' &&
      !Array.isArray(requestBody) &&
      !(requestBody as Record<string, unknown>).organizationId
    ) {
      requestBody = { ...(requestBody as object), organizationId: input.ctx.organizationId };
    }

    const start = Date.now();
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: input.method,
        headers,
        body:
          input.method !== 'GET' && input.method !== 'HEAD' && requestBody != null
            ? JSON.stringify(requestBody)
            : undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upstream unreachable';
      const hint =
        message.includes('ECONNREFUSED') || message.includes('fetch failed')
          ? ` Start the ${match.module.name} backend (${upstreamBase}).`
          : '';
      throw new AppError(502, `Module upstream error: ${message}.${hint}`);
    }

    const responseTime = Date.now() - start;
    const contentType = response.headers.get('content-type') ?? '';
    let responseBody: unknown = null;

    if (contentType.includes('application/json')) {
      responseBody = await response.json().catch(() => null);
    } else {
      responseBody = { raw: await response.text().catch(() => '') };
    }

    await prisma.developerApiLog.create({
      data: {
        partnerId: input.ctx.partnerId,
        applicationId: input.ctx.applicationId,
        requestId: headers['X-Request-Id']!,
        method: input.method,
        endpoint: `${input.moduleSlug}${upstreamPath}`,
        statusCode: response.status,
        responseTime,
        environment: input.ctx.environment,
        ipAddress: input.ipAddress,
        requestBody: requestBody ? (requestBody as object) : undefined,
        responseBody: responseBody ? (responseBody as object) : undefined,
      },
    });

    if (input.ctx.applicationId) {
      await prisma.developerApplication.update({
        where: { id: input.ctx.applicationId },
        data: { lastUsedAt: new Date() },
      });
    }

    return {
      status: response.status,
      responseTime,
      requestId: headers['X-Request-Id'],
      organizationId: input.ctx.organizationId,
      environment: input.ctx.environment,
      body: responseBody,
    };
  }
}

function parseAllowedEnvironments(raw: unknown): DeveloperEnvironment[] {
  if (Array.isArray(raw)) {
    return raw.filter((e) => e === 'SANDBOX' || e === 'PRODUCTION') as DeveloperEnvironment[];
  }
  return [DeveloperEnvironment.SANDBOX];
}

export const developerGatewayService = new DeveloperGatewayService();
