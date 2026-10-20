import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { generateNumber } from '../utils/number-gen';

export class IssueService {
  async list(organizationId: string) {
    return prisma.stockIssue.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        store: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });
  }

  async getById(organizationId: string, id: string) {
    const issue = await prisma.stockIssue.findFirst({
      where: { id, organizationId },
      include: {
        store: true,
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
        },
      },
    });
    if (!issue) throw new AppError(404, 'Stock issue not found');
    return issue;
  }

  async create(organizationId: string, userId: string, data: {
    storeId: string; issuedTo: string; issuedToType: string; issuedToName: string;
    purpose?: string; notes?: string;
    items: Array<{ productId: string; quantity: number; batchId?: string; unitCost?: number }>;
  }) {
    const issueNumber = await generateNumber(organizationId, 'ISS');
    const issue = await prisma.stockIssue.create({
      data: {
        organizationId,
        issueNumber,
        storeId: data.storeId,
        issuedTo: data.issuedTo,
        issuedToType: data.issuedToType,
        issuedToName: data.issuedToName,
        purpose: data.purpose,
        requestedBy: userId,
        issuedBy: userId,
        status: 'ISSUED',
        issuedAt: new Date(),
        notes: data.notes,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            batchId: item.batchId,
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of data.items) {
      let remaining = item.quantity;
      const batches = await prisma.inventoryBatch.findMany({
        where: {
          organizationId,
          productId: item.productId,
          storeId: data.storeId,
          isActive: true,
          quantity: { gt: 0 },
        },
        orderBy: { expiryDate: 'asc' },
      });
      for (const batch of batches) {
        if (remaining <= 0) break;
        const deduct = Math.min(remaining, Number(batch.quantity));
        await prisma.inventoryBatch.update({
          where: { id: batch.id },
          data: { quantity: batch.quantity.minus(deduct) },
        });
        remaining -= deduct;
      }
    }

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        action: 'STOCK_ISSUED',
        metadata: { issueNumber, issuedTo: data.issuedToName, itemCount: data.items.length },
      },
    });

    return issue;
  }

  async approve(organizationId: string, id: string, userId: string) {
    const issue = await this.getById(organizationId, id);
    if (issue.status !== 'DRAFT') throw new AppError(400, 'Only draft issues can be approved');
    return prisma.stockIssue.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: userId },
    });
  }

  async reject(organizationId: string, id: string, userId: string, reason?: string) {
    const issue = await this.getById(organizationId, id);
    if (issue.status !== 'DRAFT' && issue.status !== 'APPROVED') throw new AppError(400, 'Cannot reject in current status');
    return prisma.stockIssue.update({
      where: { id },
      data: { status: 'REJECTED', notes: reason || 'Rejected' },
    });
  }
}

export const issueService = new IssueService();
