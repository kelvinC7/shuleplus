import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

function normalizePhone(raw: string): string {
  const trimmed = raw.trim().replace(/[\s\-()]/g, '');
  if (!trimmed) return '';
  const plus = trimmed.startsWith('+') ? '+' : '';
  const digits = trimmed.replace(/\D/g, '');
  return `${plus}${digits}`;
}

function phoneVariants(normalized: string): string[] {
  const digits = normalized.replace(/\D/g, '');
  const variants = new Set<string>([normalized, digits]);
  if (digits.startsWith('250') && digits.length >= 12) {
    variants.add(`0${digits.slice(3)}`);
    variants.add(`+${digits}`);
    variants.add(digits.slice(3));
  }
  if (digits.startsWith('0') && digits.length >= 10) {
    variants.add(`+250${digits.slice(1)}`);
    variants.add(`250${digits.slice(1)}`);
    variants.add(digits.slice(1));
  }
  if (digits.length >= 9) {
    const last9 = digits.slice(-9);
    variants.add(last9);
    variants.add(`0${last9}`);
    variants.add(`250${last9}`);
    variants.add(`+250${last9}`);
  }
  return [...variants].filter(Boolean);
}

const parentStudentsInclude = {
  studentParents: {
    include: {
      student: {
        include: {
          enrollments: {
            where: { isCurrent: true, status: 'ACTIVE' },
            include: { class: { include: { grade: true } } },
          },
        },
      },
    },
  },
} as const;

export class ParentService {
  async create(
    organizationId: string,
    data: {
      firstName: string;
      lastName: string;
      phone?: string;
      email?: string;
      nationalId?: string;
      occupation?: string;
      address?: string;
    }
  ) {
    return prisma.parent.create({
      data: {
        organizationId,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        nationalId: data.nationalId,
        occupation: data.occupation,
        address: data.address,
      },
    });
  }

  async list(organizationId: string, search?: string) {
    const where: any = { organizationId };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { nationalId: { contains: search, mode: 'insensitive' } },
      ];
    }
    return prisma.parent.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async search(organizationId: string, q: string) {
    return prisma.parent.findMany({
      where: {
        organizationId,
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { nationalId: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  /** Roster sync (service-to-service): parents with their linked students + current class. */
  async listWithStudents(organizationId: string) {
    return prisma.parent.findMany({
      where: { organizationId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        studentParents: {
          include: {
            student: {
              include: {
                enrollments: {
                  where: { isCurrent: true, status: 'ACTIVE' },
                  include: { class: { include: { grade: true } } },
                },
              },
            },
          },
        },
      },
    });
  }

  async getById(id: string, organizationId: string) {
    const parent = await prisma.parent.findFirst({
      where: { id, organizationId },
      include: {
        studentParents: {
          include: { student: true },
        },
      },
    });
    if (!parent) throw new AppError(404, 'Parent not found');
    return parent;
  }

  async update(
    id: string,
    organizationId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      nationalId?: string;
      occupation?: string;
      address?: string;
    }
  ) {
    const existing = await prisma.parent.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Parent not found');

    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.nationalId !== undefined) updateData.nationalId = data.nationalId;
    if (data.occupation !== undefined) updateData.occupation = data.occupation;
    if (data.address !== undefined) updateData.address = data.address;

    return prisma.parent.update({ where: { id }, data: updateData });
  }

  async delete(id: string, organizationId: string) {
    const existing = await prisma.parent.findFirst({
      where: { id, organizationId },
      include: { studentParents: true },
    });
    if (!existing) throw new AppError(404, 'Parent not found');
    if (existing.studentParents.length > 0) {
      throw new AppError(400, 'Cannot delete parent linked to students');
    }
    await prisma.parent.delete({ where: { id } });
    return { message: 'Parent deleted' };
  }

  async toggleSmsEnabled(id: string, organizationId: string, enabled: boolean) {
    const existing = await prisma.parent.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Parent not found');
    return prisma.parent.update({
      where: { id },
      data: { smsEnabled: enabled },
    });
  }

  /** Enable or disable SMS for all parents in a school (optional: only those with a phone). */
  async bulkSetSmsEnabled(organizationId: string, enabled: boolean, onlyWithPhone = true) {
    const result = await prisma.parent.updateMany({
      where: {
        organizationId,
        ...(onlyWithPhone
          ? {
              AND: [{ phone: { not: null } }, { phone: { not: '' } }],
            }
          : {}),
      },
      data: { smsEnabled: enabled },
    });
    const total = await prisma.parent.count({ where: { organizationId } });
    const withPhone = await prisma.parent.count({
      where: {
        organizationId,
        AND: [{ phone: { not: null } }, { phone: { not: '' } }],
      },
    });
    const enabledCount = await prisma.parent.count({
      where: { organizationId, smsEnabled: true },
    });
    return {
      updated: result.count,
      total,
      withPhone,
      enabledCount,
      enabled,
    };
  }

  /** Cross-tenant lookup for ParentMIS login (service auth, no organizationId). */
  async findAllByPhone(phoneRaw: string) {
    const phone = normalizePhone(phoneRaw);
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) return [];

    let parents = await prisma.parent.findMany({
      where: { phone: { in: phoneVariants(phone) } },
      include: parentStudentsInclude,
      orderBy: { updatedAt: 'desc' },
    });

    if (parents.length === 0) {
      const last9 = digits.slice(-9);
      const loose = await prisma.parent.findMany({
        where: {
          OR: [{ phone: { endsWith: last9 } }, { phone: { endsWith: `0${last9}` } }],
        },
        include: parentStudentsInclude,
        orderBy: { updatedAt: 'desc' },
        take: 40,
      });
      parents = loose.filter((p) => {
        const pDigits = String(p.phone ?? '').replace(/\D/g, '');
        return pDigits.endsWith(last9);
      });
    }

    return parents;
  }
}

export const parentService = new ParentService();
