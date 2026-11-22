import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { resolveBookFilePath } from './book.service';
import { applyStructuredCurriculum, type ProposedLesson } from './curriculum-parser.service';
import { mergeCompanionIntelligence } from './companion-merge.service';

async function updateJobProgress(
  jobId: string,
  data: {
    pipelineStage: string;
    progress: number;
    pagesProcessed?: number;
    pagesTotal?: number;
  }
) {
  await prisma.curriculumProcessingJob.update({
    where: { id: jobId },
    data,
  });
}

async function isJobCancelled(jobId: string) {
  const job = await prisma.curriculumProcessingJob.findUnique({ where: { id: jobId } });
  return Boolean(job?.cancelRequested);
}

interface ExtractResult {
  page_count: number;
  pages: Array<{
    page_number: number;
    text: string;
    is_scanned: boolean;
    ocr_applied?: boolean;
    confidence: number;
  }>;
  proposed_units?: Array<{
    unit_number: string;
    title: string;
    source_page_start?: number;
  }>;
  proposed_lessons?: Array<Record<string, unknown>>;
  ocr_pages?: number;
  error?: string;
  pages_file?: string;
}

function loadExtractorPayload(stdout: string): ExtractResult {
  const trimmed = stdout.trim();
  let header: ExtractResult;
  try {
    header = JSON.parse(trimmed) as ExtractResult;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end <= start) {
      throw new Error(
        `Invalid JSON from PDF extractor (${trimmed.length} bytes stdout). Restart the Curriculum API after worker updates.`
      );
    }
    header = JSON.parse(trimmed.slice(start, end + 1)) as ExtractResult;
  }

  if (header.pages_file && fs.existsSync(header.pages_file)) {
    try {
      const full = JSON.parse(fs.readFileSync(header.pages_file, 'utf8')) as ExtractResult;
      header.pages = full.pages ?? [];
      header.page_count = full.page_count ?? header.page_count;
      if (full.proposed_units) header.proposed_units = full.proposed_units;
      if (full.proposed_lessons) header.proposed_lessons = full.proposed_lessons;
      if (full.ocr_pages != null) header.ocr_pages = full.ocr_pages;
    } finally {
      try {
        fs.unlinkSync(header.pages_file);
      } catch {
        /* ignore cleanup */
      }
    }
  }

  if (!header.pages) header.pages = [];
  return header;
}

function runPythonExtractor(pdfPath: string, documentType?: string | null): Promise<ExtractResult> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(env.PDF_EXTRACT_SCRIPT)) {
      return resolve({
        page_count: 0,
        pages: [],
        error: 'PDF extract script not found — manual curriculum entry required.',
      });
    }

    const args = [env.PDF_EXTRACT_SCRIPT, pdfPath];
    if (!env.OCR_ENABLED) args.push('--no-ocr');
    const docType = documentType === 'pupils_book' ? 'pupils_book' : 'teachers_guide';
    args.push(`--doc-type=${docType}`);

    const proc = spawn(env.PYTHON_BIN, args, {
      cwd: path.dirname(env.PDF_EXTRACT_SCRIPT),
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
      },
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
        return reject(new Error(stderr || `Python extractor exited ${code}`));
      }
      try {
        resolve(loadExtractorPayload(stdout));
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Invalid JSON from PDF extractor'));
      }
    });
  });
}

export async function runPdfExtractionJob(jobId: string) {
  const job = await prisma.curriculumProcessingJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  const book = await prisma.curriculumBook.findUnique({ where: { id: job.bookId } });
  if (!book) return;

  await prisma.curriculumProcessingJob.update({
    where: { id: jobId },
    data: {
      status: 'RUNNING',
      startedAt: new Date(),
      attempts: { increment: 1 },
      pipelineStage: 'secure_upload',
      progress: 10,
    },
  });
  await prisma.curriculumBook.update({
    where: { id: book.id },
    data: { processingStatus: 'EXTRACTING', processingError: null },
  });

  try {
    if (await isJobCancelled(jobId)) {
      await prisma.curriculumProcessingJob.update({
        where: { id: jobId },
        data: { status: 'CANCELLED', finishedAt: new Date() },
      });
      return;
    }

    await updateJobProgress(jobId, { pipelineStage: 'pdf_analysis', progress: 15 });

    const pdfPath = resolveBookFilePath(book.fileKey);
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file missing on disk: ${book.fileKey}`);
    }

    const result = await runPythonExtractor(pdfPath, book.documentType);

    if (result.page_count && result.page_count > env.MAX_PDF_PAGES) {
      throw new Error(`PDF has ${result.page_count} pages; limit is ${env.MAX_PDF_PAGES}.`);
    }

    await updateJobProgress(jobId, {
      pipelineStage: 'ai_structuring',
      progress: 40,
      pagesTotal: result.page_count || result.pages.length,
    });

    if (result.error && !result.pages.length) {
      await prisma.curriculumBook.update({
        where: { id: book.id },
        data: {
          processingStatus: 'NEEDS_REVIEW',
          processingError: result.error,
          extractionSummary: result as unknown as Prisma.InputJsonValue,
        },
      });
      await prisma.curriculumProcessingJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          lastError: result.error,
          finishedAt: new Date(),
          result: result as unknown as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const total = result.pages.length || 1;
    for (let i = 0; i < result.pages.length; i++) {
      if (await isJobCancelled(jobId)) {
        await prisma.curriculumProcessingJob.update({
          where: { id: jobId },
          data: { status: 'CANCELLED', finishedAt: new Date() },
        });
        await prisma.curriculumBook.update({
          where: { id: book.id },
          data: { processingStatus: 'UPLOADED' },
        });
        return;
      }

      const page = result.pages[i];
      await prisma.curriculumDocumentPage.upsert({
        where: {
          bookId_pageNumber: { bookId: book.id, pageNumber: page.page_number },
        },
        create: {
          bookId: book.id,
          pageNumber: page.page_number,
          textContent: page.text,
          isScanned: page.is_scanned,
          ocrApplied: Boolean(page.ocr_applied),
          extractionConfidence: page.confidence,
          needsManualReview: page.is_scanned || page.confidence < 0.65,
        },
        update: {
          textContent: page.text,
          isScanned: page.is_scanned,
          ocrApplied: Boolean(page.ocr_applied),
          extractionConfidence: page.confidence,
          needsManualReview: page.is_scanned || page.confidence < 0.65,
        },
      });
      if (i % 5 === 0) {
        await updateJobProgress(jobId, {
          pipelineStage: 'pdf_analysis',
          progress: Math.min(75, 40 + Math.round(((i + 1) / total) * 35)),
          pagesProcessed: i + 1,
          pagesTotal: total,
        });
      }
    }

    await updateJobProgress(jobId, { pipelineStage: 'validation', progress: 85, pagesProcessed: total, pagesTotal: total });

    const lowConfidence = result.pages.filter((p) => p.confidence < 0.65 || p.is_scanned).length;

    let structureResult: { unitsCreated: number; lessonsCreated: number; message?: string } = {
      unitsCreated: 0,
      lessonsCreated: 0,
    };
    if ((result.proposed_units?.length ?? 0) > 0 || (result.proposed_lessons?.length ?? 0) > 0) {
      structureResult = await applyStructuredCurriculum(
        book.id,
        {
          proposed_units: result.proposed_units,
          proposed_lessons: result.proposed_lessons as ProposedLesson[] | undefined,
        },
        { replaceExisting: book.processingStatus !== 'PUBLISHED' }
      );
    }

    let companionMerge: { merged?: number; skipped?: boolean; tgId?: string; pbId?: string } | null = null;
    if (book.companionBookId || book.documentType === 'pupils_book') {
      try {
        companionMerge = await mergeCompanionIntelligence(book.id, {
          triggerLessons: result.proposed_lessons as ProposedLesson[] | undefined,
          triggerDocType: book.documentType,
        });
      } catch (mergeErr) {
        companionMerge = {
          skipped: true,
          merged: 0,
        };
        console.warn('[companion-merge]', mergeErr);
      }
    }

    await updateJobProgress(jobId, { pipelineStage: 'ready_review', progress: 95 });

    await prisma.curriculumBook.update({
      where: { id: book.id },
      data: {
        pageCount: result.page_count || result.pages.length,
        processingStatus: 'NEEDS_REVIEW',
        extractionSummary: {
          pageCount: result.page_count,
          lowConfidencePages: lowConfidence,
          ocrPages: result.ocr_pages ?? 0,
          proposedUnits: result.proposed_units ?? [],
          proposedLessons: result.proposed_lessons ?? [],
          structureApplied: structureResult,
          companionMerge,
          extractionEngine: 'shuleplus-extract-v2',
        } as Prisma.InputJsonValue,
      },
    });

    await prisma.curriculumProcessingJob.update({
      where: { id: jobId },
      data: {
        status: 'SUCCEEDED',
        progress: 100,
        finishedAt: new Date(),
        result: result as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Extraction failed';
    await prisma.curriculumBook.update({
      where: { id: book.id },
      data: { processingStatus: 'FAILED', processingError: message },
    });
    await prisma.curriculumProcessingJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', lastError: message, finishedAt: new Date() },
    });
  }
}

export async function getBookPage(bookId: string, pageNumber: number) {
  return prisma.curriculumDocumentPage.findUnique({
    where: { bookId_pageNumber: { bookId, pageNumber } },
  });
}
