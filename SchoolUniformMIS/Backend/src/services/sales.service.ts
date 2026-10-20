import {
  CustomerType,
  PaymentMethod,
  PaymentStatus,
  StockMovementType,
} from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";

export interface SaleLineInput {
  variantId: string;
  quantity: number;
  unitPrice: string | number;
}

export interface SaleInput {
  customerType: CustomerType;
  studentId?: string;
  customerName?: string;
  discount?: string | number;
  tax?: string | number;
  notes?: string;
  createdBy?: string;
  lines: SaleLineInput[];
  initialPayment?: {
    amount: string | number;
    method: PaymentMethod;
    notes?: string;
  };
}

function generateInvoiceNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${stamp}-${rand}`;
}

export class SalesService {
  async list(
    organizationId: string,
    filters: { studentId?: string; paymentStatus?: PaymentStatus } = {},
  ) {
    return prisma.uniformSale.findMany({
      where: {
        organizationId,
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
        ...(filters.paymentStatus
          ? { paymentStatus: filters.paymentStatus }
          : {}),
      },
      include: {
        lines: { include: { variant: { include: { product: true } } } },
        payments: true,
        student: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(organizationId: string, input: SaleInput) {
    if (!input.lines?.length)
      throw new AppError(400, "Sale must include at least one line item");

    const lineTotals = input.lines.map((l) => ({
      ...l,
      lineTotal: Number(l.unitPrice) * l.quantity,
    }));
    const subtotal = lineTotals.reduce((sum, l) => sum + l.lineTotal, 0);
    const discount = Number(input.discount ?? 0);
    const tax = Number(input.tax ?? 0);
    const total = Math.max(0, subtotal - discount + tax);

    const initialPaid = Number(input.initialPayment?.amount ?? 0);
    const paymentStatus: PaymentStatus =
      initialPaid <= 0
        ? PaymentStatus.PENDING
        : initialPaid >= total
          ? PaymentStatus.PAID
          : PaymentStatus.PARTIAL;

    return prisma.$transaction(async (tx) => {
      for (const line of input.lines) {
        const balance = await tx.stockBalance.findUnique({
          where: { variantId: line.variantId },
        });
        if (!balance || balance.available < line.quantity) {
          throw new AppError(
            400,
            `Insufficient stock for variant ${line.variantId}`,
          );
        }
      }

      const sale = await tx.uniformSale.create({
        data: {
          organizationId,
          invoiceNumber: generateInvoiceNumber(),
          customerType: input.customerType,
          studentId: input.studentId,
          customerName: input.customerName,
          discount: String(discount),
          tax: String(tax),
          total: String(total),
          paymentStatus,
          notes: input.notes,
          createdBy: input.createdBy,
          lines: {
            create: lineTotals.map((l) => ({
              organizationId,
              variantId: l.variantId,
              quantity: l.quantity,
              unitPrice: String(l.unitPrice),
              lineTotal: String(l.lineTotal),
            })),
          },
        },
        include: { lines: true },
      });

      for (const line of input.lines) {
        await tx.stockBalance.update({
          where: { variantId: line.variantId },
          data: {
            available: { decrement: line.quantity },
            sold: { increment: line.quantity },
          },
        });
        await tx.stockMovement.create({
          data: {
            organizationId,
            variantId: line.variantId,
            type: StockMovementType.SALE,
            quantity: line.quantity,
            reference: `sale:${sale.id}`,
            createdBy: input.createdBy,
          },
        });
      }

      if (initialPaid > 0) {
        await tx.payment.create({
          data: {
            organizationId,
            saleId: sale.id,
            amount: String(initialPaid),
            method: input.initialPayment!.method,
            status:
              paymentStatus === PaymentStatus.PAID
                ? PaymentStatus.PAID
                : PaymentStatus.PARTIAL,
            paidAt: new Date(),
            notes: input.initialPayment!.notes,
          },
        });
      }

      return tx.uniformSale.findUniqueOrThrow({
        where: { id: sale.id },
        include: { lines: true, payments: true, student: true },
      });
    });
  }

  async addPayment(
    organizationId: string,
    saleId: string,
    input: { amount: string | number; method: PaymentMethod; notes?: string },
  ) {
    const sale = await prisma.uniformSale.findFirst({
      where: { id: saleId, organizationId },
      include: { payments: true },
    });
    if (!sale) throw new AppError(404, "Sale not found");

    const alreadyPaid = sale.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const newTotal = alreadyPaid + Number(input.amount);
    const status: PaymentStatus =
      newTotal >= Number(sale.total)
        ? PaymentStatus.PAID
        : PaymentStatus.PARTIAL;

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          organizationId,
          saleId,
          amount: String(input.amount),
          method: input.method,
          status,
          paidAt: new Date(),
          notes: input.notes,
        },
      });

      await tx.uniformSale.update({
        where: { id: saleId },
        data: { paymentStatus: status },
      });

      return payment;
    });
  }

  async listOutstandingPayments(organizationId: string) {
    const sales = await prisma.uniformSale.findMany({
      where: {
        organizationId,
        paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
      },
      include: { payments: true, student: true },
      orderBy: { createdAt: "desc" },
    });

    return sales.map((sale) => {
      const paid = sale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const outstanding = Number(sale.total) - paid;
      return {
        id: sale.id,
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        student: sale.student,
        customerName: sale.customerName,
        total: sale.total,
        paid,
        outstanding,
        balance: outstanding,
        paymentStatus: sale.paymentStatus,
      };
    });
  }
}

export const salesService = new SalesService();
