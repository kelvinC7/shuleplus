import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class DutyRosterService {
  async list(organizationId: string, query?: { date?: string; staffId?: string }) {
    const where: any = { organizationId };
    if (query?.staffId) where.staffId = query.staffId;
    if (query?.date) {
      const d = new Date(query.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.rosterDate = { gte: d, lt: next };
    }

    return prisma.dutyRoster.findMany({
      where,
      include: { staff: true },
      orderBy: { rosterDate: 'desc' },
    });
  }

  async getById(organizationId: string, id: string) {
    const roster = await prisma.dutyRoster.findFirst({
      where: { id, organizationId },
      include: { staff: true },
    });
    if (!roster) throw new AppError(404, 'Duty roster not found');
    return roster;
  }

  async create(organizationId: string, data: any) {
    return prisma.dutyRoster.create({
      data: { organizationId, ...data },
      include: { staff: true },
    });
  }

  async update(organizationId: string, id: string, data: any) {
    const existing = await prisma.dutyRoster.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Duty roster not found');
    return prisma.dutyRoster.update({ where: { id }, data, include: { staff: true } });
  }

  async remove(organizationId: string, id: string) {
    const existing = await prisma.dutyRoster.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Duty roster not found');
    await prisma.dutyRoster.delete({ where: { id } });
  }
}

export const dutyRosterService = new DutyRosterService();
