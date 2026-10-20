import { prisma } from '../config/database';
import { Prisma } from '../generated/prisma';
import { AppError } from '../middleware/error.middleware';
import {
  defaultAcademicSettings,
  parseAcademicSettings,
  validateAcademicYear,
  type AcademicSettings,
} from '../utils/academic-settings';

import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { env } from '../config/env';
import {
  defaultAcademicSettings,
  parseAcademicSettings,
  validateAcademicYear,
  type AcademicSettings,
} from '../utils/academic-settings';

async function fetchIamAcademicSettings(organizationId: string): Promise<AcademicSettings | null> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  const url = `${base}/internal/organizations/${organizationId}/academic-settings`;
  try {
    const response = await fetch(url, {
      headers: {
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'student-management',
      },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { success?: boolean; data?: AcademicSettings };
    return body.data ? parseAcademicSettings(body.data) : null;
  } catch {
    return null;
  }
}

export class SettingsService {
  async getAcademic(organizationId: string): Promise<AcademicSettings> {
    const iam = await fetchIamAcademicSettings(organizationId);
    if (iam) {
      const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
      if (tenant) {
        await prisma.tenant.update({
          where: { organizationId },
          data: { academicSettings: iam },
        });
      }
      return iam;
    }

    const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
    if (!tenant) throw new AppError(404, 'Tenant not found');
    return parseAcademicSettings(tenant.academicSettings);
  }

  async updateAcademic(organizationId: string, input: AcademicSettings): Promise<AcademicSettings> {
    const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
    if (!tenant) throw new AppError(404, 'Tenant not found');

    const academicYears = [...new Set(input.academicYears.map((y) => y.trim()).filter(Boolean))];
    if (!academicYears.length) throw new AppError(400, 'At least one academic year is required');
    for (const year of academicYears) {
      if (!validateAcademicYear(year)) {
        throw new AppError(400, `Invalid academic year "${year}". Use format 2025-2026`);
      }
    }

    const terms = [...new Set(input.terms.map((t) => t.trim()).filter(Boolean))];
    if (!terms.length) throw new AppError(400, 'At least one term is required');

    const currentAcademicYear =
      input.currentAcademicYear && academicYears.includes(input.currentAcademicYear)
        ? input.currentAcademicYear
        : academicYears[0];
    const currentTerm =
      input.currentTerm && terms.includes(input.currentTerm) ? input.currentTerm : terms[0];

    const payload: AcademicSettings = {
      academicYears,
      terms,
      currentAcademicYear,
      currentTerm,
    };

    await prisma.tenant.update({
      where: { organizationId },
      data: { academicSettings: payload as unknown as Prisma.InputJsonValue },
    });

    return payload;
  }

  async ensureDefaults(organizationId: string): Promise<void> {
    const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
    if (!tenant || tenant.academicSettings) return;
    await prisma.tenant.update({
      where: { organizationId },
      data: { academicSettings: defaultAcademicSettings() as unknown as Prisma.InputJsonValue },
    });
  }
}

export const settingsService = new SettingsService();
