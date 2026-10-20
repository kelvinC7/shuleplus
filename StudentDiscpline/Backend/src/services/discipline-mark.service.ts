import { prisma } from '../config/database';

const DEFAULT_MARKS = [
  { name: 'Late Coming', description: 'Student arrives after the required reporting time.', category: 'Attendance', type: 'DEDUCTION', points: 2 },
  { name: 'Missing Uniform', description: 'Student is not in proper school uniform.', category: 'Uniform', type: 'DEDUCTION', points: 3 },
  { name: 'Fighting', description: 'Physical altercation with another student.', category: 'Serious', type: 'DEDUCTION', points: 10 },
  { name: 'Disrespect', description: 'Disrespectful behavior toward staff or peers.', category: 'Conduct', type: 'DEDUCTION', points: 5 },
  { name: 'Bullying', description: 'Bullying or harassment of another student.', category: 'Serious', type: 'DEDUCTION', points: 8 },
  { name: 'Absence Without Permission', description: 'Unauthorized absence from class or school.', category: 'Attendance', type: 'DEDUCTION', points: 4 },
  { name: 'Damage of Property', description: 'Damage to school or personal property.', category: 'Property', type: 'DEDUCTION', points: 6 },
  { name: 'Cheating', description: 'Academic dishonesty during assessment.', category: 'Academic', type: 'DEDUCTION', points: 5 },
  { name: 'Good Conduct', description: 'Consistently positive behavior.', category: 'Reward', type: 'REWARD', points: 5 },
  { name: 'Excellent Behavior', description: 'Outstanding discipline and leadership.', category: 'Reward', type: 'REWARD', points: 10 },
  { name: 'Helping Others', description: 'Voluntary assistance to peers or staff.', category: 'Reward', type: 'REWARD', points: 3 },
];

export const disciplineMarkService = {
  async ensureDefaults(organizationId: string) {
    const count = await prisma.disciplineMark.count({ where: { organizationId } });
    if (count > 0) return { seeded: false };

    for (const mark of DEFAULT_MARKS) {
      await prisma.disciplineMark.create({
        data: { organizationId, ...mark, status: 'Active', isDefault: true },
      });
    }
    return { seeded: true, count: DEFAULT_MARKS.length };
  },

  async list(
    organizationId: string,
    filters?: { type?: string; status?: string; search?: string; sort?: string }
  ) {
    await this.ensureDefaults(organizationId);
    const q = filters?.search?.trim();
    const rows = await prisma.disciplineMark.findMany({
      where: {
        organizationId,
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { category: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    });

    const sorted = [...rows].sort((a, b) => {
      if (filters?.sort === 'marks') return b.points - a.points;
      if (filters?.sort === 'usage') return b.usageCount - a.usageCount;
      return a.name.localeCompare(b.name);
    });
    return sorted;
  },

  async stats(organizationId: string) {
    await this.ensureDefaults(organizationId);
    const [total, active, rewards, deductions] = await Promise.all([
      prisma.disciplineMark.count({ where: { organizationId } }),
      prisma.disciplineMark.count({ where: { organizationId, status: 'Active' } }),
      prisma.disciplineMark.count({ where: { organizationId, type: 'REWARD' } }),
      prisma.disciplineMark.count({ where: { organizationId, type: 'DEDUCTION' } }),
    ]);
    return { total, active, rewards, deductions };
  },

  async create(
    organizationId: string,
    input: {
      name: string;
      description?: string;
      category?: string;
      type: string;
      points: number;
      status?: string;
    }
  ) {
    const points = Math.abs(Math.round(input.points));
    return prisma.disciplineMark.create({
      data: {
        organizationId,
        name: input.name.trim(),
        description: input.description,
        category: input.category ?? 'General',
        type: input.type,
        points,
        status: input.status ?? 'Active',
        isDefault: false,
      },
    });
  },

  async update(
    organizationId: string,
    id: string,
    input: Partial<{
      name: string;
      description: string;
      category: string;
      type: string;
      points: number;
      status: string;
    }>
  ) {
    const row = await prisma.disciplineMark.findFirst({ where: { id, organizationId } });
    if (!row) throw new Error('Mark not found');
    return prisma.disciplineMark.update({
      where: { id },
      data: {
        name: input.name?.trim() ?? row.name,
        description: input.description ?? row.description,
        category: input.category ?? row.category,
        type: input.type ?? row.type,
        points: input.points != null ? Math.abs(Math.round(input.points)) : row.points,
        status: input.status ?? row.status,
      },
    });
  },

  async remove(organizationId: string, id: string) {
    const row = await prisma.disciplineMark.findFirst({ where: { id, organizationId } });
    if (!row) throw new Error('Mark not found');
    const inUse = await prisma.disciplineCase.count({ where: { markId: id } });
    if (inUse > 0) throw new Error('Cannot delete a mark that has been used in cases');
    await prisma.disciplineMark.delete({ where: { id } });
    return { id };
  },

  async getById(organizationId: string, id: string) {
    return prisma.disciplineMark.findFirst({ where: { id, organizationId } });
  },
};
