import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";

/**
 * Per-module active financial year.
 *
 * Land and Vehicles each keep their own active year so selecting a year in one
 * module never changes the year another module (or the generic register) uses.
 * The organization-wide `FinancialYear.status` remains the fallback.
 */

export type ModuleYearKey = "land" | "vehicles";

type YearLike = { year: number; status: string };

export function resolveModuleActiveYear(
  requested: number | null | undefined,
  years: YearLike[]
): number | null {
  if (requested != null && years.some((fy) => fy.year === requested)) {
    return requested;
  }
  return years.find((fy) => fy.status === "Active")?.year ?? years[0]?.year ?? null;
}

export async function getModuleActiveYear(
  organizationId: string,
  module: ModuleYearKey
): Promise<number | null> {
  try {
    const setting = await prisma.moduleYearSetting.findUnique({
      where: { organizationId_module: { organizationId, module } },
      select: { activeYear: true },
    });
    return setting?.activeYear ?? null;
  } catch (error) {
    // The setting table is created by `prisma db push`. If a deployment runs
    // against a database that has not been synced yet, fall back to the
    // organization-wide active year instead of breaking Land/Vehicle meta.
    console.warn(`Could not read ${module} active year`, error);
    return null;
  }
}

export async function setModuleActiveYear(
  organizationId: string,
  module: ModuleYearKey,
  year: number
) {
  const normalizedYear = Number(year);
  if (!Number.isFinite(normalizedYear)) {
    throw new AppError(400, "Financial year is required");
  }

  const fy = await prisma.financialYear.findUnique({
    where: { organizationId_year: { organizationId, year: normalizedYear } },
    select: { id: true, year: true },
  });
  if (!fy) {
    throw new AppError(404, `Financial year ${normalizedYear} was not found for this organization`);
  }

  return prisma.moduleYearSetting.upsert({
    where: { organizationId_module: { organizationId, module } },
    create: { organizationId, module, activeYear: fy.year },
    update: { activeYear: fy.year },
  });
}
