import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

function academicYearVariants(year?: string): string[] | undefined {
  if (!year?.trim()) return undefined;
  const variants = new Set<string>([year.trim()]);
  if (year.includes('-')) {
    variants.add(year.split('-')[0]!);
  } else {
    const y = Number(year);
    if (!Number.isNaN(y)) variants.add(`${y}-${y + 1}`);
  }
  return [...variants];
}

/** Teachers see lessons only for classes confirmed for this term/year (once any publish exists). */
export async function filterRowsVisibleToTeachers<
  T extends { className: string; term: string; academicYear: string },
>(organizationId: string, rows: T[], term?: string, academicYear?: string): Promise<T[]> {
  if (!rows.length) return rows;

  const yearVariants = academicYear ? academicYearVariants(academicYear) : undefined;
  const publishWhere = {
    organizationId,
    ...(term ? { term } : {}),
    ...(yearVariants?.length ? { academicYear: { in: yearVariants } } : {}),
  };

  const published = await prisma.classTimetablePublish.findMany({
    where: publishWhere,
    select: { className: true },
  });

  if (published.length === 0) return rows;

  const allowed = new Set(published.map((p) => p.className));
  return rows.filter((r) => allowed.has(r.className));
}

export async function confirmClassTimetable(
  organizationId: string,
  input: {
    className: string;
    term: string;
    academicYear: string;
    confirmedByUserId?: string | null;
  }
) {
  const className = input.className.trim();
  if (!className) throw new AppError(400, 'className is required');

  const lessonCount = await prisma.academicTimetable.count({
    where: {
      organizationId,
      className,
      term: input.term,
      academicYear: input.academicYear,
      isExtraActivity: false,
    },
  });

  if (lessonCount === 0) {
    throw new AppError(400, 'Add at least one lesson before confirming this class timetable');
  }

  return prisma.classTimetablePublish.upsert({
    where: {
      organizationId_className_term_academicYear: {
        organizationId,
        className,
        term: input.term,
        academicYear: input.academicYear,
      },
    },
    create: {
      organizationId,
      className,
      term: input.term,
      academicYear: input.academicYear,
      lessonCount,
      confirmedByUserId: input.confirmedByUserId ?? null,
    },
    update: {
      lessonCount,
      confirmedAt: new Date(),
      confirmedByUserId: input.confirmedByUserId ?? null,
    },
  });
}
