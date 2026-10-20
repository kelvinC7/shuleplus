import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class PayrollSyncService {
  async upsertSnapshot(input: {
    organizationId: string;
    userId: string;
    employeeNumber?: string;
    displayName?: string;
    netSalaryRwf?: number;
    tichaAvanceEligible?: boolean;
    source: 'hr' | 'payroll';
  }) {
    const tenant = await prisma.tenant.findUnique({
      where: { organizationId: input.organizationId },
    });
    if (!tenant) {
      throw new AppError(404, 'Tenant not provisioned for organization');
    }

    if (input.source === 'payroll' || input.source === 'hr') {
      await prisma.tenant.update({
        where: { organizationId: input.organizationId },
        data: { payrollModuleEnabled: true },
      });
    }

    const existing = await prisma.staffPayrollSnapshot.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
      },
    });

    const netSalaryRwf =
      input.netSalaryRwf !== undefined
        ? input.netSalaryRwf
        : (existing?.netSalaryRwf ?? 0);

    if (input.netSalaryRwf === undefined && !existing) {
      throw new AppError(400, 'netSalaryRwf is required when creating a payroll snapshot');
    }

    const tichaAvanceEligible =
      input.tichaAvanceEligible !== undefined
        ? input.tichaAvanceEligible
        : (existing?.tichaAvanceEligible ?? false);

    return prisma.staffPayrollSnapshot.upsert({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
      },
      create: {
        organizationId: input.organizationId,
        userId: input.userId,
        employeeNumber: input.employeeNumber,
        displayName: input.displayName,
        netSalaryRwf,
        tichaAvanceEligible,
        syncSource: input.source,
      },
      update: {
        employeeNumber: input.employeeNumber ?? existing?.employeeNumber,
        displayName: input.displayName ?? existing?.displayName,
        netSalaryRwf,
        tichaAvanceEligible,
        syncSource: input.source,
      },
    });
  }
}

export const payrollSyncService = new PayrollSyncService();
