import { FinancialYearStatus } from "../generated/prisma";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { computeYearStartAnnualDep, isLandCategory } from "./register-math";
import { listCategories } from "./category.service";
import {
  computeCarryForwardTotalDep,
  priorYearHasManualDepAdjustments,
  sumAdjustments,
} from "./adjustment-math";
import { loadAdjustmentsForAssetRow } from "./adjustment.service";

export async function listFinancialYears(organizationId: string) {
  return prisma.financialYear.findMany({
    where: { organizationId },
    include: { categoryBalances: true },
    orderBy: { year: "desc" },
  });
}

export async function getActiveFinancialYear(organizationId: string) {
  return prisma.financialYear.findFirst({
    where: { organizationId, status: FinancialYearStatus.Active },
    include: { categoryBalances: true },
  });
}

export async function getOpeningPreview(organizationId: string, year: number) {
  const categories = await listCategories(organizationId);
  const prior = await prisma.financialYear.findFirst({
    where: { organizationId, year: year - 1 },
    include: { categoryBalances: true },
  });

  return categories.map((c) => {
    const priorBal = prior?.categoryBalances.find(
      (b) => b.categoryName.toLowerCase() === c.name.toLowerCase()
    );
    const opening = priorBal?.closingBalance ?? 0;
    const acc = isLandCategory(c.name) ? 0 : priorBal?.accumulatedDepreciationStart
      ? // Prefer last asset TDep if any
        priorBal.accumulatedDepreciationStart
      : 0;
    return {
      category: c.name,
      categoryId: c.id,
      depreciationRate: c.depreciationRate,
      openingBalance: opening,
      accumulatedDepreciation: isLandCategory(c.name) ? 0 : acc,
      lastYearClosing: priorBal?.closingBalance ?? null,
      previewAnnualDep: isLandCategory(c.name)
        ? 0
        : computeYearStartAnnualDep(opening, acc, c.depreciationRate),
    };
  });
}

async function resolveAccFromPriorRegister(
  organizationId: string,
  categoryName: string,
  priorYear: number
) {
  const last = await prisma.asset.findFirst({
    where: {
      organizationId,
      categoryName: { equals: categoryName, mode: "insensitive" },
      registerYear: priorYear,
      deletedAt: null,
    },
    orderBy: { id: "desc" },
  });
  if (!last) return null;
  const adjustments = await loadAdjustmentsForAssetRow(organizationId, last);
  const priorTotals = sumAdjustments(adjustments, { registerYear: priorYear });
  const accumulated = priorYearHasManualDepAdjustments(priorTotals)
    ? computeCarryForwardTotalDep(last.totalDep, priorTotals)
    : last.totalDep;
  return {
    opening: last.totalBalance,
    accumulated,
    netBook: last.netBookValue,
  };
}

export async function createFinancialYear(
  organizationId: string,
  input: {
    year: number;
    startDate: string;
    endDate: string;
    description?: string;
    depMethod?: string;
    autoCarryForward?: boolean;
    lockPreviousYear?: boolean;
    status?: "Draft" | "Active" | "Closed";
    categoryBalances: Array<{
      category: string;
      openingBalance: number;
      accumulatedDepreciation?: number;
      depreciationRate: number;
    }>;
  }
) {
  const year = Number(input.year);
  if (!year) throw new AppError(400, "year is required");

  const exists = await prisma.financialYear.findUnique({
    where: { organizationId_year: { organizationId, year } },
  });
  if (exists) throw new AppError(409, `Financial year ${year} already exists`);

  const categories = await listCategories(organizationId);
  const status = (input.status as FinancialYearStatus) ?? FinancialYearStatus.Draft;

  if (status === FinancialYearStatus.Active) {
    await prisma.financialYear.updateMany({
      where: { organizationId, status: FinancialYearStatus.Active },
      data: {
        status: input.lockPreviousYear !== false ? FinancialYearStatus.Closed : FinancialYearStatus.Draft,
      },
    });
  }

  const balances = [];
  for (const row of input.categoryBalances ?? []) {
    const cat = categories.find((c) => c.name.toLowerCase() === row.category.toLowerCase());
    if (!cat) throw new AppError(400, `Unknown category: ${row.category}`);

    let opening = Number(row.openingBalance) || 0;
    let acc = isLandCategory(cat.name) ? 0 : Number(row.accumulatedDepreciation) || 0;

    if (input.autoCarryForward !== false) {
      const fromReg = await resolveAccFromPriorRegister(organizationId, cat.name, year - 1);
      if (fromReg) {
        opening = fromReg.opening;
        acc = isLandCategory(cat.name) ? 0 : fromReg.accumulated;
      }
    }

    const annual = isLandCategory(cat.name)
      ? 0
      : computeYearStartAnnualDep(opening, acc, row.depreciationRate ?? cat.depreciationRate);

    balances.push({
      organizationId,
      categoryId: cat.id,
      categoryName: cat.name,
      openingBalance: opening,
      lastYearClosing: opening,
      purchases: 0,
      accumulatedDepreciationStart: acc,
      annualDepreciation: annual,
      closingBalance: opening,
      depreciationRate: Number(row.depreciationRate ?? cat.depreciationRate),
    });
  }

  const totalOpening = balances.reduce((s, b) => s + b.openingBalance, 0);

  return prisma.financialYear.create({
    data: {
      organizationId,
      year,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      description: input.description,
      depMethod: input.depMethod ?? "Diminishing",
      autoCarryForward: input.autoCarryForward !== false,
      lockPreviousYear: input.lockPreviousYear !== false,
      status,
      totalOpening,
      totalPurchases: 0,
      totalClosing: totalOpening,
      categoryBalances: { create: balances },
    },
    include: { categoryBalances: true },
  });
}

export async function updateFinancialYear(
  organizationId: string,
  id: string,
  input: Partial<{
    description: string;
    status: "Draft" | "Active" | "Closed";
    categoryBalances: Array<{
      category: string;
      openingBalance: number;
      accumulatedDepreciation?: number;
      depreciationRate: number;
    }>;
  }>
) {
  const fy = await prisma.financialYear.findFirst({
    where: { id, organizationId },
    include: { categoryBalances: true },
  });
  if (!fy) throw new AppError(404, "Financial year not found");

  if (input.status === "Active") {
    await prisma.financialYear.updateMany({
      where: { organizationId, status: FinancialYearStatus.Active, NOT: { id } },
      data: { status: FinancialYearStatus.Closed },
    });
  }

  if (input.categoryBalances) {
    const categories = await listCategories(organizationId);
    for (const row of input.categoryBalances) {
      let existing = fy.categoryBalances.find(
        (b) => b.categoryName.toLowerCase() === row.category.toLowerCase()
      );
      const cat = categories.find((c) => c.name.toLowerCase() === row.category.toLowerCase());
      if (!cat) throw new AppError(400, `Unknown category: ${row.category}`);

      const acc = isLandCategory(row.category) ? 0 : Number(row.accumulatedDepreciation) || 0;
      const opening = Number(row.openingBalance) || 0;
      const annual = isLandCategory(row.category)
        ? 0
        : computeYearStartAnnualDep(opening, acc, Number(row.depreciationRate));

      if (!existing) {
        existing = await prisma.yearCategoryBalance.create({
          data: {
            organizationId,
            financialYearId: id,
            categoryId: cat.id,
            categoryName: cat.name,
            openingBalance: opening,
            lastYearClosing: opening,
            purchases: 0,
            accumulatedDepreciationStart: acc,
            annualDepreciation: annual,
            closingBalance: opening,
            depreciationRate: Number(row.depreciationRate),
          },
        });
        continue;
      }

      await prisma.yearCategoryBalance.update({
        where: { id: existing.id },
        data: {
          openingBalance: opening,
          accumulatedDepreciationStart: acc,
          depreciationRate: Number(row.depreciationRate),
          annualDepreciation: annual,
        },
      });
    }
  }

  return prisma.financialYear.update({
    where: { id },
    data: {
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status ? { status: input.status as FinancialYearStatus } : {}),
    },
    include: { categoryBalances: true },
  });
}

export async function closeFinancialYear(organizationId: string, id: string) {
  return updateFinancialYear(organizationId, id, { status: "Closed" });
}

export async function reopenFinancialYear(organizationId: string, id: string) {
  return updateFinancialYear(organizationId, id, { status: "Active" });
}

export async function deleteFinancialYear(organizationId: string, id: string) {
  const fy = await prisma.financialYear.findFirst({ where: { id, organizationId } });
  if (!fy) throw new AppError(404, "Financial year not found");
  const assets = await prisma.asset.count({
    where: { organizationId, registerYear: fy.year, deletedAt: null },
  });
  if (assets > 0) throw new AppError(400, "Cannot delete a year that has register assets");
  await prisma.financialYear.delete({ where: { id } });
  return { success: true };
}

export async function getCategoryOpening(
  organizationId: string,
  year: number,
  category: string
) {
  const fy = await prisma.financialYear.findUnique({
    where: { organizationId_year: { organizationId, year } },
    include: { categoryBalances: true },
  });
  const bal = fy?.categoryBalances.find(
    (b) => b.categoryName.toLowerCase() === category.toLowerCase()
  );
  return bal ?? null;
}
