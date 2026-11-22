import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { env } from '../config/env';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
]);

function uploadRoot() {
  return path.resolve(env.UPLOAD_DIR);
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'document';
}

async function removeStoredFile(storageKey: string | null | undefined) {
  if (!storageKey) return;
  const abs = path.join(uploadRoot(), storageKey);
  try {
    await fs.unlink(abs);
  } catch {
    /* ignore missing */
  }
}

export class TripDocumentFileService {
  async upload(
    organizationId: string,
    tripId: string,
    documentType: string,
    file: { originalname: string; buffer: Buffer; mimetype: string; size: number }
  ) {
    if (!documentType.trim()) throw new AppError(400, 'documentType is required');
    if (file.size > MAX_BYTES) throw new AppError(400, 'File exceeds 10 MB limit');
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new AppError(400, 'File type not allowed. Use PDF, Word, or image.');
    }

    const trip = await prisma.trip.findFirst({ where: { id: tripId, organizationId } });
    if (!trip) throw new AppError(404, 'Trip not found');
    if (trip.status !== 'DRAFT' && trip.status !== 'CORRECTION_REQUESTED') {
      throw new AppError(409, 'Documents can only be uploaded while the trip is draft or under correction');
    }

    const storageKey = [organizationId, tripId, `${crypto.randomUUID()}-${safeFileName(file.originalname)}`].join('/');
    const absPath = path.join(uploadRoot(), storageKey);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, file.buffer);

    const existing = await prisma.tripDocument.findFirst({
      where: { tripId, documentType: documentType.trim() },
    });

    if (existing) {
      await removeStoredFile(existing.storageKey);
      return prisma.tripDocument.update({
        where: { id: existing.id },
        data: {
          fileName: file.originalname,
          storageKey,
          verificationStatus: 'NOT_REVIEWED',
        },
      });
    }

    return prisma.tripDocument.create({
      data: {
        tripId,
        documentType: documentType.trim(),
        fileName: file.originalname,
        storageKey,
      },
    });
  }

  async openForTrip(tripId: string, documentId: string) {
    const doc = await prisma.tripDocument.findFirst({
      where: { id: documentId, tripId },
      include: { trip: { select: { organizationId: true } } },
    });
    if (!doc) throw new AppError(404, 'Document not found');
    if (!doc.storageKey) throw new AppError(404, 'No file stored for this document — re-upload from the school portal');

    const absPath = path.join(uploadRoot(), doc.storageKey);
    try {
      await fs.access(absPath);
    } catch {
      throw new AppError(404, 'File missing on server — ask the school to upload again');
    }

    return { doc, absPath };
  }
}

export const tripDocumentFileService = new TripDocumentFileService();
