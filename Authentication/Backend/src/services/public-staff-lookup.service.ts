import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { UserStatus } from '../generated/prisma';
import { env } from '../config/env';
import { staffIdService } from './staff-id.service';
import { queueStaffFanout } from './staff-fanout.service';
import { isModernStaffId, staffDisplayCode } from '../utils/staff-id';

function resolveIamPhoto(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const value = url.trim();
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  const base = (process.env.PUBLIC_BASE_URL ?? env.FRONTEND_URL).replace(/\/$/, '');
  return value.startsWith('/') ? `${base}${value}` : `${base}/${value}`;
}

async function lookupHrStaff(code: string) {
  const base = env.HR_API_URL.replace(/\/$/, '');
  const url = `${base}/public/staff/lookup?code=${encodeURIComponent(code)}`;
  const res = await fetch(url, {
    headers: { 'X-Service-Key': env.PLATFORM_SERVICE_KEY },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const body = (await res.json()) as { success?: boolean; data?: Record<string, unknown> };
  if (!body.success || !body.data) return null;
  return body.data;
}

async function findIamUserByCode(raw: string) {
  const needle = raw.trim();
  const baseWhere = { status: UserStatus.ACTIVE };

  let users = await prisma.user.findMany({
    where: {
      ...baseWhere,
      OR: [
        { employeeId: { equals: needle, mode: 'insensitive' } },
        { id: needle },
      ],
    },
    include: {
      organization: {
        select: { id: true, name: true, phone: true, email: true, logoUrl: true, organizationCode: true },
      },
      userRoles: { include: { role: { select: { name: true, slug: true } } } },
      userModules: { include: { module: { select: { slug: true } } } },
    },
    take: 10,
  });

  if (users.length === 0) {
    users = await prisma.user.findMany({
      where: {
        ...baseWhere,
        email: { startsWith: `${needle.toLowerCase()}@`, mode: 'insensitive' },
      },
      include: {
        organization: {
          select: { id: true, name: true, phone: true, email: true, logoUrl: true, organizationCode: true },
        },
        userRoles: { include: { role: { select: { name: true, slug: true } } } },
        userModules: { include: { module: { select: { slug: true } } } },
      },
      take: 10,
    });
  }

  const lower = needle.toLowerCase();
  return (
    users.find((u) => u.id === needle) ??
    users.find((u) => u.employeeId?.toLowerCase() === lower) ??
    users.find((u) => staffDisplayCode(u).toLowerCase() === lower) ??
    users.find((u) => u.email.split('@')[0]?.toLowerCase() === lower) ??
    null
  );
}

function mapIamUser(iamMatch: NonNullable<Awaited<ReturnType<typeof findIamUserByCode>>>, employeeNumber: string) {
  const role = iamMatch.userRoles[0]?.role;
  const position =
    iamMatch.position?.trim() ||
    role?.name ||
    iamMatch.department?.trim() ||
    'Staff';

  return {
    id: iamMatch.id,
    organizationId: iamMatch.organizationId,
    fullName: `${iamMatch.firstName} ${iamMatch.lastName}`.trim(),
    firstName: iamMatch.firstName,
    lastName: iamMatch.lastName,
    employeeNumber,
    position,
    department: iamMatch.department,
    email: iamMatch.email,
    phone: iamMatch.phone,
    photoUrl: resolveIamPhoto(iamMatch.avatarUrl),
    status: iamMatch.status,
    schoolName: iamMatch.organization.name,
    schoolCode: iamMatch.organization.organizationCode ?? null,
    schoolLogoUrl: iamMatch.organization.logoUrl,
    schoolPhone: iamMatch.organization.phone,
    schoolEmail: iamMatch.organization.email,
    source: 'iam' as const,
  };
}

export class PublicStaffLookupService {
  async lookupByCode(code: string) {
    const raw = code.trim();
    if (!raw) throw new AppError(400, 'Staff ID is required');

    const iamMatch = await findIamUserByCode(raw);

    if (iamMatch) {
      const role = iamMatch.userRoles[0]?.role;
      let employeeNumber = iamMatch.employeeId?.trim() || staffDisplayCode(iamMatch);

      if (!isModernStaffId(employeeNumber)) {
        employeeNumber = await staffIdService.ensureModernEmployeeId(iamMatch.id, iamMatch.organizationId, {
          position: iamMatch.position,
          roleSlug: role?.slug,
          roleName: role?.name,
        });
        queueStaffFanout({
          organizationId: iamMatch.organizationId,
          iamUserId: iamMatch.id,
          email: iamMatch.email,
          firstName: iamMatch.firstName,
          lastName: iamMatch.lastName,
          phone: iamMatch.phone,
          position: iamMatch.position,
          department: iamMatch.department,
          employeeId: employeeNumber,
          avatarUrl: iamMatch.avatarUrl,
          moduleSlugs: iamMatch.userModules.map((m) => m.module.slug),
        });
      }

      return mapIamUser(iamMatch, employeeNumber);
    }

    const hr = await lookupHrStaff(raw);
    if (hr) return hr;

    throw new AppError(404, 'No staff member found for that ID');
  }
}

export const publicStaffLookupService = new PublicStaffLookupService();
