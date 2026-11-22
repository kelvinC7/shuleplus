import {
  CurriculumProcessingStatus,
  CurriculumReviewStatus,
  PrismaClient,
} from '@prisma/client';
import { rebPrimaryCbcTemplateSchema, REB_PRIMARY_CBC_TEMPLATE_SLUG } from '../src/templates/reb-primary-cbc';

const prisma = new PrismaClient();

const PILOT_BOOK = {
  title: 'Mathematics for Rwandan Primary Schools: Teacher’s Guide — Primary 5',
  subject: 'Mathematics',
  grade: 'Primary 5',
  educationLevel: 'Primary',
  language: 'English',
  edition: '2025',
  curriculumVersion: 'CBC',
  academicYear: '2025',
  sourceName: 'Rwanda Education Board (REB)',
  sourceUrl: 'https://elearning.reb.rw/',
  publicationYear: 2025,
  fileKey: 'seed-p5-mathematics-tg.pdf',
  processingStatus: CurriculumProcessingStatus.PUBLISHED,
};

async function main() {
  const seedPilot = process.env.SEED_PILOT_CURRICULUM === 'true';

  await prisma.lessonPlanTemplate.upsert({
    where: { slug: REB_PRIMARY_CBC_TEMPLATE_SLUG },
    create: {
      slug: REB_PRIMARY_CBC_TEMPLATE_SLUG,
      name: 'REB Primary CBC Lesson Plan',
      description: 'Structure aligned to REB Teacher’s Guide sample (P5 Mathematics, pp. 15–19).',
      schema: rebPrimaryCbcTemplateSchema,
      isDefault: true,
    },
    update: {
      schema: rebPrimaryCbcTemplateSchema,
      isDefault: true,
    },
  });

  if (!seedPilot) {
    console.log('[Seed] Template only. Upload P5 TG PDF via Superadmin for real curriculum (SEED_PILOT_CURRICULUM=true for dev pilot).');
    return;
  }

  let book = await prisma.curriculumBook.findFirst({
    where: { title: PILOT_BOOK.title, grade: PILOT_BOOK.grade },
  });

  if (!book) {
    book = await prisma.curriculumBook.create({
      data: {
        ...PILOT_BOOK,
        publishedAt: new Date(),
        extractionSummary: {
          seeded: true,
          note: 'Pilot curriculum from verified Unit 1 structure — replace after PDF extraction review.',
        },
      },
    });
  }

  const unitTitle =
    'Reading, writing, comparing and calculating whole numbers up to 1,000,000';

  let unit = await prisma.curriculumUnit.findFirst({
    where: { bookId: book.id, unitNumber: '1' },
  });

  if (!unit) {
    unit = await prisma.curriculumUnit.create({
      data: {
        bookId: book.id,
        unitNumber: '1',
        title: unitTitle,
        keyCompetence:
          'Read, write, compare and calculate whole numbers beyond 1,000,000 (confirm exact REB wording in unit overview).',
        suggestedPeriods: 32,
        sortOrder: 1,
        sourcePageStart: 12,
        sourcePageEnd: 45,
        reviewStatus: CurriculumReviewStatus.APPROVED,
      },
    });
  }

  const lessons = [
    {
      lessonNumber: '1.1',
      title: 'Introduction of the unit',
      suggestedPeriods: 1,
      sortOrder: 1,
      sourcePages: [12],
      materials: [],
      objectives: [] as string[],
    },
    {
      lessonNumber: '1.2',
      title: 'Reading and writing numbers up to 1,000,000',
      suggestedPeriods: 2,
      sortOrder: 2,
      sourcePages: [13, 14],
      materials: ['Number cards', 'Exercise books'],
      objectives: [
        'Read whole numbers up to 1,000,000 in figures and words.',
        'Write whole numbers up to 1,000,000 in figures and words.',
      ],
    },
    {
      lessonNumber: '1.3',
      title: 'Place values of whole numbers up to 7 digits',
      suggestedPeriods: 2,
      sortOrder: 3,
      sourcePages: [15, 16, 17],
      materials: ['Place-value tables', 'Paper cutouts / number cards'],
      objectives: [
        'Name the place values of digits in a whole number.',
        'Identify the place value of a digit in a written numeral.',
        'Appreciate the place of a digit when a digit is missing in a numeral.',
      ],
      sourceContent: {
        introNumbers: ['235,790', '253,970'],
        discoveryNumber: '1,235,176',
        practiceNumber: '4,582,731',
        guideSubsectionTitle: 'Place Value of digits for a whole number up to 6 Digits',
        note: 'Guide introduces millions (1,000,000 after 999,999); seven-digit focus extends official content.',
      },
    },
    {
      lessonNumber: '1.4',
      title: 'Reading and writing numbers in figures',
      suggestedPeriods: 2,
      sortOrder: 4,
      sourcePages: [18],
      materials: ['Blackboard', 'Exercise books'],
      objectives: ['Write numerals from word form and read numerals aloud accurately.'],
    },
  ];

  for (const item of lessons) {
    const existing = await prisma.curriculumLesson.findFirst({
      where: { unitId: unit.id, lessonNumber: item.lessonNumber },
    });
    if (existing) continue;

    const lesson = await prisma.curriculumLesson.create({
      data: {
        unitId: unit.id,
        lessonNumber: item.lessonNumber,
        title: item.title,
        suggestedPeriods: item.suggestedPeriods,
        sortOrder: item.sortOrder,
        materials: item.materials,
        sourcePages: item.sourcePages,
        sourceContent: item.sourceContent ?? undefined,
        extractionConfidence: 0.92,
        reviewStatus: CurriculumReviewStatus.APPROVED,
        objectives: {
          create: item.objectives.map((statement, idx) => ({
            statement,
            sortOrder: idx,
            isOfficial: true,
            sourcePages: item.sourcePages,
          })),
        },
        references: {
          create: [
            {
              label: `${PILOT_BOOK.title} — Unit 1`,
              pageStart: item.sourcePages[0],
              pageEnd: item.sourcePages[item.sourcePages.length - 1],
            },
          ],
        },
      },
    });

    if (item.lessonNumber === '1.3') {
      console.log(`[Seed] Place-value pilot lesson id: ${lesson.id}`);
    }
  }

  console.log('[Seed] P5 Mathematics curriculum pilot ready (published).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
