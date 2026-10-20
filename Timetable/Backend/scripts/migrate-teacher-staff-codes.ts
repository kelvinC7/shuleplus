/**
 * Backfill timetable teacher employee_number ({ROLE}{DD}{SSS}{NNN}).
 *
 *   npx tsx scripts/migrate-teacher-staff-codes.ts --dry-run
 *   npx tsx scripts/migrate-teacher-staff-codes.ts --fix-wrong-prefix --dry-run
 *   npx tsx scripts/migrate-teacher-staff-codes.ts --fix-wrong-prefix
 */
import { PrismaClient } from '../src/generated/prisma';
import { teacherProfileService } from '../src/services/teacher-profile.service';
import {
  normalizeStaffIdInput,
  parseOrganizationStaffPrefix,
  parseStaffIdTail,
  staffIdMatchesOrganization,
} from '../src/utils/staff-id';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const fixWrongPrefix = process.argv.includes('--fix-wrong-prefix');

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { organizationId: true, organizationCode: true },
  });
  const codeByOrg = new Map(tenants.map((t) => [t.organizationId, t.organizationCode]));

  const profiles = await prisma.timetableTeacherProfile.findMany({
    orderBy: [{ organizationId: 'asc' }, { createdAt: 'asc' }],
  });

  let updated = 0;
  let skipped = 0;

  for (const p of profiles) {
    const orgCode = codeByOrg.get(p.organizationId) ?? null;
    const current = normalizeStaffIdInput(p.employeeNumber);
    const needsReassign =
      fixWrongPrefix &&
      current &&
      !staffIdMatchesOrganization(current, orgCode);

    if (dryRun) {
      if (needsReassign) {
        console.log(
          `[dry-run] ${p.teacherName}: ${current} → (reassign using ${parseOrganizationStaffPrefix(orgCode).prefix})`
        );
        updated += 1;
      } else if (!current) {
        console.log(`[dry-run] ${p.teacherName}: (empty) → (assign)`);
        updated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    if (needsReassign) {
      await prisma.timetableTeacherProfile.update({
        where: { id: p.id },
        data: { employeeNumber: null },
      });
    } else if (current && !fixWrongPrefix) {
      const parsed = parseStaffIdTail(current);
      const { prefix } = parseOrganizationStaffPrefix(orgCode);
      if (parsed && `${parsed.districtCode}${parsed.schoolCode}` === prefix) {
        skipped += 1;
        continue;
      }
    }

    const saved = await teacherProfileService.upsert(p.organizationId, {
      teacherUserId: p.teacherUserId,
      teacherName: p.teacherName,
      employeeNumber: needsReassign ? null : p.employeeNumber,
      position: p.position,
    });
    console.log(`${p.teacherName}: ${saved.employeeNumber ?? '(none)'}`);
    updated += 1;
  }

  console.log(
    `\nDone. ${dryRun ? 'Would update' : 'Processed'}: ${updated}${dryRun ? `, unchanged: ${skipped}` : ''}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
