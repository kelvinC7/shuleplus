import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

type DisciplineCountFilter = {
  organizationId: string;
  status?: string;
  severity?: string;
  since?: Date;
};

/** Count discipline cases; works even when Prisma client was not regenerated yet. */
export async function countDisciplineCases(filter: DisciplineCountFilter): Promise<number> {
  const delegate = (prisma as { disciplineCase?: { count: (args: unknown) => Promise<number> } }).disciplineCase;
  if (delegate) {
    return delegate.count({
      where: {
        organizationId: filter.organizationId,
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.severity ? { severity: filter.severity } : {}),
        ...(filter.since ? { incidentDate: { gte: filter.since } } : {}),
      },
    });
  }

  try {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM discipline_cases
        WHERE organization_id = ${filter.organizationId}
        ${filter.status ? Prisma.sql`AND status = ${filter.status}` : Prisma.empty}
        ${filter.severity ? Prisma.sql`AND severity = ${filter.severity}` : Prisma.empty}
        ${filter.since ? Prisma.sql`AND incident_date >= ${filter.since}` : Prisma.empty}
      `
    );
    return Number(rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

export function getDisciplineCaseDelegate() {
  const delegate = (prisma as { disciplineCase?: typeof prisma.disciplineCase }).disciplineCase;
  if (!delegate) {
    throw new Error(
      'Prisma client is missing DisciplineCase. Stop the server, run npm run prisma:generate, then restart.'
    );
  }
  return delegate;
}
