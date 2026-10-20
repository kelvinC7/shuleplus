import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import type { Prisma } from '../generated/prisma';
import { getTeacherAccount } from '../clients/iam.client';
import { teacherStaffIdService } from './teacher-staff-id.service';
import {
  formatModernStaffId,
  isLegacyStaffId,
  isModernStaffId,
  normalizeStaffIdInput,
  parseOrganizationStaffPrefix,
  parseStaffIdTail,
  resolveStaffRolePrefix,
} from '../utils/staff-id';

function withRolePrefix(
  organizationCode: string | null | undefined,
  raw: string,
  position?: string | null
): string | null {
  const parsed = parseStaffIdTail(raw);
  if (!parsed) return null;
  const { prefix: schoolPrefix } = parseOrganizationStaffPrefix(organizationCode);
  if (`${parsed.districtCode}${parsed.schoolCode}` !== schoolPrefix) return null;
  const role =
    parsed.rolePrefix ?? resolveStaffRolePrefix({ position: position ?? 'Teacher' });
  return formatModernStaffId(role, parsed.districtCode, parsed.schoolCode, parsed.sequence);
}

async function resolveEmployeeNumber(
  organizationId: string,
  input: {
    employeeNumber?: string | null;
    teacherUserId: string;
    existingEmployeeNumber?: string | null;
    position?: string | null;
  }
): Promise<string> {
  const tenant = await prisma.tenant.findUnique({ where: { organizationId } });

  const manual = input.employeeNumber?.trim()
    ? normalizeStaffIdInput(input.employeeNumber)
    : '';
  if (manual && isModernStaffId(manual)) return manual;
  if (manual) {
    const upgraded = withRolePrefix(tenant?.organizationCode, manual, input.position);
    if (upgraded) return upgraded;
  }

  const existing = normalizeStaffIdInput(input.existingEmployeeNumber);
  if (existing && isModernStaffId(existing)) return existing;
  if (existing && !isLegacyStaffId(existing)) {
    const upgraded = withRolePrefix(tenant?.organizationCode, existing, input.position);
    if (upgraded) return upgraded;
  }

  const teacherUserId = input.teacherUserId.trim();
  if (teacherUserId && !teacherUserId.startsWith('teacher-')) {
    const account = await getTeacherAccount(organizationId, teacherUserId);
    const fromIam = account?.employeeId?.trim() ? normalizeStaffIdInput(account.employeeId) : '';
    if (fromIam && isModernStaffId(fromIam)) return fromIam;
    if (fromIam) {
      const upgraded = withRolePrefix(tenant?.organizationCode, fromIam, input.position);
      if (upgraded) return upgraded;
    }
  }

  return teacherStaffIdService.allocateForOrganization(organizationId, input.position);
}

export class TeacherProfileService {
  async list(organizationId: string) {
    return prisma.timetableTeacherProfile.findMany({
      where: { organizationId },
      orderBy: { teacherName: 'asc' },
    });
  }

  async upsert(
    organizationId: string,
    data: {
      teacherUserId: string;
      teacherName: string;
      employeeNumber?: string | null;
      position?: string | null;
      maxPeriodsPerDay?: number;
      availableDays?: string[];
      preferredSlots?: Prisma.InputJsonValue;
      unavailableSlots?: Prisma.InputJsonValue;
      portalEnabled?: boolean;
      loginMethod?: string;
      loginEmail?: string | null;
      loginPhone?: string | null;
    }
  ) {
    const existing = await prisma.timetableTeacherProfile.findUnique({
      where: {
        organizationId_teacherUserId: {
          organizationId,
          teacherUserId: data.teacherUserId,
        },
      },
      select: { employeeNumber: true },
    });

    const position = data.position?.trim() || 'Teacher';
    const hadEmployeeNumber = Boolean(existing?.employeeNumber?.trim());
    const employeeNumber = hadEmployeeNumber
      ? normalizeStaffIdInput(existing!.employeeNumber!)
      : await resolveEmployeeNumber(organizationId, {
          employeeNumber: data.employeeNumber,
          teacherUserId: data.teacherUserId,
          existingEmployeeNumber: existing?.employeeNumber,
          position,
        });

    return prisma.timetableTeacherProfile.upsert({
      where: {
        organizationId_teacherUserId: {
          organizationId,
          teacherUserId: data.teacherUserId,
        },
      },
      create: {
        organizationId,
        teacherUserId: data.teacherUserId,
        teacherName: data.teacherName,
        position,
        employeeNumber,
        maxPeriodsPerDay: data.maxPeriodsPerDay ?? 6,
        availableDays: data.availableDays ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        preferredSlots: data.preferredSlots ?? [],
        unavailableSlots: data.unavailableSlots ?? [],
        portalEnabled: data.portalEnabled ?? false,
        loginMethod: data.loginMethod ?? 'email',
        loginEmail: data.loginEmail ?? null,
        loginPhone: data.loginPhone ?? null,
      },
      update: {
        teacherName: data.teacherName,
        position,
        ...(!hadEmployeeNumber && employeeNumber ? { employeeNumber } : {}),
        ...(data.maxPeriodsPerDay !== undefined ? { maxPeriodsPerDay: data.maxPeriodsPerDay } : {}),
        ...(data.availableDays ? { availableDays: data.availableDays } : {}),
        ...(data.preferredSlots ? { preferredSlots: data.preferredSlots } : {}),
        ...(data.unavailableSlots ? { unavailableSlots: data.unavailableSlots } : {}),
        ...(data.portalEnabled !== undefined ? { portalEnabled: data.portalEnabled } : {}),
        ...(data.loginMethod ? { loginMethod: data.loginMethod } : {}),
        ...(data.loginEmail !== undefined ? { loginEmail: data.loginEmail } : {}),
        ...(data.loginPhone !== undefined ? { loginPhone: data.loginPhone } : {}),
      },
    });
  }

  async bulkUpsert(
    organizationId: string,
    profiles: Array<{
      teacherUserId: string;
      teacherName: string;
      employeeNumber?: string | null;
      maxPeriodsPerDay?: number;
      availableDays?: string[];
      preferredSlots?: Prisma.InputJsonValue;
      unavailableSlots?: Prisma.InputJsonValue;
    }>
  ) {
    const results = [];
    for (const profile of profiles) {
      results.push(await this.upsert(organizationId, profile));
    }
    return results;
  }

  async remove(organizationId: string, teacherUserId: string) {
    const existing = await prisma.timetableTeacherProfile.findUnique({
      where: { organizationId_teacherUserId: { organizationId, teacherUserId } },
    });
    if (!existing) throw new AppError(404, 'Teacher profile not found');
    await prisma.timetableTeacherProfile.delete({
      where: { organizationId_teacherUserId: { organizationId, teacherUserId } },
    });
    return { deleted: true };
  }
}

export const teacherProfileService = new TeacherProfileService();
