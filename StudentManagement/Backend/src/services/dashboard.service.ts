import { prisma } from '../config/database';
import { settingsService } from './settings.service';

function monthKey(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function normalizeYear(year: string): string {
  return year.replace(/\s/g, '').replace(/–/g, '-');
}

function formatCategoryLabel(category: string): string {
  if (!category) return 'General';
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
}

export class DashboardService {
  async getSummary(organizationId: string, academicYear?: string) {
    await settingsService.ensureDefaults(organizationId);
    const settings = await settingsService.getAcademic(organizationId);
    const chartYear = academicYear ?? settings.currentAcademicYear ?? undefined;
    const isCurrentYear =
      !!chartYear &&
      !!settings.currentAcademicYear &&
      normalizeYear(chartYear) === normalizeYear(settings.currentAcademicYear);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const enrollmentWhere: {
      organizationId: string;
      status: 'ACTIVE';
      isCurrent?: boolean;
      academicYear?: string;
    } = {
      organizationId,
      status: 'ACTIVE',
    };

    // Match Students page: current year uses active (isCurrent) enrollments.
    if (!chartYear || isCurrentYear) {
      enrollmentWhere.isCurrent = true;
    } else {
      enrollmentWhere.academicYear = chartYear;
    }

    const [
      studentCount,
      classCount,
      activeEnrollments,
      tenant,
      genderGroups,
      enrollments,
      classes,
      newStudentsMonth,
    ] = await Promise.all([
      prisma.student.count({ where: { organizationId, status: 'ACTIVE' } }),
      prisma.class.count({ where: { organizationId } }),
      prisma.enrollment.count({ where: { organizationId, isCurrent: true, status: 'ACTIVE' } }),
      prisma.tenant.findUnique({ where: { organizationId } }),
      prisma.student.groupBy({
        by: ['gender'],
        where: { organizationId, status: 'ACTIVE' },
        _count: { id: true },
      }),
      prisma.enrollment.findMany({
        where: enrollmentWhere,
        select: {
          classId: true,
          createdAt: true,
          student: { select: { gender: true } },
          class: { select: { name: true, stream: true, category: true } },
        },
      }),
      prisma.class.findMany({
        where: { organizationId },
        select: { id: true, name: true, stream: true, category: true, sortOrder: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.student.count({
        where: {
          organizationId,
          status: 'ACTIVE',
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ]);

    const genderDistribution = {
      MALE: genderGroups.find((g) => g.gender === 'MALE')?._count.id ?? 0,
      FEMALE: genderGroups.find((g) => g.gender === 'FEMALE')?._count.id ?? 0,
      OTHER: genderGroups.filter((g) => g.gender !== 'MALE' && g.gender !== 'FEMALE').reduce((s, g) => s + g._count.id, 0),
    };

    const categoryMap = new Map<string, number>();
    for (const cls of classes) {
      const cat = formatCategoryLabel(cls.category ?? 'General');
      if (!categoryMap.has(cat)) categoryMap.set(cat, 0);
    }
    for (const e of enrollments) {
      const cat = formatCategoryLabel(e.class?.category ?? 'General');
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
    }
    const studentsByCategory = [...categoryMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    const classCountMap = new Map<string, { value: number; male: number; female: number }>();
    for (const cls of classes) {
      classCountMap.set(cls.id, { value: 0, male: 0, female: 0 });
    }
    for (const e of enrollments) {
      const entry = classCountMap.get(e.classId);
      if (!entry) continue;
      entry.value += 1;
      if (e.student.gender === 'MALE') entry.male += 1;
      else if (e.student.gender === 'FEMALE') entry.female += 1;
    }
    const studentsByClass = classes.map((cls) => {
      const label = `${cls.name}${cls.stream ? ` ${cls.stream}` : ''}`;
      const counts = classCountMap.get(cls.id) ?? { value: 0, male: 0, female: 0 };
      return { label, ...counts };
    });

    const monthBuckets = new Map<string, number>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(sixMonthsAgo.getMonth() + i);
      monthBuckets.set(monthKey(d), 0);
    }
    for (const e of enrollments) {
      const key = monthKey(new Date(e.createdAt));
      if (monthBuckets.has(key)) monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + 1);
    }
    const enrollmentTrend = [...monthBuckets.entries()].map(([label, value]) => ({ label, value }));

    const enrollmentRate =
      studentCount > 0 ? Math.round((activeEnrollments / studentCount) * 100) : 0;

    return {
      organizationId,
      organizationName: tenant?.organizationName ?? 'Unknown',
      studentCount,
      classCount,
      activeEnrollments,
      newStudentsMonth,
      enrollmentRate,
      status: tenant?.status ?? 'UNKNOWN',
      genderDistribution,
      studentsByCategory,
      studentsByClass,
      enrollmentTrend,
      academicYear: chartYear ?? settings.currentAcademicYear,
    };
  }
}

export const dashboardService = new DashboardService();
