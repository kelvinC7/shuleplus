import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { resolveTgPbPair } from './companion-merge.service';

const MAX_CHARS = 14000;

type SourceContent = {
  mergedCorpus?: string;
  bodyExcerpt?: string;
  tools?: string[];
  requirements?: string[];
  intelligenceNotes?: string[];
  teacherActivities?: string[];
  learnerActivities?: string[];
  pupilActivities?: string[];
  exercises?: string[];
  teachersGuide?: { teacherActivities?: string[]; learnerActivities?: string[] };
  pupilsBook?: { activities?: string[]; exercises?: string[] };
};

export async function retrieveLessonContext(lessonId: string) {
  const lesson = await prisma.curriculumLesson.findUnique({
    where: { id: lessonId },
    include: {
      objectives: { orderBy: { sortOrder: 'asc' } },
      references: true,
      unit: { include: { book: true } },
    },
  });
  if (!lesson) throw new AppError(404, 'Lesson not found');

  const { tgId, pbId } = await resolveTgPbPair(lesson.unit.bookId);
  const tgBookId = tgId;

  const pages = (lesson.sourcePages as number[]) ?? [];
  const pageSet = new Set<number>();
  for (const p of pages) {
    pageSet.add(p);
    pageSet.add(p - 1);
    pageSet.add(p + 1);
  }
  for (const ref of lesson.references) {
    if (ref.pageStart) pageSet.add(ref.pageStart);
    if (ref.pageEnd) {
      for (let p = ref.pageStart ?? ref.pageEnd; p <= (ref.pageEnd ?? p); p++) pageSet.add(p);
    }
  }

  const structured = (lesson.sourceContent ?? {}) as SourceContent;

  const pageRows = await prisma.curriculumDocumentPage.findMany({
    where: {
      bookId: tgBookId,
      pageNumber: { in: [...pageSet].filter((n) => n > 0) },
    },
    orderBy: { pageNumber: 'asc' },
  });

  let pbPageRows: typeof pageRows = [];
  if (pbId) {
    pbPageRows = await prisma.curriculumDocumentPage.findMany({
      where: {
        bookId: pbId,
        pageNumber: { in: [...pageSet].filter((n) => n > 0) },
      },
      orderBy: { pageNumber: 'asc' },
    });
  }

  let corpus = '';
  const chunks: Array<{ pageNumber: number; excerpt: string; source: 'tg' | 'pb' }> = [];

  if (structured.mergedCorpus?.trim()) {
    corpus += `\n--- Merged TG + PB intelligence ---\n${structured.mergedCorpus.slice(0, 5000)}\n`;
  }
  if (structured.bodyExcerpt?.trim()) {
    corpus += `\n--- Lesson excerpt ---\n${structured.bodyExcerpt.slice(0, 3000)}\n`;
  }
  if (structured.intelligenceNotes?.length) {
    corpus += `\n--- Intelligence notes ---\n${structured.intelligenceNotes.join('\n')}\n`;
  }
  if (structured.tools?.length) {
    corpus += `\nTools / equipment: ${structured.tools.join('; ')}\n`;
  }
  if (structured.requirements?.length) {
    corpus += `\nRequirements: ${structured.requirements.join('; ')}\n`;
  }
  if (structured.pupilsBook?.activities?.length) {
    corpus += `\nPupil book activities:\n${structured.pupilsBook.activities.join('\n')}\n`;
  }
  if (structured.pupilsBook?.exercises?.length) {
    corpus += `\nPupil book exercises:\n${structured.pupilsBook.exercises.join('\n')}\n`;
  }

  for (const row of pageRows) {
    const text = (row.textContent ?? '').trim();
    if (!text) continue;
    const excerpt = text.slice(0, 2500);
    chunks.push({ pageNumber: row.pageNumber, excerpt, source: 'tg' });
    corpus += `\n--- TG Page ${row.pageNumber} ---\n${excerpt}\n`;
    if (corpus.length > MAX_CHARS) break;
  }

  if (corpus.length < MAX_CHARS * 0.6) {
    for (const row of pbPageRows) {
      const text = (row.textContent ?? '').trim();
      if (!text) continue;
      const excerpt = text.slice(0, 2000);
      chunks.push({ pageNumber: row.pageNumber, excerpt, source: 'pb' });
      corpus += `\n--- PB Page ${row.pageNumber} ---\n${excerpt}\n`;
      if (corpus.length > MAX_CHARS) break;
    }
  }

  const materialsFromDb = Array.isArray(lesson.materials) ? (lesson.materials as string[]) : [];

  return {
    lesson,
    book: lesson.unit.book,
    unit: lesson.unit,
    objectives: lesson.objectives.map((o) => o.statement),
    sourceChunks: chunks,
    corpus: corpus.slice(0, MAX_CHARS),
    structured: {
      tools: structured.tools ?? [],
      requirements: structured.requirements ?? [],
      materials: materialsFromDb,
      teacherActivities:
        structured.teachersGuide?.teacherActivities ??
        structured.teacherActivities ??
        [],
      learnerActivities: structured.teachersGuide?.learnerActivities ?? structured.learnerActivities ?? [],
      pupilActivities: structured.pupilsBook?.activities ?? structured.pupilActivities ?? [],
      pupilExercises: structured.pupilsBook?.exercises ?? structured.exercises ?? [],
      intelligenceNotes: structured.intelligenceNotes ?? [],
    },
    companionBookId: pbId,
  };
}
