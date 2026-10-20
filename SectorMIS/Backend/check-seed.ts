import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const org = 'org-demo-school';
  const [exams, marks, subjects, students, enrollments] = await Promise.all([
    prisma.exam.findMany({ where: { organizationId: org } }),
    prisma.markEntry.findMany({ where: { organizationId: org }, take: 30 }),
    prisma.subject.findMany({ where: { organizationId: org } }),
    prisma.student.findMany({ where: { organizationId: org } }),
    prisma.enrollment.findMany({ where: { organizationId: org }, include: { class: true, student: true } }),
  ]);
  console.log('exams:', JSON.stringify(exams.map((e) => ({ id: e.id, name: e.name, term: e.term, status: e.status }))));
  console.log('marks:', marks.length);
  console.log('subjects:', JSON.stringify(subjects.map((s) => ({ id: s.id, name: s.name }))));
  console.log('enrollments:', JSON.stringify(enrollments.map((e) => ({ studentId: e.studentId, code: e.student.studentCode, class: e.class.name, year: e.academicYear, current: e.isCurrent, status: e.status }))));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
