import { prisma } from '../src/config/database.ts';

const parents = await prisma.parentAccount.findMany({
  where: { OR: [{ phone: { contains: '777777777' } }, { firstName: 'Guardian', lastName: { contains: 'BBBB' } }] },
});
console.log('parents', parents.map((p) => ({ id: p.id, phone: p.phone, name: `${p.firstName} ${p.lastName}`, org: p.organizationId })));

for (const p of parents) {
  const links = await prisma.parentStudentLink.findMany({ where: { parentId: p.id }, include: { student: true } });
  console.log('links for', p.phone, links.map((l) => ({ sid: l.studentId, code: l.student.shuleCode, name: l.student.firstName })));
}

const allTrips = await prisma.setting.findMany({ where: { key: { startsWith: 'trips:' } } });
for (const s of allTrips) {
  let trips = [];
  try {
    trips = JSON.parse(s.value);
  } catch {
    continue;
  }
  console.log('org', s.organizationId, 'trips', trips.map((t) => ({ id: t.id, title: t.title, studentId: t.studentId, ph: t.ph })));
}

await prisma.$disconnect();
