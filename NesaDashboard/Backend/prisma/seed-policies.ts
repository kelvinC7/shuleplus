import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tuition = await prisma.feePolicy.create({
    data: {
      academicYear: '2027-2028',
      term: 1,
      educationLevel: 'PRIMARY',
      studentType: 'DAY',
      ownerships: ['GOVERNMENT', 'GOVERNMENT_AIDED'],
      applyToClasses: ['ALL'],
      maxTuitionRwf: 25000,
      status: 'ACTIVE',
      description: 'Seed: Primary day-scholar tuition ceiling',
    },
  });

  const ga = await prisma.generalAssemblyPolicy.create({
    data: {
      levels: ['ALL'],
      ownerships: ['GOVERNMENT', 'GOVERNMENT_AIDED'],
      studentTypes: ['ALL'],
      maxAmountRwf: 7000,
      requireApproval: true,
      maxTimesPerTerm: 1,
      allowMultipleCharges: false,
      requireAttachment: true,
      attachmentTypes: ['Meeting Minutes', 'Approval Letter', 'Signed Documents'],
      status: 'ACTIVE',
      description: 'Seed: General Assembly add-on ceiling',
    },
  });

  console.log('Seeded fee policy', tuition.id);
  console.log('Seeded GA policy', ga.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
