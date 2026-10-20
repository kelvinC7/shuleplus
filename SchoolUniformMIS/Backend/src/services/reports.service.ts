import { prisma } from "../config/database";

export type ReportFilters = {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  search?: string;
};

function dateRange(filters?: ReportFilters) {
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (filters?.dateFrom) {
    const d = new Date(filters.dateFrom);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      createdAt.gte = d;
    }
  }
  if (filters?.dateTo) {
    const d = new Date(filters.dateTo);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      createdAt.lte = d;
    }
  }
  return Object.keys(createdAt).length ? createdAt : undefined;
}

function matchesSearch(haystack: string, search?: string) {
  if (!search?.trim()) return true;
  return haystack.toLowerCase().includes(search.trim().toLowerCase());
}

export class ReportsService {
  async run(organizationId: string, type: string, filters: ReportFilters = {}) {
    const range = dateRange(filters);
    const status = filters.status?.trim() || "";
    const search = filters.search?.trim() || "";

    switch (type) {
      case "sales": {
        const sales = await prisma.uniformSale.findMany({
          where: {
            organizationId,
            ...(range ? { createdAt: range } : {}),
            ...(status
              ? { paymentStatus: status as "PAID" | "PARTIAL" | "PENDING" }
              : {}),
          },
          include: { lines: true, student: true },
          orderBy: { createdAt: "desc" },
          take: 500,
        });
        const rows = sales
          .map((s) => ({
            invoiceNumber: s.invoiceNumber,
            customerName:
              s.customerName ??
              `${s.student?.firstName ?? ""} ${s.student?.lastName ?? ""}`.trim(),
            total: Number(s.total),
            paymentStatus: s.paymentStatus,
            createdAt: s.createdAt.toISOString().slice(0, 10),
          }))
          .filter((r) =>
            matchesSearch(
              `${r.invoiceNumber} ${r.customerName} ${r.paymentStatus}`,
              search,
            ),
          );
        return { type, rows };
      }

      case "profit": {
        const lines = await prisma.saleLine.findMany({
          where: {
            organizationId,
            ...(range ? { sale: { createdAt: range } } : {}),
          },
          include: {
            variant: { include: { product: true } },
            sale: { select: { invoiceNumber: true, createdAt: true } },
          },
          take: 500,
        });
        const rows = lines
          .map((l) => {
            const unitPrice = Number(l.unitPrice);
            const cost = Number(l.variant.costPrice ?? 0);
            const profit = (unitPrice - cost) * l.quantity;
            return {
              invoice: l.sale.invoiceNumber,
              product: l.variant.product.name,
              size: l.variant.size,
              qty: l.quantity,
              revenue: unitPrice * l.quantity,
              cost: cost * l.quantity,
              profit,
              date: l.sale.createdAt.toISOString().slice(0, 10),
            };
          })
          .filter((r) =>
            matchesSearch(`${r.invoice} ${r.product} ${r.size}`, search),
          )
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        return { type, rows };
      }

      case "stock": {
        const balances = await prisma.stockBalance.findMany({
          where: { organizationId },
          include: { variant: { include: { product: true } } },
        });
        let rows = balances.map((b) => ({
          product: b.variant.product.name,
          size: b.variant.size,
          available: b.available,
          reserved: b.reserved,
          sold: b.sold,
          damaged: b.damaged,
          status:
            b.available <= 10 ? "Low" : b.available <= 30 ? "Watch" : "OK",
        }));
        if (status === "low") rows = rows.filter((r) => r.status === "Low");
        if (status === "watch") rows = rows.filter((r) => r.status === "Watch");
        if (status === "ok") rows = rows.filter((r) => r.status === "OK");
        rows = rows.filter((r) =>
          matchesSearch(`${r.product} ${r.size} ${r.status}`, search),
        );
        return { type, rows };
      }

      case "missing-students": {
        const students = await prisma.uniformStudent.findMany({
          where: {
            organizationId,
            isActive: true,
            items: { none: { owned: true } },
          },
          orderBy: { lastName: "asc" },
        });
        const rows = students
          .map((s) => ({
            studentId: s.academicStudentId || s.id.slice(-8).toUpperCase(),
            name: `${s.firstName} ${s.lastName}`,
            className: s.className || "",
            gender: s.gender || "",
          }))
          .filter((r) =>
            matchesSearch(`${r.studentId} ${r.name} ${r.className}`, search),
          );
        return { type, rows };
      }

      case "fabric": {
        const issues = await prisma.fabricIssue.findMany({
          where: {
            organizationId,
            ...(range ? { issuedAt: range } : {}),
          },
          include: { fabric: true, tailor: true },
          orderBy: { issuedAt: "desc" },
          take: 500,
        });
        const rows = issues
          .map((i) => ({
            fabric: i.fabric.name,
            roll: i.fabric.rollNumber || "",
            meters: Number(i.meters),
            tailor: i.tailor?.name || "",
            expectedPieces: i.expectedPieces ?? "",
            date: i.issuedAt.toISOString().slice(0, 10),
            notes: i.notes || "",
          }))
          .filter((r) =>
            matchesSearch(
              `${r.fabric} ${r.roll} ${r.tailor} ${r.notes}`,
              search,
            ),
          );
        return { type, rows };
      }

      case "tailor": {
        const orders = await prisma.productionOrder.findMany({
          where: {
            organizationId,
            ...(range ? { createdAt: range } : {}),
            ...(status
              ? {
                  status: status as
                    "WAITING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
                }
              : {}),
          },
          include: {
            tailor: true,
            fabric: true,
            receipts: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 500,
        });
        const rows = orders
          .map((o) => {
            const received = o.receipts.reduce(
              (sum, r) => sum + r.receivedQty,
              0,
            );
            return {
              tailor: o.tailor?.name || "",
              fabric: o.fabric?.name || "",
              metersIssued: Number(o.metersIssued),
              expectedOutput: o.expectedOutput,
              received,
              status: o.status,
              cost: Number(o.tailoringCost ?? 0),
              updatedAt: o.updatedAt.toISOString().slice(0, 10),
            };
          })
          .filter((r) =>
            matchesSearch(`${r.tailor} ${r.fabric} ${r.status}`, search),
          );
        return { type, rows };
      }

      default:
        return { type, rows: [] };
    }
  }
}

export const reportsService = new ReportsService();
