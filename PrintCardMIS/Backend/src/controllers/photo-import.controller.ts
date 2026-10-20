import fs from 'fs';
import path from 'path';
import { Response, NextFunction } from 'express';
import multer from 'multer';
import { ExistingPhotoPolicy } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest, hasPlatformPrintScope } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { env } from '../config/env';
import { safeFilename } from '../services/photo-import/disk';
import {
  buildJobReportBuffer,
  confirmPhotoImportJob,
  createPhotoImportJob,
  getPhotoImportJob,
  listPhotoImportJobs,
} from '../services/photo-import/photo-import.service';

const uploadTmp = path.join(env.IMPORT_ROOT, '_upload_tmp');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      fs.mkdirSync(uploadTmp, { recursive: true });
      cb(null, uploadTmp);
    } catch (err) {
      cb(err as Error, uploadTmp);
    }
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${safeFilename(file.originalname)}`);
  },
});

/** Disk storage — large ZIPs must not be loaded into RAM. */
const upload = multer({
  storage,
  limits: { fileSize: 512 * 1024 * 1024 },
});

export const photoImportUpload = upload.fields([
  { name: 'excel', maxCount: 1 },
  { name: 'zip', maxCount: 1 },
]);

function resolveOrgId(req: AuthenticatedRequest, fromBody?: string): string {
  const fromQuery = typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
  const orgId = fromBody ?? fromQuery ?? req.organizationRef ?? req.user!.organizationId;
  if (!hasPlatformPrintScope(req.user) && orgId !== req.user!.organizationId) {
    throw new AppError(403, 'Cannot access another organization');
  }
  return orgId;
}

function jobSummary(job: Awaited<ReturnType<typeof getPhotoImportJob>>) {
  if (!job) return null;
  const { rows, ...rest } = job;
  const buckets = {
    MATCHED: [] as typeof rows,
    MISSING: [] as typeof rows,
    UNKNOWN: [] as typeof rows,
    DUPLICATE: [] as typeof rows,
    INVALID: [] as typeof rows,
    SKIPPED: [] as typeof rows,
    IMPORTED: [] as typeof rows,
    FAILED: [] as typeof rows,
  };
  for (const row of rows) {
    (buckets[row.status] as typeof rows).push(row);
  }
  return { ...rest, rows, buckets };
}

export const photoImportController = {
  uploadMiddleware: photoImportUpload,

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          organizationId: z.string().min(1),
          photoIdRegex: z.string().optional(),
        })
        .parse(req.body);

      const files = req.files as
        | { excel?: Express.Multer.File[]; zip?: Express.Multer.File[] }
        | undefined;
      const excel = files?.excel?.[0];
      const zip = files?.zip?.[0];
      if (!excel?.path) throw new AppError(400, 'Excel file is required');
      if (!zip?.path) throw new AppError(400, 'ZIP file is required');

      const organizationId = resolveOrgId(req, body.organizationId);
      const job = await createPhotoImportJob({
        organizationId,
        excelPath: excel.path,
        excelOriginalName: excel.originalname || 'students.xlsx',
        zipPath: zip.path,
        zipOriginalName: zip.originalname || 'photos.zip',
        photoIdRegex: body.photoIdRegex,
        createdBy: req.user!.sub,
        createdByEmail: req.user!.email,
      });

      res.status(201).json({ success: true, data: job });
    } catch (error) {
      next(error);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = resolveOrgId(req);
      const data = await listPhotoImportJobs(organizationId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const jobId = String(req.params.id ?? '');
      const organizationId = resolveOrgId(req);
      const job = await getPhotoImportJob(jobId, organizationId);
      if (!job) throw new AppError(404, 'Import job not found');
      res.json({ success: true, data: jobSummary(job) });
    } catch (error) {
      next(error);
    }
  },

  async confirm(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const jobId = String(req.params.id ?? '');
      const organizationId = resolveOrgId(req);
      const body = z
        .object({
          existingPhotoPolicy: z.enum(['ONLY_MISSING', 'REPLACE']).optional(),
        })
        .parse(req.body ?? {});

      const job = await confirmPhotoImportJob(
        jobId,
        organizationId,
        body.existingPhotoPolicy as ExistingPhotoPolicy | undefined
      );
      res.json({ success: true, data: job });
    } catch (error) {
      next(error);
    }
  },

  async report(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const jobId = String(req.params.id ?? '');
      const organizationId = resolveOrgId(req);
      const job = await getPhotoImportJob(jobId, organizationId);
      if (!job) throw new AppError(404, 'Import job not found');
      const buffer = await buildJobReportBuffer(jobId);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="photo-import-${jobId.slice(0, 8)}.xlsx"`
      );
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  },
};
