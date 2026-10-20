import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { generateSequenceNumber } from '../utils/number-gen';
import { inventoryApi } from './inventory-api';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function filterValidItems(items: Array<{ productId: string; quantityRequested: number; notes?: string }>) {
  return items.filter(i => UUID_RE.test(i.productId));
}

export class KitchenRequestService {
  async list(organizationId: string, query?: { status?: string }) {
    const where: any = { organizationId };
    if (query?.status) where.status = query.status;

    return prisma.kitchenRequest.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(organizationId: string, id: string) {
    const request = await prisma.kitchenRequest.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!request) throw new AppError(404, 'Kitchen request not found');
    return request;
  }

  async create(organizationId: string, userId: string, data: any) {
    const requestNumber = await generateSequenceNumber(organizationId, 'KR');
    const { items, ...requestData } = data;

    const request = await prisma.kitchenRequest.create({
      data: {
        organizationId,
        requestNumber,
        requestedBy: userId,
        status: 'PENDING',
        ...requestData,
        items: items ? { create: items.map((i: any) => ({ ...i })) } : undefined,
      },
      include: { items: true },
    });

    // Auto-forward to InventoryMIS (only valid UUID product IDs)
    try {
      const validItems = filterValidItems(items || []);
      if (validItems.length > 0) {
        const stockRequest = await inventoryApi.createStockRequest(organizationId, {
          departmentName: 'Cafeteria',
          purpose: `Kitchen Request ${requestNumber}${requestData.notes ? ': ' + requestData.notes : ''}`,
          notes: `Auto-created from Cafeteria kitchen request ${requestNumber}`,
          items: validItems.map((i: any) => ({
            productId: i.productId,
            quantityRequested: Number(i.quantityRequested),
            notes: i.notes,
          })),
        });

        await prisma.kitchenRequest.update({
          where: { id: request.id },
          data: { stockRequestId: stockRequest.id, inventoryStatus: 'PENDING' },
        });

        request.stockRequestId = stockRequest.id;
        request.inventoryStatus = 'PENDING';
      } else {
        console.warn(`[KitchenRequest] No valid product IDs — skipping InventoryMIS forward`);
      }
    } catch (err: any) {
      console.error(`[KitchenRequest] Failed to forward to InventoryMIS: ${err.message}`);
    }

    await prisma.activityLog.create({
      data: {
        organizationId, userId,
        action: 'KITCHEN_REQUEST_CREATED',
        metadata: { requestId: request.id, requestNumber: request.requestNumber },
      },
    });

    return request;
  }

  async update(organizationId: string, id: string, data: any) {
    const existing = await prisma.kitchenRequest.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Kitchen request not found');
    if (existing.status !== 'PENDING') throw new AppError(400, 'Can only edit pending requests');
    if (existing.stockRequestId) throw new AppError(400, 'Cannot edit request already sent to Inventory');
    return prisma.kitchenRequest.update({ where: { id }, data });
  }

  async receive(organizationId: string, id: string, userId: string) {
    const existing = await prisma.kitchenRequest.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Kitchen request not found');
    if (existing.status !== 'ISSUED') throw new AppError(400, 'Request has not been issued yet');

    return prisma.kitchenRequest.update({
      where: { id },
      data: { status: 'RECEIVED', receivedBy: userId },
    });
  }

  async forwardToInventory(organizationId: string, id: string, userId: string) {
    const existing = await prisma.kitchenRequest.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!existing) throw new AppError(404, 'Kitchen request not found');
    if (existing.stockRequestId) throw new AppError(400, 'Request already linked to Inventory');

    const validItems = filterValidItems(existing.items.map((i) => ({
      productId: i.productId,
      quantityRequested: Number(i.quantityRequested),
      notes: i.notes || undefined,
    })));

    if (validItems.length === 0) {
      throw new AppError(400, 'No items have valid product IDs — cannot forward to Inventory');
    }

    const stockRequest = await inventoryApi.createStockRequest(organizationId, {
      departmentName: 'Cafeteria',
      purpose: `Kitchen Request ${existing.requestNumber}${existing.notes ? ': ' + existing.notes : ''}`,
      notes: `Forwarded from Cafeteria kitchen request ${existing.requestNumber}`,
      items: validItems,
    });

    return prisma.kitchenRequest.update({
      where: { id },
      data: { stockRequestId: stockRequest.id, inventoryStatus: 'PENDING' },
      include: { items: true },
    });
  }

  async syncStatus(organizationId: string, id: string) {
    const existing = await prisma.kitchenRequest.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Kitchen request not found');

    if (!existing.stockRequestId) {
      throw new AppError(400, 'Request not linked to Inventory — use Forward to send it first');
    }

    try {
      const stockRequest = await inventoryApi.getStockRequest(organizationId, existing.stockRequestId);

      let newStatus = existing.status;
      switch (stockRequest.status) {
        case 'APPROVED':  newStatus = 'APPROVED'; break;
        case 'ISSUED':    newStatus = 'ISSUED'; break;
        case 'REJECTED':  newStatus = 'REJECTED'; break;
      }

      return prisma.kitchenRequest.update({
        where: { id },
        data: {
          inventoryStatus: stockRequest.status,
          status: newStatus,
          approvedBy: stockRequest.approvedBy || existing.approvedBy,
        },
        include: { items: true },
      });
    } catch (err: any) {
      console.error(`[KitchenRequest] Failed to sync status: ${err.message}`);
      throw err;
    }
  }

  async syncAllPending(organizationId: string) {
    const pending = await prisma.kitchenRequest.findMany({
      where: {
        organizationId,
        stockRequestId: { not: null },
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    const results = [];
    for (const req of pending) {
      try {
        const updated = await this.syncStatus(organizationId, req.id);
        results.push(updated);
      } catch {
        results.push(req);
      }
    }
    return results;
  }

  async getInventoryDetails(organizationId: string, id: string) {
    const existing = await prisma.kitchenRequest.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!existing) throw new AppError(404, 'Kitchen request not found');
    if (!existing.stockRequestId) throw new AppError(400, 'Request not linked to Inventory');

    const stockRequest = await inventoryApi.getStockRequest(organizationId, existing.stockRequestId);

    let grn: any = null;
    if (stockRequest.status === 'ISSUED') {
      try {
        grn = await inventoryApi.getGrnForRequest(organizationId, existing.stockRequestId);
      } catch {
        // GRN may not exist yet
      }
    }

    return { kitchenRequest: existing, stockRequest, grn };
  }

  async createGrn(organizationId: string, id: string, userId: string, data: {
    notes?: string;
    receivedDate?: string;
    items: Array<{ productId: string; quantity: number; unitCost?: number; batchNumber?: string }>;
  }) {
    const existing = await prisma.kitchenRequest.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!existing) throw new AppError(404, 'Kitchen request not found');
    if (!existing.stockRequestId) throw new AppError(400, 'Request not linked to Inventory — forward it first');

    // Check current inventory status
    const stockRequest = await inventoryApi.getStockRequest(organizationId, existing.stockRequestId);
    if (stockRequest.status !== 'APPROVED') {
      throw new AppError(400, `Cannot create GRN — stock request is ${stockRequest.status}, must be APPROVED`);
    }

    // Create GRN in InventoryMIS
    await inventoryApi.createGrnForRequest(organizationId, existing.stockRequestId, {
      notes: data.notes || `GRN from Cafeteria kitchen request ${existing.requestNumber}`,
      receivedDate: data.receivedDate,
      items: data.items,
    });

    // Sync status back
    const updated = await this.syncStatus(organizationId, id);

    await prisma.activityLog.create({
      data: {
        organizationId, userId,
        action: 'GRN_CREATED',
        metadata: { requestId: id, requestNumber: existing.requestNumber, itemCount: data.items.length },
      },
    });

    return updated;
  }

  async remove(organizationId: string, id: string) {
    const existing = await prisma.kitchenRequest.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Kitchen request not found');
    if (existing.status !== 'PENDING') throw new AppError(400, 'Can only delete pending requests');
    if (existing.stockRequestId) throw new AppError(400, 'Cannot delete request already sent to Inventory');
    await prisma.kitchenRequest.delete({ where: { id } });
  }
}

export const kitchenRequestService = new KitchenRequestService();
