/**
 * Remove Timetable demo seed data (fake teacher-* profiles and their assignments).
 * Course configs and schedules are removed only when no real assignments remain.
 *
 *   npx tsx scripts/purge-demo-timetable.ts --dry-run
 *   npx tsx scripts/purge-demo-timetable.ts
 *   npx tsx scripts/purge-demo-timetable.ts --org <organizationId>
 */
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const orgArgIndex = process.argv.indexOf('--org');
const orgFilter = orgArgIndex >= 0 ? process.argv[orgArgIndex + 1] : undefined;

const DEMO_TEACHER_IDS = ['teacher-alice', 'teacher-jean', 'teacher-grace', 'teacher-patrick'];
const DEMO_SUBJECTS = ['Mathematics', 'English', 'Science', 'Social Studies', 'Kinyarwanda', 'ICT'];

async function purgeOrg(organizationId: string) {
  const demoAssignments = await prisma.teacherAssignment.count({
    where: { organizationId, teacherUserId: { in: DEMO_TEACHER_IDS } },
  });
  const demoProfiles = await prisma.timetableTeacherProfile.count({
    where: { organizationId, teacherUserId: { in: DEMO_TEACHER_IDS } },
  });

  const remainingAfterDemo = await prisma.teacherAssignment.count({
    where: { organizationId, teacherUserId: { notIn: DEMO_TEACHER_IDS } },
  });

  const orphanCourses =
    remainingAfterDemo === 0
      ? await prisma.timetableCourseConfig.count({
          where: { organizationId, subjectName: { in: DEMO_SUBJECTS } },
        })
      : 0;

  const orphanSchedules = remainingAfterDemo === 0
    ? await prisma.timetableSchoolSchedule.count({ where: { organizationId } })
    : 0;

  console.log(`Org ${organizationId}:`);
  console.log(`  demo assignments: ${demoAssignments}`);
  console.log(`  demo profiles:    ${demoProfiles}`);
  console.log(`  orphan courses:   ${orphanCourses}`);
  console.log(`  orphan schedules: ${orphanSchedules}`);

  if (dryRun) return;

  await prisma.teacherAssignment.deleteMany({
    where: { organizationId, teacherUserId: { in: DEMO_TEACHER_IDS } },
  });
  await prisma.timetableTeacherProfile.deleteMany({
    where: { organizationId, teacherUserId: { in: DEMO_TEACHER_IDS } },
  });

  if (remainingAfterDemo === 0) {
    await prisma.timetableCourseConfig.deleteMany({
      where: { organizationId, subjectName: { in: DEMO_SUBJECTS } },
    });
    await prisma.timetableSchoolSchedule.deleteMany({ where: { organizationId } });
  }
}

async function main() {
  if (orgFilter) {
    await purgeOrg(orgFilter);
    return;
  }

  const orgIds = new Set<string>();
  for (const row of await prisma.teacherAssignment.findMany({
    where: { teacherUserId: { in: DEMO_TEACHER_IDS } },
    select: { organizationId: true },
    distinct: ['organizationId'],
  })) {
    orgIds.add(row.organizationId);
  }
  for (const row of await prisma.timetableTeacherProfile.findMany({
    where: { teacherUserId: { in: DEMO_TEACHER_IDS } },
    select: { organizationId: true },
    distinct: ['organizationId'],
  })) {
    orgIds.add(row.organizationId);
  }

  if (orgIds.size === 0) {
    console.log('No demo timetable data found.');
    return;
  }

  for (const organizationId of orgIds) {
    await purgeOrg(organizationId);
  }
  console.log('Purge complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
