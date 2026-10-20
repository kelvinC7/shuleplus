import { prisma } from '../config/database';
import { RepresentativeAssignmentStatus } from '../generated/prisma';
import { defaultAcademicSettings } from '../utils/academic-settings';
import { academicSettingsService } from './academic-settings.service';

async function assignedSchoolIds(
  userId: string,
  organizationId?: string,
  source: 'representative' | 'chief' = 'representative'
): Promise<string[]> {
  const now = new Date();
  const where = {
    userId,
    status: RepresentativeAssignmentStatus.ACTIVE,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    ...(organizationId && organizationId !== 'all' ? { organizationId } : {}),
  };
  const assignments =
    source === 'chief'
      ? await prisma.chiefAccountantAssignment.findMany({ where, select: { organizationId: true } })
      : await prisma.schoolRepresentativeAssignment.findMany({ where, select: { organizationId: true } });
  const ids = assignments.map((a) => a.organizationId);
  if (!ids.length) return [];

  const orgs = await prisma.organization.findMany({
    where: { id: { in: ids }, type: 'SCHOOL' },
    select: { id: true },
    orderBy: { name: 'asc' },
  });
  return orgs.map((o) => o.id);
}

export async function getRepresentativeAcademicContext(
  userId: string,
  organizationId?: string,
  source: 'representative' | 'chief' = 'representative'
) {
  const orgIds = await assignedSchoolIds(userId, organizationId, source);
  const defaults = defaultAcademicSettings();

  if (!orgIds.length) {
    return {
      academicYears: defaults.academicYears,
      terms: defaults.terms,
      currentAcademicYear: defaults.currentAcademicYear!,
      currentTerm: defaults.currentTerm!,
    };
  }

  const settingsList = await Promise.all(
    orgIds.map((id) => academicSettingsService.getForOrganization(id))
  );

  const yearSet = new Set<string>();
  const termSet = new Set<string>();
  for (const s of settingsList) {
    s.academicYears.forEach((y) => yearSet.add(y));
    s.terms.forEach((t) => termSet.add(t));
  }

  const academicYears = yearSet.size ? [...yearSet].sort().reverse() : defaults.academicYears;
  const terms = termSet.size ? [...termSet] : defaults.terms;

  const primary = settingsList[0];
  let currentAcademicYear = primary?.currentAcademicYear ?? defaults.currentAcademicYear!;
  let currentTerm = primary?.currentTerm ?? defaults.currentTerm!;

  if (!academicYears.includes(currentAcademicYear)) {
    currentAcademicYear = academicYears[0] ?? currentAcademicYear;
  }
  if (!terms.includes(currentTerm)) {
    currentTerm = terms[0] ?? currentTerm;
  }

  return {
    academicYears,
    terms,
    currentAcademicYear,
    currentTerm,
  };
}
