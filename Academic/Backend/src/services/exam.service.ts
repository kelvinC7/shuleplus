import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class ExamService {
  async create(organizationId: string, data: {
    name: string;
    type: string;
    academicYear: string;
    term?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    description?: string;
    totalMarks?: number;
    passingMarks?: number;
  }) {
    const existing = await prisma.exam.findFirst({
      where: { organizationId, name: data.name, academicYear: data.academicYear },
    });
    if (existing) throw new AppError(409, 'Exam with this name already exists for this academic year');

    return prisma.exam.create({
      data: {
        organizationId,
        name: data.name,
        type: data.type as any,
        academicYear: data.academicYear,
        term: data.term ?? null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: (data.status as any) ?? 'DRAFT',
        description: data.description ?? null,
        totalMarks: data.totalMarks ?? null,
        passingMarks: data.passingMarks ?? null,
      },
    });
  }

  async list(organizationId: string, filters?: { status?: string; academicYear?: string; type?: string }) {
    const where: any = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.academicYear) where.academicYear = filters.academicYear;
    if (filters?.type) where.type = filters.type;

    return prisma.exam.findMany({
      where,
      orderBy: [{ academicYear: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getById(id: string, organizationId: string) {
    const exam = await prisma.exam.findFirst({
      where: { id, organizationId },
    });
    if (!exam) throw new AppError(404, 'Exam not found');
    return exam;
  }

  async update(id: string, organizationId: string, data: {
    name?: string;
    type?: string;
    academicYear?: string;
    term?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    description?: string;
    totalMarks?: number;
    passingMarks?: number;
  }) {
    const existing = await prisma.exam.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Exam not found');

    if (data.name && data.academicYear) {
      const duplicate = await prisma.exam.findFirst({
        where: { organizationId, name: data.name, academicYear: data.academicYear, id: { not: id } },
      });
      if (duplicate) throw new AppError(409, 'Exam with this name already exists for this academic year');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.academicYear !== undefined) updateData.academicYear = data.academicYear;
    if (data.term !== undefined) updateData.term = data.term || null;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.totalMarks !== undefined) updateData.totalMarks = data.totalMarks;
    if (data.passingMarks !== undefined) updateData.passingMarks = data.passingMarks;

    return prisma.exam.update({ where: { id }, data: updateData });
  }

  async delete(id: string, organizationId: string) {
    const existing = await prisma.exam.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Exam not found');

    await prisma.exam.delete({ where: { id } });
    return { message: 'Exam deleted' };
  }

  async listAcademicYears(organizationId: string) {
    const result = await prisma.exam.groupBy({
      by: ['academicYear'],
      where: { organizationId },
      _count: { id: true },
      orderBy: { academicYear: 'desc' },
    });
    return result.map(r => ({ academicYear: r.academicYear, count: r._count.id }));
  }
}

export const examService = new ExamService();
