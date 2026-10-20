/**
 * Fixes IAM migration history when an old failed migration blocks deploy.
 *
 * Usage: npx tsx scripts/fix-iam-migrations.ts
 */
import { execSync } from 'node:child_process';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const MARK_APPLIED = [
  '20260709124101_new',
  '20260709130000_user_access_management',
  '20260710104417_add_mfa_sessions_otps',
  '20260713180000_org_branding_assets',
  '20260730071048_add_is_hidden_organization_module',
  '20260806085729_sync_org_module_fields',
];

function run(cmd: string) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
}

async function clearFailedMigration(name: string) {
  const failed = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM _prisma_migrations
    WHERE migration_name = ${name} AND finished_at IS NULL AND rolled_back_at IS NULL
  `;
  if (failed.length === 0) {
    console.log(`No active failed record for ${name}`);
    return;
  }
  console.log(`\nClearing failed migration: ${name}`);
  run(`npx prisma migrate resolve --rolled-back ${name}`);
}

async function main() {
  const anyFailed = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM _prisma_migrations
    WHERE finished_at IS NULL AND rolled_back_at IS NULL
  `;
  if (anyFailed.length > 0) {
    console.log('\nFailed migration records blocking deploy:');
    for (const { migration_name } of anyFailed) {
      console.log(`  - ${migration_name}`);
    }
  }

  for (const { migration_name } of anyFailed) {
    await clearFailedMigration(migration_name);
  }

  const applied = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL
  `;
  const appliedSet = new Set(applied.map((r) => r.migration_name));

  for (const name of MARK_APPLIED) {
    if (appliedSet.has(name)) {
      console.log(`Already applied: ${name}`);
      continue;
    }
    console.log(`\nMarking as applied (schema already present): ${name}`);
    run(`npx prisma migrate resolve --applied ${name}`);
  }

  const rfidCols = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'rfid_uid'
  `;

  if (rfidCols.length === 0) {
    console.log('\nApplying RFID columns on users…');
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rfid_uid" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fingerprint_id" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "identity_remarks" TEXT`);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "users_organization_id_rfid_uid_idx" ON "users"("organization_id", "rfid_uid")`
    );
  } else {
    console.log('\nRFID columns already exist on users');
  }

  const rfidMigration = '20260814100000_user_rfid_identity';
  const rfidApplied = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM _prisma_migrations
    WHERE migration_name = ${rfidMigration} AND finished_at IS NOT NULL
  `;

  if (rfidApplied.length === 0) {
    console.log(`\nMarking RFID migration as applied: ${rfidMigration}`);
    run(`npx prisma migrate resolve --applied ${rfidMigration}`);
  }

  console.log('\nApplying pending migrations…');
  run('npx prisma migrate deploy');

  console.log('\nVerifying migration status…');
  run('npx prisma migrate status');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
