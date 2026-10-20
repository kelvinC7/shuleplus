/**
 * Normalize HR employee numbers to {ROLE}{DD}{SSS}{NNN}.
 *
 *   npm run migrate:staff-ids -- --dry-run
 *   npm run migrate:staff-ids -- --fix-wrong-prefix --dry-run
 */
import { PrismaClient } from '../src/generated/prisma';
import { resolvePositionAbbreviation } from '../src/constants/staff-positions';
import {
  formatModernStaffId,
  isLegacyStaffId,
  isModernStaffId,
  nextSequenceFromExistingIds,
  normalizeStaffIdInput,
  parseOrganizationStaffPrefix,
  parseStaffIdTail,
} from '../src/utils/staff-id';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const fixWrongPrefix = process.argv.includes('--fix-wrong-prefix');

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { organizationId: true, organizationCode: true, organizationName: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    const { districtCode, schoolCode, prefix } = parseOrganizationStaffPrefix(tenant.organizationCode);
    const employees = await prisma.employee.findMany({
      where: { organizationId: tenant.organizationId, deletedAt: null },
      select: {
        id: true,
        employeeNumber: true,
        position: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (employees.length === 0) continue;

    const existingIds = employees.map((e) => e.employeeNumber);
    let nextSeq = nextSequenceFromExistingIds(existingIds, districtCode, schoolCode);

    for (const emp of employees) {
      const rolePrefix = resolvePositionAbbreviation({ position: emp.position });
      const current = normalizeStaffIdInput(emp.employeeNumber);
      const parsed = parseStaffIdTail(current);
      const locationOk = parsed !== null && `${parsed.districtCode}${parsed.schoolCode}` === prefix;

      if (isModernStaffId(current) && parsed?.rolePrefix === rolePrefix && locationOk) {
        skipped += 1;
        continue;
      }

      let newNumber: string;

      if (parsed && locationOk) {
        newNumber = formatModernStaffId(
          rolePrefix,
          parsed.districtCode,
          parsed.schoolCode,
          parsed.sequence
        );
      } else if (
        fixWrongPrefix &&
        (!parsed || !locationOk || isLegacyStaffId(current))
      ) {
        while (nextSeq <= 999) {
          const candidate = formatModernStaffId(rolePrefix, districtCode, schoolCode, nextSeq);
          const taken = employees.some(
            (e) => e.id !== emp.id && normalizeStaffIdInput(e.employeeNumber) === candidate
          );
          if (!taken) break;
          nextSeq += 1;
        }
        if (nextSeq > 999) {
          console.error(`[${tenant.organizationName}] sequence exhausted — skipped ${emp.id}`);
          continue;
        }
        newNumber = formatModernStaffId(rolePrefix, districtCode, schoolCode, nextSeq);
        nextSeq += 1;
      } else {
        skipped += 1;
        continue;
      }

      if (newNumber === current) {
        skipped += 1;
        continue;
      }

      const label = `${emp.firstName} ${emp.lastName}`.trim();
      console.log(
        `${dryRun ? '[dry-run] ' : ''}${tenant.organizationName}: ${label} ${current || '(empty)'} → ${newNumber}`
      );

      if (!dryRun) {
        await prisma.employee.update({
          where: { id: emp.id },
          data: { employeeNumber: newNumber },
        });
      }
      updated += 1;
    }
  }

  console.log(`\nDone. ${dryRun ? 'Would update' : 'Updated'}: ${updated}, already OK: ${skipped}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
