import type { Prisma } from '../generated/prisma';

/** Intake gate accepts legacy SUBMITTED rows until normalized. */
export const INTAKE_ACTIVE_STATUSES = ['VALIDATION', 'RESUBMITTED', 'SUBMITTED'] as const;

export function buildTenantJurisdictionWhere(
  jurisdiction?: { district?: string; sector?: string }
): Prisma.TenantWhereInput | undefined {
  if (!jurisdiction?.district?.trim() && !jurisdiction?.sector?.trim()) return undefined;

  const AND: Prisma.TenantWhereInput[] = [];
  const district = jurisdiction.district?.trim();
  const sector = jurisdiction.sector?.trim();

  if (district) {
    AND.push({ district: { equals: district, mode: 'insensitive' } });
  }
  if (sector) {
    AND.push({ sector: { equals: sector, mode: 'insensitive' } });
  }

  return AND.length === 1 ? AND[0]! : { AND };
}
