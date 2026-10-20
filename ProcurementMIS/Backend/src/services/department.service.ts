import { prisma } from '../config/database';

/** School departments — synced per tenant via seedDefaults. */
export const DEFAULT_DEPARTMENTS = [
  { name: 'Administration', code: 'ADMIN' },
  { name: 'Academic Affairs', code: 'ACADEMIC' },
  { name: 'Finance & Accounts', code: 'FINANCE' },
  { name: 'Procurement', code: 'PROCUREMENT' },
  { name: 'Stores & Inventory', code: 'STORES' },
  { name: 'ICT', code: 'ICT' },
  { name: 'Library', code: 'LIBRARY' },
  { name: 'Student Affairs', code: 'STUDENT' },
  { name: 'Health / Clinic', code: 'HEALTH' },
  { name: 'Boarding', code: 'BOARDING' },
  { name: 'Kitchen & Catering', code: 'CATERING' },
  { name: 'Maintenance', code: 'MAINTENANCE' },
  { name: 'Cleaning & Sanitation', code: 'CLEANING' },
  { name: 'Security', code: 'SECURITY' },
  { name: 'Transport', code: 'TRANSPORT' },
  { name: 'Sports', code: 'SPORTS' },
  { name: 'Clubs & Activities', code: 'ACTIVITIES' },
  { name: 'Uniform & Tailoring', code: 'UNIFORM' },
  { name: 'Construction & Infrastructure', code: 'INFRA' },
  { name: 'Examination', code: 'EXAM' },
  { name: 'Others', code: 'OTHER' },
];

export const OTHER_DEPARTMENT_CODE = 'OTHER';

export class DepartmentService {
  async list(organizationId: string) {
    return prisma.department.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true, headName: true },
    });
  }

  async seedDefaults(organizationId: string) {
    for (const dept of DEFAULT_DEPARTMENTS) {
      await prisma.department.upsert({
        where: {
          organizationId_code: { organizationId, code: dept.code },
        },
        create: { organizationId, name: dept.name, code: dept.code },
        update: { name: dept.name },
      });
    }
  }

  async findOtherDepartment(organizationId: string) {
    return prisma.department.findFirst({
      where: { organizationId, code: OTHER_DEPARTMENT_CODE, isActive: true },
    });
  }
}

export const departmentService = new DepartmentService();
