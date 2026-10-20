import {
  filterCatalogByPermissions,
  SM_API_BASE_PATH,
  SM_DEVELOPER_API_GROUPS,
  type DeveloperEndpointDef,
} from './developer-api-catalog';

function pathToOpenApi(path: string): string {
  return path.replace(/\{(\w+)\}/g, '{$1}');
}

function endpointToOperation(ep: DeveloperEndpointDef) {
  const parameters = [
    ...(ep.pathParams?.map((p) => ({
      name: p.name,
      in: 'path' as const,
      required: p.required,
      schema: { type: p.type },
      description: p.description,
    })) ?? []),
    ...(ep.queryParams?.map((p) => ({
      name: p.name,
      in: 'query' as const,
      required: p.required,
      schema: { type: p.type },
      description: p.description,
    })) ?? []),
  ];

  return {
    summary: ep.summary,
    description: `${ep.description}\n\n**Required scope:** \`${ep.permission}\``,
    tags: ep.tags ?? [],
    security: ep.authMode === 'oauth' ? [{ bearerAuth: [] }] : [],
    ...(parameters.length ? { parameters } : {}),
    ...(ep.requestBody
      ? {
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' }, example: ep.requestBody } },
          },
        }
      : {}),
    responses: {
      '200': ep.responseExample
        ? { description: 'Success', content: { 'application/json': { example: ep.responseExample } } }
        : { description: 'Success' },
      '401': { description: 'Unauthorized' },
      '403': { description: 'Forbidden — missing scope' },
      '404': { description: 'Not Found' },
      '429': { description: 'Rate limit exceeded' },
      '500': { description: 'Internal Server Error' },
    },
  };
}

export function generateStudentManagementOpenApi(input: {
  baseUrl: string;
  allowedModules: Record<string, Record<string, boolean>>;
}) {
  const groups = filterCatalogByPermissions(input.allowedModules);
  const paths: Record<string, Record<string, unknown>> = {};

  for (const group of groups) {
    for (const ep of group.endpoints) {
      const fullPath = `${SM_API_BASE_PATH}${pathToOpenApi(ep.path)}`;
      if (!paths[fullPath]) paths[fullPath] = {};
      paths[fullPath][ep.method.toLowerCase()] = endpointToOperation(ep);
    }
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'StudentManagement API',
      version: '1.0.0',
      description:
        'Manage students, parents, classes, and enrollment through the ShulePlus API. OAuth 2.0 client credentials for API calls; Developer Portal session for this documentation.',
    },
    servers: [{ url: input.baseUrl, description: 'StudentManagement API' }],
    tags: SM_DEVELOPER_API_GROUPS.filter((g) => g.endpoints.length > 0).map((g) => ({
      name: g.label,
      description: g.description,
    })),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'OAuth 2.0 access token from ShulePlus Developer Portal (client credentials grant)',
        },
      },
    },
    paths,
  };
}

export function generatePostmanFromCatalog(input: {
  baseUrl: string;
  allowedModules: Record<string, Record<string, boolean>>;
  organizationId?: string;
}) {
  const groups = filterCatalogByPermissions(input.allowedModules);
  const items = groups
    .filter((g) => g.endpoints.length > 0)
    .map((group) => ({
      name: group.label,
      item: group.endpoints.map((ep) => {
        const pathParts = ep.path.split('/').filter(Boolean);
        return {
          name: ep.summary,
          request: {
            method: ep.method,
            header: [
              { key: 'Accept', value: 'application/json' },
              { key: 'Content-Type', value: 'application/json' },
              ...(ep.authMode === 'oauth' ? [{ key: 'Authorization', value: 'Bearer {{access_token}}' }] : []),
            ],
            url: {
              raw: `{{base_url}}${SM_API_BASE_PATH}${ep.path}`,
              host: ['{{base_url}}'],
              path: [SM_API_BASE_PATH.replace(/^\//, ''), ...pathParts],
            },
            description: `${ep.description}\n\nScope: ${ep.permission}`,
            ...(ep.requestBody && ep.method !== 'GET'
              ? { body: { mode: 'raw', raw: JSON.stringify(ep.requestBody, null, 2) } }
              : {}),
          },
        };
      }),
    }));

  return {
    info: {
      name: 'StudentManagement API',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'base_url', value: input.baseUrl },
      { key: 'access_token', value: '' },
      { key: 'client_id', value: '' },
      { key: 'organization_id', value: input.organizationId ?? '' },
    ],
    item: items,
  };
}
