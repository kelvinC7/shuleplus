import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

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
}

export const parentService = new ParentService();
