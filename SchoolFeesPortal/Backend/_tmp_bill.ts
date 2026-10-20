import { prisma } from './src/config/database';
(async () => {
  const b = await prisma.studentBill.findFirst({
    where: { organizationId: 'test-org-001', status: { not: 'CANCELLED' } },
    select: { studentCode: true, studentName: true, className: true, academicYear: true, term: true, balance: true, netAmount: true, billNumber: true },
  });
  console.log(JSON.stringify(b));
  await prisma.$disconnect();
})();
