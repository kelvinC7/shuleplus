import { Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  defaultAcademicSettings,
  parseAcademicSettings,
  validateAcademicYear,
  type AcademicSettings,
} from '../utils/academic-settings';

export class AcademicSettingsService {
  async ensureSchoolProfile(organizationId: string) {
    let profile = await prisma.schoolProfile.findUnique({ where: { organizationId } });
    if (!profile) {
      profile = await prisma.schoolProfile.create({
        data: { organizationId, educationLevels: [] },
      });
    }
    return profile;
  }

  async getForOrganization(organizationId: string): Promise<AcademicSettings> {
    const profile = await this.ensureSchoolProfile(organizationId);
    const parsed = parseAcademicSettings(profile.academicSettings);

    // Legacy single-year field → keep in sync when JSON empty
    if (
      profile.academicYear &&
      validateAcademicYear(profile.academicYear) &&
      !parsed.academicYears.includes(profile.academicYear)
    ) {
      return {
        ...parsed,
        academicYears: [...new Set([...parsed.academicYears, profile.academicYear])].sort(),
        currentAcademicYear: parsed.currentAcademicYear ?? profile.academicYear,
      };
    }

    return parsed;
  }

  async updateForOrganization(organizationId: string, input: AcademicSettings): Promise<AcademicSettings> {
    if (!input.academicYears.length) {
      throw new AppError(400, 'At least one academic year is required');
    }
    for (const year of input.academicYears) {
      if (!validateAcademicYear(year)) {
        throw new AppError(400, `Invalid academic year: ${year}. Use format 2025-2026`);
      }
    }
    if (input.currentAcademicYear && !input.academicYears.includes(input.currentAcademicYear)) {
      throw new AppError(400, 'Current academic year must be in the academic years list');
    }
    if (input.currentTerm && !input.terms.includes(input.currentTerm)) {
      throw new AppError(400, 'Current term must be in the terms list');
    }

    const terms = [...new Set(input.terms.length ? input.terms : defaultAcademicSettings().terms)];
    const termDates: AcademicSettings['termDates'] = {};
    if (input.termDates) {
      for (const term of terms) {
        const range = input.termDates[term];
        if (range?.start && range?.end && range.start <= range.end) {
          termDates[term] = { start: range.start, end: range.end };
        }
      }
    }

    const normalized: AcademicSettings = {
      academicYears: [...new Set(input.academicYears)].sort(),
      terms,
      currentAcademicYear: input.currentAcademicYear ?? input.academicYears[0] ?? null,
      currentTerm: input.currentTerm ?? input.terms[0] ?? null,
      termDates: Object.keys(termDates).length ? termDates : undefined,
      reportCard: input.reportCard,
    };

    await prisma.schoolProfile.update({
      where: { organizationId },
      data: {
        academicSettings: normalized as unknown as Prisma.InputJsonValue,
        academicYear: normalized.currentAcademicYear,
      },
    });

    return normalized;
  }
}

export const academicSettingsService = new AcademicSettingsService();
