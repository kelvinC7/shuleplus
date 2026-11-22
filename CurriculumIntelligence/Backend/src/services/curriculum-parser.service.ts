import { CurriculumReviewStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export interface ProposedUnit {
  unit_number: string;
  title: string;
  source_page_start?: number;
  source_page_end?: number;
  key_competence?: string;
  suggested_periods?: number;
  unit_materials?: string[];
  unit_tools?: string[];
  unit_requirements?: string[];
}

export interface ProposedLesson {
  unit_number: string;
  lesson_number: string;
  title: string;
  source_page: number;
  source_page_end?: number;
  source_pages?: number[];
  suggested_periods?: number | null;
  objectives?: string[];
  materials?: string[];
  tools?: string[];
  requirements?: string[];
  body_excerpt?: string;
  teacher_activities?: string[];
  learner_activities?: string[];
  assessment_hints?: string[];
  pupil_activities?: string[];
  activities?: string[];
  exercises?: string[];
}

const STRUCTURAL_SKIP = /list of lessons|sample lesson plan|lesson plan template|content map/i;

export async function applyStructuredCurriculum(
  bookId: string,
  input: { proposed_units?: ProposedUnit[]; proposed_lessons?: ProposedLesson[] },
  options?: { replaceExisting?: boolean }
) {
  const book = await prisma.curriculumBook.findUnique({ where: { id: bookId } });
  if (!book) throw new AppError(404, 'Book not found');
  if (book.processingStatus === 'PUBLISHED' && !options?.replaceExisting) {
    throw new AppError(409, 'Unpublish or archive before replacing published curriculum structure.');
  }

  const units = input.proposed_units ?? [];
  const lessons = (input.proposed_lessons ?? []).filter(
    (l) => l.title && !STRUCTURAL_SKIP.test(l.title)
  );

  if (!units.length && !lessons.length) {
    return { unitsCreated: 0, lessonsCreated: 0, message: 'No structure detected in PDF.' };
  }

  if (options?.replaceExisting || book.processingStatus !== 'PUBLISHED') {
    await prisma.curriculumUnit.deleteMany({ where: { bookId } });
  }

  const unitIdByNumber = new Map<string, string>();

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const created = await prisma.curriculumUnit.create({
      data: {
        bookId,
        unitNumber: u.unit_number,
        title: u.title,
        keyCompetence: u.key_competence,
        suggestedPeriods: u.suggested_periods,
        sortOrder: i + 1,
        sourcePageStart: u.source_page_start,
        sourcePageEnd: u.source_page_end ?? undefined,
        reviewStatus: CurriculumReviewStatus.PENDING,
      },
    });
    unitIdByNumber.set(u.unit_number, created.id);
  }

  if (!unitIdByNumber.size && lessons.length) {
    const fallback = await prisma.curriculumUnit.create({
      data: {
        bookId,
        unitNumber: lessons[0].unit_number.split('.')[0] || '1',
        title: 'Extracted unit (verify title)',
        sortOrder: 1,
        reviewStatus: CurriculumReviewStatus.PENDING,
      },
    });
    unitIdByNumber.set(fallback.unitNumber, fallback.id);
  }

  let lessonsCreated = 0;
  for (let i = 0; i < lessons.length; i++) {
    const l = lessons[i];
    const unitKey = l.unit_number.includes('.') ? l.unit_number.split('.')[0] : l.unit_number;
    let unitId = unitIdByNumber.get(unitKey) ?? unitIdByNumber.get(l.unit_number);
    if (!unitId) {
      const created = await prisma.curriculumUnit.create({
        data: {
          bookId,
          unitNumber: unitKey,
          title: `Unit ${unitKey} (verify title)`,
          sortOrder: unitIdByNumber.size + 1,
          reviewStatus: CurriculumReviewStatus.PENDING,
        },
      });
      unitIdByNumber.set(unitKey, created.id);
      unitId = created.id;
    }

    const materialItems = [...(l.materials ?? []), ...(l.tools ?? [])].filter(Boolean);
    const sourcePages =
      l.source_pages?.length && l.source_pages.every((n) => n > 0)
        ? l.source_pages
        : l.source_page_end && l.source_page_end >= l.source_page
          ? Array.from({ length: l.source_page_end - l.source_page + 1 }, (_, k) => l.source_page + k)
          : [l.source_page];

    await prisma.curriculumLesson.create({
      data: {
        unitId,
        lessonNumber: l.lesson_number,
        title: l.title,
        suggestedPeriods: l.suggested_periods ?? undefined,
        sortOrder: i + 1,
        sourcePages,
        materials: materialItems.length ? materialItems : undefined,
        sourceContent: {
          engine: 'shuleplus-extract-v2',
          requirements: l.requirements ?? [],
          tools: l.tools ?? [],
          teacherActivities: l.teacher_activities ?? [],
          learnerActivities: l.learner_activities ?? [],
          assessmentHints: l.assessment_hints ?? [],
          pupilActivities: l.pupil_activities ?? l.activities ?? [],
          exercises: l.exercises ?? [],
          bodyExcerpt: l.body_excerpt?.slice(0, 4000),
        },
        reviewStatus: CurriculumReviewStatus.PENDING,
        extractionConfidence: 0.7,
        objectives: l.objectives?.length
          ? {
              create: l.objectives.map((statement, idx) => ({
                statement,
                sortOrder: idx,
                isOfficial: true,
                sourcePages: [l.source_page],
              })),
            }
          : undefined,
        references: {
          create: {
            label: `Teacher’s Guide — ${l.lesson_number}`,
            pageStart: l.source_page,
            pageEnd: l.source_page,
          },
        },
      },
    });
    lessonsCreated += 1;
  }

  return { unitsCreated: unitIdByNumber.size, lessonsCreated };
}

export async function buildExtractionValidationReport(bookId: string) {
  const book = await prisma.curriculumBook.findUnique({
    where: { id: bookId },
    include: {
      units: { include: { lessons: true } },
      pages: { where: { needsManualReview: true }, take: 20 },
    },
  });
  if (!book) throw new AppError(404, 'Book not found');

  const summary = (book.extractionSummary ?? {}) as Record<string, unknown>;
  return {
    bookId: book.id,
    title: book.title,
    processingStatus: book.processingStatus,
    pageCount: book.pageCount,
    unitCount: book.units.length,
    lessonCount: book.units.reduce((n, u) => n + u.lessons.length, 0),
    lowConfidencePages: summary.lowConfidencePages ?? book.pages.length,
    proposedUnits: summary.proposedUnits ?? [],
    pagesNeedingReview: book.pages.map((p) => ({
      pageNumber: p.pageNumber,
      isScanned: p.isScanned,
      ocrApplied: p.ocrApplied,
      confidence: p.extractionConfidence,
    })),
  };
}
