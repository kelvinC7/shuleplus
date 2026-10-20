#!/usr/bin/env node
/**
 * Merge legacy IAM catalog slug `fees` into `school-fees` (same School Fees microservice).
 *
 * Usage (on server, from ShulePlus/):
 *   node scripts/repair-fees-module-slug.mjs
 *   node scripts/repair-fees-module-slug.mjs --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const authBackend = path.join(REPO_ROOT, 'Authentication', 'Backend');
const dryRun = process.argv.includes('--dry-run');

function loadDatabaseUrl() {
  const envPath = path.join(authBackend, '.env');
  if (!fs.existsSync(envPath)) return null;
  const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => /^\s*DATABASE_URL\s*=/.test(l));
  if (!line) return null;
  return line.replace(/^\s*DATABASE_URL\s*=\s*/, '').trim().replace(/^["']|["']$/g, '');
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? loadDatabaseUrl();
  if (!databaseUrl?.startsWith('postgres')) {
    console.error('DATABASE_URL missing — set it or run from Authentication/Backend with .env');
    process.exit(1);
  }

  process.env.DATABASE_URL = databaseUrl;
  const { createRequire } = await import('node:module');
  const require = createRequire(path.join(authBackend, 'package.json'));
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const [legacy, canonical] = await Promise.all([
      prisma.platformModule.findUnique({ where: { slug: 'fees' } }),
      prisma.platformModule.findUnique({ where: { slug: 'school-fees' } }),
    ]);

    if (!legacy) {
      console.log('No legacy `fees` module — nothing to merge.');
      return;
    }

    if (!canonical) {
      console.log('Renaming legacy slug fees → school-fees');
      if (!dryRun) {
        await prisma.platformModule.update({
          where: { id: legacy.id },
          data: { slug: 'school-fees', shortName: 'Fees', name: 'School Fees' },
        });
      }
      return;
    }

    console.log('Merging org/user assignments from fees → school-fees');

    const legacyAssignments = await prisma.organizationModule.findMany({
      where: { moduleId: legacy.id },
    });

    for (const row of legacyAssignments) {
      const existing = await prisma.organizationModule.findUnique({
        where: {
          organizationId_moduleId: { organizationId: row.organizationId, moduleId: canonical.id },
        },
      });
      if (existing) {
        if (!dryRun) await prisma.organizationModule.delete({ where: { id: row.id } });
        console.log(`  org ${row.organizationId}: already on school-fees`);
      } else if (!dryRun) {
        await prisma.organizationModule.update({
          where: { id: row.id },
          data: { moduleId: canonical.id },
        });
        console.log(`  org ${row.organizationId}: moved assignment`);
      } else {
        console.log(`  org ${row.organizationId}: would move assignment`);
      }
    }

    const legacyUserModules = await prisma.userModule.findMany({ where: { moduleId: legacy.id } });
    for (const row of legacyUserModules) {
      const existing = await prisma.userModule.findUnique({
        where: { userId_moduleId: { userId: row.userId, moduleId: canonical.id } },
      });
      if (existing) {
        if (!dryRun) await prisma.userModule.delete({ where: { id: row.id } });
      } else if (!dryRun) {
        await prisma.userModule.update({
          where: { id: row.id },
          data: { moduleId: canonical.id },
        });
      }
    }

    if (!dryRun) {
      await prisma.platformModule.update({
        where: { id: legacy.id },
        data: { isEnabled: false, visibleInMarketplace: false, maintenanceMode: true },
      });
    }
    console.log(dryRun ? 'Dry run complete.' : 'Legacy fees module disabled; use school-fees.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
