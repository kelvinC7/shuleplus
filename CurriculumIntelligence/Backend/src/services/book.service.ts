import { CurriculumProcessingStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { validateEducationGrade } from '../config/education-levels';
import { AppError } from '../middleware/error.middleware';
import { logPlatformActivity } from './activity-log.service';
import { enqueuePdfExtraction } from './job-queue.service';
import { resolveStoredFilePath, storeCurriculumPdf } from './storage.service';
import { resolveTgPbPair } from './companion-merge.service';

export type CurriculumBookListItem = {
  id: string;
  title: string;
  subject: string;
  grade: string;
  educationLevel: string | null;
  language: string;
  documentType: string | null;
  edition: string | null;
  processingStatus: CurriculumProcessingStatus;
  pageCount: number | null;
  fileSizeBytes: number | null;
  processingError: string | null;
  lastJobError: string | null;
  updatedAt: Date;
  createdAt: Date;
};

export async function listBooks(
  filters?: {
    status?: CurriculumProcessingStatus;
    educationLevel?: string;
    grade?: string;
    subject?: string;
    documentType?: string;
    search?: string;
  },
  pagination?: { page?: number; pageSize?: number }
) {
  const where: Prisma.CurriculumBookWhereInput = {};
  if (filters?.status) where.processingStatus = filters.status;
  if (filters?.educationLevel) where.educationLevel = filters.educationLevel;
  if (filters?.grade) where.grade = filters.grade;
  if (filters?.subject) where.subject = { contains: filters.subject, mode: 'insensitive' };
  if (filters?.documentType) where.documentType = filters.documentType;
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { subject: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const page = Math.max(1, pagination?.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, pagination?.pageSize ?? 10));
  const skip = (page - 1) * pageSize;

  const [rows, total] = await Promise.all([
    prisma.curriculumBook.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        _count: { select: { pages: true } },
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { lastError: true, status: true },
        },
      },
    }),
    prisma.curriculumBook.count({ where }),
  ]);

  const items: CurriculumBookListItem[] = rows.map((book) => {
    const lastJob = book.jobs[0];
    const pageCount =
      book.pageCount != null && book.pageCount > 0
        ? book.pageCount
        : book._count.pages > 0
          ? book._count.pages
          : null;
    return {
      id: book.id,
      title: book.title,
      subject: book.subject,
      grade: book.grade,
      educationLevel: book.educationLevel,
      language: book.language,
      documentType: book.documentType,
      edition: book.edition,
      processingStatus: book.processingStatus,
      pageCount,
      fileSizeBytes: book.fileSizeBytes,
      processingError: book.processingError,
      lastJobError: lastJob?.status === 'FAILED' ? lastJob.lastError : null,
      updatedAt: book.updatedAt,
      createdAt: book.createdAt,
    };
  });

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getBook(bookId: string) {
  const book = await prisma.curriculumBook.findUnique({
    where: { id: bookId },
    include: {
      jobs: { orderBy: { createdAt: 'desc' }, take: 5 },
      _count: { select: { units: true, pages: true } },
      companionBook: {
        select: { id: true, title: true, documentType: true, processingStatus: true, pageCount: true },
      },
    },
  });
  if (!book) throw new AppError(404, 'Book not found');
  return book;
}

export async function createBookFromUpload(input: {
  file: Express.Multer.File;
  metadata: {
    title: string;
    subject: string;
    grade: string;
    language: string;
    educationLevel: string;
    documentType?: string;
    publisher?: string;
    description?: string;
    edition?: string;
    curriculumVersion?: string;
    academicYear?: string;
    sourceName?: string;
    sourceUrl?: string;
    publicationYear?: number;
    extractionOptions?: Record<string, unknown>;
    companionBookId?: string;
  };
  actor?: { id?: string; email?: string };
}) {
  if (input.file.size > env.MAX_UPLOAD_BYTES) {
    throw new AppError(400, `PDF exceeds maximum size (${Math.round(env.MAX_UPLOAD_BYTES / (1024 * 1024))} MB).`);
  }

  if (!validateEducationGrade(input.metadata.educationLevel, input.metadata.grade)) {
    throw new AppError(400, 'Invalid education level and class combination.');
  }

  const stored = await storeCurriculumPdf(input.file.originalname, input.file.buffer);

  const duplicate = await prisma.curriculumBook.findFirst({
    where: { fileSha256: stored.sha256, processingStatus: { not: 'ARCHIVED' } },
    select: { id: true, title: true, version: true },
  });
  if (duplicate) {
    throw new AppError(
      409,
      `This PDF was already uploaded as "${duplicate.title}" (id: ${duplicate.id}). Upload a new version from the library if intended.`
    );
  }

  const book = await prisma.curriculumBook.create({
    data: {
      title: input.metadata.title,
      subject: input.metadata.subject,
      grade: input.metadata.grade,
      language: input.metadata.language,
      educationLevel: input.metadata.educationLevel,
      documentType: input.metadata.documentType,
      publisher: input.metadata.publisher,
      description: input.metadata.description,
      edition: input.metadata.edition,
      curriculumVersion: input.metadata.curriculumVersion,
      academicYear: input.metadata.academicYear,
      sourceName: input.metadata.sourceName ?? 'REB',
      sourceUrl: input.metadata.sourceUrl,
      publicationYear: input.metadata.publicationYear,
      extractionOptions: input.metadata.extractionOptions as Prisma.InputJsonValue,
      fileKey: stored.fileKey,
      fileSha256: stored.sha256,
      fileSizeBytes: stored.fileSizeBytes,
      storageProvider: stored.provider,
      mimeType: input.file.mimetype || 'application/pdf',
      processingStatus: 'UPLOADED',
      companionBookId: input.metadata.companionBookId,
    },
  });

  const job = await prisma.curriculumProcessingJob.create({
    data: {
      bookId: book.id,
      status: 'QUEUED',
      pipelineStage: 'secure_upload',
      progress: 5,
    },
  });

  await logPlatformActivity({
    actorId: input.actor?.id,
    actorEmail: input.actor?.email,
    action: 'curriculum_book_uploaded',
    entityType: 'CurriculumBook',
    entityId: book.id,
    metadata: { title: book.title, fileKey: book.fileKey, sha256: stored.sha256 },
  });

  void enqueuePdfExtraction(job.id).catch((err) => {
    console.error('[Curriculum] extraction enqueue failed', err);
  });

  return { book, job };
}

async function startPdfExtractionJob(bookId: string) {
  const job = await prisma.curriculumProcessingJob.create({
    data: {
      bookId,
      status: 'QUEUED',
      pipelineStage: 'secure_upload',
      progress: 5,
    },
  });
  await prisma.curriculumBook.update({
    where: { id: bookId },
    data: { processingStatus: 'EXTRACTING', processingError: null },
  });
  void enqueuePdfExtraction(job.id).catch((err) => {
    console.error('[Curriculum] extraction enqueue failed', err);
  });
  return job;
}

async function replaceBookPdf(bookId: string, file: Express.Multer.File) {
  if (file.size > env.MAX_UPLOAD_BYTES) {
    throw new AppError(400, `PDF exceeds maximum size (${Math.round(env.MAX_UPLOAD_BYTES / (1024 * 1024))} MB).`);
  }
  if (file.mimetype !== 'application/pdf') {
    throw new AppError(400, 'Only PDF uploads are supported');
  }

  const existing = await prisma.curriculumBook.findUnique({ where: { id: bookId } });
  if (!existing) throw new AppError(404, 'Book not found');

  const stored = await storeCurriculumPdf(file.originalname, file.buffer);
  const duplicate = await prisma.curriculumBook.findFirst({
    where: {
      fileSha256: stored.sha256,
      id: { not: bookId },
      processingStatus: { not: 'ARCHIVED' },
    },
    select: { id: true, title: true },
  });
  if (duplicate) {
    throw new AppError(
      409,
      `This PDF is already used by "${duplicate.title}". Choose a different file.`
    );
  }

  await prisma.curriculumBook.update({
    where: { id: bookId },
    data: {
      fileKey: stored.fileKey,
      fileSha256: stored.sha256,
      fileSizeBytes: stored.fileSizeBytes,
      mimeType: file.mimetype || 'application/pdf',
    },
  });

  const job = await startPdfExtractionJob(bookId);
  return { bookId, job };
}

/** Upload or replace TG/PB PDFs for an existing curriculum set (from review workspace). */
export async function supplementCurriculumPair(
  contextBookId: string,
  files: { teachersGuideFile?: Express.Multer.File; pupilsBookFile?: Express.Multer.File },
  actor?: { id?: string; email?: string }
) {
  if (!files.teachersGuideFile && !files.pupilsBookFile) {
    throw new AppError(400, 'Upload at least one PDF (Teacher\'s Guide or Pupil\'s Book).');
  }

  const { tgId, pbId } = await resolveTgPbPair(contextBookId);
  const tg = await prisma.curriculumBook.findUnique({ where: { id: tgId } });
  if (!tg) throw new AppError(404, 'Teacher\'s Guide book not found');

  const out: {
    teachersGuideBookId: string;
    pupilsBookBookId?: string;
    teachersGuideJobId?: string;
    pupilsBookJobId?: string;
  } = { teachersGuideBookId: tgId };

  if (files.pupilsBookFile) {
    if (pbId) {
      const replaced = await replaceBookPdf(pbId, files.pupilsBookFile);
      out.pupilsBookBookId = pbId;
      out.pupilsBookJobId = replaced.job.id;
    } else {
      const pbTitle =
        tg.title.replace(/teacher'?s guide/i, "Pupil's Book").trim() ||
        `${tg.subject} ${tg.grade} Pupil's Book`;
      const pbResult = await createBookFromUpload({
        file: files.pupilsBookFile,
        metadata: {
          title: pbTitle,
          subject: tg.subject,
          grade: tg.grade,
          language: tg.language,
          educationLevel: tg.educationLevel ?? 'primary',
          documentType: 'pupils_book',
          publisher: tg.publisher ?? undefined,
          curriculumVersion: tg.curriculumVersion ?? undefined,
          academicYear: tg.academicYear ?? undefined,
          publicationYear: tg.publicationYear ?? undefined,
          sourceUrl: tg.sourceUrl ?? undefined,
        },
        actor,
      });
      await prisma.curriculumBook.update({
        where: { id: tgId },
        data: { companionBookId: pbResult.book.id },
      });
      out.pupilsBookBookId = pbResult.book.id;
      out.pupilsBookJobId = pbResult.job.id;
    }
  }

  if (files.teachersGuideFile) {
    const replaced = await replaceBookPdf(tgId, files.teachersGuideFile);
    out.teachersGuideJobId = replaced.job.id;
  }

  await logPlatformActivity({
    actorId: actor?.id,
    actorEmail: actor?.email,
    action: 'curriculum_pair_supplemented',
    entityType: 'CurriculumBook',
    entityId: tgId,
    metadata: {
      pupilsBookBookId: out.pupilsBookBookId,
      replacedTeachersGuide: Boolean(files.teachersGuideFile),
      replacedPupilsBook: Boolean(files.pupilsBookFile && pbId),
      addedPupilsBook: Boolean(files.pupilsBookFile && !pbId),
    },
  });

  return out;
}

export async function createBookPairFromUpload(input: {
  teachersGuideFile: Express.Multer.File;
  pupilsBookFile: Express.Multer.File;
  metadata: Omit<Parameters<typeof createBookFromUpload>[0]['metadata'], 'documentType' | 'companionBookId'>;
  actor?: { id?: string; email?: string };
}) {
  const pbTitle =
    input.metadata.title.replace(/teacher'?s guide/i, "Pupil's Book").trim() ||
    `${input.metadata.subject} ${input.metadata.grade} Pupil's Book`;

  const pbResult = await createBookFromUpload({
    file: input.pupilsBookFile,
    metadata: {
      ...input.metadata,
      title: pbTitle,
      documentType: 'pupils_book',
    },
    actor: input.actor,
  });

  const tgResult = await createBookFromUpload({
    file: input.teachersGuideFile,
    metadata: {
      ...input.metadata,
      documentType: 'teachers_guide',
      companionBookId: pbResult.book.id,
    },
    actor: input.actor,
  });

  return { teachersGuide: tgResult, pupilsBook: pbResult };
}

export async function updateBookStatus(
  bookId: string,
  status: CurriculumProcessingStatus,
  actor?: { id?: string; email?: string }
) {
  const existing = await prisma.curriculumBook.findUnique({ where: { id: bookId } });
  if (!existing) throw new AppError(404, 'Book not found');

  if (
    status === 'PUBLISHED' &&
    existing.processingStatus !== 'NEEDS_REVIEW' &&
    existing.processingStatus !== 'APPROVED' &&
    existing.processingStatus !== 'PUBLISHED'
  ) {
    throw new AppError(
      409,
      'Book must complete extraction and human review (Needs Review) before publishing.'
    );
  }

  if (status === 'PUBLISHED') {
    const versionAgg = await prisma.curriculumVersion.aggregate({
      where: { bookId },
      _max: { versionNumber: true },
    });
    const nextVersion = (versionAgg._max.versionNumber ?? 0) + 1;

    const book = await prisma.$transaction(async (tx) => {
      const updated = await tx.curriculumBook.update({
        where: { id: bookId },
        data: {
          processingStatus: status,
          publishedAt: new Date(),
          publishedBy: actor?.id,
          version: nextVersion,
        },
      });
      await tx.curriculumVersion.create({
        data: {
          bookId: updated.id,
          versionNumber: nextVersion,
          snapshot: {
            publishedAt: new Date().toISOString(),
            title: updated.title,
            subject: updated.subject,
            grade: updated.grade,
            version: nextVersion,
          } as Prisma.InputJsonValue,
          changeNote:
            nextVersion === 1 ? 'Published curriculum snapshot' : `Republication snapshot v${nextVersion}`,
          createdBy: actor?.id,
        },
      });
      await tx.curriculumUnit.updateMany({
        where: { bookId: updated.id },
        data: { reviewStatus: 'APPROVED' },
      });
      await tx.curriculumLesson.updateMany({
        where: { unit: { bookId: updated.id } },
        data: { reviewStatus: 'APPROVED' },
      });
      return updated;
    });

    await logPlatformActivity({
      actorId: actor?.id,
      actorEmail: actor?.email,
      action: `curriculum_book_status_${status.toLowerCase()}`,
      entityType: 'CurriculumBook',
      entityId: book.id,
    });

    return book;
  }

  const book = await prisma.curriculumBook.update({
    where: { id: bookId },
    data: {
      processingStatus: status,
      archivedAt: status === 'ARCHIVED' ? new Date() : undefined,
    },
  });

  await logPlatformActivity({
    actorId: actor?.id,
    actorEmail: actor?.email,
    action: `curriculum_book_status_${status.toLowerCase()}`,
    entityType: 'CurriculumBook',
    entityId: book.id,
  });

  return book;
}

export function resolveBookFilePath(fileKey: string) {
  return resolveStoredFilePath(fileKey);
}
