import { ProcessingJobStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { enqueuePdfExtraction } from './job-queue.service';

export async function getPlatformOverview() {
  const [books, jobs, recentJobs, needsReview] = await Promise.all([
    prisma.curriculumBook.groupBy({
      by: ['processingStatus'],
      _count: { _all: true },
    }),
    prisma.curriculumProcessingJob.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.curriculumProcessingJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            subject: true,
            grade: true,
            educationLevel: true,
            processingStatus: true,
          },
        },
      },
    }),
    prisma.curriculumBook.count({ where: { processingStatus: 'NEEDS_REVIEW' } }),
  ]);

  const bookCounts: Record<string, number> = {};
  for (const row of books) {
    bookCounts[row.processingStatus] = row._count._all;
  }

  const jobCounts: Record<string, number> = {};
  for (const row of jobs) {
    jobCounts[row.status] = row._count._all;
  }

  const totalBooks = Object.values(bookCounts).reduce((a, b) => a + b, 0);

  return {
    books: {
      total: totalBooks,
      uploaded: bookCounts.UPLOADED ?? 0,
      extracting: bookCounts.EXTRACTING ?? 0,
      needsReview: bookCounts.NEEDS_REVIEW ?? 0,
      approved: bookCounts.APPROVED ?? 0,
      published: bookCounts.PUBLISHED ?? 0,
      failed: bookCounts.FAILED ?? 0,
      archived: bookCounts.ARCHIVED ?? 0,
    },
    jobs: {
      queued: jobCounts.QUEUED ?? 0,
      running: jobCounts.RUNNING ?? 0,
      succeeded: jobCounts.SUCCEEDED ?? 0,
      failed: jobCounts.FAILED ?? 0,
      cancelled: jobCounts.CANCELLED ?? 0,
    },
    reviewTasks: needsReview,
    recentJobs,
  };
}

export async function listProcessingJobs(filters?: {
  status?: ProcessingJobStatus;
  limit?: number;
}) {
  return prisma.curriculumProcessingJob.findMany({
    where: filters?.status ? { status: filters.status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: filters?.limit ?? 50,
    include: {
      book: {
        select: {
          id: true,
          title: true,
          subject: true,
          grade: true,
          educationLevel: true,
          documentType: true,
          processingStatus: true,
          pageCount: true,
        },
      },
    },
  });
}

export async function cancelProcessingJob(jobId: string, actor?: { id?: string; email?: string }) {
  const job = await prisma.curriculumProcessingJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error('Job not found');
  if (job.status === 'SUCCEEDED' || job.status === 'CANCELLED') {
    throw new Error('Job cannot be cancelled');
  }

  await prisma.curriculumProcessingJob.update({
    where: { id: jobId },
    data: {
      cancelRequested: true,
      status: job.status === 'QUEUED' ? 'CANCELLED' : job.status,
      lastError: job.status === 'QUEUED' ? 'Cancelled by administrator' : job.lastError,
      finishedAt: job.status === 'QUEUED' ? new Date() : undefined,
    },
  });

  if (job.status === 'QUEUED') {
    await prisma.curriculumBook.update({
      where: { id: job.bookId },
      data: { processingStatus: 'UPLOADED' },
    });
  }

  await prisma.platformActivityLog.create({
    data: {
      actorId: actor?.id,
      actorEmail: actor?.email,
      action: 'curriculum_job_cancel',
      entityType: 'CurriculumProcessingJob',
      entityId: jobId,
    },
  });

  return { cancelled: true };
}

export async function retryProcessingJob(jobId: string, actor?: { id?: string; email?: string }) {
  const job = await prisma.curriculumProcessingJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error('Job not found');
  if (job.status === 'RUNNING') throw new Error('Job is still running');

  const newJob = await prisma.curriculumProcessingJob.create({
    data: {
      bookId: job.bookId,
      status: 'QUEUED',
      pipelineStage: 'secure_upload',
    },
  });

  await prisma.platformActivityLog.create({
    data: {
      actorId: actor?.id,
      actorEmail: actor?.email,
      action: 'curriculum_job_retry',
      entityType: 'CurriculumProcessingJob',
      entityId: newJob.id,
      metadata: { retriedFrom: jobId },
    },
  });

  void enqueuePdfExtraction(newJob.id);
  return newJob;
}
