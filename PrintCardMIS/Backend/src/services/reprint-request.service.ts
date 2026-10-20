import {
  CardStatus,
  PersonKind,
  Prisma,
  ReprintReason,
  ReprintRequestStatus,
} from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import type { JwtPayload } from '../middleware/auth.middleware';
import { hasPlatformPrintScope } from '../middleware/auth.middleware';
import { getCardRecordById } from './card-record.service';

function assertOrgAccess(user: JwtPayload, organizationId: string) {
  if (hasPlatformPrintScope(user)) return;
  if (user.organizationId !== organizationId) {
    throw new AppError(403, 'You can only access your organization');
  }
}

export async function createReprintRequest(
  user: JwtPayload,
  input: {
    organizationId: string;
    cardRecordId: string;
    reason: ReprintReason;
    description?: string;
  }
) {
  assertOrgAccess(user, input.organizationId);

  const card = await getCardRecordById(input.cardRecordId, input.organizationId);
  if (!card) throw new AppError(404, 'Card not found');

  const existing = await prisma.reprintRequest.findFirst({
    where: {
      cardRecordId: card.id,
      status: { in: [ReprintRequestStatus.PENDING, ReprintRequestStatus.APPROVED] },
    },
  });
  if (existing) throw new AppError(409, 'A reprint request is already open for this card');

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.reprintRequest.create({
      data: {
        organizationId: input.organizationId,
        cardRecordId: card.id,
        personKind: card.personKind,
        reason: input.reason,
        description: input.description?.trim() || null,
        requestedBy: user.sub,
        requestedByEmail: user.email,
      },
      include: { cardRecord: true },
    });

    if (card.status !== CardStatus.REPRINT_REQUIRED) {
      await tx.cardRecord.update({
        where: { id: card.id },
        data: { status: CardStatus.REPRINT_REQUIRED },
      });
    }

    await tx.printEvent.create({
      data: {
        organizationId: input.organizationId,
        cardRecordId: card.id,
        eventType: 'REPRINT_REQUESTED',
        result: 'SUCCESS',
        performedBy: user.sub,
        performedByEmail: user.email,
        metadata: { reason: input.reason },
      },
    });

    return created;
  });

  return request;
}

export async function listReprintRequests(
  user: JwtPayload,
  filters?: {
    organizationId?: string;
    status?: ReprintRequestStatus;
    personKind?: PersonKind;
    reason?: ReprintReason;
  }
) {
  const where: Prisma.ReprintRequestWhereInput = {};

  if (hasPlatformPrintScope(user)) {
    if (filters?.organizationId) where.organizationId = filters.organizationId;
  } else {
    where.organizationId = user.organizationId;
  }

  if (filters?.status) where.status = filters.status;
  if (filters?.personKind) where.personKind = filters.personKind;
  if (filters?.reason) where.reason = filters.reason;

  return prisma.reprintRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { cardRecord: true },
    take: 200,
  });
}

export async function reviewReprintRequest(
  user: JwtPayload,
  requestId: string,
  action: 'APPROVE' | 'REJECT',
  rejectionReason?: string
) {
  if (!hasPlatformPrintScope(user)) {
    throw new AppError(403, 'Only platform administrators can review reprint requests');
  }

  const request = await prisma.reprintRequest.findUnique({
    where: { id: requestId },
    include: { cardRecord: true },
  });
  if (!request) throw new AppError(404, 'Reprint request not found');
  if (request.status !== ReprintRequestStatus.PENDING) {
    throw new AppError(400, 'Request has already been reviewed');
  }

  if (action === 'REJECT') {
    const reason = rejectionReason?.trim();
    if (!reason) throw new AppError(400, 'Rejection reason is required');

    return prisma.reprintRequest.update({
      where: { id: requestId },
      data: {
        status: ReprintRequestStatus.REJECTED,
        reviewedBy: user.sub,
        reviewedByEmail: user.email,
        rejectionReason: reason,
        reviewedAt: new Date(),
      },
      include: { cardRecord: true },
    });
  }

  return prisma.reprintRequest.update({
    where: { id: requestId },
    data: {
      status: ReprintRequestStatus.APPROVED,
      reviewedBy: user.sub,
      reviewedByEmail: user.email,
      reviewedAt: new Date(),
    },
    include: { cardRecord: true },
  });
}

export async function completeReprintRequest(user: JwtPayload, requestId: string) {
  if (!hasPlatformPrintScope(user)) {
    throw new AppError(403, 'Only platform administrators can complete reprint requests');
  }

  const request = await prisma.reprintRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError(404, 'Reprint request not found');
  if (request.status !== ReprintRequestStatus.APPROVED && request.status !== ReprintRequestStatus.PRINTED) {
    throw new AppError(400, 'Request must be approved or printed before completion');
  }

  return prisma.reprintRequest.update({
    where: { id: requestId },
    data: {
      status: ReprintRequestStatus.COMPLETED,
      completedAt: new Date(),
    },
    include: { cardRecord: true },
  });
}
