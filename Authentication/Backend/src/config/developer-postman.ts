import crypto from 'crypto';
import {
  resolveDeveloperGatewayBaseUrl,
  resolveModuleGatewayBaseUrl,
  resolvePublicApiBaseUrl,
} from '../config/developer-public-url';
import type { DeveloperModuleDef, ModuleRouteDef } from './developer-module-registry';
import { filterModulesByPermissions } from './developer-module-registry';

const MODULE_ORDER = [
  'authentication',
  'student-management',
  'school-fees',
  'babyeyi-wizard',
  'webpage-babyeyi',
];

const QUICK_START_ROUTE_IDS = [
  'iam-health',
  'iam-provinces',
  'sm-student.read-get-students',
  'sm-student.search-get-public-students-lookup',
];

interface PostmanEvent {
  listen: 'test' | 'prerequest';
  script: { type: 'text/javascript'; exec: string[] };
}

interface PostmanRequest {
  method: string;
  header: { key: string; value: string; description?: string }[];
  url: {
    raw: string;
    host: string[];
    path: string[];
    query?: { key: string; value: string; description?: string; disabled?: boolean }[];
    variable?: { key: string; value: string; description?: string }[];
  };
  body?: { mode: string; raw: string };
  description?: string;
}

interface PostmanItem {
  name: string;
  description?: string;
  item?: PostmanItem[];
  request?: PostmanRequest;
  event?: PostmanEvent[];
}

export interface PostmanCollection {
  info: { name: string; description: string; schema: string };
  item: PostmanItem[];
  variable: { key: string; value: string; type: string }[];
  auth?: { type: string; bearer: { key: string; value: string; type: string }[] };
  event?: PostmanEvent[];
}

function sandboxBaseUrl(): string {
  return resolvePublicApiBaseUrl();
}

function parseGatewayPath(upstreamPath: string): {
  segments: string[];
  variables: { key: string; value: string; description?: string }[];
} {
  const segments: string[] = [];
  const variables: { key: string; value: string; description?: string }[] = [];

  for (const part of upstreamPath.split('/').filter(Boolean)) {
    if (part.startsWith('{') && part.endsWith('}')) {
      const key = part.slice(1, -1);
      const envKey =
        key === 'id'
          ? 'sample_record_id'
          : key === 'provinceId'
            ? 'sample_province_id'
            : key === 'districtId'
              ? 'sample_district_id'
              : key === 'applicationNumber'
                ? 'sample_application_number'
                : key;
      segments.push(`:${key}`);
      variables.push({
        key,
        value: `{{${envKey}}}`,
        description: `Replace with a real ${key}`,
      });
    } else {
      segments.push(part);
    }
  }

  return { segments, variables };
}

function gatewayHeaders(): PostmanRequest['header'] {
  return [
    { key: 'Accept', value: 'application/json' },
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Authorization', value: 'Bearer {{access_token}}' },
    { key: 'x-developer-environment', value: '{{developer_environment}}', description: 'SANDBOX or PRODUCTION' },
  ];
}

function buildGatewayQuery(route: ModuleRouteDef): PostmanRequest['url']['query'] {
  const query: NonNullable<PostmanRequest['url']['query']> = [];

  if (route.authMode === 'service') {
    query.push({
      key: 'organizationId',
      value: '{{organization_id}}',
      description: 'Sandbox org (auto-filled by gateway if omitted)',
      disabled: true,
    });
  }

  if (route.method === 'GET' && route.upstreamPath === '/students') {
    query.push({
      key: 'academicYear',
      value: '{{academic_year}}',
      description: 'Same filter as Student Management UI (Manage Students page)',
    });
  }

  for (const q of route.queryParams ?? []) {
    query.push({
      key: q.name,
      value:
        q.name === 'organizationId'
          ? '{{organization_id}}'
          : q.name === 'code'
            ? '{{sample_student_code}}'
            : `{{${q.name}}}`,
      description: q.description,
    });
  }

  return query.length ? query : undefined;
}

function routeToPostmanItem(mod: DeveloperModuleDef, route: ModuleRouteDef): PostmanItem {
  const { segments, variables } = parseGatewayPath(route.upstreamPath);
  const path = ['developers', 'gateway', mod.slug, ...segments];
  const query = buildGatewayQuery(route);

  const rawQuery = query
    ? `?${query.filter((q) => !q.disabled).map((q) => `${q.key}=${encodeURIComponent(q.value)}`).join('&')}`
    : '';

  const item: PostmanItem = {
    name: `${route.method} ${route.summary}`,
    request: {
      method: route.method,
      header: gatewayHeaders(),
      url: {
        raw: `{{sandbox_base_url}}/${path.join('/')}${rawQuery}`,
        host: ['{{sandbox_base_url}}'],
        path,
        query,
        variable: variables.length ? variables : undefined,
      },
      description: [
        route.description,
        '',
        `- **Permission:** \`${route.permission}\``,
        `- **Auth mode:** ${route.authMode}`,
        `- **Gateway:** \`/developers/gateway/${mod.slug}${route.upstreamPath}\``,
        route.authMode === 'service'
          ? '- Uses your sandbox organization via gateway service auth.'
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    },
  };

  if (route.requestBody && route.method !== 'GET') {
    item.request!.body = {
      mode: 'raw',
      raw: JSON.stringify(
        {
          ...route.requestBody,
          ...(route.upstreamPath.includes('admissions') ? { organizationId: '{{organization_id}}' } : {}),
        },
        null,
        2
      ),
    };
  }

  return item;
}

const OAUTH_TOKEN_PREREQUEST_SCRIPT: PostmanEvent = {
  listen: 'prerequest',
  script: {
    type: 'text/javascript',
    exec: [
      'function readVar(key) {',
      '  const fromEnv = pm.environment.get(key);',
      '  if (fromEnv) return fromEnv;',
      '  return pm.collectionVariables.get(key);',
      '}',
      'const clientId = readVar("client_id");',
      'const clientSecret = readVar("client_secret");',
      'if (!clientId || !clientSecret) {',
      '  throw new Error(',
      '    "Missing client_id or client_secret. Re-download Postman from Developer Portal → My Sandbox, import BOTH json files, and select the ShulePlus Sandbox environment (top-right)."',
      '  );',
      '}',
    ],
  },
};

const OAUTH_TOKEN_TEST_SCRIPT: PostmanEvent = {
  listen: 'test',
  script: {
    type: 'text/javascript',
    exec: [
      'const json = pm.response.json();',
      'pm.test("OAuth token request succeeded", function () {',
      '  pm.response.to.have.status(200);',
      '});',
      'if (json && json.access_token) {',
      '  pm.environment.set("access_token", json.access_token);',
      '  pm.collectionVariables.set("access_token", json.access_token);',
      '  pm.test("Access token saved to environment", function () {',
      '    pm.expect(json.access_token).to.be.a("string").and.not.empty;',
      '  });',
      '  console.log("access_token saved (expires in " + (json.expires_in || 900) + "s)");',
      '} else {',
      '  pm.test("Response contains access_token", function () {',
      '    pm.expect.fail("No access_token in response — check client_id and client_secret");',
      '  });',
      '}',
    ],
  },
};

function oauthTokenRequest(): PostmanItem {
  return {
    name: '1. Get OAuth Token (run first)',
    event: [OAUTH_TOKEN_PREREQUEST_SCRIPT, OAUTH_TOKEN_TEST_SCRIPT],
    request: {
      method: 'POST',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      url: {
        raw: '{{sandbox_base_url}}/developers/oauth/token',
        host: ['{{sandbox_base_url}}'],
        path: ['developers', 'oauth', 'token'],
      },
      body: {
        mode: 'raw',
        raw: JSON.stringify(
          {
            grant_type: 'client_credentials',
            client_id: '{{client_id}}',
            client_secret: '{{client_secret}}',
          },
          null,
          2
        ),
      },
      description: [
        '**Run this request first** before any API call.',
        '',
        '1. Import the ShulePlus environment file',
        '2. Set `client_secret` in the environment (from Developer Portal → Applications, or the one-time secret shown at download)',
        '3. Send this request — the access token is saved automatically to `access_token`',
        '',
        'Token expires in 15 minutes. Re-run this request when you get 401 errors.',
      ].join('\n'),
    },
  };
}

function sortModules(modules: DeveloperModuleDef[]): DeveloperModuleDef[] {
  return [...modules].sort((a, b) => {
    const ai = MODULE_ORDER.indexOf(a.slug);
    const bi = MODULE_ORDER.indexOf(b.slug);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export function generatePostmanCollection(input: {
  allowedModules: Record<string, Record<string, boolean>>;
  partnerName?: string;
  organizationId?: string;
  clientId?: string;
  clientSecret?: string;
  sandboxBaseUrl?: string;
}) {
  const modules = sortModules(filterModulesByPermissions(input.allowedModules));
  const base = input.sandboxBaseUrl ?? sandboxBaseUrl();

  const allRoutes = modules.flatMap((mod) =>
    mod.routes.map((route) => ({ mod, route, item: routeToPostmanItem(mod, route) }))
  );

  const quickStartItems = QUICK_START_ROUTE_IDS.map((id) => {
    const found = allRoutes.find((r) => r.route.id === id);
    return found?.item;
  }).filter(Boolean) as PostmanItem[];

  const collection: PostmanCollection = {
    info: {
      name: `ShulePlus API — ${input.partnerName ?? 'Developer'}`,
      description: [
        '# ShulePlus Developer API',
        '',
        'Import **both** the collection and the environment file, then follow the Quick Start folder.',
        '',
        '## Setup',
        '1. Import **both** JSON files (collection + environment)',
        '2. Select **ShulePlus Sandbox** in the environment dropdown (top-right) — required',
        '3. Run **1. Get OAuth Token** — token is saved automatically',
        '4. Run **Student Management → GET List students**',
        '',
        'Credentials are embedded in the collection and environment from your portal download.',
        '',
        '## Variables',
        '| Variable | Purpose |',
        '|----------|---------|',
        '| `client_id` / `client_secret` | From Applications in the developer portal |',
        '| `organization_id` | ST THEO SCHOOL (shared sandbox — same Student Management DB as the UI) |',
        '| `access_token` | Auto-filled after OAuth (15 min TTL) |',
        '',
        'Gateway base: `{{sandbox_base_url}}/developers/gateway/{module-slug}{path}`',
      ].join('\n'),
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'sandbox_base_url', value: base, type: 'string' },
      { key: 'access_token', value: '', type: 'string' },
      { key: 'client_id', value: input.clientId ?? '', type: 'string' },
      { key: 'client_secret', value: input.clientSecret ?? '', type: 'string' },
      { key: 'organization_id', value: input.organizationId ?? '', type: 'string' },
      { key: 'academic_year', value: '2025-2026', type: 'string' },
      { key: 'developer_environment', value: 'SANDBOX', type: 'string' },
    ],
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{access_token}}', type: 'string' }],
    },
    item: [
      {
        name: '🚀 Quick Start',
        description: 'Run in order: OAuth → Health → your first API call.',
        item: [oauthTokenRequest(), ...quickStartItems],
      },
      {
        name: '🔑 OAuth',
        item: [oauthTokenRequest()],
      },
      ...modules.map((mod) => ({
        name: mod.name,
        description: mod.description,
        item: mod.routes.map((route) => routeToPostmanItem(mod, route)),
      })),
    ],
  };

  return collection;
}

export function generatePostmanEnvironment(input: {
  partnerName?: string;
  organizationId?: string;
  clientId?: string;
  clientSecret?: string;
  sandboxBaseUrl?: string;
}) {
  const baseUrl = input.sandboxBaseUrl ?? sandboxBaseUrl();

  return {
    id: crypto.randomUUID(),
    name: `ShulePlus Sandbox — ${input.partnerName ?? 'Developer'}`,
    values: [
      { key: 'sandbox_base_url', value: baseUrl, type: 'default', enabled: true },
      { key: 'access_token', value: '', type: 'secret', enabled: true },
      { key: 'client_id', value: input.clientId ?? '', type: 'default', enabled: true },
      {
        key: 'client_secret',
        value: input.clientSecret ?? '',
        type: 'secret',
        enabled: true,
      },
      { key: 'organization_id', value: input.organizationId ?? '', type: 'default', enabled: true },
      { key: 'academic_year', value: '2025-2026', type: 'default', enabled: true },
      { key: 'developer_environment', value: 'SANDBOX', type: 'default', enabled: true },
      { key: 'sample_student_code', value: 'SANDBOX-STU-001', type: 'default', enabled: true },
      { key: 'sample_record_id', value: '', type: 'default', enabled: true },
      { key: 'sample_province_id', value: '', type: 'default', enabled: true },
      { key: 'sample_district_id', value: '', type: 'default', enabled: true },
      { key: 'sample_application_number', value: '', type: 'default', enabled: true },
    ],
    _postman_variable_scope: 'environment',
  };
}

export function postmanSetupInstructions(input: {
  clientId?: string;
  clientSecret?: string;
  organizationId?: string;
  sandboxBaseUrl?: string;
  modulesCount: number;
  appAutoCreated?: boolean;
}) {
  const lines = [
    '## Postman setup',
    '',
    '1. Import **both** downloaded JSON files into Postman',
    '2. Select the **ShulePlus Sandbox** environment (top-right)',
    '3. Run **Quick Start → 1. Get OAuth Token**',
    '4. Run module requests — token is reused automatically',
    '',
    `**Gateway URL:** ${input.sandboxBaseUrl ?? sandboxBaseUrl()}`,
    `**Organization ID:** ${input.organizationId ?? '(provision sandbox first)'}`,
    `**Client ID:** ${input.clientId ?? '(create an application in the portal)'}`,
    `**Modules in collection:** ${input.modulesCount}`,
  ];

  if (input.clientSecret) {
    lines.push(
      '',
      '⚠ **client_secret** is embedded in the downloaded environment file. Re-import it in Postman if you had an older environment open.',
      '',
      'If OAuth still fails: Developer Portal → **Applications** → **Rotate secret**, then update `client_secret` in Postman.'
    );
  } else {
    lines.push('', 'Set `client_secret` from **Applications → your sandbox app** (shown once at creation).');
  }

  lines.push(
    '',
    '**Local dev:** IAM :3001, StudentManagement :3052 — both must be running.',
    '**JWT:** StudentManagement `JWT_ACCESS_SECRET` must match IAM backend.'
  );

  return lines.join('\n');
}
