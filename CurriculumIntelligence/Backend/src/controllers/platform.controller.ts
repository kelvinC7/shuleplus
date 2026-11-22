import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import * as bookService from '../services/book.service';
import * as treeService from '../services/curriculum-tree.service';
import fs from 'fs';
import { getBookPage } from '../services/extraction.service';
import { enqueuePdfExtraction } from '../services/job-queue.service';
import {
  applyStructuredCurriculum,
  buildExtractionValidationReport,
} from '../services/curriculum-parser.service';
import { resolveBookFilePath } from '../services/book.service';
import { prisma } from '../config/database';
import { CurriculumProcessingStatus, ProcessingJobStatus } from '@prisma/client';
import { paramString } from '../utils/params';
import { EDUCATION_LEVELS } from '../config/education-levels';
import {
  cancelProcessingJob,
  getPlatformOverview,
  listProcessingJobs,
  retryProcessingJob,
} from '../services/platform-overview.service';

const bookMetaSchema = z.object({
  title: z.string().min(3),
  subject: z.string().min(2),
  grade: z.string().min(2),
  language: z.string().min(2),
  educationLevel: z.string().min(2),
  documentType: z.enum(['teachers_guide', 'pupils_book', 'syllabus', 'other']).optional(),
  publisher: z.string().optional(),
  description: z.string().optional(),
  edition: z.string().optional(),
  curriculumVersion: z.string().optional(),
  academicYear: z.string().optional(),
  sourceName: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  publicationYear: z.coerce.number().optional(),
  extractionOptions: z.string().optional(),
  companionBookId: z.string().uuid().optional(),
  uploadPair: z.enum(['true', 'false']).optional(),
});

export const platformController = {
  async overview(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await getPlatformOverview() });
    } catch (e) {
      next(e);
    }
  },

  async educationLevels(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: EDUCATION_LEVELS });
    } catch (e) {
      next(e);
    }
  },

  async listJobs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as ProcessingJobStatus | undefined;
      const jobs = await listProcessingJobs({ status });
      res.json({ success: true, data: jobs });
    } catch (e) {
      next(e);
    }
  },

  async cancelJob(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await cancelProcessingJob(paramString(req.params.jobId), {
        id: req.user?.sub,
        email: req.user?.email,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e instanceof Error ? new AppError(400, e.message) : e);
    }
  },

  async retryJob(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const job = await retryProcessingJob(paramString(req.params.jobId), {
        id: req.user?.sub,
        email: req.user?.email,
      });
      res.json({ success: true, data: job });
    } catch (e) {
      next(e instanceof Error ? new AppError(400, e.message) : e);
    }
  },

  async listBooks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as CurriculumProcessingStatus | undefined;
      const page = parseInt(String(req.query.page ?? '1'), 10);
      const pageSize = parseInt(String(req.query.pageSize ?? '10'), 10);
      const data = await bookService.listBooks(
        {
          status,
          educationLevel: req.query.educationLevel as string | undefined,
          grade: req.query.grade as string | undefined,
          subject: req.query.subject as string | undefined,
          documentType: req.query.documentType as string | undefined,
          search: req.query.search as string | undefined,
        },
        { page: Number.isFinite(page) ? page : 1, pageSize: Number.isFinite(pageSize) ? pageSize : 10 }
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getBook(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const book = await bookService.getBook(paramString(req.params.id));
      res.json({ success: true, data: book });
    } catch (e) {
      next(e);
    }
  },

  async uploadBook(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const files = req.files as { file?: Express.Multer.File[]; companionFile?: Express.Multer.File[] } | undefined;
      const single = req.file;
      const file = files?.file?.[0] ?? single;
      const companionFile = files?.companionFile?.[0];
      if (!file) throw new AppError(400, 'PDF file is required');
      if (file.mimetype !== 'application/pdf') throw new AppError(400, 'Only PDF uploads are supported');

      const parsed = bookMetaSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Invalid metadata');

      const { sourceUrl, extractionOptions, companionBookId, uploadPair, ...rest } = parsed.data;
      let options: Record<string, unknown> | undefined;
      if (extractionOptions) {
        try {
          options = JSON.parse(extractionOptions) as Record<string, unknown>;
        } catch {
          throw new AppError(400, 'Invalid extractionOptions JSON');
        }
      }

      if (companionFile) {
        if (companionFile.mimetype !== 'application/pdf') {
          throw new AppError(400, 'Companion file must be a PDF');
        }
        const { documentType: _docType, ...pairMeta } = rest;
        const pair = await bookService.createBookPairFromUpload({
          teachersGuideFile: rest.documentType === 'pupils_book' ? companionFile : file,
          pupilsBookFile: rest.documentType === 'pupils_book' ? file : companionFile,
          metadata: {
            ...pairMeta,
            sourceUrl: sourceUrl || undefined,
            extractionOptions: options,
          },
          actor: { id: req.user?.sub, email: req.user?.email },
        });
        res.status(201).json({
          success: true,
          data: {
            book: pair.teachersGuide.book,
            job: pair.teachersGuide.job,
            pupilsBook: pair.pupilsBook.book,
            pupilsBookJob: pair.pupilsBook.job,
            paired: true,
          },
        });
        return;
      }

      const result = await bookService.createBookFromUpload({
        file,
        metadata: {
          ...rest,
          sourceUrl: sourceUrl || undefined,
          extractionOptions: options,
          companionBookId: uploadPair === 'true' ? undefined : companionBookId,
        },
        actor: { id: req.user?.sub, email: req.user?.email },
      });
      res.status(201).json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async setBookStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = z.nativeEnum(CurriculumProcessingStatus).parse(req.body.status);
      const book = await bookService.updateBookStatus(paramString(req.params.id), status, {
        id: req.user?.sub,
        email: req.user?.email,
      });
      res.json({ success: true, data: book });
    } catch (e) {
      next(e);
    }
  },

  async getBookTree(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tree = await treeService.getAdminBookTree(paramString(req.params.id));
      res.json({ success: true, data: tree });
    } catch (e) {
      next(e);
    }
  },

  async getPage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const pageNumber = parseInt(String(req.params.pageNumber), 10);
      const page = await getBookPage(paramString(req.params.id), pageNumber);
      res.json({ success: true, data: page });
    } catch (e) {
      next(e);
    }
  },

  async uploadCurriculumPair(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const bookId = paramString(req.params.id);
      const files = req.files as
        | { teachersGuideFile?: Express.Multer.File[]; pupilsBookFile?: Express.Multer.File[] }
        | undefined;
      const tgFile = files?.teachersGuideFile?.[0];
      const pbFile = files?.pupilsBookFile?.[0];
      if (!tgFile && !pbFile) {
        throw new AppError(400, 'Upload Teacher\'s Guide and/or Pupil\'s Book PDF.');
      }
      const data = await bookService.supplementCurriculumPair(
        bookId,
        { teachersGuideFile: tgFile, pupilsBookFile: pbFile },
        { id: req.user?.sub, email: req.user?.email }
      );
      res.status(202).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async reprocess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const bookId = paramString(req.params.id);
      const job = await prisma.curriculumProcessingJob.create({
        data: { bookId, status: 'QUEUED', pipelineStage: 'secure_upload', progress: 0 },
      });
      await prisma.curriculumBook.update({
        where: { id: bookId },
        data: { processingStatus: 'EXTRACTING', processingError: null },
      });
      await enqueuePdfExtraction(job.id);
      res.json({ success: true, data: job });
    } catch (e) {
      next(e);
    }
  },

  async updateUnit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          title: z.string().optional(),
          keyCompetence: z.string().optional(),
          suggestedPeriods: z.coerce.number().optional(),
          sortOrder: z.coerce.number().optional(),
          reviewStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
        })
        .parse(req.body);

      const unit = await prisma.curriculumUnit.update({
        where: { id: paramString(req.params.unitId) },
        data: body,
      });
      res.json({ success: true, data: unit });
    } catch (e) {
      next(e);
    }
  },

  async streamFile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const book = await bookService.getBook(paramString(req.params.id));
      const filePath = resolveBookFilePath(book.fileKey);
      if (!fs.existsSync(filePath)) throw new AppError(404, 'PDF file not found on server');
      res.setHeader('Content-Type', book.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(book.fileKey)}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      next(e);
    }
  },

  async validationReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const report = await buildExtractionValidationReport(paramString(req.params.id));
      res.json({ success: true, data: report });
    } catch (e) {
      next(e);
    }
  },

  async applyStructure(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const bookId = paramString(req.params.id);
      const job = await prisma.curriculumProcessingJob.findFirst({
        where: { bookId, status: 'SUCCEEDED' },
        orderBy: { finishedAt: 'desc' },
      });
      if (!job?.result) throw new AppError(400, 'No successful extraction to apply');
      const result = job.result as {
        proposed_units?: Parameters<typeof applyStructuredCurriculum>[1]['proposed_units'];
        proposed_lessons?: Parameters<typeof applyStructuredCurriculum>[1]['proposed_lessons'];
      };
      const applied = await applyStructuredCurriculum(
        bookId,
        {
          proposed_units: result.proposed_units,
          proposed_lessons: result.proposed_lessons,
        },
        { replaceExisting: true }
      );
      res.json({ success: true, data: applied });
    } catch (e) {
      next(e);
    }
  },

  async updateLesson(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          title: z.string().optional(),
          lessonNumber: z.string().optional(),
          suggestedPeriods: z.coerce.number().optional(),
          sortOrder: z.coerce.number().optional(),
          materials: z.array(z.string()).optional(),
          reviewStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
        })
        .parse(req.body);

      const lesson = await prisma.curriculumLesson.update({
        where: { id: paramString(req.params.lessonId) },
        data: body,
      });
      res.json({ success: true, data: lesson });
    } catch (e) {
      next(e);
    }
  },
};
