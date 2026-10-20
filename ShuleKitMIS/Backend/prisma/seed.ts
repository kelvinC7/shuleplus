import { PrismaClient } from '../src/generated/prisma';

const SAINT_THEO_ORG_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const prisma = new PrismaClient();

interface ReqDef {
  title: string;
  quantity: number;
  unitPrice: number;
}

interface KitDef {
  name: string;
  gradeLevel: string;
  description: string;
  amount: string;
  requirements: ReqDef[];
}

const KIT_DEFS: KitDef[] = [
  {
    name: 'Nursery Kit',
    gradeLevel: 'Nursery',
    description: 'Complete starter kit for Nursery learners (N1–N3).',
    amount: '15000',
    requirements: [
      { title: 'Exercise books (A4)', quantity: 5, unitPrice: 1000 },
      { title: 'Pencils', quantity: 6, unitPrice: 200 },
      { title: 'Crayons (12 pack)', quantity: 1, unitPrice: 2000 },
      { title: 'School bag', quantity: 1, unitPrice: 5000 },
      { title: 'Water bottle', quantity: 1, unitPrice: 1800 },
    ],
  },
  {
    name: 'Primary Kit',
    gradeLevel: 'Primary',
    description: 'Standard kit for Primary learners (P1–P6).',
    amount: '25000',
    requirements: [
      { title: 'Exercise books (A4)', quantity: 8, unitPrice: 1000 },
      { title: 'Pens (blue/black)', quantity: 4, unitPrice: 500 },
      { title: 'Pencils', quantity: 4, unitPrice: 200 },
      { title: 'Geometry set', quantity: 1, unitPrice: 3000 },
      { title: 'School bag', quantity: 1, unitPrice: 6000 },
      { title: 'Uniform (shirt + shorts/skirt)', quantity: 1, unitPrice: 5200 },
    ],
  },
  {
    name: 'O-Level Kit',
    gradeLevel: 'O-Level',
    description: 'Standard kit for Ordinary Level learners (S1–S3).',
    amount: '35000',
    requirements: [
      { title: 'Exercise books (A4)', quantity: 10, unitPrice: 1000 },
      { title: 'Pens (blue/black)', quantity: 5, unitPrice: 500 },
      { title: 'Pencils', quantity: 3, unitPrice: 200 },
      { title: 'Geometry set', quantity: 1, unitPrice: 3000 },
      { title: 'Calculator', quantity: 1, unitPrice: 8000 },
      { title: 'School bag', quantity: 1, unitPrice: 6000 },
      { title: 'Uniform (shirt + trousers/skirt)', quantity: 1, unitPrice: 7900 },
    ],
  },
  {
    name: 'A-Level Kit',
    gradeLevel: 'A-Level',
    description: 'Standard kit for Advanced Level learners (S4–S6).',
    amount: '45000',
    requirements: [
      { title: 'Exercise books (A4)', quantity: 12, unitPrice: 1000 },
      { title: 'Pens (blue/black)', quantity: 6, unitPrice: 500 },
      { title: 'Pencils', quantity: 3, unitPrice: 200 },
      { title: 'Geometry set', quantity: 1, unitPrice: 3000 },
      { title: 'Scientific calculator', quantity: 1, unitPrice: 15000 },
      { title: 'School bag', quantity: 1, unitPrice: 6000 },
      { title: 'Uniform (shirt + trousers/skirt)', quantity: 2, unitPrice: 2700 },
    ],
  },
];

async function main() {
  console.log('Seeding ShuleKit MIS module...');

  const tenant = await prisma.tenant.upsert({
    where: { organizationId: SAINT_THEO_ORG_ID },
    update: {},
    create: {
      organizationId: SAINT_THEO_ORG_ID,
      organizationCode: 'STTHEO',
      organizationName: 'Saint Theo School',
      district: 'Gasabo',
      status: 'ACTIVE',
    },
  });
  console.log(`Tenant: ${tenant.organizationName} (${tenant.organizationId})`);

  for (const kit of KIT_DEFS) {
    const existing = await prisma.kit.findFirst({
      where: { organizationId: SAINT_THEO_ORG_ID, gradeLevel: kit.gradeLevel },
      include: { requirements: true },
    });
    const reqData = kit.requirements.map((r) => ({
      organizationId: SAINT_THEO_ORG_ID,
      title: r.title,
      quantity: r.quantity,
      unitPrice: String(r.unitPrice),
    }));
    const needsUpdate =
      existing && existing.requirements.some((r) => Number(r.unitPrice) <= 0);

    if (existing) {
      if (needsUpdate) {
        await prisma.kit.update({
          where: { id: existing.id },
          data: {
            amount: kit.amount,
            requirements: { deleteMany: {}, create: reqData },
          },
        });
        console.log(`Updated kit with priced items: ${kit.name}`);
      } else {
        console.log(`Kit already exists: ${kit.name}`);
      }
      continue;
    }

    const created = await prisma.kit.create({
      data: {
        organizationId: SAINT_THEO_ORG_ID,
        name: kit.name,
        gradeLevel: kit.gradeLevel,
        description: kit.description,
        amount: kit.amount,
        status: 'ACTIVE',
        requirements: { create: reqData },
      },
    });
    console.log(`Created kit: ${created.name} (${kit.amount} FRW)`);
  }

  console.log('ShuleKit MIS seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
