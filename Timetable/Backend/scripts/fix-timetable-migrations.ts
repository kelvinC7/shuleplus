/**
 * Clears failed Timetable migration records and applies pending migrations
 * (e.g. live_alert_settings, teacher employee_number / position).
 *
 * Usage: npx tsx scripts/fix-timetable-migrations.ts
 */
import { execSync } from 'node:child_process';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const TEACHER_EMP = '20260915180000_teacher_employee_number';
const TEACHER_POS = '20260915183000_teacher_position';

function run(cmd: string) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
}

async function clearFailed(name: string) {
  const failed = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM _prisma_migrations
    WHERE migration_name = ${name} AND finished_at IS NULL AND rolled_back_at IS NULL
  `;
  if (failed.length === 0) return;
  console.log(`\nClearing failed migration: ${name}`);
  run(`npx prisma migrate resolve --rolled-back ${name}`);
}

async function columnExists(table: string, column: string) {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
  `;
  return rows.length > 0;
}

async function ensureTeacherProfileColumns() {
  const hasEmp = await columnExists('timetable_teacher_profiles', 'employee_number');
  const hasPos = await columnExists('timetable_teacher_profiles', 'position');

  if (!hasEmp) {
    console.log('\nAdding employee_number on timetable_teacher_profiles…');
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "timetable_teacher_profiles" ADD COLUMN IF NOT EXISTS "employee_number" TEXT`
    );
  }
  if (!hasPos) {
    console.log('\nAdding position on timetable_teacher_profiles…');
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "timetable_teacher_profiles" ADD COLUMN IF NOT EXISTS "position" TEXT DEFAULT 'Teacher'`
    );
  }

  for (const name of [TEACHER_EMP, TEACHER_POS]) {
    const applied = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations
      WHERE migration_name = ${name} AND finished_at IS NOT NULL
    `;
    if (applied.length === 0) {
      console.log(`\nMarking as applied: ${name}`);
      run(`npx prisma migrate resolve --applied ${name}`);
    }
  }
}

async function main() {
  const anyFailed = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM _prisma_migrations
    WHERE finished_at IS NULL AND rolled_back_at IS NULL
  `;
  if (anyFailed.length > 0) {
    console.log('\nFailed migration records:');
    for (const { migration_name } of anyFailed) {
      console.log(`  - ${migration_name}`);
    }
  }

  for (const { migration_name } of anyFailed) {
    await clearFailed(migration_name);
  }

  console.log('\nApplying pending migrations…');
  try {
    run('npx prisma migrate deploy');
  } catch {
    console.log('\nmigrate deploy failed — ensuring teacher profile columns manually…');
    await ensureTeacherProfileColumns();
  }

  if (!(await columnExists('timetable_teacher_profiles', 'position'))) {
    await ensureTeacherProfileColumns();
  }

  console.log('\nVerifying migration status…');
  run('npx prisma migrate status');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
