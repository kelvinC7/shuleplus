import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";

export interface FabricInput {
  name: string;
  supplierId?: string;
  supplierName?: string;
  rollNumber?: string;
  metersTotal: string | number;
  metersRemaining?: string | number;
  cost: string | number;
  color?: string;
  quality?: string;
  warehouse?: string;
  academicYear?: string;
  purchaseDate?: string;
}

export interface FabricIssueInput {
  fabricId: string;
  tailorId?: string;
  meters: string | number;
  expectedPieces?: number;
  notes?: string;
}

export class FabricService {
  private async nextRollNumber(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    organizationId: string,
  ) {
    const count = await tx.fabric.count({ where: { organizationId } });
    const seq = String(count + 1).padStart(4, "0");
    const year = new Date().getFullYear();
    return `FAB-${year}-${seq}`;
  }

  private async resolveSupplierId(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    organizationId: string,
    supplierId?: string,
    supplierName?: string,
  ) {
    if (supplierId) return supplierId;
    const name = supplierName?.trim();
    if (!name) return undefined;
    const existing = await tx.supplier.findFirst({
      where: { organizationId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) return existing.id;
    const created = await tx.supplier.create({
      data: { organizationId, name },
    });
    return created.id;
  }

  async list(organizationId: string) {
    return prisma.fabric.findMany({
      where: { organizationId },
      include: { supplier: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(organizationId: string, input: FabricInput) {
    return prisma.fabric.create({
      data: {
        organizationId,
        name: input.name,
        supplierId: input.supplierId,
        rollNumber: input.rollNumber,
        metersTotal: String(input.metersTotal),
        metersRemaining: String(input.metersRemaining ?? input.metersTotal),
        cost: String(input.cost),
        color: input.color,
        quality: input.quality,
        warehouse: input.warehouse,
        academicYear: input.academicYear,
        purchaseDate: input.purchaseDate
          ? new Date(input.purchaseDate)
          : undefined,
      },
    });
  }

  async update(
    organizationId: string,
    id: string,
    input: Partial<FabricInput>,
  ) {
    const fabric = await prisma.fabric.findFirst({
      where: { id, organizationId },
    });
    if (!fabric) throw new AppError(404, "Fabric not found");

    const data: Record<string, unknown> = { ...input };
    delete data.supplierName;
    if (input.metersTotal !== undefined)
      data.metersTotal = String(input.metersTotal);
    if (input.metersRemaining !== undefined)
      data.metersRemaining = String(input.metersRemaining);
    if (input.cost !== undefined) data.cost = String(input.cost);
    if (input.purchaseDate !== undefined)
      data.purchaseDate = new Date(input.purchaseDate);

    if (input.supplierName?.trim() && !input.supplierId) {
      const name = input.supplierName.trim();
      const existing = await prisma.supplier.findFirst({
        where: { organizationId, name: { equals: name, mode: "insensitive" } },
      });
      data.supplierId =
        existing?.id ??
        (await prisma.supplier.create({ data: { organizationId, name } })).id;
    }

    return prisma.fabric.update({
      where: { id },
      data,
      include: { supplier: true },
    });
  }

  async remove(organizationId: string, id: string) {
    const fabric = await prisma.fabric.findFirst({
      where: { id, organizationId },
    });
    if (!fabric) throw new AppError(404, "Fabric not found");
    await prisma.fabric.delete({ where: { id } });
    return { message: "Fabric deleted" };
  }

  async createIssue(organizationId: string, input: FabricIssueInput) {
    const fabric = await prisma.fabric.findFirst({
      where: { id: input.fabricId, organizationId },
    });
    if (!fabric) throw new AppError(404, "Fabric not found");

    const meters = Number(input.meters);
    if (Number(fabric.metersRemaining) < meters) {
      throw new AppError(400, "Insufficient fabric meters remaining");
    }

    return prisma.$transaction(async (tx) => {
      const issue = await tx.fabricIssue.create({
        data: {
          organizationId,
          fabricId: input.fabricId,
          tailorId: input.tailorId,
          meters: String(meters),
          expectedPieces: input.expectedPieces,
          notes: input.notes,
        },
        include: { fabric: true, tailor: true },
      });

      await tx.fabric.update({
        where: { id: input.fabricId },
        data: { metersRemaining: { decrement: meters } },
      });

      return issue;
    });
  }

  async listIssues(organizationId: string) {
    return prisma.fabricIssue.findMany({
      where: { organizationId },
      include: { fabric: true, tailor: true },
      orderBy: { issuedAt: "desc" },
    });
  }

  async updateIssue(
    organizationId: string,
    id: string,
    input: Partial<FabricIssueInput> & { fabricId?: string },
  ) {
    const issue = await prisma.fabricIssue.findFirst({
      where: { id, organizationId },
      include: { fabric: true },
    });
    if (!issue) throw new AppError(404, "Fabric issue not found");

    const nextFabricId = input.fabricId || issue.fabricId;
    const nextMeters =
      input.meters !== undefined ? Number(input.meters) : Number(issue.meters);
    if (!nextMeters || nextMeters <= 0)
      throw new AppError(400, "Meters must be greater than 0");

    return prisma.$transaction(async (tx) => {
      // Restore previous issue meters to original fabric
      await tx.fabric.update({
        where: { id: issue.fabricId },
        data: { metersRemaining: { increment: Number(issue.meters) } },
      });

      const fabric = await tx.fabric.findFirst({
        where: { id: nextFabricId, organizationId },
      });
      if (!fabric) throw new AppError(404, "Fabric not found");
      if (Number(fabric.metersRemaining) < nextMeters) {
        throw new AppError(400, "Insufficient fabric meters remaining");
      }

      await tx.fabric.update({
        where: { id: nextFabricId },
        data: { metersRemaining: { decrement: nextMeters } },
      });

      return tx.fabricIssue.update({
        where: { id },
        data: {
          fabricId: nextFabricId,
          meters: String(nextMeters),
          ...(input.tailorId !== undefined ? { tailorId: input.tailorId } : {}),
          ...(input.expectedPieces !== undefined
            ? { expectedPieces: input.expectedPieces }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
        include: { fabric: true, tailor: true },
      });
    });
  }

  async removeIssue(organizationId: string, id: string) {
    const issue = await prisma.fabricIssue.findFirst({
      where: { id, organizationId },
    });
    if (!issue) throw new AppError(404, "Fabric issue not found");

    return prisma.$transaction(async (tx) => {
      await tx.fabric.update({
        where: { id: issue.fabricId },
        data: { metersRemaining: { increment: Number(issue.meters) } },
      });
      await tx.fabricIssue.delete({ where: { id } });
      return { message: "Fabric issue deleted" };
    });
  }

  async listPurchases(organizationId: string) {
    return prisma.fabricPurchase.findMany({
      where: { organizationId },
      include: { fabric: true, supplier: true },
      orderBy: { purchaseDate: "desc" },
    });
  }

  /** Stock In: create new fabric roll or top-up existing, and record FabricPurchase */
  async stockIn(
    organizationId: string,
    input: FabricInput & {
      fabricId?: string;
      meters?: string | number;
      notes?: string;
      invoiceNo?: string;
      otherCosts?: string | number;
      tax?: string | number;
      discount?: string | number;
    },
  ) {
    const meters = Number(input.meters ?? input.metersTotal);
    if (!meters || meters <= 0)
      throw new AppError(400, "Meters must be greater than 0");
    const costPerMeter = Number(input.cost) || 0;
    const otherCosts = Number(input.otherCosts) || 0;
    const tax = Number(input.tax) || 0;
    const discount = Number(input.discount) || 0;
    const fabricCost = costPerMeter * meters;
    const totalPurchaseCost = Math.max(
      0,
      fabricCost + otherCosts + tax - discount,
    );

    return prisma.$transaction(async (tx) => {
      const resolvedSupplierId = await this.resolveSupplierId(
        tx,
        organizationId,
        input.supplierId,
        input.supplierName,
      );

      let fabric;
      if (input.fabricId) {
        fabric = await tx.fabric.findFirst({
          where: { id: input.fabricId, organizationId },
        });
        if (!fabric) throw new AppError(404, "Fabric not found");
        fabric = await tx.fabric.update({
          where: { id: fabric.id },
          data: {
            metersTotal: { increment: meters },
            metersRemaining: { increment: meters },
            ...(input.cost !== undefined ? { cost: String(costPerMeter) } : {}),
            ...(resolvedSupplierId ? { supplierId: resolvedSupplierId } : {}),
            ...(input.warehouse ? { warehouse: input.warehouse } : {}),
            ...(input.academicYear ? { academicYear: input.academicYear } : {}),
            ...(input.purchaseDate
              ? { purchaseDate: new Date(input.purchaseDate) }
              : {}),
          },
          include: { supplier: true },
        });
      } else {
        const rollNumber =
          input.rollNumber?.trim() ||
          (await this.nextRollNumber(tx, organizationId));
        fabric = await tx.fabric.create({
          data: {
            organizationId,
            name: input.name!,
            supplierId: resolvedSupplierId,
            rollNumber,
            metersTotal: String(meters),
            metersRemaining: String(meters),
            cost: String(costPerMeter),
            color: input.color,
            quality: input.quality,
            warehouse: input.warehouse,
            academicYear: input.academicYear,
            purchaseDate: input.purchaseDate
              ? new Date(input.purchaseDate)
              : new Date(),
          },
          include: { supplier: true },
        });
      }

      const purchase = await tx.fabricPurchase.create({
        data: {
          organizationId,
          fabricId: fabric.id,
          name: fabric.name,
          supplierId: resolvedSupplierId ?? fabric.supplierId,
          meters: String(meters),
          cost: String(totalPurchaseCost),
          purchaseDate: input.purchaseDate
            ? new Date(input.purchaseDate)
            : new Date(),
          notes:
            [
              input.academicYear ? `Year: ${input.academicYear}` : null,
              input.invoiceNo ? `Invoice: ${input.invoiceNo}` : null,
              otherCosts ? `Other costs: ${otherCosts}` : null,
              tax ? `Tax: ${tax}` : null,
              discount ? `Discount: ${discount}` : null,
              input.notes,
            ]
              .filter(Boolean)
              .join(" · ") || null,
        },
        include: { fabric: true, supplier: true },
      });

      return { fabric, purchase };
    });
  }

  async summary(organizationId: string) {
    const [fabrics, issues, purchases, orders] = await Promise.all([
      prisma.fabric.findMany({
        where: { organizationId },
        include: { supplier: true },
      }),
      prisma.fabricIssue.findMany({ where: { organizationId } }),
      prisma.fabricPurchase.findMany({ where: { organizationId } }),
      prisma.productionOrder.findMany({
        where: { organizationId },
        include: { fabric: true, product: true, tailor: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    const totalMeters = fabrics.reduce(
      (s, f) => s + Number(f.metersRemaining),
      0,
    );
    const stockValue = fabrics.reduce(
      (s, f) => s + Number(f.metersRemaining) * Number(f.cost),
      0,
    );
    const lowStock = fabrics.filter(
      (f) => Number(f.metersRemaining) < 50,
    ).length;
    const usedMeters = issues.reduce((s, i) => s + Number(i.meters), 0);
    const expectedUniforms = issues.reduce(
      (s, i) => s + (i.expectedPieces ?? 0),
      0,
    );
    const productionCost = purchases.reduce((s, p) => s + Number(p.cost), 0);
    const estimatedRevenue = expectedUniforms * 4500; // avg selling estimate

    const usageByFabric = fabrics.map((f) => {
      const used = Number(f.metersTotal) - Number(f.metersRemaining);
      return {
        fabric: f.name,
        metersUsed: used,
        remaining: Number(f.metersRemaining),
      };
    });

    return {
      kpis: {
        fabricTypes: fabrics.length,
        totalMeters,
        stockValue,
        lowStock,
        usedMeters,
        expectedUniforms,
        productionCost,
        estimatedRevenue,
      },
      fabrics,
      issues,
      purchases,
      orders,
      charts: {
        usageByFabric: usageByFabric
          .sort((a, b) => b.metersUsed - a.metersUsed)
          .slice(0, 8),
        monthlyPurchases: purchases.slice(0, 12).map((p) => ({
          label: p.name,
          meters: Number(p.meters),
          cost: Number(p.cost),
          date: p.purchaseDate,
        })),
      },
    };
  }
}

export const fabricService = new FabricService();
