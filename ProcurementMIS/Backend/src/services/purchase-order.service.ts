import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { applyDateFilter } from '../utils/date-range';
import { resolveUserDisplayName, resolveUserDisplayNames } from '../utils/user-display-name';
import { normalizeItemName, roundMoney, toPositiveNumber } from '../utils/item-match';

function generatePONumber(orgId: string): string {
  const date = new Date();
  const prefix = 'PO';
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${year}${month}-${random}`;
}

function generateDirectPRNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `PR-${year}-${month}-${random}`;
}

export class PurchaseOrderService {
  async list(organizationId: string, filters?: {
    status?: string;
    search?: string;
    academicYear?: string;
    term?: string;
    date?: string;
    week?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: any = { organizationId };
    if (filters?.status && filters.status !== 'ALL') where.status = filters.status;
    applyDateFilter(where, 'orderDate', filters);
    if (filters?.academicYear || filters?.term) {
      where.purchaseRequest = {};
      if (filters.academicYear) where.purchaseRequest.academicYear = filters.academicYear;
      if (filters.term) where.purchaseRequest.term = filters.term;
    }
    if (filters?.search) {
      where.OR = [
        { poNumber: { contains: filters.search, mode: 'insensitive' } },
        { createdByName: { contains: filters.search, mode: 'insensitive' } },
        { supplier: { companyName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const orders = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: { select: { id: true, companyName: true } },
        purchaseRequest: {
          select: {
            id: true,
            prNumber: true,
            academicYear: true,
            term: true,
            requestedBy: true,
            requestedByName: true,
          },
        },
        items: true,
        _count: { select: { items: true } },
      },
    });

    return this.withDisplayNames(orders);
  }

  async getById(organizationId: string, id: string) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      include: {
        supplier: true,
        purchaseRequest: { include: { department: true } },
        items: true,
        goodsReceivings: { include: { items: true } },
      },
    });
    if (!po) throw new AppError(404, 'Purchase order not found');

    const [displayName, requesterName] = await Promise.all([
      resolveUserDisplayName(po.createdBy, po.createdByName ?? undefined),
      po.purchaseRequest
        ? resolveUserDisplayName(
            po.purchaseRequest.requestedBy,
            po.purchaseRequest.requestedByName,
          )
        : Promise.resolve(''),
    ]);

    return {
      ...po,
      createdByName: displayName || po.createdByName,
      purchaseRequest: po.purchaseRequest
        ? {
            ...po.purchaseRequest,
            requestedByName:
              requesterName || po.purchaseRequest.requestedByName,
          }
        : po.purchaseRequest,
    };
  }

  async create(organizationId: string, userId: string, userEmail: string, data: any) {
    const userName = await resolveUserDisplayName(userId, userEmail);
    const poNumber = generatePONumber(organizationId);
    const subtotal = data.items?.reduce(
      (sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0
    ) || 0;
    const discount = Number(data.discount) || 0;
    const tax = Number(data.tax) || 0;
    const shippingCost = Number(data.shippingCost) || 0;
    const totalAmount = subtotal - discount + tax + shippingCost;

    const result = await prisma.$transaction(async (tx) => {
      let linkedPrId: string | null = data.prId || null;

      // Direct purchase orders (created without a request) must still appear as
      // requisitions with their money/prices and other details.
      if (!linkedPrId) {
        const prNumber = generateDirectPRNumber();
        const pr = await tx.purchaseRequest.create({
          data: {
            organizationId,
            prNumber,
            requestType: 'GOODS',
            requestedBy: userId,
            requestedByName: userName,
            purpose: data.notes?.trim() || `Direct purchase order ${poNumber}`,
            status: 'CONVERTED_TO_PO',
            totalEstimate: roundMoney(totalAmount),
            items: {
              create: (data.items || []).map((item: any) => {
                const quantity = Number(item.quantity) || 0;
                const unitPrice = Number(item.unitPrice) || 0;
                return {
                  itemName: item.itemName,
                  description: item.description || null,
                  unit: item.unit,
                  quantity,
                  estimatedPrice: unitPrice,
                  estimatedTotal: roundMoney(quantity * unitPrice),
                };
              }),
            },
          },
          select: { id: true },
        });
        linkedPrId = pr.id;
      }

      const po = await tx.purchaseOrder.create({
        data: {
          organizationId,
          poNumber,
          prId: linkedPrId,
          supplierId: data.supplierId,
          expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
          deliveryAddress: data.deliveryAddress,
          subtotal,
          discount,
          tax,
          shippingCost,
          totalAmount,
          paymentTerms: data.paymentTerms,
          notes: data.notes,
          status: 'DRAFT',
          createdBy: userId,
          createdByName: userName,
          items: {
            create: data.items?.map((item: any) => ({
              itemName: item.itemName,
              description: item.description,
              unit: item.unit,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              totalPrice: Number(item.quantity) * Number(item.unitPrice),
            })) || [],
          },
        },
        include: {
          items: true,
          supplier: true,
          purchaseRequest: {
            select: {
              id: true,
              prNumber: true,
              academicYear: true,
              term: true,
              requestedBy: true,
              requestedByName: true,
            },
          },
        },
      });

      if (linkedPrId) {
        await tx.purchaseRequest.update({
          where: { id: linkedPrId },
          data: { status: 'CONVERTED_TO_PO' },
        });
        try {
          await this.syncPurchaseRequestPricing(tx, linkedPrId, po.items);
        } catch (error) {
          console.error('[purchase-order] unable to persist request pricing', error);
        }
      }

      await tx.activityLog.create({
        data: {
          organizationId,
          userId,
          action: 'PO_CREATED',
          entity: 'PurchaseOrder',
          entityId: po.id,
          metadata: { poNumber, totalAmount, prId: linkedPrId },
        },
      });

      return po;
    });

    return result;
  }

  async importOrders(
    organizationId: string,
    userId: string,
    userEmail: string,
    data: {
      supplierId: string;
      expectedDelivery?: string;
      deliveryAddress?: string;
      paymentTerms?: string;
      notes?: string;
      rows: {
        itemName: string;
        quantity: number | string;
        unitPrice: number | string;
        prCode: string;
        rowNumber?: number;
      }[];
    },
  ) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, organizationId, isActive: true },
    });
    if (!supplier) {
      throw new AppError(400, 'Please select a valid supplier for this import');
    }

    const rows = data.rows ?? [];
    if (rows.length === 0) {
      throw new AppError(400, 'No valid rows were provided for import');
    }

    const errors: string[] = [];
    const fail = (rowNumber: number | undefined, message: string) => {
      errors.push(rowNumber ? `Row ${rowNumber}: ${message}` : message);
    };

    const parsed = rows.map((row, index) => {
      const rowNumber = row.rowNumber ?? index + 2;
      const prCode = String(row.prCode ?? '').trim();
      const itemName = String(row.itemName ?? '').trim();
      const quantity = toPositiveNumber(row.quantity);
      const unitPrice = toPositiveNumber(row.unitPrice);

      if (!prCode) fail(rowNumber, 'Purchase Request Code is required');
      if (!itemName) fail(rowNumber, 'Item is required');
      if (quantity === null) fail(rowNumber, 'Quantity must be a positive number');
      if (unitPrice === null) fail(rowNumber, 'Unit Price must be a positive number');

      return { rowNumber, prCode, itemName, quantity, unitPrice };
    });

    if (errors.length > 0) {
      throw new AppError(400, this.formatImportErrors(errors));
    }

    const codes = [...new Set(parsed.map((row) => row.prCode))];
    const purchaseRequests = await prisma.purchaseRequest.findMany({
      where: {
        organizationId,
        OR: codes.map((code) => ({
          prNumber: { equals: code, mode: 'insensitive' as const },
        })),
      },
      include: {
        items: true,
        purchaseOrders: { select: { id: true, poNumber: true } },
      },
    });

    const prByCode = new Map(
      purchaseRequests.map((request) => [request.prNumber.trim().toUpperCase(), request]),
    );

    const eligibleStatuses = new Set([
      'PENDING',
      'DEPARTMENT_HEAD_APPROVED',
      'FINANCE_APPROVED',
      'PROCUREMENT_APPROVED',
      'MD_APPROVED',
    ]);

    type GroupedItem = {
      itemName: string;
      description?: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      capacityKey: string;
    };
    const grouped = new Map<
      string,
      { pr: (typeof purchaseRequests)[number]; items: GroupedItem[] }
    >();
    const seen = new Set<string>();
    const consumed = new Map<string, number>();
    const capacities = new Map<string, number>();

    for (const row of parsed) {
      const pr = prByCode.get(row.prCode.toUpperCase());
      if (!pr) {
        fail(row.rowNumber, `Purchase Request "${row.prCode}" was not found`);
        continue;
      }
      if (!eligibleStatuses.has(pr.status)) {
        fail(
          row.rowNumber,
          `Purchase Request "${pr.prNumber}" is not eligible for a purchase order (status: ${pr.status.replace(/_/g, ' ')})`,
        );
        continue;
      }
      if (pr.purchaseOrders.length > 0) {
        fail(
          row.rowNumber,
          `Purchase Request "${pr.prNumber}" already has purchase order ${pr.purchaseOrders[0].poNumber}`,
        );
        continue;
      }

      const itemKey = normalizeItemName(row.itemName);
      const matchingItems = pr.items.filter(
        (item) => normalizeItemName(item.itemName) === itemKey,
      );
      if (matchingItems.length === 0) {
        fail(
          row.rowNumber,
          `"${row.itemName}" does not exist on Purchase Request "${pr.prNumber}"`,
        );
        continue;
      }

      const duplicateKey = `${pr.id}|${itemKey}`;
      if (seen.has(duplicateKey)) {
        fail(
          row.rowNumber,
          `Duplicate row for "${row.itemName}" on Purchase Request "${pr.prNumber}"`,
        );
        continue;
      }
      seen.add(duplicateKey);

      const capacity = matchingItems.reduce(
        (sum, item) => sum + Number(item.quantity),
        0,
      );
      capacities.set(duplicateKey, capacity);
      consumed.set(duplicateKey, (consumed.get(duplicateKey) ?? 0) + (row.quantity ?? 0));

      const existingGroup = grouped.get(pr.id);
      const groupItem: GroupedItem = {
        itemName: matchingItems[0].itemName,
        description: matchingItems[0].description ?? undefined,
        unit: matchingItems[0].unit,
        quantity: row.quantity ?? 0,
        unitPrice: roundMoney(row.unitPrice ?? 0),
        capacityKey: duplicateKey,
      };
      if (existingGroup) existingGroup.items.push(groupItem);
      else grouped.set(pr.id, { pr, items: [groupItem] });
    }

    for (const [key, requested] of consumed.entries()) {
      const capacity = capacities.get(key) ?? 0;
      if (requested > capacity) {
        const [prId, normalized] = key.split('|');
        const pr = purchaseRequests.find((request) => request.id === prId);
        const item = pr?.items.find(
          (entry) => normalizeItemName(entry.itemName) === normalized,
        );
        errors.push(
          `"${item?.itemName ?? normalized}" exceeds the requested quantity of ${capacity} on ${pr?.prNumber ?? 'the purchase request'}`,
        );
      }
    }

    if (errors.length > 0) {
      throw new AppError(400, this.formatImportErrors(errors));
    }

    const createdByName = await resolveUserDisplayName(userId, userEmail);
    const groups = [...grouped.values()];
    if (groups.length === 0) {
      throw new AppError(400, 'No valid rows were provided for import');
    }

    let expectedDelivery: Date | null = null;
    if (data.expectedDelivery) {
      const parsedDate = new Date(data.expectedDelivery);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new AppError(400, 'Expected delivery date is invalid');
      }
      expectedDelivery = parsedDate;
    }

    const poNumbers = await this.generateUniquePONumbers(
      organizationId,
      groups.length,
    );

    try {
      const created = await prisma.$transaction(async (tx) => {
        const results = [];
        for (let index = 0; index < groups.length; index += 1) {
          const group = groups[index];
          const subtotal = roundMoney(
            group.items.reduce(
              (sum, item) => sum + item.quantity * item.unitPrice,
              0,
            ),
          );

          const po = await tx.purchaseOrder.create({
            data: {
              organizationId,
              poNumber: poNumbers[index],
              prId: group.pr.id,
              supplierId: supplier.id,
              expectedDelivery,
              deliveryAddress: data.deliveryAddress,
              subtotal,
              discount: 0,
              tax: 0,
              shippingCost: 0,
              totalAmount: subtotal,
              paymentTerms: data.paymentTerms,
              notes: data.notes,
              status: 'DRAFT',
              createdBy: userId,
              createdByName,
              items: {
                create: group.items.map((item) => ({
                  itemName: item.itemName,
                  description: item.description,
                  unit: item.unit,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: roundMoney(item.quantity * item.unitPrice),
                })),
              },
            },
            include: { items: true },
          });

          await tx.purchaseRequest.update({
            where: { id: group.pr.id },
            data: { status: 'CONVERTED_TO_PO' },
          });

          await this.syncPurchaseRequestPricing(tx, group.pr.id, group.items);

          await tx.activityLog.create({
            data: {
              organizationId,
              userId,
              action: 'PO_IMPORTED',
              entity: 'PurchaseOrder',
              entityId: po.id,
              metadata: {
                poNumber: po.poNumber,
                prNumber: group.pr.prNumber,
                totalAmount: subtotal,
                itemCount: group.items.length,
                source: 'EXCEL_IMPORT',
              },
            },
          });

          results.push({
            id: po.id,
            poNumber: po.poNumber,
            prNumber: group.pr.prNumber,
            totalAmount: subtotal,
            itemCount: po.items.length,
            totalQuantity: group.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            ),
          });
        }
        return results;
      });

      return {
        purchaseOrders: created,
        totalAmount: roundMoney(
          created.reduce((sum, order) => sum + order.totalAmount, 0),
        ),
        itemCount: created.reduce((sum, order) => sum + order.itemCount, 0),
        totalQuantity: created.reduce(
          (sum, order) => sum + order.totalQuantity,
          0,
        ),
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new AppError(
          409,
          'A purchase order was already created for one of the selected purchase requests',
        );
      }
      throw error;
    }
  }

  private formatImportErrors(errors: string[]): string {
    const unique = [...new Set(errors)];
    const shown = unique.slice(0, 5).join('; ');
    return unique.length > 5
      ? `${shown}; and ${unique.length - 5} more issue(s)`
      : shown;
  }

  private async generateUniquePONumbers(
    organizationId: string,
    count: number,
  ): Promise<string[]> {
    const date = new Date();
    const prefix = `PO-${date.getFullYear().toString().slice(-2)}${String(
      date.getMonth() + 1,
    ).padStart(2, '0')}`;
    const numbers: string[] = [];

    for (let index = 0; index < count; index += 1) {
      let candidate = '';
      for (let attempt = 0; attempt < 25; attempt += 1) {
        const random = Math.floor(Math.random() * 9000 + 1000);
        candidate = `${prefix}-${random}`;
        const exists = await prisma.purchaseOrder.findFirst({
          where: { organizationId, poNumber: candidate },
          select: { id: true },
        });
        if (!exists && !numbers.includes(candidate)) break;
      }
      numbers.push(candidate);
    }

    return numbers;
  }

  async updateStatus(organizationId: string, id: string, status: string, userId: string) {
    await this.getById(organizationId, id);
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: status as any },
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        action: `PO_${status}`,
        entity: 'PurchaseOrder',
        entityId: id,
        metadata: { status },
      },
    });

    return updated;
  }

  async updatePaymentStatus(organizationId: string, id: string, paymentStatus: string) {
    await this.getById(organizationId, id);
    return prisma.purchaseOrder.update({
      where: { id },
      data: { paymentStatus: paymentStatus as any },
    });
  }

  async remove(organizationId: string, id: string) {
    const po = await this.getById(organizationId, id);
    if (po.status !== 'DRAFT') throw new AppError(400, 'Only draft orders can be deleted');
    return prisma.purchaseOrder.delete({ where: { id } });
  }

  /**
   * Copies the unit prices captured on a purchase order back onto the linked
   * purchase request items. Requisitions can then always show the real ordered
   * prices, even when the purchase order relation is not joined on a query.
   */
  private async syncPurchaseRequestPricing(
    client: Prisma.TransactionClient,
    prId: string,
    orderItems: { itemName: string; unitPrice: number | Prisma.Decimal }[],
  ): Promise<void> {
    const prItems = await client.purchaseRequestItem.findMany({ where: { prId } });
    if (prItems.length === 0) return;

    const priceByName = new Map<string, number>();
    for (const item of orderItems) {
      const key = normalizeItemName(item.itemName);
      const price = Number(item.unitPrice);
      if (!Number.isFinite(price) || price <= 0) continue;
      if (!priceByName.has(key)) priceByName.set(key, price);
    }
    if (priceByName.size === 0) return;

    let totalEstimate = 0;
    let matched = false;
    for (const item of prItems) {
      const unitPrice = priceByName.get(normalizeItemName(item.itemName));
      if (unitPrice == null) {
        totalEstimate = roundMoney(totalEstimate + Number(item.estimatedTotal ?? 0));
        continue;
      }

      matched = true;
      const estimatedTotal = roundMoney(Number(item.quantity) * unitPrice);
      totalEstimate = roundMoney(totalEstimate + estimatedTotal);
      await client.purchaseRequestItem.update({
        where: { id: item.id },
        data: { estimatedPrice: unitPrice, estimatedTotal },
      });
    }

    if (matched) {
      await client.purchaseRequest.update({
        where: { id: prId },
        data: { totalEstimate },
      });
    }
  }

  private async withDisplayNames<
    T extends {
      createdBy: string;
      createdByName: string | null;
      purchaseRequest?: {
        requestedBy?: string | null;
        requestedByName?: string | null;
      } | null;
    },
  >(orders: T[]): Promise<T[]> {
    if (orders.length === 0) return orders;

    const [creatorNames, requesterNames] = await Promise.all([
      resolveUserDisplayNames(orders.map((order) => order.createdBy)),
      resolveUserDisplayNames(
        orders
          .map((order) => order.purchaseRequest?.requestedBy)
          .filter((id): id is string => Boolean(id)),
      ),
    ]);

    return orders.map((order) => {
      const creator = creatorNames.get(order.createdBy);
      const pr = order.purchaseRequest;
      const requester = pr?.requestedBy ? requesterNames.get(pr.requestedBy) : undefined;

      return {
        ...order,
        createdByName: creator || order.createdByName,
        purchaseRequest: pr
          ? { ...pr, requestedByName: requester || pr.requestedByName }
          : pr,
      } as T;
    });
  }
}

export const purchaseOrderService = new PurchaseOrderService();
