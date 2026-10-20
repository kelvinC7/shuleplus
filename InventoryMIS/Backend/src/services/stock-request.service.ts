import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { generateNumber } from '../utils/number-gen';

export class StockRequestService {
  async list(organizationId: string, status?: string) {
    const where: any = { organizationId };
    if (status) where.status = status;
    return prisma.stockRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        store: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });
  }

  async getById(organizationId: string, id: string) {
    const request = await prisma.stockRequest.findFirst({
      where: { id, organizationId },
      include: {
        store: true,
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
        },
      },
    });
    if (!request) throw new AppError(404, 'Stock request not found');
    return request;
  }

  private async ensureStore(organizationId: string): Promise<string> {
    let store = await prisma.store.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!store) {
      store = await prisma.store.create({
        data: {
          organizationId,
          name: 'General',
          code: 'GEN',
          type: 'BRANCH',
        },
      });
    }
    return store.id;
  }

  async create(organizationId: string, userId: string, data: {
    storeId?: string; departmentName: string; purpose?: string; notes?: string;
    items?: Array<{ productId: string; quantityRequested: number; notes?: string }>;
  }) {
    const storeId = data.storeId || await this.ensureStore(organizationId);
    const requestNumber = await generateNumber(organizationId, 'REQ');
    const request = await prisma.stockRequest.create({
      data: {
        organizationId,
        requestNumber,
        storeId,
        requestedBy: userId,
        departmentName: data.departmentName,
        purpose: data.purpose,
        notes: data.notes,
        items: data.items?.length ? {
          create: data.items.map(item => ({
            productId: item.productId,
            quantityRequested: item.quantityRequested,
            notes: item.notes,
          })),
        } : undefined,
      },
      include: { items: true, store: { select: { id: true, name: true } } },
    });

    await prisma.activityLog.create({
      data: {
        organizationId, userId,
        action: 'STOCK_REQUESTED',
        metadata: { requestNumber, department: data.departmentName },
      },
    });

    return request;
  }

  async update(organizationId: string, id: string, data: {
    departmentName?: string; purpose?: string; notes?: string;
  }) {
    const existing = await this.getById(organizationId, id);
    if (existing.status !== 'PENDING') throw new AppError(400, 'Only pending requests can be edited');
    return prisma.stockRequest.update({
      where: { id },
      data,
      include: {
        store: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
        },
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const existing = await this.getById(organizationId, id);
    if (existing.status !== 'PENDING') throw new AppError(400, 'Only pending requests can be deleted');
    await prisma.stockRequest.delete({ where: { id } });
  }

  async addItem(organizationId: string, id: string, data: {
    productId: string; quantityRequested: number; notes?: string;
  }) {
    const existing = await this.getById(organizationId, id);
    if (existing.status !== 'PENDING') throw new AppError(400, 'Only pending requests can be edited');
    return prisma.stockRequestItem.create({
      data: {
        requestId: id,
        productId: data.productId,
        quantityRequested: data.quantityRequested,
        notes: data.notes,
      },
      include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
    });
  }

  async updateItem(organizationId: string, requestId: string, itemId: string, data: {
    quantityRequested?: number; notes?: string;
  }) {
    const existing = await this.getById(organizationId, requestId);
    if (existing.status !== 'PENDING') throw new AppError(400, 'Only pending requests can be edited');
    return prisma.stockRequestItem.update({
      where: { id: itemId },
      data,
      include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
    });
  }

  async removeItem(organizationId: string, requestId: string, itemId: string) {
    const existing = await this.getById(organizationId, requestId);
    if (existing.status !== 'PENDING') throw new AppError(400, 'Only pending requests can be edited');
    await prisma.stockRequestItem.delete({ where: { id: itemId } });
  }

  async approve(organizationId: string, id: string, userId: string) {
    const request = await this.getById(organizationId, id);
    if (request.status !== 'PENDING') throw new AppError(400, 'Only pending requests can be approved');
    return prisma.stockRequest.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: userId },
    });
  }

  async reject(organizationId: string, id: string, userId: string, reason?: string) {
    const request = await this.getById(organizationId, id);
    if (request.status !== 'PENDING') throw new AppError(400, 'Only pending requests can be rejected');
    return prisma.stockRequest.update({
      where: { id },
      data: { status: 'REJECTED', notes: reason || 'Rejected' },
    });
  }

  async fulfill(organizationId: string, id: string, issueId: string) {
    const request = await this.getById(organizationId, id);
    if (request.status !== 'APPROVED') throw new AppError(400, 'Only approved requests can be fulfilled');
    return prisma.stockRequest.update({
      where: { id },
      data: { status: 'ISSUED', issuedAsIssueId: issueId },
    });
  }

  async listFromService(organizationId: string, status?: string) {
    const where: any = { organizationId };
    if (status) where.status = status;
    return prisma.stockRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        store: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
        },
      },
    });
  }

  async approveFromService(organizationId: string, id: string) {
    const request = await this.getById(organizationId, id);
    if (request.status !== 'PENDING') throw new AppError(400, 'Only pending requests can be approved');
    return prisma.stockRequest.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: 'system' },
    });
  }

  async rejectFromService(organizationId: string, id: string, reason?: string) {
    const request = await this.getById(organizationId, id);
    if (request.status !== 'PENDING') throw new AppError(400, 'Only pending requests can be rejected');
    return prisma.stockRequest.update({
      where: { id },
      data: { status: 'REJECTED', notes: reason || 'Rejected via service' },
    });
  }

  async issueFromService(organizationId: string, id: string) {
    const request = await this.getById(organizationId, id);
    if (request.status !== 'APPROVED') throw new AppError(400, 'Only approved requests can be issued');
    return prisma.stockRequest.update({
      where: { id },
      data: { status: 'ISSUED', issuedAsIssueId: 'service-issue' },
    });
  }
}

export const stockRequestService = new StockRequestService();
