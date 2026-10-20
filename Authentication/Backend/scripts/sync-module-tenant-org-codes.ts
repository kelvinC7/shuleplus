/**
 * Copy IAM organization_code into HR and Timetable tenant rows.
 *
 *   cd Authentication/Backend && npx tsx scripts/sync-module-tenant-org-codes.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient as IamPrisma } from '../src/generated/prisma';

function readDatabaseUrl(envRelative: string): string {
  const envPath = join(__dirname, envRelative);
  const text = readFileSync(envPath, 'utf8');
  const line = text.split('\n').find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error(`DATABASE_URL not found in ${envPath}`);
  return line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
}

async function syncTenants(
  label: string,
  envRelative: string,
  rows: Array<{ id: string; organizationCode: string | null }>
) {
  const prev = process.env.DATABASE_URL;
  process.env.DATABASE_URL = readDatabaseUrl(envRelative);
  const mod = await import(
    label === 'HR'
      ? '../../../HR/Backend/src/generated/prisma'
      : '../../../Timetable/Backend/src/generated/prisma'
  );
  const client = new mod.PrismaClient() as {
    tenant: {
      updateMany: (args: unknown) => Promise<{ count: number }>;
    };
    $disconnect: () => Promise<void>;
  };

  let updated = 0;
  for (const org of rows) {
    if (!org.organizationCode?.trim()) continue;
    const code = org.organizationCode.trim();
    const result = await client.tenant.updateMany({
      where: { organizationId: org.id },
      data: { organizationCode: code },
    });
    updated += result.count;
  }
  await client.$disconnect();
  if (prev !== undefined) process.env.DATABASE_URL = prev;
  else delete process.env.DATABASE_URL;
  console.log(`${label}: updated ${updated} tenant row(s)`);
}

async function main() {
  const iam = new IamPrisma();
  const orgs = await iam.organization.findMany({
    select: { id: true, organizationCode: true },
  });
  await iam.$disconnect();

  await syncTenants('HR', '../../../HR/Backend/.env', orgs);
  await syncTenants('Timetable', '../../../Timetable/Backend/.env', orgs);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
