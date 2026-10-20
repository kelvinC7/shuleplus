import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const migrations = await prisma.$queryRaw<
    Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>
  >`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at`;

  console.log('Migrations in DB:');
  for (const row of migrations) {
    const status = row.finished_at
      ? 'applied'
      : row.rolled_back_at
        ? 'rolled_back'
        : 'FAILED/PENDING';
    console.log(`  ${row.migration_name} -> ${status}`);
  }

  const cols = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name IN ('branch','position','employee_id','supervisor_id','rfid_uid','fingerprint_id')
    ORDER BY column_name`;

  console.log('\nUser columns present:', cols.map((c) => c.column_name).join(', ') || '(none)');

  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('provinces','user_modules','mfa_sessions','organization_modules')
    ORDER BY table_name`;

  console.log('Key tables present:', tables.map((t) => t.table_name).join(', ') || '(none)');

  const orgModCols = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'organization_modules' AND column_name = 'is_hidden'`;

  console.log('organization_modules.is_hidden:', orgModCols.length ? 'yes' : 'no');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
