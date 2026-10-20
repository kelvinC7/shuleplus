import type { DeveloperModuleDef, ModuleRouteDef } from './developer-module-registry';
import { DEVELOPER_MODULE_REGISTRY } from './developer-module-registry';
import {
  resolveDeveloperGatewayBaseUrl,
  resolveModuleGatewayBaseUrl,
  resolvePublicApiBaseUrl,
} from './developer-public-url';

function pathToOpenApi(path: string): string {
  return path.replace(/\{([^}]+)\}/g, '{$1}');
}

function routeToOperation(route: ModuleRouteDef, gatewayBase: string) {
  const parameters: object[] = [];

  const pathParams = route.upstreamPath.match(/\{([^}]+)\}/g) ?? [];
  for (const p of pathParams) {
    const name = p.slice(1, -1);
    parameters.push({
      name,
      in: 'path',
      required: true,
      schema: { type: 'string' },
    });
  }

  for (const q of route.queryParams ?? []) {
    parameters.push({
      name: q.name,
      in: 'query',
      required: q.required,
      description: q.description,
      schema: { type: q.type === 'integer' ? 'integer' : 'string' },
    });
  }

  const operation: Record<string, unknown> = {
    operationId: route.id,
    summary: route.summary,
    description: route.description,
    tags: route.tags ?? [],
    'x-permission': route.permission,
    'x-auth-mode': route.authMode,
    parameters,
    responses: {
      '200': {
        description: 'Success',
        content: route.responseExample
          ? { 'application/json': { example: route.responseExample } }
          : { 'application/json': { schema: { type: 'object' } } },
      },
      '401': { description: 'Unauthorized' },
      '403': { description: 'Insufficient permissions' },
      '502': { description: 'Upstream module unreachable' },
    },
  };

  if (route.requestBody) {
    operation.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: { type: 'object' },
          example: route.requestBody,
        },
      },
    };
  }

  if (route.authMode === 'none') {
    operation.security = [];
  } else {
    operation.security = [{ bearerAuth: [] }, { oauth2: [] }];
  }

  return operation;
}

export function generateModuleOpenApiSpec(mod: DeveloperModuleDef, gatewayBaseUrl?: string) {
  const gatewayBase =
    gatewayBaseUrl ?? resolveModuleGatewayBaseUrl(mod.slug);

  const paths: Record<string, Record<string, unknown>> = {};

  for (const route of mod.routes) {
    const gatewayPath = `/gateway/${mod.slug}${route.upstreamPath}`;
    const oasPath = pathToOpenApi(gatewayPath);
    if (!paths[oasPath]) paths[oasPath] = {};
    paths[oasPath][route.method.toLowerCase()] = routeToOperation(route, gatewayBase);
  }

  return {
    openapi: '3.1.0',
    info: {
      title: `ShulePlus ${mod.name} API`,
      description: mod.description,
      version: '1.0.0',
      contact: { name: 'ShulePlus Developer Portal', url: 'https://shuleplus.rw' },
    },
    servers: [
      {
        url: gatewayBaseUrl ?? resolveModuleGatewayBaseUrl(mod.slug),
        description: 'Developer Gateway (sandbox)',
      },
      {
        url: mod.resolveUpstreamBase(),
        description: 'Direct module upstream (internal)',
      },
    ],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Developer portal session or OAuth access token',
        },
        oauth2: {
          type: 'oauth2',
          flows: {
            clientCredentials: {
              tokenUrl: `${resolvePublicApiBaseUrl()}/developers/oauth/token`,
              scopes: {},
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [...new Set(mod.routes.flatMap((r) => r.tags ?? []))].map((t) => ({ name: t })),
  };
}

export function generateAllOpenApiSpecs(gatewayBaseUrl?: string) {
  const specs: Record<string, ReturnType<typeof generateModuleOpenApiSpec>> = {};
  for (const mod of DEVELOPER_MODULE_REGISTRY) {
    specs[mod.slug] = generateModuleOpenApiSpec(mod, gatewayBaseUrl);
  }
  return specs;
}

export function generateAggregatedOpenApiSpec(gatewayBaseUrl?: string) {
  const merged: {
    openapi: string;
    info: object;
    servers: object[];
    paths: Record<string, Record<string, unknown>>;
    components: object;
    security: object[];
    tags: { name: string }[];
  } = {
    openapi: '3.1.0',
    info: {
      title: 'ShulePlus Developer API',
      description: 'Aggregated sandbox API across ShulePlus microservices.',
      version: '1.0.0',
    },
    servers: [
      {
        url: gatewayBaseUrl ?? resolveDeveloperGatewayBaseUrl(),
        description: 'Developer Gateway',
      },
    ],
    paths: {},
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        oauth2: {
          type: 'oauth2',
          flows: {
            clientCredentials: {
              tokenUrl: `${resolvePublicApiBaseUrl()}/developers/oauth/token`,
              scopes: {},
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [],
  };

  const tagSet = new Set<string>();
  for (const mod of DEVELOPER_MODULE_REGISTRY) {
    const spec = generateModuleOpenApiSpec(mod, gatewayBaseUrl);
    Object.assign(merged.paths, spec.paths);
    for (const t of spec.tags ?? []) tagSet.add(t.name);
  }
  merged.tags = [...tagSet].map((name) => ({ name }));

  return merged;
}
