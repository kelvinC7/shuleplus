import { prisma } from '../config/database';
import { iamClient } from '../clients/iam.client';
import { teacherPortalClient } from '../clients/teacher-portal.client';
import { staffService } from './payroll.service';

function hrEmployeeNumber(staff: {
  employeeNumber: string;
  hrProfile: unknown;
}) {
  const profile = staff.hrProfile as { hrEmployeeNumber?: string } | null;
  return profile?.hrEmployeeNumber?.trim() || staff.employeeNumber;
}

async function pushStaffToTeacherPortal(
  orgId: string,
  staffId: string,
  netSalaryRwf: number,
  tichaAvanceEligible = true
) {
  if (!teacherPortalClient.isEnabled() || netSalaryRwf <= 0) return;

  const staff = await prisma.payrollStaff.findFirst({
    where: { id: staffId, organizationId: orgId, deletedAt: null },
  });
  if (!staff?.email?.trim()) return;

  const iamUser = await iamClient.findUserByEmail(orgId, staff.email);
  if (!iamUser?.id) return;

  const displayName = `${staff.firstName} ${staff.lastName}`.trim();
  await teacherPortalClient.syncStaffPayroll({
    organizationId: orgId,
    userId: iamUser.id,
    employeeNumber: hrEmployeeNumber(staff),
    displayName,
    netSalaryRwf: Math.round(netSalaryRwf),
    tichaAvanceEligible,
    source: 'payroll',
  });
}

export async function syncStaffSalaryToTeacherPortal(orgId: string, staffId: string) {
  try {
    const profile = await staffService.getProfile(orgId, staffId);
    const netSalary = Number(profile.calc?.netSalary ?? 0);
    await pushStaffToTeacherPortal(orgId, staffId, netSalary);
  } catch (err) {
    console.warn('[Payroll→TeacherPortal] syncStaffSalary failed', err);
  }
}

export async function syncPaidRunToTeacherPortal(orgId: string, runId: string) {
  if (!teacherPortalClient.isEnabled()) return;

  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, organizationId: orgId },
  });
  if (!run) return;

  const rows = Array.isArray(run.registerJson)
    ? (run.registerJson as Array<{
        staffId?: string;
        netSalary?: number;
      }>)
    : [];

  for (const row of rows) {
    if (!row.staffId) continue;
    const netSalary = Number(row.netSalary ?? 0);
    if (netSalary <= 0) continue;
    await pushStaffToTeacherPortal(orgId, row.staffId, netSalary);
  }
}
