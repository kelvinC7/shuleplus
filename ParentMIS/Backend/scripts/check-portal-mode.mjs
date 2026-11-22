import { prisma } from '../src/config/database.ts';
import { resolvePortalFeaturesForParent } from '../src/services/parent-portal-mode.service.ts';

const digits = '781111111';
const parents = await prisma.parentAccount.findMany({
  where: { phone: { contains: digits } },
});
console.log(
  'parents',
  parents.map((p) => ({ id: p.id, phone: p.phone, fn: p.firstName, org: p.organizationId }))
);
for (const parent of parents) {
  const pf = await resolvePortalFeaturesForParent(parent.organizationId, parent.id);
  console.log('resolved', parent.phone, pf);
}
const settings = await prisma.setting.findMany({
  where: { OR: [{ key: 'portal:features' }, { key: { startsWith: 'parent:portal:' } }] },
});
console.log('portal settings', settings.map((s) => ({ org: s.organizationId, key: s.key, value: s.value })));
const uwase = await prisma.student.findFirst({ where: { firstName: 'UWASE' } });
const links = await prisma.parentStudentLink.findMany({
  where: { studentId: uwase?.id },
  include: { parent: true },
});
for (const l of links) {
  const pf = await resolvePortalFeaturesForParent(l.parent.organizationId, l.parent.id);
  console.log('uwase parent', l.parent.phone, l.parent.firstName, pf);
}

const org = parents[0]?.organizationId ?? parents[0]?.org;
if (org) {
  const tripsRow = await prisma.setting.findUnique({
    where: { organizationId_key: { organizationId: org, key: `trips:${org}` } },
  });
  if (tripsRow?.value) {
    try {
      const trips = JSON.parse(tripsRow.value);
      console.log('synced trips count', trips.length);
      console.log(trips.map((t) => ({ id: t.id, studentId: t.studentId, ph: t.ph, title: t.title })));
    } catch {
      console.log('trips parse failed');
    }
  } else {
    console.log('no trips setting for org', org);
  }
}

await prisma.$disconnect();
