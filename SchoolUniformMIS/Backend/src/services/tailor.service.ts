import { ProductionStatus, StockMovementType } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";

export interface TailorInput {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}

export interface ProductionOrderInput {
  tailorId: string;
  fabricId?: string;
  metersIssued: string | number;
  expectedOutput: number;
  deliveryDate?: string;
  tailoringCost: string | number;
  status?: ProductionStatus;
  productId?: string;
  notes?: string;
}

export interface ProductionReceiptInput {
  receivedQty: number;
  damagedQty?: number;
  unfinishedQty?: number;
  notes?: string;
}

export class TailorService {
  async listTailors(organizationId: string) {
    return prisma.tailor.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  }

  async createTailor(organizationId: string, input: TailorInput) {
    return prisma.tailor.create({ data: { organizationId, ...input } });
  }

  async updateTailor(
    organizationId: string,
    id: string,
    input: Partial<TailorInput>,
  ) {
    const tailor = await prisma.tailor.findFirst({
      where: { id, organizationId },
    });
    if (!tailor) throw new AppError(404, "Tailor not found");
    return prisma.tailor.update({ where: { id }, data: input });
  }

  async listProductionOrders(
    organizationId: string,
    filters: { status?: ProductionStatus } = {},
  ) {
    return prisma.productionOrder.findMany({
      where: {
        organizationId,
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: { tailor: true, fabric: true, product: true, receipts: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async createProductionOrder(
    organizationId: string,
    input: ProductionOrderInput,
  ) {
    const tailor = await prisma.tailor.findFirst({
      where: { id: input.tailorId, organizationId },
    });
    if (!tailor) throw new AppError(404, "Tailor not found");

    return prisma.productionOrder.create({
      data: {
        organizationId,
        tailorId: input.tailorId,
        fabricId: input.fabricId,
        metersIssued: String(input.metersIssued),
        expectedOutput: input.expectedOutput,
        deliveryDate: input.deliveryDate
          ? new Date(input.deliveryDate)
          : undefined,
        tailoringCost: String(input.tailoringCost),
        status: input.status ?? ProductionStatus.WAITING,
        productId: input.productId,
        notes: input.notes,
      },
      include: { tailor: true, fabric: true, product: true },
    });
  }

  async updateProductionOrder(
    organizationId: string,
    id: string,
    input: Partial<ProductionOrderInput>,
  ) {
    const order = await prisma.productionOrder.findFirst({
      where: { id, organizationId },
    });
    if (!order) throw new AppError(404, "Production order not found");

    const data: Record<string, unknown> = { ...input };
    if (input.metersIssued !== undefined)
      data.metersIssued = String(input.metersIssued);
    if (input.tailoringCost !== undefined)
      data.tailoringCost = String(input.tailoringCost);
    if (input.deliveryDate !== undefined)
      data.deliveryDate = new Date(input.deliveryDate);

    return prisma.productionOrder.update({
      where: { id },
      data,
      include: { tailor: true, fabric: true, product: true },
    });
  }

  async receiveProduction(
    organizationId: string,
    orderId: string,
    input: ProductionReceiptInput,
  ) {
    const order = await prisma.productionOrder.findFirst({
      where: { id: orderId, organizationId },
      include: { product: { include: { variants: true } } },
    });
    if (!order) throw new AppError(404, "Production order not found");

    return prisma.$transaction(async (tx) => {
      const receipt = await tx.productionReceipt.create({
        data: {
          organizationId,
          orderId,
          receivedQty: input.receivedQty,
          damagedQty: input.damagedQty ?? 0,
          unfinishedQty: input.unfinishedQty ?? 0,
          notes: input.notes,
        },
      });

      const totalReceived = await tx.productionReceipt.aggregate({
        where: { orderId },
        _sum: { receivedQty: true, unfinishedQty: true },
      });
      const receivedSoFar = totalReceived._sum.receivedQty ?? 0;
      const status: ProductionStatus =
        receivedSoFar >= order.expectedOutput
          ? ProductionStatus.COMPLETED
          : ProductionStatus.IN_PROGRESS;

      await tx.productionOrder.update({
        where: { id: orderId },
        data: { status },
      });

      const targetVariant = order.product?.variants[0];
      if (targetVariant && input.receivedQty > 0) {
        await tx.stockBalance.upsert({
          where: { variantId: targetVariant.id },
          create: {
            organizationId,
            variantId: targetVariant.id,
            available: input.receivedQty,
          },
          update: { available: { increment: input.receivedQty } },
        });
        await tx.stockMovement.create({
          data: {
            organizationId,
            variantId: targetVariant.id,
            type: StockMovementType.IN,
            quantity: input.receivedQty,
            reference: `production-order:${orderId}`,
            notes: "Received from production",
          },
        });
      }

      if (input.damagedQty && targetVariant) {
        await tx.stockBalance.upsert({
          where: { variantId: targetVariant.id },
          create: {
            organizationId,
            variantId: targetVariant.id,
            damaged: input.damagedQty,
          },
          update: { damaged: { increment: input.damagedQty } },
        });
      }

      return receipt;
    });
  }
}

export const tailorService = new TailorService();
