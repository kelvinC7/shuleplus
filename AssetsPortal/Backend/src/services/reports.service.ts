import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { getDashboard } from "./dashboard.service";
import { listCategories } from "./category.service";
import { listFinancialYears } from "./year.service";
import { listAssignments, listMaintenance, listTransfers } from "./operations.service";

const REPORT_TYPES = [
  "overview",
  "all-assets",
  "categories",
  "financial-years",
  "health",
  "assignments",
  "returns",
  "transfers",
  "maintenance",
  "depreciation",
  "damaged-lost",
  "locations",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export function listReportTypes() {
  return REPORT_TYPES;
}

export async function getReport(organizationId: string, type: string) {
  if (!REPORT_TYPES.includes(type as ReportType)) {
    throw new AppError(400, `Unknown report type. Valid: ${REPORT_TYPES.join(", ")}`);
  }

  switch (type as ReportType) {
    case "overview":
      return getDashboard(organizationId);
    case "all-assets": {
      const data = await prisma.asset.findMany({
        where: { organizationId, deletedAt: null },
        orderBy: [{ registerYear: "desc" }, { categoryName: "asc" }, { id: "asc" }],
      });
      return { type, count: data.length, data };
    }
    case "categories":
      return { type, data: await listCategories(organizationId) };
    case "financial-years":
      return { type, data: await listFinancialYears(organizationId) };
    case "health": {
      const data = await prisma.asset.findMany({
        where: { organizationId, deletedAt: null },
        select: {
          id: true,
          assetCode: true,
          assetName: true,
          categoryName: true,
          assetHealthStatus: true,
          netBookValue: true,
          registerYear: true,
        },
      });
      return { type, data };
    }
    case "assignments":
      return { type, data: (await listAssignments(organizationId)).data };
    case "returns": {
      const data = (await listAssignments(organizationId)).data.filter((a) => a.status === "Returned");
      return { type, data };
    }
    case "transfers":
      return { type, data: (await listTransfers(organizationId)).data };
    case "maintenance":
      return { type, data: (await listMaintenance(organizationId)).data };
    case "depreciation": {
      const data = await prisma.asset.findMany({
        where: { organizationId, deletedAt: null },
        select: {
          id: true,
          assetCode: true,
          assetName: true,
          categoryName: true,
          registerYear: true,
          depRate: true,
          openingAmount: true,
          unitPrice: true,
          totalBalance: true,
          accumulatedDepreciation: true,
          annualDep: true,
          totalDep: true,
          netBookValue: true,
        },
        orderBy: [{ registerYear: "desc" }, { categoryName: "asc" }],
      });
      return { type, data };
    }
    case "damaged-lost": {
      const data = await prisma.asset.findMany({
        where: {
          organizationId,
          deletedAt: null,
          assetHealthStatus: "NotUsedOld",
        },
      });
      return { type, data };
    }
    case "locations": {
      const assets = await prisma.asset.findMany({
        where: { organizationId, deletedAt: null },
      });
      const map = new Map<string, { count: number; netBook: number }>();
      for (const a of assets) {
        const key = a.location || "Unspecified";
        const cur = map.get(key) ?? { count: 0, netBook: 0 };
        cur.count += 1;
        cur.netBook += a.netBookValue;
        map.set(key, cur);
      }
      return {
        type,
        data: [...map.entries()].map(([location, v]) => ({ location, ...v })),
      };
    }
    default:
      throw new AppError(400, "Unknown report");
  }
}
