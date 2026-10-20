import {
  DeliveryMethod,
  DeliveryStatus,
  OrderType,
  PaymentMethod,
  Prisma,
  RequestStatus,
} from '../generated/prisma';
import { generateRequestNumber, generatePaymentNumber } from '../utils/request-number';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { studentManagementClient } from './student-management-client.service';
import { tenantService } from './tenant.service';

const YEAR = new Date().getFullYear();

const ORDER_TRANSITIONS: Partial<Record<RequestStatus, RequestStatus[]>> = {
  PENDING: ['CONFIRMED', 'PROCESSING', 'CANCELLED', 'APPROVED', 'PAID'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['REFUNDED'],
  APPROVED: ['PAID', 'PROCESSING', 'CANCELLED'],
  PAID: ['PROCESSING', 'PACKED', 'DELIVERED', 'REFUNDED'],
  CANCELLED: ['PENDING'],
  REFUNDED: [],
};

function trackingCode(): string {
  return `TRK-${YEAR}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export class PlatformOpsService {
  async getSettings() {
    return prisma.platformSettings.upsert({
      where: { id: 'platform' },
      update: {},
      create: {
        id: 'platform',
        homeDeliveryFee: env.HOME_DELIVERY_FEE,
      },
    });
  }

  async updateSettings(input: Record<string, unknown>) {
    await this.getSettings();
    return prisma.platformSettings.update({
      where: { id: 'platform' },
      data: {
        homeDeliveryFee: input.homeDeliveryFee !== undefined ? Number(input.homeDeliveryFee) : undefined,
        schoolPickupFee: input.schoolPickupFee !== undefined ? Number(input.schoolPickupFee) : undefined,
        lowStockThreshold: input.lowStockThreshold !== undefined ? Number(input.lowStockThreshold) : undefined,
        customKitsEnabled: typeof input.customKitsEnabled === 'boolean' ? input.customKitsEnabled : undefined,
        standardKitsEnabled: typeof input.standardKitsEnabled === 'boolean' ? input.standardKitsEnabled : undefined,
        supportPhone: typeof input.supportPhone === 'string' ? input.supportPhone : undefined,
        supportEmail: typeof input.supportEmail === 'string' ? input.supportEmail : undefined,
      },
    });
  }

  async dashboard() {
    const settings = await this.getSettings();
    const [
      totalOrders,
      pendingOrders,
      deliveredOrders,
      revenueAgg,
      standardCount,
      customCount,
      lowStock,
      pendingDeliveries,
      topProducts,
      byDistrict,
    ] = await Promise.all([
      prisma.kitRequest.count(),
      prisma.kitRequest.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'APPROVED', 'PAID'] } } }),
      prisma.kitRequest.count({ where: { status: 'DELIVERED' } }),
      prisma.kitRequestPayment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.kitRequest.count({ where: { orderType: 'STANDARD' } }),
      prisma.kitRequest.count({ where: { orderType: 'CUSTOM' } }),
      prisma.product.count({ where: { stockQty: { lte: settings.lowStockThreshold }, status: 'ACTIVE' } }),
      prisma.delivery.count({ where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } } }),
      prisma.kitRequestItem.groupBy({
        by: ['title'],
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 8,
      }),
      prisma.kitRequest.groupBy({
        by: ['district'],
        _count: { id: true },
        _sum: { total: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totals: {
        orders: totalOrders,
        pendingOrders,
        deliveredOrders,
        revenue: Number(revenueAgg._sum.amount ?? 0),
        standardOrders: standardCount,
        customOrders: customCount,
        lowStockProducts: lowStock,
        pendingDeliveries,
      },
      topProducts: topProducts.map((p) => ({
        title: p.title,
        quantity: p._sum.quantity ?? 0,
        revenue: Number(p._sum.lineTotal ?? 0),
      })),
      byDistrict: byDistrict.map((d) => ({
        district: d.district ?? 'Unknown',
        orders: d._count.id,
        revenue: Number(d._sum.total ?? 0),
      })),
    };
  }

  async listOrders(query: {
    status?: string;
    orderType?: string;
    district?: string;
    organizationId?: string;
    academicYear?: string;
    search?: string;
  }) {
    const where: Prisma.KitRequestWhereInput = {};
    if (query.status) where.status = query.status as RequestStatus;
    if (query.orderType) where.orderType = query.orderType as OrderType;
    if (query.district) where.district = { equals: query.district, mode: 'insensitive' };
    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.academicYear) where.academicYear = query.academicYear;
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { requestNumber: { contains: q, mode: 'insensitive' } },
        { trackingNumber: { contains: q, mode: 'insensitive' } },
        { studentName: { contains: q, mode: 'insensitive' } },
        { studentCode: { contains: q, mode: 'insensitive' } },
        { organizationName: { contains: q, mode: 'insensitive' } },
        { parentName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.kitRequest.count({ where }),
      prisma.kitRequest.findMany({
        where,
        include: {
          items: true,
          payments: { orderBy: { createdAt: 'desc' } },
          delivery: true,
          standardKit: true,
          kit: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);
    return { total, orders };
  }

  async getOrder(id: string) {
    const order = await prisma.kitRequest.findUnique({
      where: { id },
      include: {
        items: true,
        payments: { orderBy: { createdAt: 'desc' } },
        delivery: true,
        standardKit: { include: { items: true } },
        kit: true,
      },
    });
    if (!order) throw new AppError(404, 'Order not found');
    return order;
  }

  async updateOrderStatus(id: string, status: RequestStatus) {
    const order = await this.getOrder(id);
    const allowed = ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new AppError(400, `Cannot move "${order.status}" to "${status}"`);
    }
    return prisma.kitRequest.update({
      where: { id },
      data: { status },
      include: { items: true, payments: true, delivery: true },
    });
  }

  async refundOrder(id: string) {
    const order = await this.getOrder(id);
    if (order.status === 'CANCELLED') throw new AppError(400, 'Order is cancelled');
    await prisma.kitRequestPayment.updateMany({
      where: { requestId: id, status: 'COMPLETED' },
      data: { status: 'REFUNDED' },
    });
    return prisma.kitRequest.update({
      where: { id },
      data: { status: 'REFUNDED' },
      include: { payments: true, items: true, delivery: true },
    });
  }

  async listDeliveries(query: { status?: string; district?: string; search?: string }) {
    const where: Prisma.DeliveryWhereInput = {};
    if (query.status) where.status = query.status as DeliveryStatus;
    if (query.district) where.district = { equals: query.district, mode: 'insensitive' };
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { trackingCode: { contains: q, mode: 'insensitive' } },
        { addressLine: { contains: q, mode: 'insensitive' } },
        { request: { requestNumber: { contains: q, mode: 'insensitive' } } },
        { request: { studentName: { contains: q, mode: 'insensitive' } } },
      ];
    }
    return prisma.delivery.findMany({
      where,
      include: { request: { include: { items: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async updateDelivery(id: string, input: Record<string, unknown>) {
    const existing = await prisma.delivery.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Delivery not found');
    const status = typeof input.status === 'string' ? (input.status as DeliveryStatus) : undefined;
    const updated = await prisma.delivery.update({
      where: { id },
      data: {
        status,
        addressLine: typeof input.addressLine === 'string' ? input.addressLine : undefined,
        pickupPoint: typeof input.pickupPoint === 'string' ? input.pickupPoint : undefined,
        district: typeof input.district === 'string' ? input.district : undefined,
        sector: typeof input.sector === 'string' ? input.sector : undefined,
        fee: input.fee !== undefined ? Number(input.fee) : undefined,
        trackingCode: typeof input.trackingCode === 'string' ? input.trackingCode : undefined,
        courierName: typeof input.courierName === 'string' ? input.courierName : undefined,
        estimatedAt: input.estimatedAt ? new Date(String(input.estimatedAt)) : undefined,
        deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
        notes: typeof input.notes === 'string' ? input.notes : undefined,
      },
      include: { request: true },
    });
    if (status === 'DELIVERED') {
      await prisma.kitRequest.update({
        where: { id: existing.requestId },
        data: { status: 'DELIVERED' },
      });
    } else if (status === 'OUT_FOR_DELIVERY' || status === 'IN_TRANSIT') {
      await prisma.kitRequest.update({
        where: { id: existing.requestId },
        data: { status: status === 'OUT_FOR_DELIVERY' ? 'OUT_FOR_DELIVERY' : 'SHIPPED' },
      });
    }
    return updated;
  }

  /** Public: create STANDARD or CUSTOM platform order. */
  async createPublicPlatformOrder(input: {
    orderType: 'STANDARD' | 'CUSTOM';
    studentCode: string;
    standardKitId?: string;
    items?: Array<{
      productId?: string;
      requirementId?: string;
      title?: string;
      unitPrice?: number;
      quantity?: number;
      imageUrl?: string;
    }>;
    parentName: string;
    parentPhone?: string;
    parentRelation: 'FATHER' | 'MOTHER' | 'GUARDIAN';
    deliveryMethod: 'AT_SCHOOL' | 'AT_HOME';
    deliveryAddress?: string;
    pickupPoint?: string;
    district?: string;
    sector?: string;
    notes?: string;
    paymentMethod?: PaymentMethod;
    paymentReference?: string;
  }) {
    const student = await studentManagementClient.lookupByCode(input.studentCode).catch(() => null);
    if (!student) throw new AppError(404, 'Student not found in the Academic module');

    const settings = await this.getSettings();
    await tenantService.createTenant({
      organizationId: student.organizationId,
      organizationName: student.schoolName,
      organizationCode: student.schoolCode ?? student.organizationCode ?? undefined,
    });
    const resolvedDistrict = input.district?.trim() || student.district || null;
    if (resolvedDistrict) {
      await prisma.tenant.update({
        where: { organizationId: student.organizationId },
        data: { district: resolvedDistrict },
      }).catch(() => undefined);
    }

    let lineItems: Array<{
      productId: string | null;
      title: string;
      imageUrl: string | null;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }> = [];
    let standardKitId: string | null = null;
    let orderType: OrderType = input.orderType;

    if (input.orderType === 'STANDARD') {
      if (!settings.standardKitsEnabled) throw new AppError(400, 'Standard kits are disabled');
      if (!input.standardKitId) throw new AppError(400, 'standardKitId is required');
      const kit = await prisma.standardKit.findFirst({
        where: { id: input.standardKitId, status: 'ACTIVE' },
        include: { items: true, pricingRules: { where: { available: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      if (!kit) throw new AppError(404, 'Standard kit not found');
      if (kit.organizationId && kit.organizationId !== student.organizationId) {
        throw new AppError(400, 'This standard kit belongs to a different school');
      }
      standardKitId = kit.id;
      const kitPriceOverride = kit.pricingRules[0] ? Number(kit.pricingRules[0].sellingPrice) : null;
      if (Array.isArray(input.items) && input.items.length > 0) {
        const byId = new Map(kit.items.map((i) => [i.id, i]));
        for (const sel of input.items) {
          const key = sel.requirementId ?? sel.productId;
          const row = key ? byId.get(key) : undefined;
          if (row) {
            const unitPrice = Number(row.unitPrice) || 0;
            const quantity = Math.min(9999, Math.max(1, Math.round(sel.quantity ?? row.quantity) || 1));
            lineItems.push({
              productId: row.productId,
              title: row.title,
              imageUrl: row.imageUrl,
              unitPrice,
              quantity,
              lineTotal: unitPrice * quantity,
            });
          } else if (sel.title) {
            const unitPrice = Number(sel.unitPrice ?? 0);
            const quantity = Math.min(9999, Math.max(1, Math.round(sel.quantity ?? 1) || 1));
            lineItems.push({
              productId: sel.productId ?? null,
              title: sel.title,
              imageUrl: sel.imageUrl ?? null,
              unitPrice,
              quantity,
              lineTotal: unitPrice * quantity,
            });
          }
        }
      } else {
        lineItems = kit.items.map((i) => {
          const unitPrice = Number(i.unitPrice) || 0;
          return {
            productId: i.productId,
            title: i.title,
            imageUrl: i.imageUrl,
            unitPrice,
            quantity: i.quantity,
            lineTotal: unitPrice * i.quantity,
          };
        });
      }
      if (kitPriceOverride !== null && lineItems.length === 0) {
        lineItems = [{
          productId: null,
          title: kit.name,
          imageUrl: kit.imageUrl,
          unitPrice: kitPriceOverride,
          quantity: 1,
          lineTotal: kitPriceOverride,
        }];
      }
    } else {
      if (!settings.customKitsEnabled) throw new AppError(400, 'Custom kits are disabled');
      if (!Array.isArray(input.items) || input.items.length === 0) {
        throw new AppError(400, 'Select at least one product');
      }
      for (const sel of input.items) {
        if (sel.productId) {
          const product = await prisma.product.findFirst({
            where: { id: sel.productId, status: 'ACTIVE', customEligible: true },
            include: { pricingRules: { where: { available: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
          });
          if (!product) throw new AppError(400, `Product not available: ${sel.productId}`);
          const unitPrice = product.pricingRules[0]
            ? Number(product.pricingRules[0].sellingPrice)
            : Number(product.unitPrice);
          const quantity = Math.min(9999, Math.max(1, Math.round(sel.quantity ?? 1) || 1));
          if (product.stockQty < quantity) {
            throw new AppError(400, `Insufficient stock for ${product.name}`);
          }
          lineItems.push({
            productId: product.id,
            title: product.name,
            imageUrl: product.imageUrl,
            unitPrice,
            quantity,
            lineTotal: unitPrice * quantity,
          });
        } else if (sel.title) {
          const unitPrice = Number(sel.unitPrice ?? 0);
          const quantity = Math.min(9999, Math.max(1, Math.round(sel.quantity ?? 1) || 1));
          lineItems.push({
            productId: null,
            title: sel.title,
            imageUrl: sel.imageUrl ?? null,
            unitPrice,
            quantity,
            lineTotal: unitPrice * quantity,
          });
        }
      }
    }

    if (lineItems.length === 0) throw new AppError(400, 'Order has no line items');

    const subtotal = lineItems.reduce((s, i) => s + i.lineTotal, 0);
    const homeFee =
      input.deliveryMethod === 'AT_HOME'
        ? Number(settings.homeDeliveryFee)
        : Number(settings.schoolPickupFee);
    const total = subtotal + homeFee;

    const requestNumber = await generateRequestNumber(student.organizationId);
    const tracking = trackingCode();

    const order = await prisma.$transaction(async (tx) => {
      if (orderType === 'CUSTOM') {
        for (const item of lineItems) {
          if (!item.productId) continue;
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQty: { decrement: item.quantity } },
          });
        }
      }

      const created = await tx.kitRequest.create({
        data: {
          organizationId: student.organizationId,
          organizationName: student.schoolName,
          district: resolvedDistrict,
          academicYear: student.academicYear,
          term: student.term,
          requestNumber,
          orderType,
          standardKitId,
          studentId: student.id,
          studentName: student.fullName,
          studentCode: student.shuleCode ?? student.studentUid ?? student.studentCode,
          className: student.classLabel ?? student.className,
          gradeLevel: student.classLabel ?? student.className,
          parentName: input.parentName,
          parentPhone: input.parentPhone,
          parentRelation: input.parentRelation,
          deliveryMethod: input.deliveryMethod as DeliveryMethod,
          subtotal,
          homeFee,
          total,
          status: 'CONFIRMED',
          notes: input.notes,
          trackingNumber: tracking,
          items: {
            create: lineItems.map((i) => ({
              productId: i.productId,
              title: i.title,
              imageUrl: i.imageUrl,
              unitPrice: i.unitPrice,
              quantity: i.quantity,
              lineTotal: i.lineTotal,
            })),
          },
          delivery: {
            create: {
              method: input.deliveryMethod as DeliveryMethod,
              status: 'PENDING',
              addressLine: input.deliveryAddress,
              pickupPoint: input.pickupPoint,
              district: resolvedDistrict,
              sector: input.sector ?? student.sector ?? undefined,
              fee: homeFee,
              trackingCode: tracking,
            },
          },
        },
        include: { items: true, delivery: true, payments: true, standardKit: true },
      });

      if (input.paymentMethod) {
        const paymentNumber = await generatePaymentNumber(student.organizationId);
        await tx.kitRequestPayment.create({
          data: {
            requestId: created.id,
            organizationId: student.organizationId,
            paymentNumber,
            amount: total,
            method: input.paymentMethod,
            status: 'COMPLETED',
            reference: input.paymentReference ?? 'PUBLIC_CHECKOUT',
            paidBy: input.parentName,
            verifiedAt: new Date(),
          },
        });
        await tx.kitRequest.update({ where: { id: created.id }, data: { status: 'PAID' } });
      }

      return tx.kitRequest.findUniqueOrThrow({
        where: { id: created.id },
        include: { items: true, delivery: true, payments: true, standardKit: true },
      });
    });

    return order;
  }
}

export const platformOpsService = new PlatformOpsService();
