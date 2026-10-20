import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { env } from '../config/env';

function resolvePhoto(photo: string | null | undefined): string | null {
  if (!photo?.trim()) return null;
  const value = photo.trim();
  const base = (process.env.PUBLIC_BASE_URL ?? `http://localhost:${env.PORT}`).replace(/\/$/, '');
  const uploadsIdx = value.indexOf('/uploads/');
  if (uploadsIdx >= 0) return `${base}${value.slice(uploadsIdx)}`;
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith('/') ? `${base}${value}` : `${base}/${value}`;
}

export class PublicStaffLookupService {
  async lookupByCode(code: string) {
    const raw = code.trim();
    if (!raw) throw new AppError(400, 'Staff ID is required');

    const employee = await prisma.employee.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { employeeNumber: { equals: raw, mode: 'insensitive' } },
          { id: raw },
          { email: { startsWith: `${raw.toLowerCase()}@`, mode: 'insensitive' } },
        ],
      },
      include: {
        department: { select: { name: true } },
      },
    });

    if (!employee) {
      throw new AppError(404, 'No staff member found for that ID');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { organizationId: employee.organizationId },
      select: { organizationName: true, organizationCode: true },
    });

    return {
      id: employee.id,
      organizationId: employee.organizationId,
      fullName: [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ').trim(),
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeNumber: employee.employeeNumber,
      position: employee.position,
      department: employee.department?.name ?? null,
      email: employee.email,
      phone: employee.phone,
      photoUrl: resolvePhoto(employee.photoUrl),
      status: employee.status,
      schoolName: tenant?.organizationName ?? 'School',
      schoolCode: tenant?.organizationCode ?? null,
      district: null,
      source: 'hr' as const,
    };
  }
}

export const publicStaffLookupService = new PublicStaffLookupService();
