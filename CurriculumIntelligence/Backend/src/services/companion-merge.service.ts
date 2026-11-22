import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';

const MERGE_SCRIPT = path.resolve(process.cwd(), '../worker/merge_curriculum.py');

type EnrichedLesson = {
  unit_number: string;
  lesson_number: string;
  objectives?: string[];
  materials?: string[];
  tools?: string[];
  requirements?: string[];
  source_page?: number;
  source_pages?: number[];
  body_excerpt?: string;
  teacher_activities?: string[];
  learner_activities?: string[];
  pupil_activities?: string[];
  activities?: string[];
  exercises?: string[];
};

function runPythonMerge(payload: Record<string, unknown>): Promise<{
  mergedLessons: Array<Record<string, unknown>>;
  stats?: Record<string, unknown>;
}> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(MERGE_SCRIPT)) {
      return resolve({ mergedLessons: [] });
    }
    const proc = spawn(env.PYTHON_BIN, [MERGE_SCRIPT], {
      cwd: path.dirname(MERGE_SCRIPT),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => {
      stdout += d.toString('utf8');
    });
    proc.stderr.on('data', (d) => {
      stderr += d.toString('utf8');
    });
    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `merge_curriculum.py exited ${code}`));
      }
      try {
        const trimmed = stdout.trim();
        const start = trimmed.indexOf('{');
        const end = trimmed.lastIndexOf('}');
        resolve(JSON.parse(trimmed.slice(start, end + 1)) as {
          mergedLessons: Array<Record<string, unknown>>;
          stats?: Record<string, unknown>;
        });
      } catch {
        reject(new Error('Invalid JSON from merge_curriculum.py'));
      }
    });
    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}

function lessonsFromExtractionSummary(summary: unknown): EnrichedLesson[] {
  if (!summary || typeof summary !== 'object') return [];
  const s = summary as { proposedLessons?: EnrichedLesson[] };
  return s.proposedLessons ?? [];
}

async function enrichedLessonsForBook(bookId: string): Promise<EnrichedLesson[]> {
  const book = await prisma.curriculumBook.findUnique({ where: { id: bookId } });
  if (!book?.extractionSummary) return [];
  return lessonsFromExtractionSummary(book.extractionSummary);
}

/** TG is canonical for portal; PB enriches via companion link. */
export async function resolveTgPbPair(bookId: string): Promise<{ tgId: string; pbId: string | null }> {
  const book = await prisma.curriculumBook.findUnique({ where: { id: bookId } });
  if (!book) return { tgId: bookId, pbId: null };

  if (book.documentType === 'teachers_guide' && book.companionBookId) {
    return { tgId: book.id, pbId: book.companionBookId };
  }
  if (book.documentType === 'pupils_book') {
    const tg = await prisma.curriculumBook.findFirst({
      where: { companionBookId: book.id, documentType: 'teachers_guide' },
      select: { id: true },
    });
    if (tg) return { tgId: tg.id, pbId: book.id };
  }
  return { tgId: book.documentType === 'teachers_guide' ? book.id : bookId, pbId: null };
}

export async function mergeCompanionIntelligence(
  triggerBookId: string,
  overrides?: { triggerLessons?: EnrichedLesson[]; triggerDocType?: string | null }
) {
  const { tgId, pbId } = await resolveTgPbPair(triggerBookId);
  if (!pbId) return { merged: 0, skipped: true };

  const triggerIsTg =
    overrides?.triggerDocType === 'teachers_guide' ||
    (overrides?.triggerDocType == null && triggerBookId === tgId);
  const triggerIsPb = triggerBookId === pbId || overrides?.triggerDocType === 'pupils_book';

  const [tgFromDb, pbFromDb] = await Promise.all([
    enrichedLessonsForBook(tgId),
    enrichedLessonsForBook(pbId),
  ]);
  const tgLessons =
    triggerIsTg && overrides?.triggerLessons?.length ? overrides.triggerLessons : tgFromDb;
  const pbLessons =
    triggerIsPb && overrides?.triggerLessons?.length ? overrides.triggerLessons : pbFromDb;
  if (!tgLessons.length) return { merged: 0, skipped: true };

  const { mergedLessons } = await runPythonMerge({
    teachersGuideLessons: tgLessons,
    pupilsBookLessons: pbLessons,
  });

  const dbLessons = await prisma.curriculumLesson.findMany({
    where: { unit: { bookId: tgId } },
    include: { objectives: true },
  });
  const byNumber = new Map(dbLessons.map((l) => [l.lessonNumber ?? '', l]));

  let merged = 0;
  for (const row of mergedLessons) {
    const num = String(row.lesson_number ?? '');
    const lesson = byNumber.get(num);
    if (!lesson) continue;

    const materialsUnified = (row.materialsUnified as string[]) ?? [];
    const tools = (row.tools as string[]) ?? [];
    const requirements = (row.requirements as string[]) ?? [];
    const objectives = (row.objectives as string[]) ?? [];
    const pb = row.pupilsBook as { pages?: number[] } | null | undefined;
    const tgPages = (row.teachersGuide as { pages?: number[] })?.pages ?? [];
    const pbPages = pb?.pages?.filter((n) => n > 0) ?? [];
    const sourcePages = [...new Set([...(lesson.sourcePages as number[]), ...tgPages, ...pbPages])].sort(
      (a, b) => a - b
    );

    await prisma.curriculumLesson.update({
      where: { id: lesson.id },
      data: {
        materials: materialsUnified.length ? materialsUnified : undefined,
        sourcePages,
        sourceContent: {
          engine: 'shuleplus-merge-v1',
          mergedAt: new Date().toISOString(),
          teachersGuide: row.teachersGuide,
          pupilsBook: row.pupilsBook,
          tools,
          requirements,
          intelligenceNotes: row.intelligenceNotes,
          mergedCorpus: row.mergedCorpus,
        } as Prisma.InputJsonValue,
      },
    });

    const existingObj = new Set(lesson.objectives.map((o) => o.statement.trim().toLowerCase()));
    const toAdd = objectives.filter((s) => s.trim() && !existingObj.has(s.trim().toLowerCase()));
    if (toAdd.length) {
      const baseOrder = lesson.objectives.length;
      await prisma.learningObjective.createMany({
        data: toAdd.map((statement, i) => ({
          lessonId: lesson.id,
          statement,
          sortOrder: baseOrder + i,
          isOfficial: true,
          sourcePages: sourcePages.slice(0, 3),
        })),
      });
    }
    merged += 1;
  }

  const tgBook = await prisma.curriculumBook.findUnique({ where: { id: tgId }, select: { extractionSummary: true } });
  const prevSummary =
    tgBook?.extractionSummary && typeof tgBook.extractionSummary === 'object'
      ? (tgBook.extractionSummary as Record<string, unknown>)
      : {};
  await prisma.curriculumBook.update({
    where: { id: tgId },
    data: {
      extractionSummary: {
        ...prevSummary,
        companionMerge: { pbId, mergedLessonCount: merged, at: new Date().toISOString() },
      } as Prisma.InputJsonValue,
    },
  });

  return { merged, tgId, pbId };
}
