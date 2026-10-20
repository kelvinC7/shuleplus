import { PrismaClient, Gender, ParentRole, EnrollmentStatus } from '../src/generated/prisma';

const ORG_ID = 'org-demo-school';
const ORG_CODE = 'KGS';
const ORG_NAME = 'Kigali Green Hills School';
const YEAR = '2026';
const PARENT_PHONE = '250788123456';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Student Management (portal mirror)...');

  const tenant = await prisma.tenant.upsert({
    where: { organizationId: ORG_ID },
    update: { organizationCode: ORG_CODE, organizationName: ORG_NAME, district: 'Gasabo', schoolCode: '001' },
    create: {
      organizationId: ORG_ID,
      organizationCode: ORG_CODE,
      organizationName: ORG_NAME,
      district: 'Gasabo',
      schoolCode: '001',
      status: 'ACTIVE',
    },
  });
  console.log(`Tenant: ${tenant.organizationName}`);

  const gradeS1 = await prisma.grade.upsert({
    where: { organizationId_name: { organizationId: ORG_ID, name: 'S1' } },
    update: { category: 'O-Level', sortOrder: 10 },
    create: { organizationId: ORG_ID, name: 'S1', category: 'O-Level', sortOrder: 10 },
  });
  const gradeS3 = await prisma.grade.upsert({
    where: { organizationId_name: { organizationId: ORG_ID, name: 'S3' } },
    update: { category: 'O-Level', sortOrder: 12 },
    create: { organizationId: ORG_ID, name: 'S3', category: 'O-Level', sortOrder: 12 },
  });

  const comboS1 = await prisma.combination.upsert({
    where: { organizationId_name: { organizationId: ORG_ID, name: 'S1-GENERAL' } },
    update: { displayName: 'S1 General' },
    create: { organizationId: ORG_ID, name: 'S1-GENERAL', displayName: 'S1 General' },
  });
  const comboS3 = await prisma.combination.upsert({
    where: { organizationId_name: { organizationId: ORG_ID, name: 'S3-GENERAL' } },
    update: { displayName: 'S3 General' },
    create: { organizationId: ORG_ID, name: 'S3-GENERAL', displayName: 'S3 General' },
  });

  const classS1 = await prisma.class.upsert({
    where: { organizationId_name_combinationId_stream: { organizationId: ORG_ID, name: 'S1', combinationId: comboS1.id, stream: 'A' } },
    update: { gradeId: gradeS1.id },
    create: { organizationId: ORG_ID, name: 'S1', stream: 'A', category: 'O-Level', gradeId: gradeS1.id, combinationId: comboS1.id, sortOrder: 1 },
  });
  const classS3 = await prisma.class.upsert({
    where: { organizationId_name_combinationId_stream: { organizationId: ORG_ID, name: 'S3', combinationId: comboS3.id, stream: 'B' } },
    update: { gradeId: gradeS3.id },
    create: { organizationId: ORG_ID, name: 'S3', stream: 'B', category: 'O-Level', gradeId: gradeS3.id, combinationId: comboS3.id, sortOrder: 2 },
  });

  const students = [
    { uid: 'kgs-stu-001', firstName: 'Kevin', lastName: 'Uwase', code: 'KGS-2026-001', gender: Gender.MALE, cls: classS3 },
    { uid: 'kgs-stu-002', firstName: 'Emely', lastName: 'Uwase', code: 'KGS-2026-002', gender: Gender.FEMALE, cls: classS1 },
  ];

  const studentIds: string[] = [];
  for (const s of students) {
    const student = await prisma.student.upsert({
      where: { organizationId_studentUid: { organizationId: ORG_ID, studentUid: s.uid } },
      update: { firstName: s.firstName, lastName: s.lastName, studentCode: s.code, gender: s.gender },
      create: {
        organizationId: ORG_ID,
        studentUid: s.uid,
        firstName: s.firstName,
        lastName: s.lastName,
        studentCode: s.code,
        gender: s.gender,
        status: 'ACTIVE',
      },
    });
    await prisma.enrollment.upsert({
      where: { organizationId_studentId_academicYear: { organizationId: ORG_ID, studentId: student.id, academicYear: YEAR } },
      update: { classId: s.cls.id, isCurrent: true, status: EnrollmentStatus.ACTIVE },
      create: {
        organizationId: ORG_ID,
        studentId: student.id,
        classId: s.cls.id,
        academicYear: YEAR,
        isCurrent: true,
        status: EnrollmentStatus.ACTIVE,
      },
    });
    studentIds.push(student.id);
  }
  console.log(`Students: ${studentIds.length}`);

  let parent = await prisma.parent.findFirst({
    where: { organizationId: ORG_ID, phone: PARENT_PHONE },
  });
  if (!parent) {
    parent = await prisma.parent.create({
      data: {
        organizationId: ORG_ID,
        firstName: 'Alice',
        lastName: 'Uwase',
        phone: PARENT_PHONE,
        email: 'alice.uwase@example.com',
      },
    });
  }
  console.log(`Parent: ${parent.firstName} ${parent.lastName} (${parent.id})`);

  for (const sid of studentIds) {
    await prisma.studentParent.upsert({
      where: { organizationId_studentId_parentId: { organizationId: ORG_ID, studentId: sid, parentId: parent.id } },
      update: { role: ParentRole.MOTHER },
      create: { organizationId: ORG_ID, studentId: sid, parentId: parent.id, role: ParentRole.MOTHER },
    });
  }
  console.log('Linked parent to all students.');
  console.log('SM seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
