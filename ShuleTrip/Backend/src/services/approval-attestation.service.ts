import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { env } from '../config/env';

const MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function uploadRoot() {
  return path.resolve(env.UPLOAD_DIR);
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'image';
}

export type AttestationFileInput = {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
};

export class ApprovalAttestationService {
  async savePair(
    organizationId: string,
    tripId: string,
    signature: AttestationFileInput,
    stamp: AttestationFileInput
  ) {
    for (const f of [signature, stamp]) {
      if (f.size > MAX_BYTES) throw new AppError(400, 'Signature or stamp image exceeds 5 MB');
      if (!IMAGE_MIME.has(f.mimetype)) {
        throw new AppError(400, 'Upload signature and stamp as PNG, JPEG, or WebP images');
      }
    }

    const trip = await prisma.trip.findFirst({ where: { id: tripId, organizationId } });
    if (!trip) throw new AppError(404, 'Trip not found');

    const folder = path.join(organizationId, tripId, 'attestations', crypto.randomUUID());
    const sigKey = `${folder}/signature-${safeFileName(signature.originalname)}`;
    const stampKey = `${folder}/stamp-${safeFileName(stamp.originalname)}`;

    await fs.mkdir(path.join(uploadRoot(), folder), { recursive: true });
    await fs.writeFile(path.join(uploadRoot(), sigKey), signature.buffer);
    await fs.writeFile(path.join(uploadRoot(), stampKey), stamp.buffer);

    return {
      signatureStorageKey: sigKey,
      stampStorageKey: stampKey,
      signatureFileName: signature.originalname,
      stampFileName: stamp.originalname,
    };
  }

  async openApprovalAsset(tripId: string, approvalId: string, kind: 'signature' | 'stamp') {
    const approval = await prisma.tripApproval.findFirst({
      where: { id: approvalId, tripId },
    });
    if (!approval) throw new AppError(404, 'Approval record not found');

    const key = kind === 'signature' ? approval.signatureStorageKey : approval.stampStorageKey;
    const fileName = kind === 'signature' ? approval.signatureFileName : approval.stampFileName;
    if (!key) throw new AppError(404, 'No uploaded file for this attestation');

    const absPath = path.join(uploadRoot(), key);
    return { absPath, fileName: fileName ?? `${kind}.png` };
  }
}

export const approvalAttestationService = new ApprovalAttestationService();
