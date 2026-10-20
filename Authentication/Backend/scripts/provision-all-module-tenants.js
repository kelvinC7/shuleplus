/**
 * Call each module POST /api/tenant/create for ACTIVE organization assignments,
 * then set OrganizationModule.tenantProvisioned = true on success.
 *
 * Usage (from Authentication/Backend):
 *   node scripts/provision-all-module-tenants.js
 *   node scripts/provision-all-module-tenants.js --slug=action-plan
 *   node scripts/provision-all-module-tenants.js --force
 */
const { PrismaClient, ModuleAssignmentStatus } = require('../src/generated/prisma');

const prisma = new PrismaClient();
const SERVICE_KEY =
  process.env.MODULE_PROVISIONING_KEY ||
  process.env.PLATFORM_SERVICE_KEY ||
  'dev-service-key';

function resolveTenantCreateUrl(backendUrl) {
  const base = String(backendUrl).replace(/\/$/, '');
  if (base.endsWith('/api')) return `${base}/tenant/create`;
  return `${base}/api/tenant/create`;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const slugArg = args.find((a) => a.startsWith('--slug='));
  const onlySlug = slugArg ? slugArg.split('=')[1] : null;

  const where = {
    status: ModuleAssignmentStatus.ACTIVE,
    ...(force ? {} : { tenantProvisioned: false }),
    ...(onlySlug ? { module: { slug: onlySlug } } : {}),
  };

  const rows = await prisma.organizationModule.findMany({
    where,
    include: {
      organization: true,
      module: true,
    },
    orderBy: { activatedAt: 'asc' },
  });

  console.log(
    `Provisioning ${rows.length} assignment(s)${onlySlug ? ` for slug=${onlySlug}` : ''}${force ? ' (force)' : ''}…`
  );

  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    const label = `${row.organization.slug} / ${row.module.slug}`;
    if (!row.module.backendUrl) {
      await prisma.organizationModule.update({
        where: { id: row.id },
        data: { tenantProvisioned: true, tenantProvisionedAt: new Date() },
      });
      console.log(`OK  ${label} (no backendUrl — flagged provisioned)`);
      ok += 1;
      continue;
    }

    if (row.tenantProvisioned && !force) {
      skipped += 1;
      continue;
    }

    const url = resolveTenantCreateUrl(row.module.backendUrl);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': SERVICE_KEY,
          'x-source-service': 'IAM',
        },
        body: JSON.stringify({
          organizationId: row.organization.id,
          organizationName: row.organization.name,
          organizationCode: row.organization.organizationCode ?? undefined,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`FAIL ${label} → HTTP ${response.status} ${text.slice(0, 200)}`);
        failed += 1;
        continue;
      }

      await prisma.organizationModule.update({
        where: { id: row.id },
        data: { tenantProvisioned: true, tenantProvisionedAt: new Date() },
      });
      console.log(`OK  ${label} → ${url}`);
      ok += 1;
    } catch (err) {
      console.error(`FAIL ${label} → ${err.message} (is ${row.module.backendUrl} running?)`);
      failed += 1;
    }
  }

  console.log(`\nDone. ok=${ok} failed=${failed} skipped=${skipped}`);
  if (failed > 0) {
    console.log('Start the failing module backends, then re-run with --force or use Super Admin → Provisioning.');
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
