import {
  CardStatus,
  PersonKind,
  Prisma,
  PrintBatchStatus,
  PrintItemResult,
  PrintType,
  ReprintRequestStatus,
} from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

/** batch_number is globally unique — sequence across all organizations for the year. */
async function nextBatchNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PB-${year}-`;
  const last = await prisma.printBatch.findFirst({
    where: { batchNumber: { startsWith: prefix } },
    orderBy: { batchNumber: 'desc' },
  });
  const lastNum = last ? Number.parseInt(last.batchNumber.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastNum + 1).padStart(5, '0')}`;
}

function isBatchNumberConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002' &&
    Array.isArray(err.meta?.target) &&
    (err.meta.target as string[]).includes('batch_number')
  );
}

export async function createPrintBatch(input: {
  organizationId: string;
  personKind: PersonKind;
  cardRecordIds: string[];
  createdBy: string;
  createdByEmail?: string;
  asReprint?: boolean;
}) {
  const uniqueIds = [...new Set(input.cardRecordIds)];
  if (uniqueIds.length === 0) throw new AppError(400, 'No cards selected');

  const cards = await prisma.cardRecord.findMany({
    where: { id: { in: uniqueIds }, organizationId: input.organizationId },
  });
  if (cards.length !== uniqueIds.length) throw new AppError(400, 'Some cards were not found');

  const MAX_BATCH_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_BATCH_RETRIES; attempt += 1) {
    const batchNumber = await nextBatchNumber();
    try {
      const batch = await prisma.$transaction(async (tx) => {
        const created = await tx.printBatch.create({
          data: {
            organizationId: input.organizationId,
            batchNumber,
            personKind: input.personKind,
            status: PrintBatchStatus.READY,
            totalCards: cards.length,
            createdBy: input.createdBy,
            createdByEmail: input.createdByEmail ?? null,
          },
        });

        await tx.printBatchItem.createMany({
          data: cards.map((card, index) => ({
            batchId: created.id,
            cardRecordId: card.id,
            sortOrder: index,
            printType:
              input.asReprint ||
              card.status === CardStatus.PRINTED ||
              card.status === CardStatus.REPRINTED
                ? PrintType.REPRINT
                : PrintType.ORIGINAL,
          })),
        });

        await tx.cardRecord.updateMany({
          where: { id: { in: cards.map((c) => c.id) } },
          data: { status: CardStatus.PRINTING },
        });

        return created;
      });

      return getBatchDetail(batch.id, input.organizationId);
    } catch (err) {
      if (isBatchNumberConflict(err) && attempt < MAX_BATCH_RETRIES - 1) continue;
      throw err;
    }
  }

  throw new AppError(500, 'Could not allocate a print batch number');
}

export async function startPrinting(batchId: string, organizationId: string) {
  const batch = await prisma.printBatch.findFirst({ where: { id: batchId, organizationId } });
  if (!batch) throw new AppError(404, 'Batch not found');
  return prisma.printBatch.update({
    where: { id: batchId },
    data: { status: PrintBatchStatus.PRINTING },
  });
}

export type ConfirmItem = { itemId: string; success: boolean; failureReason?: string };

export async function confirmPrintBatch(input: {
  batchId: string;
  organizationId: string;
  user: { sub: string; email: string };
  printerName?: string;
  items: ConfirmItem[];
  allSuccess?: boolean;
}) {
  const batch = await prisma.printBatch.findFirst({
    where: { id: input.batchId, organizationId: input.organizationId },
    include: { items: { include: { cardRecord: true } } },
  });
  if (!batch) throw new AppError(404, 'Batch not found');

  const itemMap = new Map(input.items.map((i) => [i.itemId, i]));
  let successCount = 0;
  let failedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const item of batch.items) {
      const confirm = itemMap.get(item.id);
      const success = input.allSuccess ? true : confirm?.success ?? false;
      const result = success ? PrintItemResult.SUCCESS : PrintItemResult.FAILED;

      if (success) successCount += 1;
      else failedCount += 1;

      await tx.printBatchItem.update({
        where: { id: item.id },
        data: {
          result,
          failureReason: success ? null : confirm?.failureReason ?? 'Print failed',
          confirmedAt: new Date(),
        },
      });

      const card = item.cardRecord;
      let newStatus: CardStatus;
      if (success) {
        newStatus =
          item.printType === PrintType.REPRINT ? CardStatus.REPRINTED : CardStatus.PRINTED;
      } else {
        newStatus = CardStatus.REPRINT_REQUIRED;
      }

      if (success) {
        await tx.cardRecord.update({
          where: { id: card.id },
          data: {
            status: newStatus,
            printCount: { increment: 1 },
            lastPrintedAt: new Date(),
            lastPrintedBy: input.user.email,
            lastBatchNumber: batch.batchNumber,
          },
        });

        await tx.reprintRequest.updateMany({
          where: {
            cardRecordId: card.id,
            status: ReprintRequestStatus.APPROVED,
          },
          data: { status: ReprintRequestStatus.PRINTED },
        });
      } else {
        await tx.cardRecord.update({
          where: { id: card.id },
          data: { status: newStatus },
        });
      }

      await tx.printEvent.create({
        data: {
          organizationId: input.organizationId,
          cardRecordId: card.id,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          eventType: success ? 'PRINTED' : 'PRINT_FAILED',
          printType: item.printType,
          result: success ? 'SUCCESS' : 'FAILED',
          performedBy: input.user.sub,
          performedByEmail: input.user.email,
          printerName: input.printerName ?? null,
          failureReason: success ? null : confirm?.failureReason ?? 'Print failed',
        },
      });
    }

    const batchStatus =
      failedCount === 0
        ? PrintBatchStatus.COMPLETED
        : successCount === 0
          ? PrintBatchStatus.PARTIAL
          : PrintBatchStatus.PARTIAL;

    await tx.printBatch.update({
      where: { id: batch.id },
      data: {
        status: batchStatus,
        successCount,
        failedCount,
        printerName: input.printerName ?? null,
        confirmedAt: new Date(),
      },
    });
  });

  return getBatchDetail(batch.id, input.organizationId);
}

export async function cancelPrintBatch(batchId: string, organizationId: string) {
  const batch = await prisma.printBatch.findFirst({
    where: { id: batchId, organizationId },
    include: { items: true },
  });
  if (!batch) throw new AppError(404, 'Batch not found');
  if (batch.status === PrintBatchStatus.COMPLETED) throw new AppError(400, 'Batch already completed');

  await prisma.$transaction(async (tx) => {
    for (const item of batch.items) {
      if (item.result !== PrintItemResult.PENDING) continue;
      const card = await tx.cardRecord.findUnique({ where: { id: item.cardRecordId } });
      if (!card) continue;
      const revertStatus =
        card.printCount > 0
          ? card.status === CardStatus.REPRINTED
            ? CardStatus.REPRINTED
            : CardStatus.PRINTED
          : CardStatus.NOT_PRINTED;
      await tx.cardRecord.update({
        where: { id: card.id },
        data: { status: revertStatus },
      });
    }
    await tx.printBatch.update({
      where: { id: batchId },
      data: { status: PrintBatchStatus.CANCELLED },
    });
  });

  return getBatchDetail(batchId, organizationId);
}

export async function listPrintQueue(organizationId?: string) {
  return prisma.printBatch.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      status: { in: [PrintBatchStatus.READY, PrintBatchStatus.PRINTING, PrintBatchStatus.PARTIAL] },
    },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true } } },
  });
}

export async function listPrintHistory(organizationId?: string, limit = 50) {
  return prisma.printBatch.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      status: { in: [PrintBatchStatus.COMPLETED, PrintBatchStatus.PARTIAL, PrintBatchStatus.CANCELLED] },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getBatchDetail(batchId: string, organizationId: string) {
  const batch = await prisma.printBatch.findFirst({
    where: { id: batchId, organizationId },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
        include: { cardRecord: true },
      },
    },
  });
  if (!batch) throw new AppError(404, 'Batch not found');
  return batch;
}

export async function reorderBatchItems(
  batchId: string,
  organizationId: string,
  orderedItemIds: string[]
) {
  const batch = await getBatchDetail(batchId, organizationId);
  await prisma.$transaction(
    orderedItemIds.map((id, index) =>
      prisma.printBatchItem.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );
  return getBatchDetail(batchId, organizationId);
}

export async function removeBatchItem(batchId: string, itemId: string, organizationId: string) {
  const batch = await getBatchDetail(batchId, organizationId);
  if (batch.status !== PrintBatchStatus.READY && batch.status !== PrintBatchStatus.DRAFT) {
    throw new AppError(400, 'Cannot modify batch after printing started');
  }
  const item = batch.items.find((i) => i.id === itemId);
  if (!item) throw new AppError(404, 'Item not found');

  await prisma.$transaction(async (tx) => {
    await tx.printBatchItem.delete({ where: { id: itemId } });
    const card = await tx.cardRecord.findUnique({ where: { id: item.cardRecordId } });
    if (card && card.status === CardStatus.PRINTING) {
      await tx.cardRecord.update({
        where: { id: card.id },
        data: {
          status: card.printCount > 0 ? CardStatus.PRINTED : CardStatus.NOT_PRINTED,
        },
      });
    }
    await tx.printBatch.update({
      where: { id: batchId },
      data: { totalCards: { decrement: 1 } },
    });
  });

  return getBatchDetail(batchId, organizationId);
}
