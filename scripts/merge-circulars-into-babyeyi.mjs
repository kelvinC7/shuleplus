#!/usr/bin/env node
/**
 * Merge catalog "circulars" into Babyeyi Wizard as one product:
 *   Circular (Babyeyi) Wizard → https://babyeyi.shuleplus.rw
 *
 * - Renames babyeyi module
 * - Points circulars URLs at babyeyi hosts and disables circulars in marketplace
 * - Moves org/user assignments from circulars → babyeyi (when missing)
 * - Marks babyeyi tenantProvisioned when circulars was the only assignment
 *
 * Usage (from repo root, with Auth DATABASE_URL):
 *   DATABASE_URL=... node scripts/merge-circulars-into-babyeyi.mjs
 *   node scripts/merge-circulars-into-babyeyi.mjs --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const NAME = 'Circular (Babyeyi) Wizard';
const SHORT = 'Circulars';
const FE = 'https://babyeyi.shuleplus.rw';
const BE = 'https://babyeyi-api.shuleplus.rw';

function sanitizeDatabaseUrl(raw) {
  if (!raw) return '';
  let v = String(raw).trim();
  // Strip wrapping quotes (ASCII + common curly) and accidental escapes
  for (let i = 0; i < 4; i++) {
    const next = v
      .replace(/^\\?["'`“”‘’]+/, '')
      .replace(/["'`“”‘’]+\\?$/, '')
      .trim();
    if (next === v) break;
    v = next;
  }
  return v;
}

async function main() {
  const authBackend = path.join(REPO_ROOT, 'Authentication', 'Backend');
  const envPath = path.join(authBackend, '.env');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    const line = raw.split(/\r?\n/).find((l) => /^\s*DATABASE_URL\s*=/.test(l));
    if (line) {
      const v = sanitizeDatabaseUrl(line.replace(/^\s*DATABASE_URL\s*=\s*/, ''));
      // Prefer .env over a previously exported (often quoted) shell var
      if (v.startsWith('postgres')) process.env.DATABASE_URL = v;
    }
  }
  if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  }
  if (!process.env.DATABASE_URL?.startsWith('postgres')) {
    console.error(
      'DATABASE_URL missing or invalid. Set it or put it in Authentication/Backend/.env'
    );
    console.error(
      'Got:',
      process.env.DATABASE_URL ? `${process.env.DATABASE_URL.slice(0, 24)}…` : '(empty)'
    );
    process.exit(1);
  }

  const require = createRequire(path.join(authBackend, 'package.json'));
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const babyeyi = await prisma.platformModule.findUnique({ where: { slug: 'babyeyi' } });
    const circulars = await prisma.platformModule.findUnique({ where: { slug: 'circulars' } });

    if (!babyeyi) {
      console.error('platform_modules.babyeyi not found — create/seed it first.');
      process.exit(1);
    }

    console.log(dryRun ? 'DRY RUN' : 'APPLY');
    console.log(`babyeyi id=${babyeyi.id}`);
    if (circulars) console.log(`circulars id=${circulars.id}`);

    if (!dryRun) {
      await prisma.platformModule.update({
        where: { id: babyeyi.id },
        data: {
          name: NAME,
          shortName: SHORT,
          frontendUrl: FE,
          backendUrl: BE,
          healthCheckUrl: '/api/health',
          category: 'Communication',
          isEnabled: true,
          visibleInMarketplace: true,
          maintenanceMode: false,
        },
      });
      console.log('✓ renamed babyeyi →', NAME);
    } else {
      console.log('would rename babyeyi →', NAME, FE, BE);
    }

    if (circulars) {
      const circAssignments = await prisma.organizationModule.findMany({
        where: { moduleId: circulars.id },
      });
      console.log(`circulars org assignments: ${circAssignments.length}`);

      for (const a of circAssignments) {
        const existing = await prisma.organizationModule.findFirst({
          where: { organizationId: a.organizationId, moduleId: babyeyi.id },
        });

        if (existing) {
          if (!dryRun) {
            await prisma.organizationModule.update({
              where: { id: existing.id },
              data: {
                status: existing.status === 'SUSPENDED' ? existing.status : 'ACTIVE',
                tenantProvisioned: existing.tenantProvisioned || a.tenantProvisioned,
                tenantProvisionedAt: existing.tenantProvisionedAt ?? a.tenantProvisionedAt,
                isHidden: false,
              },
            });
            await prisma.organizationModule.delete({ where: { id: a.id } });
          }
          console.log(`  org ${a.organizationId}: merge circulars → existing babyeyi`);
        } else if (!dryRun) {
          await prisma.organizationModule.update({
            where: { id: a.id },
            data: { moduleId: babyeyi.id },
          });
          console.log(`  org ${a.organizationId}: reassign circulars → babyeyi`);
        } else {
          console.log(`  org ${a.organizationId}: would reassign → babyeyi`);
        }
      }

      const userMods = await prisma.userModule.findMany({ where: { moduleId: circulars.id } });
      for (const um of userMods) {
        const exists = await prisma.userModule.findFirst({
          where: { userId: um.userId, moduleId: babyeyi.id },
        });
        if (exists) {
          if (!dryRun) await prisma.userModule.delete({ where: { id: um.id } });
          console.log(`  user ${um.userId}: drop duplicate circulars`);
        } else if (!dryRun) {
          await prisma.userModule.update({
            where: { id: um.id },
            data: { moduleId: babyeyi.id },
          });
          console.log(`  user ${um.userId}: reassign → babyeyi`);
        }
      }

      if (!dryRun) {
        await prisma.platformModule.update({
          where: { id: circulars.id },
          data: {
            name: NAME,
            shortName: SHORT,
            frontendUrl: FE,
            backendUrl: BE,
            isEnabled: false,
            visibleInMarketplace: false,
            maintenanceMode: false,
          },
        });
        console.log('✓ disabled circulars catalog entry (alias only)');
      }
    }

    // Refresh organization.modules JSON
    if (!dryRun) {
      const orgs = await prisma.organization.findMany({ select: { id: true } });
      for (const org of orgs) {
        const active = await prisma.organizationModule.findMany({
          where: { organizationId: org.id, status: 'ACTIVE' },
          include: { module: { select: { slug: true } } },
        });
        const slugs = [...new Set(active.map((x) => (x.module.slug === 'circulars' ? 'babyeyi' : x.module.slug)))];
        await prisma.organization.update({
          where: { id: org.id },
          data: { modules: slugs },
        });
      }
      console.log(`✓ synced organization.modules for ${orgs.length} orgs`);
    }

    console.log('\nDone. Users should re-login, then open Circular (Babyeyi) Wizard from org dashboard.');
    console.log('Provision babyeyi if still not provisioned: Super Admin → Re-provision.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
