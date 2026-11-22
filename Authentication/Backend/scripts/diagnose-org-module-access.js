/**
 * Diagnose why an organization cannot open its modules (Academic, HR, …).
 *
 * Prints, per ACTIVE assignment: status, tenantProvisioned, provisionLastError,
 * resolved backend URL, health check result, and key/JWT drift vs IAM.
 *
 * Usage (from Authentication/Backend):
 *   node scripts/diagnose-org-module-access.js <org-slug|org-code|org-id|name>
 *   node scripts/diagnose-org-module-access.js <org> --slug=academic
 *   node scripts/diagnose-org-module-access.js <org> --fix   # create missing tenants
 */
require('dotenv').config();
const { PrismaClient, ModuleAssignmentStatus } = require('../src/generated/prisma');
const fs = require('node:fs');
const path = require('node:path');

const prisma = new PrismaClient();

/** Keep in sync with src/config/local-module-urls.ts */
const LOOPBACK = {
  academic: 'http://127.0.0.1:4002',
  'academic-1': 'http://127.0.0.1:4002',
  'student-management': 'http://127.0.0.1:4024',
  'teacher-portal': 'http://127.0.0.1:4003',
  'school-fees': 'http://127.0.0.1:4004',
  fees: 'http://127.0.0.1:4004',
  finance: 'http://127.0.0.1:4004',
  'school-budget': 'http://127.0.0.1:4005',
  payroll: 'http://127.0.0.1:4006',
  hr: 'http://127.0.0.1:4007',
  attendance: 'http://127.0.0.1:4008',
  'action-plan': 'http://127.0.0.1:4009',
  'procurement-mis': 'http://127.0.0.1:4010',
  inventory: 'http://127.0.0.1:4011',
  'inventory-mis': 'http://127.0.0.1:4011',
  'school-uniform': 'http://127.0.0.1:4023',
  'assets-portal': 'http://127.0.0.1:4012',
  cafeteria: 'http://127.0.0.1:4013',
  timetable: 'http://127.0.0.1:4014',
  'parent-mis': 'http://127.0.0.1:4015',
  nesa: 'http://127.0.0.1:4016',
  babyeyi: 'http://127.0.0.1:4017',
  circulars: 'http://127.0.0.1:4017',
  kaziavance: 'http://127.0.0.1:4018',
  'student-discipline': 'http://127.0.0.1:4019',
  'sample-module': 'http://127.0.0.1:4020',
  'shulekit-mis': 'http://127.0.0.1:4021',
  schoolmaterial: 'http://127.0.0.1:4021',
  'task-module': 'http://127.0.0.1:4022',
  library: 'http://127.0.0.1:4025',
  transport: 'http://127.0.0.1:4034/api',
  'print-card': 'http://127.0.0.1:4028',
  shulechat: 'http://127.0.0.1:4029/api',
  chat: 'http://127.0.0.1:4029/api',
  'sector-mis': 'http://127.0.0.1:4032',
  'deo-mis': 'http://127.0.0.1:4030',
  'curriculum-intelligence': 'http://127.0.0.1:4031',
  'shule-trip': 'http://127.0.0.1:4033/api',
};

function resolveBackend(slug, catalogUrl) {
  const useLoopback =
    process.env.MODULE_PROVISION_USE_LOOPBACK !== 'false' &&
    LOOPBACK[slug];
  return useLoopback || catalogUrl || null;
}

function tenantCreateUrl(backendUrl) {
  const base = String(backendUrl).replace(/\/$/, '');
  return base.endsWith('/api') ? `${base}/tenant/create` : `${base}/api/tenant/create`;
}

function healthUrl(backendUrl) {
  const base = String(backendUrl).replace(/\/$/, '');
  return base.endsWith('/api') ? `${base}/health` : `${base}/api/health`;
}

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function keyDrift(moduleDir, iamEnv) {
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const envPath = path.join(repoRoot, moduleDir, 'Backend', '.env');
  const modEnv = readEnv(envPath);
  const checks = [
    ['JWT_ACCESS_SECRET', modEnv.JWT_ACCESS_SECRET, iamEnv.JWT_ACCESS_SECRET],
    [
      'SERVICE_API_KEY',
      modEnv.SERVICE_API_KEY || modEnv.PLATFORM_SERVICE_KEY,
      iamEnv.MODULE_PROVISIONING_KEY || iamEnv.PLATFORM_SERVICE_KEY,
    ],
  ];
  return checks
    .filter(([, a, b]) => a && b && a !== b)
    .map(([key]) => `${path.basename(moduleDir)} ${key} differs from IAM`);
}

async function findOrganization(ref) {
  return prisma.organization.findFirst({
    where: {
      OR: [
        { id: ref },
        { slug: ref },
        { organizationCode: ref },
        { name: { contains: ref, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, slug: true, organizationCode: true },
  });
}

async function main() {
  const args = process.argv.slice(2);
  const ref = args.find((a) => !a.startsWith('--'));
  const fix = args.includes('--fix');
  const slugArg = args.find((a) => a.startsWith('--slug='));
  const onlySlug = slugArg ? slugArg.split('=')[1] : null;

  if (!ref) {
    console.error(
      'Usage: node scripts/diagnose-org-module-access.js <org-slug|code|id|name> [--slug=academic] [--fix]'
    );
    process.exit(1);
  }

  const org = await findOrganization(ref);
  if (!org) {
    console.error(`Organization not found: ${ref}`);
    process.exit(1);
  }

  const iamEnv = readEnv(path.join(__dirname, '..', '.env'));
  const serviceKey =
    process.env.MODULE_PROVISIONING_KEY ||
    process.env.PLATFORM_SERVICE_KEY ||
    iamEnv.MODULE_PROVISIONING_KEY ||
    iamEnv.PLATFORM_SERVICE_KEY;

  console.log(`\nOrganization: ${org.name} (${org.organizationCode ?? org.slug})`);
  console.log(`ID: ${org.id}`);
  console.log(`Service key configured: ${serviceKey ? 'yes' : 'NO'}`);

  const rows = await prisma.organizationModule.findMany({
    where: {
      organizationId: org.id,
      ...(onlySlug ? { module: { slug: onlySlug } } : {}),
    },
    include: { module: true },
    orderBy: { module: { slug: 'asc' } },
  });

  if (rows.length === 0) {
    console.log('\nNo module assignments found for this organization.');
    return;
  }

  const MODULE_DIR = {
    academic: 'Academic',
    'academic-1': 'Academic',
    hr: 'HR',
    payroll: 'Payroll',
    'school-fees': 'SchoolFeesPortal',
    fees: 'SchoolFeesPortal',
    finance: 'SchoolFeesPortal',
  };

  console.log('\nAssignments:');
  for (const row of rows) {
    const backend = resolveBackend(row.module.slug, row.module.backendUrl);
    const active = row.status === ModuleAssignmentStatus.ACTIVE;
    const drift = MODULE_DIR[row.module.slug]
      ? keyDrift(MODULE_DIR[row.module.slug], iamEnv)
      : [];

    console.log(`\n- ${row.module.slug} (${row.module.name})`);
    console.log(`  status=${row.status} tenantProvisioned=${row.tenantProvisioned}`);
    console.log(`  frontendUrl=${row.module.frontendUrl ?? '—'}`);
    console.log(`  backend=${backend ?? '— (no backend URL)'}`);
    if (row.provisionLastError) console.log(`  lastError=${row.provisionLastError}`);
    if (drift.length) console.log(`  DRIFT: ${drift.join('; ')}`);

    if (!backend) {
      console.log('  ACTION: set backendUrl in the module catalog.');
      continue;
    }

    try {
      const health = await fetch(healthUrl(backend), { signal: AbortSignal.timeout(5000) });
      console.log(`  health HTTP ${health.status}`);
    } catch (err) {
      console.log(`  health FAILED: ${err.message}`);
    }

    if (!active) continue;

    if (row.tenantProvisioned && !fix) {
      console.log('  tenant already provisioned (use --fix to force re-create)');
      continue;
    }

    if (!fix) {
      console.log('  ACTION: provision with --fix, or Super Admin → Provisioning.');
      continue;
    }

    try {
      const res = await fetch(tenantCreateUrl(backend), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': serviceKey || '',
          'x-source-service': 'IAM',
        },
        body: JSON.stringify({
          organizationId: org.id,
          organizationName: org.name,
          organizationCode: org.organizationCode ?? undefined,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const text = (await res.text()).slice(0, 300);
        console.log(`  provision FAILED: HTTP ${res.status} ${text}`);
        await prisma.organizationModule.update({
          where: { id: row.id },
          data: {
            provisionLastError: `HTTP ${res.status}: ${text}`,
            provisionAttempts: { increment: 1 },
          },
        });
        continue;
      }
      await prisma.organizationModule.update({
        where: { id: row.id },
        data: {
          tenantProvisioned: true,
          tenantProvisionedAt: new Date(),
          provisionLastError: null,
          provisionAttempts: { increment: 1 },
        },
      });
      console.log('  provision OK');
    } catch (err) {
      console.log(`  provision FAILED: ${err.message}`);
      await prisma.organizationModule.update({
        where: { id: row.id },
        data: {
          provisionLastError: err.message,
          provisionAttempts: { increment: 1 },
        },
      });
    }
  }

  console.log('\nDone. Org admin must sign out/in (or refresh the launcher) to get a fresh JWT module list.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
