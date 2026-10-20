import { StockMovementType } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";

export interface StockAdjustInput {
  variantId: string;
  type: StockMovementType;
  quantity: number;
  reference?: string;
  notes?: string;
  createdBy?: string;
}

const DELTA_BY_TYPE: Record<
  StockMovementType,
  { available: number; reserved: number; sold: number; damaged: number }
> = {
  IN: { available: 1, reserved: 0, sold: 0, damaged: 0 },
  OUT: { available: -1, reserved: 0, sold: 0, damaged: 0 },
  ADJUST: { available: 1, reserved: 0, sold: 0, damaged: 0 },
  RESERVE: { available: -1, reserved: 1, sold: 0, damaged: 0 },
  RELEASE: { available: 1, reserved: -1, sold: 0, damaged: 0 },
  DAMAGE: { available: -1, reserved: 0, sold: 0, damaged: 1 },
  SALE: { available: -1, reserved: 0, sold: 1, damaged: 0 },
  DISTRIBUTION: { available: -1, reserved: 0, sold: 0, damaged: 0 },
};

export const LOW_STOCK_THRESHOLD = 5;

export class InventoryService {
  async listStock(
    organizationId: string,
    filters: { lowStockOnly?: boolean } = {},
  ) {
    const balances = await prisma.stockBalance.findMany({
      where: { organizationId },
      include: {
        variant: { include: { product: { include: { category: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const rows = balances.map((b) => ({
      ...b,
      isLowStock: b.available <= LOW_STOCK_THRESHOLD,
    }));

    return filters.lowStockOnly ? rows.filter((r) => r.isLowStock) : rows;
  }

  async adjustStock(organizationId: string, input: StockAdjustInput) {
    const variant = await prisma.uniformVariant.findFirst({
      where: { id: input.variantId, organizationId },
    });
    if (!variant) throw new AppError(404, "Variant not found");

    const delta = DELTA_BY_TYPE[input.type];
    if (!delta)
      throw new AppError(400, `Unsupported stock movement type: ${input.type}`);

    const qty = Math.abs(input.quantity);

    const [movement, balance] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          organizationId,
          variantId: input.variantId,
          type: input.type,
          quantity: qty,
          reference: input.reference,
          notes: input.notes,
          createdBy: input.createdBy,
        },
      }),
      prisma.stockBalance.upsert({
        where: { variantId: input.variantId },
        create: {
          organizationId,
          variantId: input.variantId,
          available: Math.max(0, delta.available * qty),
          reserved: Math.max(0, delta.reserved * qty),
          sold: Math.max(0, delta.sold * qty),
          damaged: Math.max(0, delta.damaged * qty),
        },
        update: {
          available: { increment: delta.available * qty },
          reserved: { increment: delta.reserved * qty },
          sold: { increment: delta.sold * qty },
          damaged: { increment: delta.damaged * qty },
        },
      }),
    ]);

    return { movement, balance };
  }
}

export const inventoryService = new InventoryService();
