import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import sharp from 'sharp';
import {
  ExistingPhotoPolicy,
  PhotoImportJobStatus,
  PhotoImportRowStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { upstreamClients, type PrintCardStudent } from '../../clients/upstream.client';
import { ensureOrgImportDirs, jobWorkDir, moveDir, pathExists, safeFilename } from './disk';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff']);
const MIN_DIM = 80;
const MAX_BYTES = 25 * 1024 * 1024;

export type PhotoImportStats = {
  excelRows: number;
  photosInZip: number;
  matched: number;
  missing: number;
  unknown: number;
  duplicate: number;
  invalid: number;
  skipped: number;
  imported: number;
  failed: number;
  processed: number;
};

type ExcelStudentRow = {
  photoId: string;
  studentCode: string | null;
  studentName: string | null;
};

type ZipPhoto = {
  photoId: string;
  fileName: string;
  relativePath: string;
  absolutePath: string;
  hash: string;
  bytes: number;
  width?: number;
  height?: number;
  valid: boolean;
  message?: string;
};

function emptyStats(): PhotoImportStats {
  return {
    excelRows: 0,
    photosInZip: 0,
    matched: 0,
    missing: 0,
    unknown: 0,
    duplicate: 0,
    invalid: 0,
    skipped: 0,
    imported: 0,
    failed: 0,
    processed: 0,
  };
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function cellString(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function normalizePersonName(value: string | null | undefined): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Camera prefixes differ by school (ANMP0059, 2L7A2738, …).
 * Match only on the trailing number: Excel 2738 ↔ 2L7A2738.JPG, Excel 59 ↔ ANMP0059.png.
 */
function extractNumericPhotoId(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    return String(parseInt(s, 10));
  }
  // Trailing digit run (preferred): 2L7A2738 → 2738, ANMP0059 → 59
  const trailing = s.match(/(\d+)\s*$/);
  if (trailing?.[1]) {
    return String(parseInt(trailing[1], 10));
  }
  const groups = s.match(/\d+/g);
  if (!groups?.length) return null;
  // Prefer the longest digit group (camera serial), not tiny prefix digits like "2" in 2L7A…
  const sorted = [...groups].sort((a, b) => b.length - a.length || groups.indexOf(b) - groups.indexOf(a));
  const pick = sorted.find((g) => g.length >= 3) ?? groups[groups.length - 1]!;
  return String(parseInt(pick, 10));
}

/** Stable match keys — numeric id only (plus zero-padded variants for loose Excel). */
function photoIdMatchKeys(raw: string | null | undefined): string[] {
  const n = extractNumericPhotoId(raw);
  if (!n) return [];
  const keys = new Set<string>([n]);
  if (n.length < 4) keys.add(n.padStart(4, '0'));
  if (n.length < 3) keys.add(n.padStart(3, '0'));
  return [...keys];
}

function pickColumn(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const want = normalizeHeader(alias);
    if (!want) continue;
    const idx = normalized.indexOf(want);
    if (idx >= 0) return idx;
  }
  return -1;
}

function findHeaderRow(rows: unknown[][]): { headerRow: string[]; dataStart: number } {
  const maxScan = Math.min(rows.length, 12);
  for (let i = 0; i < maxScan; i++) {
    const headerRow = (rows[i] ?? []).map((c) => cellString(c));
    const photoIdx = pickColumn(headerRow, [
      'photoid',
      'photo id',
      'photo_id',
      'photoid',
      'cameraid',
      'camera id',
      'imageid',
      'image id',
    ]);
    const nameIdx = pickColumn(headerRow, [
      'fullnames',
      'full names',
      'fullname',
      'fullname',
      'names',
      'studentname',
      'student name',
      'learnersnames',
      'learner names',
    ]);
    if (photoIdx >= 0 || nameIdx >= 0) {
      return { headerRow, dataStart: i + 1 };
    }
  }
  return { headerRow: (rows[0] ?? []).map((c) => cellString(c)), dataStart: 1 };
}

export function parseExcelStudents(buffer: Buffer): ExcelStudentRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown as unknown[][];

  if (!rows.length) return [];

  const { headerRow, dataStart } = findHeaderRow(rows);
  const photoIdx = pickColumn(headerRow, [
    'photoid',
    'photo id',
    'photo_id',
    'cameraid',
    'camera id',
    'imageid',
    'image id',
  ]);
  const codeIdx = pickColumn(headerRow, [
    'studentcode',
    'student code',
    'student_code',
    'sdmscode',
    'sdms code',
    'sdmscode',
    'sdms',
    'admissionnumber',
    'admission number',
    'code',
  ]);
  const nameIdx = pickColumn(headerRow, [
    'fullnames',
    'full names',
    'fullname',
    'fullname',
    'names',
    'studentname',
    'student name',
    'learnersnames',
    'learner names',
  ]);

  if (photoIdx < 0) {
    throw new Error(
      'Excel must include a PHOTO ID column (e.g. "PHOTO ID"). Names-only sheets cannot match camera files. Use babyclasssystemupload.xlsx style: Full names + PHOTO ID.'
    );
  }

  const out: ExcelStudentRow[] = [];
  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const photoIdRaw = cellString(row[photoIdx]);
    const studentCode = codeIdx >= 0 ? cellString(row[codeIdx]) : '';
    const studentName = nameIdx >= 0 ? cellString(row[nameIdx]) : '';
    if (!photoIdRaw && !studentName && !studentCode) continue;
    if (/^class\b/i.test(studentName) && !photoIdRaw) continue;
    out.push({
      photoId: photoIdRaw,
      studentCode: studentCode || null,
      studentName: studentName || null,
    });
  }
  if (!out.some((r) => extractNumericPhotoId(r.photoId))) {
    throw new Error(
      'Excel PHOTO ID column is empty. Fill numeric Photo IDs (e.g. 2738) that match the end of filenames (2L7A2738.JPG).'
    );
  }
  return out;
}

function extractPhotoIdFromFilename(fileName: string, _photoIdRegex?: string): string | null {
  const stem = path.basename(fileName, path.extname(fileName));
  // Always prefer the numeric camera id; ignore school-specific prefixes (ANMP, 2L7A, …).
  return extractNumericPhotoId(stem) ?? stem.toUpperCase();
}

function indexStudents(students: PrintCardStudent[]) {
  const byPhotoId = new Map<string, PrintCardStudent>();
  const byCode = new Map<string, PrintCardStudent>();
  const byName = new Map<string, PrintCardStudent>();
  for (const s of students) {
    const code = (s.studentCode || '').trim().toUpperCase();
    if (code) byCode.set(code, s);
    for (const key of photoIdMatchKeys(s.photoId)) {
      byPhotoId.set(key, s);
    }
    const name = normalizePersonName(s.fullName);
    if (name) byName.set(name, s);
  }
  return { byPhotoId, byCode, byName };
}

function resolveStudent(
  excel: ExcelStudentRow,
  indexes: ReturnType<typeof indexStudents>
): PrintCardStudent | undefined {
  for (const key of photoIdMatchKeys(excel.photoId)) {
    const hit = indexes.byPhotoId.get(key);
    if (hit) return hit;
  }
  const code = (excel.studentCode || '').trim().toUpperCase();
  if (code && indexes.byCode.get(code)) return indexes.byCode.get(code);
  const name = normalizePersonName(excel.studentName);
  if (name && indexes.byName.get(name)) return indexes.byName.get(name);
  return undefined;
}

function indexZipPhotos(photos: ZipPhoto[]) {
  const photosById = new Map<string, ZipPhoto[]>();
  const add = (key: string, photo: ZipPhoto) => {
    if (!key) return;
    const list = photosById.get(key) ?? [];
    if (list.some((p) => p.absolutePath === photo.absolutePath)) return;
    list.push(photo);
    photosById.set(key, list);
  };
  for (const photo of photos) {
    for (const key of photoIdMatchKeys(photo.photoId)) add(key, photo);
    for (const key of photoIdMatchKeys(path.parse(photo.fileName).name)) add(key, photo);
  }
  return photosById;
}

function lookupZipPhotos(photosById: Map<string, ZipPhoto[]>, photoId: string): ZipPhoto[] {
  const seen = new Set<string>();
  const out: ZipPhoto[] = [];
  for (const key of photoIdMatchKeys(photoId)) {
    for (const photo of photosById.get(key) ?? []) {
      if (seen.has(photo.absolutePath)) continue;
      seen.add(photo.absolutePath);
      out.push(photo);
    }
  }
  return out;
}

async function hashFile(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function extractZipImages(
  zipPath: string,
  destDir: string,
  photoIdRegex: string
): Promise<ZipPhoto[]> {
  await fs.mkdir(destDir, { recursive: true });
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries().filter((e) => !e.isDirectory);
  const photos: ZipPhoto[] = [];

  for (const entry of entries) {
    const name = entry.entryName.replace(/\\/g, '/');
    if (name.includes('__MACOSX/') || name.split('/').some((p) => p.startsWith('.'))) continue;
    const ext = path.extname(name).toLowerCase();
    if (!IMAGE_EXT.has(ext)) continue;

    const base = safeFilename(path.basename(name));
    const absolutePath = path.join(destDir, base);
    const data = entry.getData();
    if (data.length > MAX_BYTES) {
      photos.push({
        photoId: extractPhotoIdFromFilename(base, photoIdRegex) ?? base,
        fileName: base,
        relativePath: name,
        absolutePath,
        hash: '',
        bytes: data.length,
        valid: false,
        message: 'File exceeds 25 MB',
      });
      continue;
    }

    await fs.writeFile(absolutePath, data);
    const photoId = extractPhotoIdFromFilename(base, photoIdRegex);
    let valid = true;
    let message: string | undefined;
    let width: number | undefined;
    let height: number | undefined;
    try {
      const meta = await sharp(absolutePath).metadata();
      width = meta.width;
      height = meta.height;
      if (!width || !height || width < MIN_DIM || height < MIN_DIM) {
        valid = false;
        message = `Image too small (${width ?? 0}x${height ?? 0})`;
      }
    } catch {
      valid = false;
      message = 'Unreadable image file';
    }

    const hash = valid ? await hashFile(absolutePath) : '';
    photos.push({
      photoId: (photoId ?? path.parse(base).name).toUpperCase(),
      fileName: base,
      relativePath: name,
      absolutePath,
      hash,
      bytes: data.length,
      width,
      height,
      valid,
      message,
    });
  }

  return photos;
}

function recountStats(rows: { status: PhotoImportRowStatus }[]): PhotoImportStats {
  const stats = emptyStats();
  for (const row of rows) {
    switch (row.status) {
      case 'MATCHED':
        stats.matched += 1;
        break;
      case 'MISSING':
        stats.missing += 1;
        break;
      case 'UNKNOWN':
        stats.unknown += 1;
        break;
      case 'DUPLICATE':
        stats.duplicate += 1;
        break;
      case 'INVALID':
        stats.invalid += 1;
        break;
      case 'SKIPPED':
        stats.skipped += 1;
        break;
      case 'IMPORTED':
        stats.imported += 1;
        break;
      case 'FAILED':
        stats.failed += 1;
        break;
      default:
        break;
    }
  }
  return stats;
}

export async function createPhotoImportJob(input: {
  organizationId: string;
  excelOriginalName: string;
  zipOriginalName: string;
  /** Prefer disk paths for large ZIPs (avoids loading into RAM). */
  excelPath?: string;
  zipPath?: string;
  excelBuffer?: Buffer;
  zipBuffer?: Buffer;
  photoIdRegex?: string;
  createdBy: string;
  createdByEmail?: string | null;
}) {
  const dirs = await ensureOrgImportDirs(input.organizationId);
  const jobId = crypto.randomUUID();
  const stamp = Date.now();
  const excelName = `${stamp}-${safeFilename(input.excelOriginalName)}`;
  const zipName = `${stamp}-${safeFilename(input.zipOriginalName)}`;
  const excelPath = path.join(dirs.incoming, excelName);
  const zipPath = path.join(dirs.incoming, zipName);

  if (input.excelPath) {
    await moveDir(input.excelPath, excelPath);
  } else if (input.excelBuffer) {
    await fs.writeFile(excelPath, input.excelBuffer);
  } else {
    throw new Error('Excel file is required');
  }

  if (input.zipPath) {
    await moveDir(input.zipPath, zipPath);
  } else if (input.zipBuffer) {
    await fs.writeFile(zipPath, input.zipBuffer);
  } else {
    throw new Error('ZIP file is required');
  }

  const job = await prisma.photoImportJob.create({
    data: {
      id: jobId,
      organizationId: input.organizationId,
      status: PhotoImportJobStatus.QUEUED,
      excelPath,
      zipPath,
      photoIdRegex: input.photoIdRegex?.trim() || 'numbers-only',
      createdBy: input.createdBy,
      createdByEmail: input.createdByEmail ?? null,
      stats: emptyStats() as unknown as Prisma.InputJsonValue,
    },
  });

  return job;
}

export async function analyzePhotoImportJob(jobId: string): Promise<void> {
  const job = await prisma.photoImportJob.findUnique({ where: { id: jobId } });
  if (!job || !job.excelPath || !job.zipPath) return;
  if (job.status !== PhotoImportJobStatus.QUEUED && job.status !== PhotoImportJobStatus.FAILED) {
    return;
  }

  await prisma.photoImportJob.update({
    where: { id: jobId },
    data: { status: PhotoImportJobStatus.ANALYZING, errorMessage: null },
  });

  const workDir = jobWorkDir(job.organizationId, job.id);
  const photosDir = path.join(workDir, 'photos');

  try {
    await fs.mkdir(photosDir, { recursive: true });
    await prisma.photoImportRow.deleteMany({ where: { jobId: job.id } });

    const excelBuf = await fs.readFile(job.excelPath);
    const excelRows = parseExcelStudents(excelBuf);
    const zipPhotos = await extractZipImages(job.zipPath, photosDir, job.photoIdRegex);

    const students = await upstreamClients.listStudents(job.organizationId);
    const studentIndex = indexStudents(students);
    const photosById = indexZipPhotos(zipPhotos);

    const hashOwners = new Map<string, string>();
    const rowData: Prisma.PhotoImportRowCreateManyInput[] = [];
    const usedPhotoPaths = new Set<string>();

    for (const excel of excelRows) {
      const photoId = extractNumericPhotoId(excel.photoId) ?? excel.photoId.trim();
      const displayPhotoId = photoId || null;
      const student = resolveStudent(excel, studentIndex);
      const candidates = photoId ? lookupZipPhotos(photosById, photoId) : [];

      if (!photoId) {
        rowData.push({
          jobId: job.id,
          photoId: null,
          studentId: student?.id ?? null,
          studentCode: student?.studentCode ?? excel.studentCode,
          studentName: student?.fullName ?? excel.studentName,
          status: PhotoImportRowStatus.MISSING,
          hasExistingPhoto: Boolean(student?.photoUrl),
          message: 'No Photo ID in Excel',
        });
        continue;
      }

      for (const c of candidates) usedPhotoPaths.add(c.absolutePath);

      if (!candidates.length) {
        rowData.push({
          jobId: job.id,
          photoId: displayPhotoId,
          studentId: student?.id ?? null,
          studentCode: student?.studentCode ?? excel.studentCode,
          studentName: student?.fullName ?? excel.studentName,
          status: PhotoImportRowStatus.MISSING,
          hasExistingPhoto: Boolean(student?.photoUrl),
          message: student
            ? 'No matching photo in ZIP (check PHOTO ID vs filename like ANMP0059.png)'
            : 'Student not found by name and photo missing from ZIP',
        });
        continue;
      }

      if (candidates.length > 1) {
        for (const c of candidates) {
          rowData.push({
            jobId: job.id,
            photoId: displayPhotoId,
            studentId: student?.id ?? null,
            studentCode: student?.studentCode ?? excel.studentCode,
            studentName: student?.fullName ?? excel.studentName,
            status: PhotoImportRowStatus.DUPLICATE,
            fileName: c.fileName,
            filePath: c.absolutePath,
            fileHash: c.hash || null,
            hasExistingPhoto: Boolean(student?.photoUrl),
            message: `Multiple ZIP files for Photo ID ${photoId}`,
          });
        }
        continue;
      }

      const photo = candidates[0]!;
      if (!photo.valid) {
        rowData.push({
          jobId: job.id,
          photoId: displayPhotoId,
          studentId: student?.id ?? null,
          studentCode: student?.studentCode ?? excel.studentCode,
          studentName: student?.fullName ?? excel.studentName,
          status: PhotoImportRowStatus.INVALID,
          fileName: photo.fileName,
          filePath: photo.absolutePath,
          fileHash: photo.hash || null,
          hasExistingPhoto: Boolean(student?.photoUrl),
          message: photo.message ?? 'Invalid image',
        });
        continue;
      }

      if (photo.hash && hashOwners.has(photo.hash)) {
        rowData.push({
          jobId: job.id,
          photoId: displayPhotoId,
          studentId: student?.id ?? null,
          studentCode: student?.studentCode ?? excel.studentCode,
          studentName: student?.fullName ?? excel.studentName,
          status: PhotoImportRowStatus.DUPLICATE,
          fileName: photo.fileName,
          filePath: photo.absolutePath,
          fileHash: photo.hash,
          hasExistingPhoto: Boolean(student?.photoUrl),
          message: `Duplicate image content (same as ${hashOwners.get(photo.hash)})`,
        });
        continue;
      }
      if (photo.hash) hashOwners.set(photo.hash, displayPhotoId ?? photo.fileName);

      if (!student) {
        rowData.push({
          jobId: job.id,
          photoId: displayPhotoId,
          studentCode: excel.studentCode,
          studentName: excel.studentName,
          status: PhotoImportRowStatus.UNKNOWN,
          fileName: photo.fileName,
          filePath: photo.absolutePath,
          fileHash: photo.hash,
          message: 'Photo matched Excel but student not found in Student Management (name match)',
        });
        continue;
      }

      rowData.push({
        jobId: job.id,
        photoId: displayPhotoId,
        studentId: student.id,
        studentCode: student.studentCode ?? excel.studentCode,
        studentName: student.fullName ?? excel.studentName,
        status: PhotoImportRowStatus.MATCHED,
        fileName: photo.fileName,
        filePath: photo.absolutePath,
        fileHash: photo.hash,
        hasExistingPhoto: Boolean(student.photoUrl),
        message: null,
      });
    }

    for (const photo of zipPhotos) {
      if (usedPhotoPaths.has(photo.absolutePath)) continue;
      rowData.push({
        jobId: job.id,
        photoId: photo.photoId,
        status: photo.valid ? PhotoImportRowStatus.UNKNOWN : PhotoImportRowStatus.INVALID,
        fileName: photo.fileName,
        filePath: photo.absolutePath,
        fileHash: photo.hash || null,
        message: photo.valid ? 'Photo in ZIP not listed in Excel' : photo.message ?? 'Invalid image',
      });
    }

    if (rowData.length) {
      await prisma.photoImportRow.createMany({ data: rowData });
    }

    const stats = recountStats(rowData.map((r) => ({ status: r.status as PhotoImportRowStatus })));
    stats.excelRows = excelRows.length;
    stats.photosInZip = zipPhotos.length;

    await prisma.photoImportJob.update({
      where: { id: job.id },
      data: {
        status: PhotoImportJobStatus.READY,
        workDir,
        stats: stats as unknown as Prisma.InputJsonValue,
        errorMessage: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analyze failed';
    await prisma.photoImportJob.update({
      where: { id: job.id },
      data: {
        status: PhotoImportJobStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
      },
    });
    // Drop large ZIP/Excel immediately on failed analyze.
    await purgeJobStagingFiles(job.id);
  }
}

async function mapPool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  let idx = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (idx < items.length) {
      const current = items[idx++];
      if (current !== undefined) await fn(current);
    }
  });
  await Promise.all(workers);
}

export async function importPhotoImportJob(jobId: string): Promise<void> {
  const job = await prisma.photoImportJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== PhotoImportJobStatus.IMPORTING) return;

  const matched = await prisma.photoImportRow.findMany({
    where: { jobId, status: PhotoImportRowStatus.MATCHED },
    orderBy: { createdAt: 'asc' },
  });

  const policy = job.existingPhotoPolicy;
  await mapPool(matched, env.PHOTO_IMPORT_CONCURRENCY, async (row) => {
    try {
      if (policy === ExistingPhotoPolicy.ONLY_MISSING && row.hasExistingPhoto) {
        await prisma.photoImportRow.update({
          where: { id: row.id },
          data: {
            status: PhotoImportRowStatus.SKIPPED,
            message: 'Existing photo kept (ONLY_MISSING)',
          },
        });
        return;
      }
      if (!row.filePath || !(await pathExists(row.filePath))) {
        await prisma.photoImportRow.update({
          where: { id: row.id },
          data: { status: PhotoImportRowStatus.FAILED, message: 'Photo file missing on disk' },
        });
        return;
      }

      const buffer = await fs.readFile(row.filePath);
      const stemPhotoId = row.fileName
        ? path.parse(row.fileName).name.toUpperCase()
        : undefined;
      const result = await upstreamClients.applyStudentPhotos(job.organizationId, {
        existingPhotoPolicy: policy,
        items: [
          {
            studentId: row.studentId ?? undefined,
            studentCode: row.studentCode ?? undefined,
            photoId: stemPhotoId ?? row.photoId ?? undefined,
            fileName: row.fileName ?? undefined,
            photoBase64: buffer.toString('base64'),
          },
        ],
      });

      if (result.failed?.length) {
        throw new Error(result.failed[0]?.message ?? 'Student Management rejected photo');
      }
      if ((result.skipped ?? 0) > 0 && (result.applied ?? 0) === 0) {
        await prisma.photoImportRow.update({
          where: { id: row.id },
          data: {
            status: PhotoImportRowStatus.SKIPPED,
            message: 'Existing photo kept (ONLY_MISSING)',
          },
        });
        return;
      }

      await prisma.photoImportRow.update({
        where: { id: row.id },
        data: { status: PhotoImportRowStatus.IMPORTED, message: null },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      await prisma.photoImportRow.update({
        where: { id: row.id },
        data: { status: PhotoImportRowStatus.FAILED, message },
      });
    }
  });

  const allRows = await prisma.photoImportRow.findMany({
    where: { jobId },
    select: { status: true },
  });
  const finalStats = recountStats(allRows);
  finalStats.excelRows = (job.stats as PhotoImportStats | null)?.excelRows ?? 0;
  finalStats.photosInZip = (job.stats as PhotoImportStats | null)?.photosInZip ?? 0;
  finalStats.processed = finalStats.imported + finalStats.skipped + finalStats.failed;

  await prisma.photoImportJob.update({
    where: { id: job.id },
    data: {
      status: PhotoImportJobStatus.COMPLETED,
      stats: finalStats as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
      errorMessage: null,
    },
  });

  // Free disk immediately — student photos already live in Student Management uploads.
  await purgeJobStagingFiles(job.id);
}

/** Delete Excel/ZIP/extracted photos for a job; DB report rows stay (without file paths). */
export async function purgeJobStagingFiles(jobId: string): Promise<void> {
  const job = await prisma.photoImportJob.findUnique({
    where: { id: jobId },
    select: { id: true, zipPath: true, excelPath: true, workDir: true },
  });
  if (!job) return;

  for (const p of [job.zipPath, job.excelPath, job.workDir]) {
    if (!p) continue;
    try {
      if (await pathExists(p)) {
        await fs.rm(p, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`[photo-import] purge failed for ${p}`, err);
    }
  }

  await prisma.photoImportJob.update({
    where: { id: jobId },
    data: { zipPath: null, excelPath: null, workDir: null },
  });
  await prisma.photoImportRow.updateMany({
    where: { jobId },
    data: { filePath: null },
  });
}

export async function confirmPhotoImportJob(
  jobId: string,
  organizationId: string,
  policy?: ExistingPhotoPolicy
) {
  const job = await prisma.photoImportJob.findFirst({
    where: { id: jobId, organizationId },
  });
  if (!job) throw new Error('Import job not found');
  if (job.status !== PhotoImportJobStatus.READY) {
    throw new Error(`Job cannot be confirmed from status ${job.status}`);
  }

  return prisma.photoImportJob.update({
    where: { id: jobId },
    data: {
      status: PhotoImportJobStatus.IMPORTING,
      existingPhotoPolicy: policy ?? job.existingPhotoPolicy,
      confirmedAt: new Date(),
      errorMessage: null,
    },
  });
}

export async function buildJobReportBuffer(jobId: string): Promise<Buffer> {
  const rows = await prisma.photoImportRow.findMany({
    where: { jobId },
    orderBy: [{ status: 'asc' }, { photoId: 'asc' }],
  });
  const sheetRows = rows.map((r) => ({
    PhotoID: r.photoId ?? '',
    StudentCode: r.studentCode ?? '',
    StudentName: r.studentName ?? '',
    Status: r.status,
    FileName: r.fileName ?? '',
    HasExistingPhoto: r.hasExistingPhoto ? 'Yes' : 'No',
    Message: r.message ?? '',
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Photo Import');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export async function cleanupExpiredImports(): Promise<number> {
  // Immediate: any finished job that still has staging paths on disk.
  const leftover = await prisma.photoImportJob.findMany({
    where: {
      status: { in: [PhotoImportJobStatus.COMPLETED, PhotoImportJobStatus.FAILED] },
      OR: [{ zipPath: { not: null } }, { excelPath: { not: null } }, { workDir: { not: null } }],
    },
    select: { id: true },
    take: 50,
  });
  let cleaned = 0;
  for (const job of leftover) {
    await purgeJobStagingFiles(job.id);
    cleaned += 1;
  }

  // Sweep orphan upload tmp files older than 1 hour.
  const tmpRoot = path.join(env.IMPORT_ROOT, '_upload_tmp');
  if (await pathExists(tmpRoot)) {
    const entries = await fs.readdir(tmpRoot, { withFileTypes: true });
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const entry of entries) {
      const full = path.join(tmpRoot, entry.name);
      try {
        const st = await fs.stat(full);
        if (st.mtimeMs < cutoff) {
          await fs.rm(full, { recursive: true, force: true });
          cleaned += 1;
        }
      } catch {
        /* ignore */
      }
    }
  }

  return cleaned;
}

export async function claimNextAnalyzeJob(): Promise<string | null> {
  const job = await prisma.photoImportJob.findFirst({
    where: { status: PhotoImportJobStatus.QUEUED },
    orderBy: { createdAt: 'asc' },
  });
  return job?.id ?? null;
}

export async function claimNextImportJob(): Promise<string | null> {
  const job = await prisma.photoImportJob.findFirst({
    where: { status: PhotoImportJobStatus.IMPORTING },
    orderBy: { confirmedAt: 'asc' },
  });
  return job?.id ?? null;
}

export async function getPhotoImportJob(jobId: string, organizationId?: string) {
  return prisma.photoImportJob.findFirst({
    where: {
      id: jobId,
      ...(organizationId ? { organizationId } : {}),
    },
    include: {
      rows: {
        orderBy: [{ status: 'asc' }, { photoId: 'asc' }],
      },
    },
  });
}

export async function listPhotoImportJobs(organizationId: string, take = 30) {
  return prisma.photoImportJob.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take,
  });
}
