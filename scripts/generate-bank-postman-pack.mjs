#!/usr/bin/env node
/**
 * Generate ShulePlus bank integration Postman collections + environment.
 * Run: node scripts/generate-bank-postman-pack.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'docs', 'postman', 'bank-integration');

const SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

const OAUTH_TEST = {
  listen: 'test',
  script: {
    type: 'text/javascript',
    exec: [
      'const json = pm.response.json();',
      'if (json && json.access_token) {',
      '  pm.environment.set("access_token", json.access_token);',
      '  pm.collectionVariables.set("access_token", json.access_token);',
      '  console.log("access_token saved");',
      '}',
      'if (json && json.data && json.data.accessToken) {',
      '  pm.environment.set("access_token", json.data.accessToken);',
      '  pm.collectionVariables.set("access_token", json.data.accessToken);',
      '}',
    ],
  },
};

function collection(name, description, items, variables = []) {
  return {
    info: {
      name,
      description,
      schema: SCHEMA,
    },
    variable: variables,
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{access_token}}', type: 'string' }],
    },
    item: items,
  };
}

function folder(name, description, items) {
  return { name, description, item: items };
}

function req(name, opts) {
  const {
    method = 'GET',
    url,
    description = '',
    body,
    headers = [],
    auth,
    events = [],
    query = [],
  } = opts;

  const defaultHeaders = [
    { key: 'Accept', value: 'application/json' },
    ...(body ? [{ key: 'Content-Type', value: 'application/json' }] : []),
    ...headers,
  ];

  if (!defaultHeaders.some((h) => h.key === 'Authorization') && auth !== 'none') {
    defaultHeaders.push({ key: 'Authorization', value: 'Bearer {{access_token}}' });
  }

  const item = {
    name,
    request: {
      method,
      header: defaultHeaders,
      url: typeof url === 'string' ? url : url,
      description,
    },
  };

  if (body) {
    item.request.body = { mode: 'raw', raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2) };
  }

  if (auth === 'none') {
    delete item.request.header;
    item.request.header = defaultHeaders.filter((h) => h.key !== 'Authorization');
  }

  if (events.length) item.event = events;

  return item;
}

/** Direct module backend URL (same paths as each microservice exposes). */
const MODULE_ENV_BASE = {
  'student-management': 'students_api_url',
  'school-fees': 'fees_api_url',
  'webpage-babyeyi': 'babyeyi_bff_url',
  'babyeyi-wizard': 'babyeyi_wizard_api_url',
  payroll: 'payroll_api_url',
  kaziavance: 'kazi_api_url',
  'ticha-portal': 'ticha_api_url',
};

function moduleUrl(baseVar, upstreamPath, query = []) {
  const clean = upstreamPath.startsWith('/') ? upstreamPath.slice(1) : upstreamPath;
  const segments = clean.split('/').filter(Boolean);
  const qs = query.length ? `?${query.map((q) => `${q.key}=${q.value}`).join('&')}` : '';
  return {
    raw: `{{${baseVar}}}/${segments.join('/')}${qs}`,
    host: [`{{${baseVar}}}`],
    path: segments,
    query: query.length ? query : undefined,
  };
}

function directModuleUrl(moduleSlug, upstreamPath, query = []) {
  const baseVar = MODULE_ENV_BASE[moduleSlug];
  if (!baseVar) throw new Error(`No env base for module: ${moduleSlug}`);
  return moduleUrl(baseVar, upstreamPath, query);
}

function savePaymentRefTest() {
  return {
    listen: 'test',
    script: {
      type: 'text/javascript',
      exec: [
        'const json = pm.response.json();',
        'const ref = json?.data?.reference ?? json?.reference;',
        'if (ref) { pm.environment.set("payment_reference", ref); console.log("payment_reference=" + ref); }',
      ],
    },
  };
}

function saveStudentTest() {
  return {
    listen: 'test',
    script: {
      type: 'text/javascript',
      exec: [
        'const json = pm.response.json();',
        'const d = json?.data ?? json;',
        'if (d?.id) pm.environment.set("student_id", d.id);',
        'if (d?.studentCode) pm.environment.set("student_code", d.studentCode);',
        'if (d?.organizationId) pm.environment.set("organization_id", d.organizationId);',
      ],
    },
  };
}

// ─── 0. IAM Auth ───────────────────────────────────────────────────────────────

const iamAuth = collection(
  'ShulePlus — 0. IAM Authentication',
  `# ShulePlus IAM — Authentication for Bank Integrations

Use this collection **first** to obtain tokens used by all other collections.

## Two authentication modes

| Mode | Use case | Token endpoint |
|------|----------|----------------|
| **OAuth client credentials** | Server-to-server (recommended for banks) | \`POST /developers/oauth/token\` |
| **Developer portal login** | Human testers with portal account | \`POST /developers/auth/login\` |

## Required variables (environment)
- \`iam_base_url\` — e.g. \`https://shuleplus.rw/api/v1\`
- \`organization_id\` — sandbox school UUID (provided by ShulePlus)
- \`client_id\` / \`client_secret\` — from Developer Portal → Applications
- \`developer_environment\` — \`SANDBOX\` or \`PRODUCTION\`

## Module API bases (direct backend)
| Variable | Service |
|----------|---------|
| \`students_api_url\` | Student Management |
| \`fees_api_url\` | School Fees Portal |
| \`babyeyi_bff_url\` | WebpageBabyeyi BFF (babyeyi.rw) |

OAuth is required for **school-authenticated** routes. **Public pay-fees** routes (\`/public/...\`) do not require a token.
`,
  [
    folder('Setup & Health', 'Verify IAM is reachable before authenticating.', [
      req('Health Check', {
        auth: 'none',
        url: '{{iam_base_url}}/health',
        description: 'Returns IAM service status. No authentication required.',
      }),
    ]),
    folder('OAuth — Bank Integration (recommended)', 'Client credentials flow for server-to-server API access.', [
      req('1. Get OAuth Access Token', {
        auth: 'none',
        method: 'POST',
        url: '{{iam_base_url}}/developers/oauth/token',
        description: '**Run first.** Exchanges client_id + client_secret for a Bearer token (15 min TTL).',
        body: {
          grant_type: 'client_credentials',
          client_id: '{{client_id}}',
          client_secret: '{{client_secret}}',
        },
        events: [OAUTH_TEST],
      }),
      req('2. Verify — Student Management Health', {
        auth: 'none',
        method: 'GET',
        url: directModuleUrl('student-management', '/health'),
        description: 'Confirms Student Management API is reachable.',
      }),
      req('3. Verify — School Fees Health', {
        auth: 'none',
        method: 'GET',
        url: directModuleUrl('school-fees', '/health'),
        description: 'Confirms School Fees Portal API is reachable.',
      }),
    ]),
    folder('Developer Portal Login (optional)', 'For human testers with a developer portal account.', [
      req('Login (email + password)', {
        auth: 'none',
        method: 'POST',
        url: '{{iam_base_url}}/developers/auth/login',
        body: { email: '{{developer_email}}', password: '{{developer_password}}' },
        description: 'If MFA is enabled, complete MFA verify before using the token.',
      }),
      req('Complete MFA', {
        auth: 'none',
        method: 'POST',
        url: '{{iam_base_url}}/developers/auth/mfa/verify',
        body: { mfaSessionToken: '{{mfa_session_token}}', code: '{{mfa_code}}' },
        events: [OAUTH_TEST],
      }),
      req('Refresh Token', {
        auth: 'none',
        method: 'POST',
        url: '{{iam_base_url}}/developers/auth/refresh',
        body: { refreshToken: '{{refresh_token}}' },
        events: [OAUTH_TEST],
      }),
    ]),
    folder('Organization Context', 'Sandbox school details for all API calls.', [
      req('Sandbox Organization Reference', {
        auth: 'none',
        method: 'GET',
        url: '{{iam_base_url}}/health',
        description: [
          'Your sandbox **organization_id** is provided by ShulePlus when your partner account is created.',
          '',
          'Default sandbox (ST THEO SCHOOL):',
          '- organization_id: `b4e8c3c3-b510-44e1-9f92-696c2a1506f3`',
          '- organization_code: `04001`',
          '',
          'Set `organization_id` in your Postman environment before running fee or student APIs.',
        ].join('\n'),
      }),
    ]),
  ],
  [
    { key: 'iam_base_url', value: 'https://shuleplus.rw/api/v1' },
    { key: 'organization_id', value: 'b4e8c3c3-b510-44e1-9f92-696c2a1506f3' },
    { key: 'developer_environment', value: 'SANDBOX' },
  ]
);

// ─── 1. End-to-end pay fees (gateway) ────────────────────────────────────────

const e2eFlow = collection(
  'ShulePlus — 1. End-to-End Pay Fees Flow',
  `# End-to-End School Fees Payment (Direct Module APIs)

Complete parent payment journey — same backend routes as ShulePlus landing / babyeyi.rw.

## Prerequisites
1. Import environment variables (\`students_api_url\`, \`fees_api_url\`, \`organization_id\`)
2. Set \`student_code\`, \`academic_year\`, \`term\`

## Flow
1. Lookup student → 2. Load fees → 3. Initiate payment → 4. Poll status → 5. Get receipt

## Base URLs
- Student lookup: \`{{students_api_url}}/public/students/lookup\`
- Fees & payments: \`{{fees_api_url}}/public/...\`

> **Note:** Use \`method\` (MOMO | CARD | BANK), not \`channel\`, when initiating payments. Public routes need **no Bearer token**.
`,
  [
    folder('Step 1 — Student Lookup', 'Find the student before loading fees.', [
      req('1.1 Lookup Student (Student Management)', {
        auth: 'none',
        method: 'GET',
        url: directModuleUrl('student-management', '/public/students/lookup', [
          { key: 'code', value: '{{student_code}}' },
        ]),
        description: 'Public lookup by ShuleCode / SDMS code. Returns student id, name, class, organizationId.',
        events: [saveStudentTest()],
      }),
    ]),
    folder('Step 2 — Load Fees', 'Resolve fee structure and outstanding balance.', [
      req('2.1 Get Student Fees (School Fees Portal)', {
        auth: 'none',
        method: 'GET',
        url: directModuleUrl('school-fees', '/public/student-fees', [
          { key: 'organizationId', value: '{{organization_id}}' },
          { key: 'studentCode', value: '{{student_code}}' },
          { key: 'academicYear', value: '{{academic_year}}' },
          { key: 'term', value: '{{term}}' },
          { key: 'autoBill', value: '1' },
        ]),
        description: 'Returns fee lines, total, paid, remaining. Creates bill if autoBill=1.',
      }),
      req('2.2 Fallback — Babyeyi Circular (optional)', {
        auth: 'none',
        method: 'GET',
        url: directModuleUrl('babyeyi-wizard', '/public/circulars', [
          { key: 'organizationId', value: '{{organization_id}}' },
          { key: 'academicYear', value: '{{academic_year}}' },
          { key: 'term', value: '{{term}}' },
        ]),
        description: 'Used when no active fee structure exists — returns Babyeyi document fee lines.',
      }),
    ]),
    folder('Step 3 — Initiate Payment', 'Start MoMo, card, or bank payment.', [
      req('3.1 Initiate MoMo Payment', {
        auth: 'none',
        method: 'POST',
        url: directModuleUrl('school-fees', '/public/payments/initiate'),
        description:
          'Creates PENDING payment. Send Idempotency-Key; same key+body replays 201, different body → 409.',
        headers: [{ key: 'Idempotency-Key', value: '{{$guid}}' }],
        body: {
          organizationId: '{{organization_id}}',
          studentCode: '{{student_code}}',
          studentName: 'Test Student',
          academicYear: '{{academic_year}}',
          term: '{{term}}',
          amount: 5000,
          method: 'MOMO',
          phone: '0788123456',
          provider: 'MTN',
        },
        events: [savePaymentRefTest()],
      }),
      req('3.2 Initiate Bank Transfer Payment', {
        auth: 'none',
        method: 'POST',
        url: directModuleUrl('school-fees', '/public/payments/initiate'),
        headers: [{ key: 'Idempotency-Key', value: '{{$guid}}' }],
        body: {
          organizationId: '{{organization_id}}',
          studentCode: '{{student_code}}',
          academicYear: '{{academic_year}}',
          term: '{{term}}',
          amount: 5000,
          method: 'BANK',
          bankName: 'Bank of Kigali (BK)',
          accountNumber: '0001234567890',
          accountHolder: 'Jean Parent',
        },
        events: [savePaymentRefTest()],
      }),
    ]),
    folder('Step 4 — Confirm & Receipt', 'Poll until COMPLETED, then fetch receipt.', [
      req('4.1 Payment Status', {
        auth: 'none',
        method: 'GET',
        url: directModuleUrl('school-fees', '/public/payments/{{payment_reference}}/status'),
        description: 'Poll until status is COMPLETED. In sandbox, may auto-confirm after demo timeout.',
      }),
      req('4.2 Get Receipt', {
        auth: 'none',
        method: 'GET',
        url: directModuleUrl('school-fees', '/public/receipts/{{receipt_number}}'),
        description: 'Public receipt verification by receipt number from status response.',
      }),
    ]),
  ],
  [
    { key: 'student_code', value: '04001042426' },
    { key: 'academic_year', value: '2025-2026' },
    { key: 'term', value: 'Term 1' },
    { key: 'payment_reference', value: '' },
    { key: 'receipt_number', value: '' },
  ]
);

// ─── 2. Student Management ───────────────────────────────────────────────────

const studentMgmt = collection(
  'ShulePlus — 2. Student Management API',
  `# Student Management API

Direct **Student Management** backend API (\`{{students_api_url}}\`).

## Public vs authenticated
- **Public lookup** — no token (\`/public/students/lookup\`)
- **Students / classes / parents** — school session JWT (org admin / service); coordinate with ShulePlus for production auth

Base: \`{{students_api_url}}\`
`,
  [
    folder('Public — Student Lookup', 'No org header needed; code embeds school prefix.', [
      req('Lookup Student by Code', {
        auth: 'none',
        method: 'GET',
        url: directModuleUrl('student-management', '/public/students/lookup', [
          { key: 'code', value: '{{student_code}}' },
        ]),
        events: [saveStudentTest()],
      }),
    ]),
    folder('Students — Authenticated', 'Requires school IAM Bearer token + tenant context.', [
      req('List Students', {
        method: 'GET',
        url: directModuleUrl('student-management', '/students', [
          { key: 'academicYear', value: '{{academic_year}}' },
          { key: 'page', value: '1' },
          { key: 'limit', value: '20' },
        ]),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Get Student by ID', {
        method: 'GET',
        url: directModuleUrl('student-management', '/students/{{student_id}}'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Create Student', {
        method: 'POST',
        url: directModuleUrl('student-management', '/students'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        body: {
          firstName: 'Test',
          lastName: 'Student',
          gender: 'MALE',
          dateOfBirth: '2015-03-12',
          classId: '{{class_id}}',
        },
      }),
    ]),
    folder('Classes & Parents', 'Supporting endpoints for enrollment context.', [
      req('List Classes', {
        method: 'GET',
        url: directModuleUrl('student-management', '/classes'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('List Parents', {
        method: 'GET',
        url: directModuleUrl('student-management', '/parents'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
    ]),
  ]
);

// ─── 3. WebpageBabyeyi BFF ─────────────────────────────────────────────────

const webpageBabyeyi = collection(
  'ShulePlus — 3. WebpageBabyeyi (Public BFF)',
  `# WebpageBabyeyi — babyeyi.rw Backend-for-Frontend

Public parent-facing **Backend-for-Frontend** used by **babyeyi.rw**.

## Base URL
\`{{babyeyi_bff_url}}\` (e.g. \`https://babyeyi-api.shuleplus.rw/api\`)

Proxies to Student Management, School Fees Portal, and Babyeyi Wizard — same paths as the public website.

## Pay fees via BFF
lookup → fees → pay → status → receipt (public; no OAuth required).
`,
  [
    folder('Health & Directory', 'BFF status and school directory.', [
      req('BFF Health', {
        method: 'GET',
        url: directModuleUrl('webpage-babyeyi', '/health'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        auth: 'none',
      }),
      req('School Directory', {
        method: 'GET',
        url: directModuleUrl('webpage-babyeyi', '/school-registrations'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
    ]),
    folder('Student Lookup', 'BFF wrapper for student search.', [
      req('Student Lookup (GET)', {
        method: 'GET',
        url: directModuleUrl('webpage-babyeyi', '/students/lookup', [
          { key: 'code', value: '{{student_code}}' },
        ]),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        events: [saveStudentTest()],
      }),
      req('Babyeyi Lookup (POST)', {
        method: 'POST',
        url: directModuleUrl('webpage-babyeyi', '/babyeyi/lookup'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        body: { code: '{{student_code}}' },
        events: [saveStudentTest()],
      }),
    ]),
    folder('Pay Fees (BFF)', 'Full public payment flow through babyeyi.rw BFF.', [
      req('Get Student Fees', {
        method: 'GET',
        url: directModuleUrl('webpage-babyeyi', '/fees/student-fees', [
          { key: 'organizationId', value: '{{organization_id}}' },
          { key: 'studentCode', value: '{{student_code}}' },
          { key: 'academicYear', value: '{{academic_year}}' },
          { key: 'term', value: '{{term}}' },
        ]),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Initiate Payment', {
        method: 'POST',
        url: directModuleUrl('webpage-babyeyi', '/fees/payments/initiate'),
        headers: [
          { key: 'x-developer-environment', value: '{{developer_environment}}' },
          { key: 'Idempotency-Key', value: '{{$guid}}' },
        ],
        body: {
          organizationId: '{{organization_id}}',
          studentCode: '{{student_code}}',
          academicYear: '{{academic_year}}',
          term: '{{term}}',
          amount: 5000,
          method: 'MOMO',
          phone: '0788123456',
        },
        events: [savePaymentRefTest()],
      }),
      req('Payment Status', {
        method: 'GET',
        url: directModuleUrl('webpage-babyeyi', '/fees/payments/{{payment_reference}}/status'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Get Receipt', {
        method: 'GET',
        url: directModuleUrl('webpage-babyeyi', '/fees/receipts/{{receipt_number}}'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
    ]),
    folder('Babyeyi Circulars', 'Fee document fallback when no structure exists.', [
      req('Circular Options (years/terms)', {
        method: 'GET',
        url: directModuleUrl('webpage-babyeyi', '/circulars/options', [
          { key: 'organizationId', value: '{{organization_id}}' },
        ]),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Get Circular', {
        method: 'GET',
        url: directModuleUrl('webpage-babyeyi', '/circulars', [
          { key: 'organizationId', value: '{{organization_id}}' },
          { key: 'academicYear', value: '{{academic_year}}' },
          { key: 'term', value: '{{term}}' },
        ]),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
    ]),
  ]
);

// ─── 4. School Fees Portal ─────────────────────────────────────────────────

const schoolFees = collection(
  'ShulePlus — 4. School Fees Portal API',
  `# School Fees Portal — Collections, Structures & Payments

Core financial module for schools. Used by school bursars and bank integrations.

## Scopes
| Scope | Purpose |
|-------|---------|
| \`fees.read\` | Structures, bills, dashboard, collection lookup |
| \`fees.write\` | Create/update fee structures |
| \`payment.create\` | Record payments, initiate public pay |
| \`payment.read\` | Status, receipts |

Direct API base: \`{{fees_api_url}}\` (e.g. \`https://fees.shuleplus.rw/api\`)
`,
  [
    folder('Public — Parent Payments', 'Unauthenticated parent payment APIs.', [
      req('Get Student Fees', {
        auth: 'none',
        method: 'GET',
        url: directModuleUrl('school-fees', '/public/student-fees', [
          { key: 'organizationId', value: '{{organization_id}}' },
          { key: 'studentCode', value: '{{student_code}}' },
          { key: 'academicYear', value: '{{academic_year}}' },
          { key: 'term', value: '{{term}}' },
        ]),
      }),
      req('Initiate Public Payment', {
        auth: 'none',
        method: 'POST',
        url: directModuleUrl('school-fees', '/public/payments/initiate'),
        headers: [
          { key: 'x-developer-environment', value: '{{developer_environment}}' },
          { key: 'Idempotency-Key', value: '{{$guid}}' },
        ],
        body: {
          studentCode: '{{student_code}}',
          amount: 5000,
          method: 'MOMO',
          phone: '0788123456',
          academicYear: '{{academic_year}}',
          term: '{{term}}',
        },
        events: [savePaymentRefTest()],
      }),
      req('Payment Status', {
        method: 'GET',
        url: directModuleUrl('school-fees', '/public/payments/{{payment_reference}}/status'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Verify Receipt', {
        method: 'GET',
        url: directModuleUrl('school-fees', '/public/receipts/{{receipt_number}}'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
    ]),
    folder('Fee Structures', 'Create and manage term fee structures.', [
      req('List Fee Structures', {
        method: 'GET',
        url: directModuleUrl('school-fees', '/structures'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Get Fee Structure by ID', {
        method: 'GET',
        url: directModuleUrl('school-fees', '/structures/{{structure_id}}'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Academic Context (years/terms)', {
        method: 'GET',
        url: directModuleUrl('school-fees', '/structures/academic-context'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Create Fee Structure', {
        method: 'POST',
        url: directModuleUrl('school-fees', '/structures'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        description: 'Requires fees.write scope. Creates active structure with line items.',
        body: {
          name: 'Term 1 Fees 2025-2026',
          code: 'FS-2025-T1',
          academicYear: '{{academic_year}}',
          term: '{{term}}',
          className: 'P5 A',
          status: 'ACTIVE',
          items: [
            { name: 'Tuition', amount: 150000, itemType: 'MANDATORY', paymentType: 'SCHOOL_ACCOUNT' },
            { name: 'Activity Fee', amount: 10000, itemType: 'MANDATORY', paymentType: 'SCHOOL_ACCOUNT' },
          ],
        },
      }),
      req('Import Babyeyi Items', {
        method: 'GET',
        url: directModuleUrl('school-fees', '/structures/babyeyi-items', [
          { key: 'academicYear', value: '{{academic_year}}' },
          { key: 'term', value: '{{term}}' },
        ]),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
    ]),
    folder('Fee Collection (School Bursar)', 'In-school payment recording.', [
      req('Collection Overview', {
        method: 'GET',
        url: directModuleUrl('school-fees', '/collections/fee-collection'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Lookup Student for Collection', {
        method: 'GET',
        url: directModuleUrl('school-fees', '/collections/fee-collection/lookup', [
          { key: 'search', value: '{{student_code}}' },
        ]),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Student Fee Account', {
        method: 'GET',
        url: directModuleUrl('school-fees', '/collections/fee-collection/student-account', [
          { key: 'studentId', value: '{{student_id}}' },
        ]),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Record Collection Payment', {
        method: 'POST',
        url: directModuleUrl('school-fees', '/collections/fee-collection/payments'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        description: 'Staff-recorded cash/bank payment at school. Requires payment.create.',
        body: {
          studentId: '{{student_id}}',
          billId: '{{bill_id}}',
          amount: 50000,
          method: 'BANK_TRANSFER',
          reference: 'BK-TXN-20260308-001',
          payerName: 'Jean Parent',
          notes: 'Bank deposit — partner integration test',
        },
      }),
    ]),
    folder('Bills, Payments & Outstanding', 'Financial reporting endpoints.', [
      req('List Bills', {
        method: 'GET',
        url: directModuleUrl('school-fees', '/bills'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('List Payments', {
        method: 'GET',
        url: directModuleUrl('school-fees', '/payments'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Outstanding Balances', {
        method: 'GET',
        url: directModuleUrl('school-fees', '/outstanding'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Fees Dashboard', {
        method: 'GET',
        url: directModuleUrl('school-fees', '/dashboard'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
    ]),
  ]
);

// ─── 5. Payroll ────────────────────────────────────────────────────────────────

const payroll = collection(
  'ShulePlus — 5. Payroll API',
  `# Payroll Module

Staff payroll, runs, bank disbursement export, and KaziAvance deduction sync.

## Scopes
- \`payroll.read\` — dashboard, staff, runs, disbursement
- \`payroll.process\` — trigger runs, mark paid, apply deductions

## Gateway
\`{{iam_base_url}}/developers/gateway/payroll/...\`
`,
  [
    folder('Health & Dashboard', '', [
      req('Health Check', {
        method: 'GET',
        url: directModuleUrl('payroll', '/health'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Payroll Dashboard', {
        method: 'GET',
        url: directModuleUrl('payroll', '/dashboard'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Payroll Settings', {
        method: 'GET',
        url: directModuleUrl('payroll', '/settings'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
    ]),
    folder('Staff', '', [
      req('Staff Directory', {
        method: 'GET',
        url: directModuleUrl('payroll', '/staff/directory'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('List Staff', {
        method: 'GET',
        url: directModuleUrl('payroll', '/staff'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Get Staff by ID', {
        method: 'GET',
        url: directModuleUrl('payroll', '/staff/{{staff_id}}'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Advance Check for Staff', {
        method: 'GET',
        url: directModuleUrl('payroll', '/advance-check/{{staff_id}}'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        description: 'Active KaziAvance advances linked to payroll deductions.',
      }),
    ]),
    folder('Payroll Runs', '', [
      req('List Runs', {
        method: 'GET',
        url: directModuleUrl('payroll', '/runs'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Preview Run', {
        method: 'POST',
        url: directModuleUrl('payroll', '/runs/preview'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        body: { periodLabel: 'March 2026', payDate: '2026-03-31' },
      }),
      req('Trigger Run', {
        method: 'POST',
        url: directModuleUrl('payroll', '/runs/trigger'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        body: { periodLabel: 'March 2026', payDate: '2026-03-31' },
      }),
      req('Get Run Detail', {
        method: 'GET',
        url: directModuleUrl('payroll', '/runs/{{payroll_run_id}}'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Mark Run Paid', {
        method: 'PATCH',
        url: directModuleUrl('payroll', '/runs/{{payroll_run_id}}/mark-paid'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        description: 'Marks run paid and pushes advance deductions to KaziAvance.',
      }),
    ]),
    folder('Bank Disbursement', '', [
      req('Disbursement Rules', {
        method: 'GET',
        url: directModuleUrl('payroll', '/disbursement/rules'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Disbursement Payments (Bank Export)', {
        method: 'GET',
        url: directModuleUrl('payroll', '/disbursement/payments', [
          { key: 'runId', value: '{{payroll_run_id}}' },
        ]),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        description: 'Returns payment rows grouped by bank for export.',
      }),
      req('Apply Scheduled Deductions', {
        method: 'POST',
        url: directModuleUrl('payroll', '/disbursement/apply-deductions'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        body: { runId: '{{payroll_run_id}}' },
      }),
      req('Disbursement Audit', {
        method: 'GET',
        url: directModuleUrl('payroll', '/disbursement/audit', [
          { key: 'runId', value: '{{payroll_run_id}}' },
        ]),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
    ]),
  ],
  [{ key: 'staff_id', value: '' }, { key: 'payroll_run_id', value: '' }]
);

// ─── 6. TichaAvance Teacher (TichaPortal BFF) ────────────────────────────────

const tichaAvance = collection(
  'ShulePlus — 6. TichaAvance Teacher (TichaPortal)',
  `# TichaAvance — Teacher Flow (TichaPortal BFF)

Same paths used by **ticha.shuleplus.rw** — proxied to KaziAvance.

## Scopes
- \`ticha.read\` — dashboard, catalog, history
- \`ticha.write\` — submit advance requests

## Flow
1. Dashboard → 2. Catalog → 3. Calculator → 4. Submit request → 5. Track workflow
`,
  [
    folder('Teacher Dashboard', '', [
      req('BFF Health', {
        method: 'GET',
        url: directModuleUrl('ticha-portal', '/api/health'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Teacher Dashboard (Kazi)', {
        method: 'GET',
        url: directModuleUrl('ticha-portal', '/kazi/api/employee/dashboard'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Salary History', {
        method: 'GET',
        url: directModuleUrl('ticha-portal', '/kazi/api/employee/salary-history'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Advance History', {
        method: 'GET',
        url: directModuleUrl('ticha-portal', '/kazi/api/employee/advance-history'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Approval Workflow Timeline', {
        method: 'GET',
        url: directModuleUrl('ticha-portal', '/kazi/api/employee/workflow'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('My Payslip (Payroll+HR)', {
        method: 'GET',
        url: directModuleUrl('ticha-portal', '/teacher-portal/staff/payroll/my'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
    ]),
    folder('Submit Advance Request', '', [
      req('Cashout Catalog', {
        method: 'GET',
        url: directModuleUrl('ticha-portal', '/kazi/api/advance/catalog'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Repayment Calculator', {
        method: 'POST',
        url: directModuleUrl('ticha-portal', '/kazi/api/advance/calculator'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        body: { desiredAmount: 500000, repaymentMonths: 6 },
      }),
      req('Submit Advance Request', {
        method: 'POST',
        url: directModuleUrl('ticha-portal', '/kazi/api/advance/requests'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        description: 'Multipart with signature in production. JSON body for API testing.',
        body: {
          amount: 500000,
          months: 6,
          purpose: 'Emergency',
          description: 'Partner API test',
        },
        events: [
          {
            listen: 'test',
            script: {
              type: 'text/javascript',
              exec: [
                'const json = pm.response.json();',
                'const id = json?.id || json?.data?.id;',
                'if (id) pm.environment.set("advance_request_id", id);',
              ],
            },
          },
        ],
      }),
      req('Cancel Pending Request', {
        method: 'DELETE',
        url: directModuleUrl('ticha-portal', '/kazi/api/advance/requests/{{advance_request_id}}'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
    ]),
  ],
  [{ key: 'advance_request_id', value: '' }]
);

// ─── 7. KaziAvance Approval (Org Admin) ──────────────────────────────────────

const kaziApproval = collection(
  'ShulePlus — 7. KaziAvance Approval (Org Admin)',
  `# KaziAvance — Org Admin Approval Flow

Direct KaziAvance API for school finance / HR admins.

## Scopes
- \`kazi.read\` — list requests, employees, policies
- \`kazi.write\` — manage employees, policies
- \`kazi.approve\` — review, approve, reject, disburse

## Approval actions (PATCH /requests/:id)
\`{ "action": "review" | "approve" | "reject" | "disburse", "amount": 500000, "comment": "..." }\`
`,
  [
    folder('Dashboard & Employees', '', [
      req('Kazi Health', {
        method: 'GET',
        url: directModuleUrl('kaziavance', '/health'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Org Admin Dashboard', {
        method: 'GET',
        url: directModuleUrl('kaziavance', '/api/org-admin/dashboard'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('List Employees', {
        method: 'GET',
        url: directModuleUrl('kaziavance', '/api/org-admin/employees'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Sync Staff from Payroll', {
        method: 'POST',
        url: directModuleUrl('kaziavance', '/api/org-admin/employees/sync-payroll'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Advance Policies', {
        method: 'GET',
        url: directModuleUrl('kaziavance', '/api/org-admin/policies'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
    ]),
    folder(
      'Staff Setup for TichaAvance',
      'Search staff → set salary → enable advance (same as TichaPortal org admin).',
      [
        req('1. Sync Staff Directory (HR/Timetable/IAM)', {
          method: 'POST',
          url: directModuleUrl('kaziavance', '/api/org-admin/employees/sync-directory'),
          headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        }),
        req('2. Lookup Staff by Name / Code / ID', {
          method: 'GET',
          url: directModuleUrl('kaziavance', '/api/org-admin/employees/lookup', [
            { key: 'q', value: '{{staff_search}}' },
          ]),
          headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
          description: 'Also supports ?id=, ?employeeCode=, ?email=, ?iamUserId=, ?phone=',
          events: [
            {
              listen: 'test',
              script: {
                type: 'text/javascript',
                exec: [
                  'const json = pm.response.json();',
                  'const row = json?.data?.[0];',
                  'if (row?.id) pm.environment.set("employee_id", row.id);',
                ],
              },
            },
          ],
        }),
        req('3. Set Salary + Enable Advance (one step)', {
          method: 'POST',
          url: directModuleUrl('kaziavance', '/api/org-admin/employees/{{employee_id}}/advance-setup'),
          headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
          body: {
            grossSalary: 850000,
            netSalary: 720000,
            allowances: 50000,
            deductions: 180000,
            allowAdvance: true,
            eligibilityStatus: 'Eligible',
            maxSalaryPercent: 50,
            reason: 'Salary set via partner API for TichaAvance',
          },
        }),
        req('4. Or — Set Salary Only', {
          method: 'PATCH',
          url: directModuleUrl('kaziavance', '/api/org-admin/employees/{{employee_id}}/salary'),
          headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
          body: {
            grossSalary: 850000,
            netSalary: 720000,
            allowances: 50000,
            deductions: 180000,
            reason: 'Manual salary update',
          },
        }),
        req('5. Or — Enable Eligibility Only', {
          method: 'PATCH',
          url: directModuleUrl('kaziavance', '/api/org-admin/employees/{{employee_id}}/eligibility'),
          headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
          body: {
            allowAdvance: true,
            eligibilityStatus: 'Eligible',
            maxSalaryPercent: 50,
            maxActiveAdvances: 1,
            waitingPeriodDays: 0,
          },
        }),
        req('6. Pull Salary from Payroll Module', {
          method: 'POST',
          url: directModuleUrl('kaziavance', '/api/org-admin/employees/{{employee_id}}/fetch-payroll-salary'),
          headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        }),
      ]
    ),
    folder('Request Queue', '', [
      req('List Advance Requests', {
        method: 'GET',
        url: directModuleUrl('kaziavance', '/api/org-admin/requests'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Requests Workspace', {
        method: 'GET',
        url: directModuleUrl('kaziavance', '/api/org-admin/requests/workspace'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Get Request Detail', {
        method: 'GET',
        url: directModuleUrl('kaziavance', '/api/org-admin/requests/{{advance_request_id}}'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
    ]),
    folder('Approve / Reject / Disburse', 'Run in order for a pending request.', [
      req('1. Mark Under Review', {
        method: 'PATCH',
        url: directModuleUrl('kaziavance', '/api/org-admin/requests/{{advance_request_id}}'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        body: { action: 'review', comment: 'Reviewing documentation' },
      }),
      req('2. Approve Request', {
        method: 'PATCH',
        url: directModuleUrl('kaziavance', '/api/org-admin/requests/{{advance_request_id}}'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        body: { action: 'approve', amount: 500000, comment: 'Approved by finance' },
      }),
      req('3. Disburse Funds', {
        method: 'PATCH',
        url: directModuleUrl('kaziavance', '/api/org-admin/requests/{{advance_request_id}}'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        body: { action: 'disburse', comment: 'Disbursed to employee account' },
      }),
      req('Reject Request', {
        method: 'PATCH',
        url: directModuleUrl('kaziavance', '/api/org-admin/requests/{{advance_request_id}}'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
        body: { action: 'reject', comment: 'Insufficient eligibility' },
      }),
    ]),
    folder('Active Advances & Repayments', '', [
      req('Active Advances', {
        method: 'GET',
        url: directModuleUrl('kaziavance', '/api/org-admin/active-advances'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Repayments', {
        method: 'GET',
        url: directModuleUrl('kaziavance', '/api/org-admin/repayments'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
      req('Audit Logs', {
        method: 'GET',
        url: directModuleUrl('kaziavance', '/api/org-admin/audit-logs'),
        headers: [{ key: 'x-developer-environment', value: '{{developer_environment}}' }],
      }),
    ]),
  ]
);

// ─── Environment ─────────────────────────────────────────────────────────────

const environment = {
  id: 'shuleplus-bank-sandbox-env',
  name: 'ShulePlus — Bank Sandbox',
  values: [
    { key: 'iam_base_url', value: 'https://shuleplus.rw/api/v1', type: 'default', enabled: true },
    { key: 'babyeyi_bff_url', value: 'https://babyeyi-api.shuleplus.rw/api', type: 'default', enabled: true },
    { key: 'fees_api_url', value: 'https://fees.shuleplus.rw/api', type: 'default', enabled: true },
    { key: 'students_api_url', value: 'https://students-api.shuleplus.rw/api', type: 'default', enabled: true },
    { key: 'babyeyi_wizard_api_url', value: 'https://babyeyi-wizard-api.shuleplus.rw/api', type: 'default', enabled: true },
    { key: 'developer_environment', value: 'SANDBOX', type: 'default', enabled: true },
    { key: 'organization_id', value: 'b4e8c3c3-b510-44e1-9f92-696c2a1506f3', type: 'default', enabled: true },
    { key: 'organization_code', value: '04001', type: 'default', enabled: true },
    { key: 'organization_name', value: 'ST THEO SCHOOL', type: 'default', enabled: true },
    { key: 'client_id', value: '', type: 'secret', enabled: true },
    { key: 'client_secret', value: '', type: 'secret', enabled: true },
    { key: 'access_token', value: '', type: 'secret', enabled: true },
    { key: 'developer_email', value: '', type: 'default', enabled: true },
    { key: 'developer_password', value: '', type: 'secret', enabled: true },
    { key: 'student_code', value: '04001042426', type: 'default', enabled: true },
    { key: 'student_id', value: '', type: 'default', enabled: true },
    { key: 'academic_year', value: '2025-2026', type: 'default', enabled: true },
    { key: 'term', value: 'Term 1', type: 'default', enabled: true },
    { key: 'payment_reference', value: '', type: 'default', enabled: true },
    { key: 'receipt_number', value: '', type: 'default', enabled: true },
    { key: 'structure_id', value: '', type: 'default', enabled: true },
    { key: 'bill_id', value: '', type: 'default', enabled: true },
    { key: 'class_id', value: '', type: 'default', enabled: true },
    { key: 'payroll_api_url', value: 'https://payroll-api.shuleplus.rw/api', type: 'default', enabled: true },
    { key: 'kazi_api_url', value: 'https://kazi-api.shuleplus.rw', type: 'default', enabled: true },
    { key: 'ticha_api_url', value: 'https://ticha-api.shuleplus.rw/api', type: 'default', enabled: true },
    { key: 'staff_id', value: '', type: 'default', enabled: true },
    { key: 'payroll_run_id', value: '', type: 'default', enabled: true },
    { key: 'advance_request_id', value: '', type: 'default', enabled: true },
    { key: 'employee_id', value: '', type: 'default', enabled: true },
    { key: 'staff_search', value: '', type: 'default', enabled: true },
  ],
  _postman_variable_scope: 'environment',
};

// ─── Write files ─────────────────────────────────────────────────────────────

fs.mkdirSync(OUT, { recursive: true });

const files = [
  ['00-iam-authentication.postman_collection.json', iamAuth],
  ['01-end-to-end-pay-fees-flow.postman_collection.json', e2eFlow],
  ['02-student-management.postman_collection.json', studentMgmt],
  ['03-webpage-babyeyi-pay-fees.postman_collection.json', webpageBabyeyi],
  ['04-school-fees-portal.postman_collection.json', schoolFees],
  ['05-payroll.postman_collection.json', payroll],
  ['06-tichaavance-teacher.postman_collection.json', tichaAvance],
  ['07-kaziavance-approval.postman_collection.json', kaziApproval],
  ['ShulePlus-Bank-Sandbox.postman_environment.json', environment],
];

for (const [name, data] of files) {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  console.log('Wrote', p);
}

console.log('\nDone. Import all JSON files from docs/postman/bank-integration/ into Postman.');
