/**
 * Normalize IAM employee IDs to {ROLE}{DD}{SSS}{NNN} (e.g. TR04001001).
 *
 *   npm run migrate:staff-ids -- --dry-run
 *   npm run migrate:staff-ids -- --fix-wrong-prefix --dry-run
 *   npm run migrate:staff-ids -- --fix-wrong-prefix
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
  staffIdMatchesOrganization,
} from '../src/utils/staff-id';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const fixWrongPrefix = process.argv.includes('--fix-wrong-prefix');

async function main() {
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      organizationCode: true,
      district: { select: { code: true } },
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const org of orgs) {
    const { districtCode, schoolCode, prefix } = parseOrganizationStaffPrefix(
      org.organizationCode,
      org.district?.code ?? null
    );

    const users = await prisma.user.findMany({
      where: { organizationId: org.id },
      select: {
        id: true,
        email: true,
        employeeId: true,
        position: true,
        userRoles: { include: { role: { select: { slug: true, name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (users.length === 0) continue;

    const existingIds = users.map((u) => u.employeeId);
    let nextSeq = nextSequenceFromExistingIds(existingIds, districtCode, schoolCode);

    for (const user of users) {
      const rolePrefix = resolvePositionAbbreviation({
        position: user.position,
        roleSlug: user.userRoles[0]?.role.slug,
        roleName: user.userRoles[0]?.role.name,
      });

      const current = normalizeStaffIdInput(user.employeeId);
      const parsed = parseStaffIdTail(current);

      const locationOk = staffIdMatchesOrganization(
        current,
        org.organizationCode,
        org.district?.code ?? null
      );

      if (isModernStaffId(current) && parsed?.rolePrefix === rolePrefix && locationOk) {
        skipped += 1;
        continue;
      }

      let newId: string;

      if (parsed && locationOk && parsed.rolePrefix === rolePrefix) {
        newId = formatModernStaffId(
          rolePrefix,
          parsed.districtCode,
          parsed.schoolCode,
          parsed.sequence
        );
      } else if (
        !current ||
        isLegacyStaffId(current) ||
        (fixWrongPrefix && isModernStaffId(current) && !locationOk)
      ) {
        while (nextSeq <= 999) {
          const candidate = formatModernStaffId(rolePrefix, districtCode, schoolCode, nextSeq);
          const taken = users.some(
            (u) => u.id !== user.id && normalizeStaffIdInput(u.employeeId) === candidate
          );
          if (!taken) break;
          nextSeq += 1;
        }
        if (nextSeq > 999) {
          console.error(`[${org.name}] sequence exhausted — skipped ${user.email}`);
          continue;
        }
        newId = formatModernStaffId(rolePrefix, districtCode, schoolCode, nextSeq);
        nextSeq += 1;
      } else {
        skipped += 1;
        continue;
      }

      if (newId === current) {
        skipped += 1;
        continue;
      }

      console.log(`${dryRun ? '[dry-run] ' : ''}${org.name}: ${user.email} ${current || '(empty)'} → ${newId}`);

      if (!dryRun) {
        await prisma.user.update({
          where: { id: user.id },
          data: { employeeId: newId },
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
