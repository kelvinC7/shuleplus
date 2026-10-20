import { PrismaClient, ResourceType, ResourceStatus } from '../src/generated/prisma';

const prisma = new PrismaClient();

const ORG_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const ORG_NAME = 'Saint Theo School';

async function main() {
  console.log('Seeding library module database...');

  const tenant = await prisma.tenant.upsert({
    where: { organizationId: ORG_ID },
    update: {},
    create: {
      organizationId: ORG_ID,
      organizationCode: 'STTHEO',
      organizationName: ORG_NAME,
    },
  });
  console.log(`Tenant: ${tenant.organizationName} (${tenant.organizationId})`);

  const categories = await Promise.all([
    prisma.resourceCategory.upsert({
      where: { organizationId_name: { organizationId: ORG_ID, name: 'Textbooks' } },
      update: {},
      create: {
        organizationId: ORG_ID,
        name: 'Textbooks',
        description: 'Standard curriculum textbooks for all subjects',
        type: ResourceType.TEXTBOOK,
      },
    }),
    prisma.resourceCategory.upsert({
      where: { organizationId_name: { organizationId: ORG_ID, name: 'Reference Books' } },
      update: {},
      create: {
        organizationId: ORG_ID,
        name: 'Reference Books',
        description: 'Encyclopedias, dictionaries, and reference materials',
        type: ResourceType.REFERENCE,
      },
    }),
    prisma.resourceCategory.upsert({
      where: { organizationId_name: { organizationId: ORG_ID, name: 'Novels & Literature' } },
      update: {},
      create: {
        organizationId: ORG_ID,
        name: 'Novels & Literature',
        description: 'Fiction, non-fiction, and literary works',
        type: ResourceType.NOVEL,
      },
    }),
    prisma.resourceCategory.upsert({
      where: { organizationId_name: { organizationId: ORG_ID, name: 'Past Papers' } },
      update: {},
      create: {
        organizationId: ORG_ID,
        name: 'Past Papers',
        description: 'Past examination papers and revision materials',
        type: ResourceType.PAST_PAPER,
      },
    }),
  ]);
  console.log(`Categories: ${categories.length} created`);

  const subjects = await Promise.all([
    prisma.subject.upsert({
      where: { organizationId_name: { organizationId: ORG_ID, name: 'Mathematics' } },
      update: {},
      create: {
        organizationId: ORG_ID,
        name: 'Mathematics',
        code: 'MATH',
        category: 'Sciences',
      },
    }),
    prisma.subject.upsert({
      where: { organizationId_name: { organizationId: ORG_ID, name: 'Physics' } },
      update: {},
      create: {
        organizationId: ORG_ID,
        name: 'Physics',
        code: 'PHYS',
        category: 'Sciences',
      },
    }),
    prisma.subject.upsert({
      where: { organizationId_name: { organizationId: ORG_ID, name: 'Chemistry' } },
      update: {},
      create: {
        organizationId: ORG_ID,
        name: 'Chemistry',
        code: 'CHEM',
        category: 'Sciences',
      },
    }),
    prisma.subject.upsert({
      where: { organizationId_name: { organizationId: ORG_ID, name: 'Biology' } },
      update: {},
      create: {
        organizationId: ORG_ID,
        name: 'Biology',
        code: 'BIO',
        category: 'Sciences',
      },
    }),
    prisma.subject.upsert({
      where: { organizationId_name: { organizationId: ORG_ID, name: 'English' } },
      update: {},
      create: {
        organizationId: ORG_ID,
        name: 'English',
        code: 'ENG',
        category: 'Languages',
      },
    }),
    prisma.subject.upsert({
      where: { organizationId_name: { organizationId: ORG_ID, name: 'Literature' } },
      update: {},
      create: {
        organizationId: ORG_ID,
        name: 'Literature',
        code: 'LIT',
        category: 'Languages',
      },
    }),
  ]);
  console.log(`Subjects: ${subjects.length} created`);

  const shelfLocations = await Promise.all([
    prisma.shelfLocation.upsert({
      where: { organizationId_building_section_shelf: { organizationId: ORG_ID, building: 'Main', section: 'A', shelf: '1' } },
      update: {},
      create: {
        organizationId: ORG_ID,
        building: 'Main',
        room: 'Reading Room 1',
        section: 'A',
        shelf: '1',
        row: 'Top',
        position: '1-5',
        capacity: 50,
      },
    }),
    prisma.shelfLocation.upsert({
      where: { organizationId_building_section_shelf: { organizationId: ORG_ID, building: 'Main', section: 'B', shelf: '1' } },
      update: {},
      create: {
        organizationId: ORG_ID,
        building: 'Main',
        room: 'Reading Room 1',
        section: 'B',
        shelf: '1',
        row: 'Middle',
        position: '1-5',
        capacity: 50,
      },
    }),
    prisma.shelfLocation.upsert({
      where: { organizationId_building_section_shelf: { organizationId: ORG_ID, building: 'Main', section: 'C', shelf: '1' } },
      update: {},
      create: {
        organizationId: ORG_ID,
        building: 'Main',
        room: 'Reading Room 2',
        section: 'C',
        shelf: '1',
        row: 'Bottom',
        position: '1-5',
        capacity: 50,
      },
    }),
  ]);
  console.log(`Shelf locations: ${shelfLocations.length} created`);

  const booksData = [
    {
      title: 'Mathematics for Rwanda O Level',
      isbn: '978-99977-8001-0',
      bookCode: 'MATH-001',
      author: 'Jean Pierre Habimana',
      publisher: 'Rwanda Education Board',
      edition: '3rd',
      publicationYear: 2024,
      subjectId: subjects[0].id,
      categoryId: categories[0].id,
      language: 'English',
      classLevel: 'S3-S6',
      description: 'Comprehensive O Level Mathematics textbook aligned with Rwanda curriculum',
      totalCopies: 3,
      availableCopies: 3,
      shelfLocationId: shelfLocations[0].id,
    },
    {
      title: 'English Grammar and Composition',
      isbn: '978-99977-8002-7',
      bookCode: 'ENG-001',
      author: 'Alice Mukamana',
      publisher: 'East African Educational Publishers',
      edition: '2nd',
      publicationYear: 2023,
      subjectId: subjects[4].id,
      categoryId: categories[0].id,
      language: 'English',
      classLevel: 'S1-S4',
      description: 'Complete English grammar guide for secondary school students',
      totalCopies: 2,
      availableCopies: 2,
      shelfLocationId: shelfLocations[0].id,
    },
    {
      title: 'Things Fall Apart',
      isbn: '978-0-435-91350-0',
      bookCode: 'LIT-001',
      author: 'Chinua Achebe',
      publisher: 'Heinemann',
      edition: '1st',
      publicationYear: 1958,
      subjectId: subjects[5].id,
      categoryId: categories[2].id,
      language: 'English',
      classLevel: 'S3-S6',
      description: 'Classic African novel exploring pre-colonial Nigerian life',
      totalCopies: 2,
      availableCopies: 2,
      shelfLocationId: shelfLocations[1].id,
    },
    {
      title: 'New Era Physics for Rwanda',
      isbn: '978-99977-8003-4',
      bookCode: 'PHYS-001',
      author: 'Samuel Mugabo',
      publisher: 'Rwanda Education Board',
      edition: '2nd',
      publicationYear: 2024,
      subjectId: subjects[1].id,
      categoryId: categories[0].id,
      language: 'English',
      classLevel: 'S4-S6',
      description: 'A Level Physics textbook covering mechanics, electricity, and modern physics',
      totalCopies: 2,
      availableCopies: 2,
      shelfLocationId: shelfLocations[2].id,
    },
    {
      title: 'Chemistry for Secondary Schools',
      isbn: '978-99977-8004-1',
      bookCode: 'CHEM-001',
      author: 'Dr. Pierre Niyonzima',
      publisher: 'Macmillan Education',
      edition: '3rd',
      publicationYear: 2023,
      subjectId: subjects[2].id,
      categoryId: categories[0].id,
      language: 'English',
      classLevel: 'S3-S6',
      description: 'Comprehensive chemistry textbook with practical experiments',
      totalCopies: 1,
      availableCopies: 1,
      shelfLocationId: shelfLocations[2].id,
    },
  ];

  const books = [];
  for (const bookData of booksData) {
    const book = await prisma.bookResource.upsert({
      where: {
        organizationId_isbn: { organizationId: ORG_ID, isbn: bookData.isbn! },
      },
      update: {},
      create: {
        organizationId: ORG_ID,
        ...bookData,
      },
    });
    books.push(book);
  }
  console.log(`Books: ${books.length} created`);

  const copiesData: Array<{
    resourceId: string;
    barcode: string;
    libraryId: string;
    purchasePrice: number;
    condition: string;
    source: string;
  }> = [];

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const copyCount = book.totalCopies;
    for (let j = 0; j < copyCount; j++) {
      const seqNum = copiesData.length + 1;
      copiesData.push({
        resourceId: book.id,
        barcode: `BAR-${String(seqNum).padStart(6, '0')}`,
        libraryId: `LIB-2026-${String(seqNum).padStart(6, '0')}`,
        purchasePrice: [15000, 12000, 8000, 18000, 16000][i] ?? 10000,
        condition: 'Good',
        source: 'Purchase',
      });
    }
  }

  for (const copyData of copiesData) {
    await prisma.bookCopy.upsert({
      where: { barcode: copyData.barcode },
      update: {},
      create: {
        organizationId: ORG_ID,
        ...copyData,
        acquiredDate: new Date('2026-01-15'),
      },
    });
  }
  console.log(`Book copies: ${copiesData.length} created`);

  await prisma.librarySettings.upsert({
    where: { organizationId: ORG_ID },
    update: {},
    create: {
      organizationId: ORG_ID,
      loanPeriodDays: 7,
      maxBooksStudent: 3,
      maxBooksTeacher: 5,
      renewalsAllowed: true,
      maxRenewals: 1,
      finesEnabled: true,
      finePerDay: 500,
      maxFine: 10000,
      lostBookPolicy: 'REPLACEMENT_COST',
      qrEnabled: true,
      barcodeEnabled: true,
      dueReminderDays: 2,
      overdueReminderDays: 1,
    },
  });
  console.log('Library settings created');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
