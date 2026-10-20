import {
  CustomerType,
  DistributionStatus,
  PaymentMethod,
  PaymentStatus,
  ReturnCondition,
  ReturnStatus,
  StockMovementType,
} from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { studentsService } from "./students.service";

export interface DistributionInput {
  studentId: string;
  variantId: string;
  quantity: number;
  academicYear?: string;
  issuedBy?: string;
  status?: DistributionStatus;
  notes?: string;
}

export interface IssueLineInput {
  variantId: string;
  quantity: number;
  unitPrice?: string | number;
}

export interface IssueBatchInput {
  studentId: string;
  academicYear?: string;
  term?: string;
  notes?: string;
  issuedBy?: string;
  status?: DistributionStatus;
  items: IssueLineInput[];
  payment?: {
    amount: string | number;
    method: PaymentMethod;
    discount?: string | number;
    scholarship?: string | number;
  };
}

export interface CreateReturnInput {
  receiptId: string;
  reason?: string;
  condition?: ReturnCondition;
  restock?: boolean;
  replaceItem?: boolean;
  exchange?: boolean;
  refundAmount?: string | number;
  notes?: string;
  processedBy?: string;
  lines: Array<{
    distributionId?: string;
    variantId: string;
    quantity: number;
    reason?: string;
    exchangeVariantId?: string;
  }>;
}

function generateReceiptNumber() {
  const n = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 90 + 10);
  return `DSP-${n}${rand}`;
}

function generateReturnNumber() {
  const n = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 90 + 10);
  return `RET-${n}${rand}`;
}

const receiptInclude = {
  student: true,
  sale: { include: { payments: true, lines: true } },
  lines: {
    include: { variant: { include: { product: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  returns: {
    include: {
      lines: { include: { variant: { include: { product: true } } } },
    },
  },
};

export class DistributionService {
  async listReceipts(
    organizationId: string,
    filters: { studentId?: string; search?: string } = {},
  ) {
    const search = filters.search?.trim();
    return prisma.distributionReceipt.findMany({
      where: {
        organizationId,
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
        ...(search
          ? {
              OR: [
                { receiptNumber: { contains: search, mode: "insensitive" } },
                {
                  student: {
                    firstName: { contains: search, mode: "insensitive" },
                  },
                },
                {
                  student: {
                    lastName: { contains: search, mode: "insensitive" },
                  },
                },
                {
                  student: {
                    className: { contains: search, mode: "insensitive" },
                  },
                },
                {
                  student: {
                    academicStudentId: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: receiptInclude,
      orderBy: { issuedAt: "desc" },
    });
  }

  async getReceipt(organizationId: string, id: string) {
    const receipt = await prisma.distributionReceipt.findFirst({
      where: { id, organizationId },
      include: receiptInclude,
    });
    if (!receipt) throw new AppError(404, "Distribution receipt not found");
    await studentsService.ensureShuleCode(organizationId, receipt.studentId);
    return prisma.distributionReceipt.findFirstOrThrow({
      where: { id },
      include: receiptInclude,
    });
  }

  /** Legacy flat lines (student profile history). */
  async list(organizationId: string, filters: { studentId?: string } = {}) {
    return prisma.uniformDistribution.findMany({
      where: {
        organizationId,
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
      },
      include: {
        student: true,
        variant: { include: { product: true } },
        receipt: true,
      },
      orderBy: { issuedAt: "desc" },
    });
  }

  async create(organizationId: string, input: DistributionInput) {
    const result = await this.issueBatch(organizationId, {
      studentId: input.studentId,
      academicYear: input.academicYear,
      notes: input.notes,
      issuedBy: input.issuedBy,
      status: input.status,
      items: [{ variantId: input.variantId, quantity: input.quantity }],
    });
    return result.distributions[0];
  }

  async issueBatch(organizationId: string, input: IssueBatchInput) {
    if (!input.items?.length)
      throw new AppError(400, "Select at least one item to distribute");

    const student =
      (await studentsService.ensureShuleCode(
        organizationId,
        input.studentId,
      )) ??
      (await prisma.uniformStudent.findFirst({
        where: { id: input.studentId, organizationId },
      }));
    if (!student) throw new AppError(404, "Student not found");

    const variantIds = input.items.map((i) => i.variantId);
    const variants = await prisma.uniformVariant.findMany({
      where: { organizationId, id: { in: variantIds } },
      include: { product: true },
    });
    if (variants.length !== new Set(variantIds).size) {
      throw new AppError(404, "One or more variants not found");
    }
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    const qtyByVariant = new Map<string, number>();
    for (const item of input.items) {
      qtyByVariant.set(
        item.variantId,
        (qtyByVariant.get(item.variantId) ?? 0) + item.quantity,
      );
    }

    for (const [variantId, qty] of qtyByVariant) {
      const balance = await prisma.stockBalance.findUnique({
        where: { variantId },
      });
      if (!balance || balance.available < qty) {
        const name = variantMap.get(variantId)?.product.name ?? variantId;
        throw new AppError(400, `Insufficient stock for ${name}`);
      }
    }

    const status =
      input.status ??
      (input.payment ? DistributionStatus.PAID : DistributionStatus.FREE);
    const discount =
      Number(input.payment?.discount ?? 0) +
      Number(input.payment?.scholarship ?? 0);
    const linePrices = input.items.map((item) => {
      const variant = variantMap.get(item.variantId)!;
      const unitPrice = Number(item.unitPrice ?? variant.sellingPrice ?? 0);
      return {
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
        productId: variant.productId,
      };
    });
    const subtotal = linePrices.reduce((s, l) => s + l.lineTotal, 0);
    const total = Math.max(0, subtotal - discount);
    const paidAmount = Number(input.payment?.amount ?? 0);
    const balance = Math.max(0, total - paidAmount);
    const lineStatus =
      paidAmount > 0 && paidAmount < total
        ? DistributionStatus.PENDING
        : paidAmount >= total && total > 0
          ? DistributionStatus.PAID
          : status;
    const receiptNumber = generateReceiptNumber();
    const totalQty = linePrices.reduce((s, l) => s + l.quantity, 0);

    return prisma.$transaction(async (tx) => {
      let sale = null as Awaited<
        ReturnType<typeof tx.uniformSale.create>
      > | null;

      if (input.payment && total > 0) {
        const paymentStatus: PaymentStatus =
          paidAmount <= 0
            ? PaymentStatus.PENDING
            : paidAmount >= total
              ? PaymentStatus.PAID
              : PaymentStatus.PARTIAL;

        sale = await tx.uniformSale.create({
          data: {
            organizationId,
            invoiceNumber: receiptNumber,
            customerType: CustomerType.STUDENT,
            studentId: input.studentId,
            discount: String(discount),
            tax: "0",
            total: String(total),
            paymentStatus,
            notes: input.notes,
            createdBy: input.issuedBy,
            lines: {
              create: linePrices.map((l) => ({
                organizationId,
                variantId: l.variantId,
                quantity: l.quantity,
                unitPrice: String(l.unitPrice),
                lineTotal: String(l.lineTotal),
              })),
            },
          },
        });

        if (paidAmount > 0) {
          await tx.payment.create({
            data: {
              organizationId,
              saleId: sale.id,
              amount: String(paidAmount),
              method: input.payment.method,
              status: paymentStatus,
              paidAt: new Date(),
            },
          });
        }
      }

      const receipt = await tx.distributionReceipt.create({
        data: {
          organizationId,
          receiptNumber,
          studentId: input.studentId,
          saleId: sale?.id,
          academicYear: input.academicYear,
          term: input.term,
          status: lineStatus,
          itemCount: linePrices.length,
          totalQty,
          subtotal: String(subtotal),
          discount: String(discount),
          total: String(total),
          paid: String(paidAmount),
          balance: String(balance),
          notes: input.notes,
          issuedBy: input.issuedBy,
        },
      });

      const distributions = [];
      for (const line of linePrices) {
        const created = await tx.uniformDistribution.create({
          data: {
            organizationId,
            receiptId: receipt.id,
            studentId: input.studentId,
            variantId: line.variantId,
            quantity: line.quantity,
            unitPrice: String(line.unitPrice),
            academicYear: input.academicYear,
            issuedBy: input.issuedBy,
            status: lineStatus,
            notes: input.notes,
          },
          include: { variant: { include: { product: true } }, student: true },
        });
        distributions.push(created);

        await tx.stockBalance.update({
          where: { variantId: line.variantId },
          data: {
            available: { decrement: line.quantity },
            ...(paidAmount > 0 ? { sold: { increment: line.quantity } } : {}),
          },
        });

        await tx.stockMovement.create({
          data: {
            organizationId,
            variantId: line.variantId,
            type:
              paidAmount > 0
                ? StockMovementType.SALE
                : StockMovementType.DISTRIBUTION,
            quantity: line.quantity,
            reference: receiptNumber,
            createdBy: input.issuedBy,
          },
        });

        const existingItem = await tx.studentUniformItem.findFirst({
          where: {
            organizationId,
            studentId: input.studentId,
            OR: [
              { variantId: line.variantId },
              { productId: line.productId, variantId: null },
            ],
          },
        });

        if (existingItem) {
          await tx.studentUniformItem.update({
            where: { id: existingItem.id },
            data: {
              owned: true,
              quantity: { increment: line.quantity },
              variantId: line.variantId,
            },
          });
        } else {
          await tx.studentUniformItem.create({
            data: {
              organizationId,
              studentId: input.studentId,
              productId: line.productId,
              variantId: line.variantId,
              owned: true,
              quantity: line.quantity,
            },
          });
        }
      }

      const fullReceipt = await tx.distributionReceipt.findFirstOrThrow({
        where: { id: receipt.id },
        include: receiptInclude,
      });

      return {
        distributions,
        sale: sale
          ? await tx.uniformSale.findUnique({
              where: { id: sale.id },
              include: {
                lines: { include: { variant: { include: { product: true } } } },
                payments: true,
              },
            })
          : null,
        distributionReceipt: fullReceipt,
        receipt: {
          receiptNumber,
          student,
          items: linePrices.map((l) => {
            const v = variantMap.get(l.variantId)!;
            return {
              name: v.product.name,
              size: v.size,
              color: v.color,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              total: l.lineTotal,
            };
          }),
          subtotal,
          discount,
          total,
          paid: paidAmount,
          balance,
          issuedAt: fullReceipt.issuedAt.toISOString(),
          issuedBy: input.issuedBy,
          notes: input.notes,
          academicYear: input.academicYear,
          term: input.term,
        },
      };
    });
  }

  async listReturns(organizationId: string) {
    return prisma.uniformReturn.findMany({
      where: { organizationId },
      include: {
        student: true,
        receipt: true,
        lines: { include: { variant: { include: { product: true } } } },
      },
      orderBy: { processedAt: "desc" },
    });
  }

  async createReturn(organizationId: string, input: CreateReturnInput) {
    if (!input.lines?.length)
      throw new AppError(400, "Select at least one item to return");

    const receipt = await prisma.distributionReceipt.findFirst({
      where: { id: input.receiptId, organizationId },
      include: { lines: true, student: true },
    });
    if (!receipt) throw new AppError(404, "Distribution receipt not found");

    for (const line of input.lines) {
      if (line.quantity <= 0)
        throw new AppError(400, "Return quantity must be positive");
      const distLine = receipt.lines.find(
        (d) => d.id === line.distributionId || d.variantId === line.variantId,
      );
      if (!distLine)
        throw new AppError(400, "Item was not on this distribution");
      if (line.quantity > distLine.quantity) {
        throw new AppError(400, "Return quantity exceeds quantity given");
      }
    }

    const refundAmount = Number(input.refundAmount ?? 0);
    const restock = input.restock !== false;
    const status =
      refundAmount > 0 ? ReturnStatus.REFUNDED : ReturnStatus.COMPLETED;

    return prisma.$transaction(async (tx) => {
      const ret = await tx.uniformReturn.create({
        data: {
          organizationId,
          returnNumber: generateReturnNumber(),
          receiptId: receipt.id,
          studentId: receipt.studentId,
          reason: input.reason,
          condition: input.condition ?? ReturnCondition.GOOD,
          status,
          refundAmount: String(refundAmount),
          restock,
          replaceItem: Boolean(input.replaceItem),
          exchange: Boolean(input.exchange),
          notes: input.notes,
          processedBy: input.processedBy,
          lines: {
            create: input.lines.map((l) => ({
              organizationId,
              distributionId: l.distributionId,
              variantId: l.variantId,
              quantity: l.quantity,
              reason: l.reason ?? input.reason,
              exchangeVariantId: l.exchangeVariantId,
            })),
          },
        },
        include: {
          student: true,
          receipt: true,
          lines: { include: { variant: { include: { product: true } } } },
        },
      });

      for (const line of input.lines) {
        if (restock) {
          await tx.stockBalance.upsert({
            where: { variantId: line.variantId },
            create: {
              organizationId,
              variantId: line.variantId,
              available: line.quantity,
            },
            update: { available: { increment: line.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              organizationId,
              variantId: line.variantId,
              type: StockMovementType.IN,
              quantity: line.quantity,
              reference: ret.returnNumber,
              notes: "Returned to stock",
              createdBy: input.processedBy,
            },
          });
        } else {
          await tx.stockBalance.upsert({
            where: { variantId: line.variantId },
            create: {
              organizationId,
              variantId: line.variantId,
              available: 0,
              damaged: line.quantity,
            },
            update: { damaged: { increment: line.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              organizationId,
              variantId: line.variantId,
              type: StockMovementType.DAMAGE,
              quantity: line.quantity,
              reference: ret.returnNumber,
              notes: "Return damaged / not restocked",
              createdBy: input.processedBy,
            },
          });
        }

        if (input.exchange && line.exchangeVariantId) {
          const exchBalance = await tx.stockBalance.findUnique({
            where: { variantId: line.exchangeVariantId },
          });
          if (!exchBalance || exchBalance.available < line.quantity) {
            throw new AppError(400, "Insufficient stock for exchange item");
          }
          await tx.stockBalance.update({
            where: { variantId: line.exchangeVariantId },
            data: { available: { decrement: line.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              organizationId,
              variantId: line.exchangeVariantId,
              type: StockMovementType.DISTRIBUTION,
              quantity: line.quantity,
              reference: ret.returnNumber,
              notes: "Exchange issue",
              createdBy: input.processedBy,
            },
          });
        }
      }

      return ret;
    });
  }

  async returnAnalytics(organizationId: string) {
    const returns = await prisma.uniformReturn.findMany({
      where: { organizationId },
      include: {
        lines: { include: { variant: { include: { product: true } } } },
      },
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayReturns = returns.filter(
      (r) => r.processedAt >= startOfDay,
    ).length;

    const itemCounts = new Map<string, number>();
    const reasonCounts = new Map<string, number>();
    let refundTotal = 0;
    let restockedQty = 0;

    for (const r of returns) {
      refundTotal += Number(r.refundAmount);
      if (r.restock) {
        restockedQty += r.lines.reduce((s, l) => s + l.quantity, 0);
      }
      if (r.reason)
        reasonCounts.set(r.reason, (reasonCounts.get(r.reason) ?? 0) + 1);
      for (const l of r.lines) {
        const name = l.variant?.product?.name ?? "Item";
        itemCounts.set(name, (itemCounts.get(name) ?? 0) + l.quantity);
        if (l.reason)
          reasonCounts.set(l.reason, (reasonCounts.get(l.reason) ?? 0) + 1);
      }
    }

    const topItem = [...itemCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const topReason = [...reasonCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0];

    return {
      todayReturns,
      mostReturnedItem: topItem
        ? { name: topItem[0], count: topItem[1] }
        : null,
      mostCommonReason: topReason
        ? { reason: topReason[0], count: topReason[1] }
        : null,
      refundAmount: refundTotal,
      itemsReturnedToStock: restockedQty,
    };
  }
}

export const distributionService = new DistributionService();
