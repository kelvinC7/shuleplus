import { ContractType, Gender } from '../generated/prisma';
import { prisma } from '../config/database';
import { departmentService, categoryService } from './hr.service';
import { allocateHrEmployeeNumber } from '../utils/staff-id';
import { SAMPLE_EMPLOYEES } from '../constants/sample-employees';

export class SeedService {
  async seedTenantData(orgId: string) {
    await departmentService.seedDefaults(orgId);
    await categoryService.seedDefaults(orgId);

    const existing = await prisma.employee.count({
      where: { organizationId: orgId, deletedAt: null },
    });
    if (existing > 0) return { seeded: false, count: existing };

    const departments = await prisma.department.findMany({ where: { organizationId: orgId } });
    const deptByName = new Map(departments.map((d) => [d.name, d.id]));

    const tenant = await prisma.tenant.findUnique({ where: { organizationId: orgId } });
    for (let index = 0; index < SAMPLE_EMPLOYEES.length; index += 1) {
      const row = SAMPLE_EMPLOYEES[index];
      const employeeNumber = await allocateHrEmployeeNumber(orgId, row.position, tenant?.organizationCode);
      const departmentId = deptByName.get(row.department) ?? null;
      await prisma.employee.create({
        data: {
          organizationId: orgId,
          employeeNumber,
          firstName: row.firstName,
          lastName: row.lastName,
          gender: row.gender as Gender,
          dateOfBirth: new Date(row.dateOfBirth),
          email: row.email ?? null,
          phone: row.phone,
          nationalId: row.nationalId,
          departmentId,
          position: row.position,
          contractType: ContractType.PERMANENT,
          status: 'ACTIVE',
          hireDate: new Date(row.hireDate),
          ongoingContract: true,
          basicSalary: row.basicSalary,
          isProtected: row.isProtected ?? false,
          hrProfile: {
            rssbNumber: `RSSB-${row.nationalId.slice(-6)}`,
            bank: {
              bankName: 'Bank of Kigali',
              accountNumber: `000${index + 1}${row.nationalId.slice(-4)}`,
            },
          },
        },
      });
    }

    return { seeded: true, count: SAMPLE_EMPLOYEES.length };
  }
}

export const seedService = new SeedService();
