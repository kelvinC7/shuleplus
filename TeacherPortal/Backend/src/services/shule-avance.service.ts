import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import {
  AUTO_APPROVAL_PERCENT,
  FINANCE_ROLES,
  MANAGER_ROLES,
  PENDING_STATUSES,
  REPAYMENT_TERM_MAX,
  REPAYMENT_TERM_MIN,
  ShuleAvanceRequestStatusName,
  ShuleAvanceRequestTypeName,
} from '../constants/shule-avance.constants';
import { AppError } from '../middleware/error.middleware';
import { resolveTimetableTeacherLink } from './teacher-link.service';

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function monthlyDeduction(amountRwf: number, termMonths: number) {
  return Math.ceil(amountRwf / termMonths);
}

export class ShuleAvanceService {
  async getStaffSnapshot(organizationId: string, userId: string) {
    return prisma.staffPayrollSnapshot.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
  }

  async getNetSalary(organizationId: string, userId: string) {
    const snapshot = await this.getStaffSnapshot(organizationId, userId);
    if (!snapshot) return 0;
    return snapshot.netSalaryRwf;
  }

  async getMonthlyRequestedTotal(organizationId: string, userId: string) {
    const monthStart = startOfMonth();
    const monthEnd = endOfMonth();

    const requests = await prisma.shuleAvanceRequest.findMany({
      where: {
        organizationId,
        userId,
        createdAt: { gte: monthStart, lte: monthEnd },
        status: { in: ['approved', 'pending_accountant', 'sent_to_manager'] },
      },
    });

    return requests.reduce(
      (sum, r) => sum + monthlyDeduction(r.amountRwf, r.repaymentTermMonths),
      0
    );
  }

  async getAutoApprovedThisMonth(organizationId: string, userId: string) {
    const monthStart = startOfMonth();
    const monthEnd = endOfMonth();

    const requests = await prisma.shuleAvanceRequest.findMany({
      where: {
        organizationId,
        userId,
        autoApproved: true,
        createdAt: { gte: monthStart, lte: monthEnd },
        status: 'approved',
      },
    });

    return requests.reduce((sum, r) => sum + r.amountRwf, 0);
  }

  async buildEligibility(
    organizationId: string,
    userId: string,
    opts?: { email?: string | null }
  ) {
    const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
    if (!tenant) throw new AppError(404, 'Tenant not found');

    const timetable = await resolveTimetableTeacherLink(
      organizationId,
      userId,
      opts?.email
    );

    const base = {
      max_percent: tenant.shuleAvanceMaxPercent,
      monthly_cap_rwf: 0,
      monthly_requested_rwf: 0,
      monthly_remaining_rwf: 0,
      auto_approval_limit_rwf: 0,
      auto_approval_remaining_rwf: 0,
      payroll_module_enabled: tenant.payrollModuleEnabled,
      timetable_linked: timetable.linked,
      registration_via: timetable.linked ? ('timetable' as const) : null,
    };

    const timetableOnlyBlock = (payrollEnabled: boolean) => ({
      allowed: false,
      status: 'timetable_linked' as const,
      message: payrollEnabled
        ? 'Your teaching account is active via Timetable — HR is not required. Salary Advance unlocks when Payroll syncs your net salary.'
        : 'Your teaching account is active via Timetable — HR and Payroll are not required for lessons, attendance, or timetable. Salary Advance only applies when your school connects Payroll.',
      net_salary_rwf: 0,
      ticha_avance_eligible: false,
      ...base,
      registration_via: 'timetable' as const,
    });

    const unlinkedBlock = () => ({
      ...base,
      allowed: false,
      status: 'profile_not_linked' as const,
      message:
        'Ask your school admin to add you in Timetable with Portal enabled and your login email. HR and Payroll are optional — Timetable registration is enough for teaching.',
      net_salary_rwf: 0,
      ticha_avance_eligible: false,
      timetable_linked: false,
      registration_via: null,
    });

    if (!tenant.payrollModuleEnabled) {
      return timetable.linked ? timetableOnlyBlock(false) : unlinkedBlock();
    }

    const snapshot = await this.getStaffSnapshot(organizationId, userId);

    if (!snapshot) {
      return timetable.linked ? timetableOnlyBlock(true) : unlinkedBlock();
    }

    if (!snapshot.tichaAvanceEligible) {
      return {
        ...base,
        allowed: false,
        status: 'advance_not_enabled' as const,
        message: 'Salary Advance is not enabled on your employee record. Contact HR or your payroll administrator.',
        net_salary_rwf: snapshot.netSalaryRwf,
        ticha_avance_eligible: false,
        registration_via: 'payroll' as const,
      };
    }

    const netSalary = snapshot.netSalaryRwf;
    const maxPercent = tenant.shuleAvanceMaxPercent;
    const monthlyCap = Math.floor((netSalary * maxPercent) / 100);
    const monthlyRequested = await this.getMonthlyRequestedTotal(organizationId, userId);
    const monthlyRemaining = Math.max(0, monthlyCap - monthlyRequested);

    const autoApprovalLimit = Math.floor((netSalary * AUTO_APPROVAL_PERCENT) / 100);
    const autoApprovedUsed = await this.getAutoApprovedThisMonth(organizationId, userId);
    const autoApprovalRemaining = Math.max(0, autoApprovalLimit - autoApprovedUsed);

    if (netSalary <= 0) {
      return {
        allowed: false,
        status: 'salary_pending' as const,
        message:
          'Your net salary has not been received from Payroll yet. It updates when payroll saves your package or marks a salary run as paid.',
        net_salary_rwf: 0,
        ticha_avance_eligible: true,
        max_percent: maxPercent,
        monthly_cap_rwf: 0,
        monthly_requested_rwf: monthlyRequested,
        monthly_remaining_rwf: 0,
        auto_approval_limit_rwf: 0,
        auto_approval_remaining_rwf: 0,
        payroll_module_enabled: true,
        timetable_linked: timetable.linked,
        registration_via: 'payroll' as const,
      };
    }

    const allowed = monthlyRemaining > 0;
    const status = allowed ? ('ready' as const) : ('cap_reached' as const);
    const message = allowed
      ? null
      : 'You have reached your monthly salary advance limit.';

    return {
      allowed,
      status,
      message,
      net_salary_rwf: netSalary,
      max_percent: maxPercent,
      monthly_cap_rwf: monthlyCap,
      monthly_requested_rwf: monthlyRequested,
      monthly_remaining_rwf: monthlyRemaining,
      auto_approval_limit_rwf: autoApprovalLimit,
      auto_approval_remaining_rwf: autoApprovalRemaining,
      ticha_avance_eligible: true,
      payroll_module_enabled: true,
      timetable_linked: timetable.linked,
      registration_via: 'payroll' as const,
    };
  }

  async getCatalog(organizationId: string) {
    const items = await prisma.shuleAvanceCatalogItem.findMany({
      where: { organizationId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      cashout: items.filter((i) => i.type === 'cashout'),
      services: items.filter((i) => i.type === 'service'),
    };
  }

  async listMyRequests(organizationId: string, userId: string) {
    return prisma.shuleAvanceRequest.findMany({
      where: { organizationId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRequest(
    organizationId: string,
    userId: string,
    input: {
      request_type: ShuleAvanceRequestTypeName;
      amount_rwf: number;
      repayment_term_months: number;
      reason?: string;
      cashout_category_slug?: string;
      service_category?: string;
      service_payload?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }
  ) {
    const eligibility = await this.buildEligibility(organizationId, userId);

    if (!eligibility.allowed) {
      throw new AppError(400, eligibility.message ?? 'Not eligible for advance');
    }

    if (
      input.repayment_term_months < REPAYMENT_TERM_MIN ||
      input.repayment_term_months > REPAYMENT_TERM_MAX
    ) {
      throw new AppError(400, `Repayment term must be between ${REPAYMENT_TERM_MIN} and ${REPAYMENT_TERM_MAX} months`);
    }

    const monthlyDed = monthlyDeduction(input.amount_rwf, input.repayment_term_months);
    if (monthlyDed > eligibility.monthly_remaining_rwf) {
      throw new AppError(
        400,
        `Amount exceeds monthly remaining cap (${eligibility.monthly_remaining_rwf.toLocaleString()} RWF/month)`
      );
    }

    let serviceCategory = input.service_category ?? null;
    if (input.request_type === 'cashout') {
      serviceCategory = input.cashout_category_slug ?? 'general';
      const catalogItem = await prisma.shuleAvanceCatalogItem.findUnique({
        where: {
          organizationId_slug: { organizationId, slug: serviceCategory },
        },
      });
      if (!catalogItem || catalogItem.type !== 'cashout') {
        throw new AppError(400, 'Invalid cashout category');
      }
    } else if (serviceCategory) {
      const catalogItem = await prisma.shuleAvanceCatalogItem.findUnique({
        where: {
          organizationId_slug: { organizationId, slug: serviceCategory },
        },
      });
      if (!catalogItem || catalogItem.type !== 'service') {
        throw new AppError(400, 'Invalid service category');
      }
    }

    let status: ShuleAvanceRequestStatusName = 'sent_to_manager';
    let autoApproved = false;

    if (
      input.request_type === 'cashout' &&
      input.amount_rwf <= eligibility.auto_approval_remaining_rwf
    ) {
      status = 'approved';
      autoApproved = true;
    } else if (input.request_type === 'service') {
      status = 'pending_accountant';
    }

    const request = await prisma.shuleAvanceRequest.create({
      data: {
        organizationId,
        userId,
        requestType: input.request_type,
        serviceCategory,
        status,
        amountRwf: input.amount_rwf,
        repaymentTermMonths: input.repayment_term_months,
        reason: input.reason,
        autoApproved,
        netSalaryBaselineRwf: eligibility.net_salary_rwf,
        monthlyRequestedTotalRwf: eligibility.monthly_requested_rwf + monthlyDed,
        servicePayload: (input.service_payload ?? {}) as Prisma.InputJsonValue,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        action: 'shule_avance.request_created',
        metadata: { requestId: request.id, status: request.status },
      },
    });

    return request;
  }

  async updateRequest(
    organizationId: string,
    userId: string,
    requestId: string,
    input: {
      amount_rwf?: number;
      repayment_term_months?: number;
      reason?: string;
      service_payload?: Record<string, unknown>;
    }
  ) {
    const existing = await prisma.shuleAvanceRequest.findFirst({
      where: { id: requestId, organizationId, userId },
    });

    if (!existing) throw new AppError(404, 'Request not found');
    if (!PENDING_STATUSES.includes(existing.status as (typeof PENDING_STATUSES)[number])) {
      throw new AppError(400, 'Only pending requests can be updated');
    }

    const amount = input.amount_rwf ?? existing.amountRwf;
    const term = input.repayment_term_months ?? existing.repaymentTermMonths;

    const eligibility = await this.buildEligibility(organizationId, userId);
    const monthlyDed = monthlyDeduction(amount, term);
    if (monthlyDed > eligibility.monthly_remaining_rwf) {
      throw new AppError(400, 'Updated amount exceeds monthly cap');
    }

    return prisma.shuleAvanceRequest.update({
      where: { id: requestId },
      data: {
        amountRwf: amount,
        repaymentTermMonths: term,
        reason: input.reason ?? existing.reason,
        servicePayload: (input.service_payload ?? existing.servicePayload) as Prisma.InputJsonValue,
      },
    });
  }

  async cancelRequest(organizationId: string, userId: string, requestId: string) {
    const existing = await prisma.shuleAvanceRequest.findFirst({
      where: { id: requestId, organizationId, userId },
    });

    if (!existing) throw new AppError(404, 'Request not found');
    if (!PENDING_STATUSES.includes(existing.status as (typeof PENDING_STATUSES)[number])) {
      throw new AppError(400, 'Only pending requests can be cancelled');
    }

    await prisma.shuleAvanceRequest.delete({ where: { id: requestId } });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        action: 'shule_avance.request_cancelled',
        metadata: { requestId },
      },
    });

    return { id: requestId, cancelled: true };
  }

  async getPayrollSummary(organizationId: string, userId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
    const snapshot = await this.getStaffSnapshot(organizationId, userId);
    return {
      net_salary_rwf: snapshot?.netSalaryRwf ?? 0,
      currency: 'RWF',
      source: snapshot?.syncSource ?? 'not-linked',
      ticha_avance_eligible: snapshot?.tichaAvanceEligible ?? false,
      employee_number: snapshot?.employeeNumber ?? null,
      payroll_module_enabled: tenant?.payrollModuleEnabled ?? false,
      synced_at: snapshot?.updatedAt?.toISOString() ?? null,
    };
  }

  async listFinanceRequests(organizationId: string) {
    return prisma.shuleAvanceRequest.findMany({
      where: { organizationId, status: 'pending_accountant' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listManagerPending(organizationId: string) {
    return prisma.shuleAvanceRequest.findMany({
      where: { organizationId, status: 'sent_to_manager' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAllOrgRequests(organizationId: string, status?: string) {
    return prisma.shuleAvanceRequest.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as ShuleAvanceRequestStatusName } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async financeSendToManager(
    organizationId: string,
    requestId: string,
    actorId: string,
    note?: string
  ) {
    const existing = await prisma.shuleAvanceRequest.findFirst({
      where: { id: requestId, organizationId, status: 'pending_accountant' },
    });
    if (!existing) throw new AppError(404, 'Pending finance request not found');

    const updated = await prisma.shuleAvanceRequest.update({
      where: { id: requestId },
      data: {
        status: 'sent_to_manager',
        managerNote: note ?? existing.managerNote,
      },
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId: actorId,
        action: 'shule_avance.finance_forwarded',
        metadata: { requestId },
      },
    });

    return updated;
  }

  async financeReject(
    organizationId: string,
    requestId: string,
    actorId: string,
    note?: string
  ) {
    const existing = await prisma.shuleAvanceRequest.findFirst({
      where: { id: requestId, organizationId, status: 'pending_accountant' },
    });
    if (!existing) throw new AppError(404, 'Pending finance request not found');

    const updated = await prisma.shuleAvanceRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected_by_accountant',
        managerNote: note,
      },
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId: actorId,
        action: 'shule_avance.finance_rejected',
        metadata: { requestId },
      },
    });

    return updated;
  }

  async managerDecision(
    organizationId: string,
    requestId: string,
    actorId: string,
    decision: 'approve' | 'reject',
    note?: string
  ) {
    const existing = await prisma.shuleAvanceRequest.findFirst({
      where: { id: requestId, organizationId, status: 'sent_to_manager' },
    });
    if (!existing) throw new AppError(404, 'Pending manager request not found');

    const updated = await prisma.shuleAvanceRequest.update({
      where: { id: requestId },
      data: {
        status: decision === 'approve' ? 'approved' : 'rejected_by_manager',
        managerNote: note,
      },
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId: actorId,
        action:
          decision === 'approve'
            ? 'shule_avance.manager_approved'
            : 'shule_avance.manager_rejected',
        metadata: { requestId },
      },
    });

    return updated;
  }

  async listApprovers(organizationId: string) {
    return prisma.shuleAvanceApprover.findMany({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addApprover(
    organizationId: string,
    input: {
      userId: string;
      email?: string;
      displayName?: string;
      role: 'manager' | 'accountant';
    }
  ) {
    return prisma.shuleAvanceApprover.upsert({
      where: {
        organizationId_userId_role: {
          organizationId,
          userId: input.userId,
          role: input.role,
        },
      },
      create: {
        organizationId,
        userId: input.userId,
        email: input.email,
        displayName: input.displayName,
        role: input.role,
        isActive: true,
      },
      update: {
        email: input.email,
        displayName: input.displayName,
        isActive: true,
      },
    });
  }

  async removeApprover(organizationId: string, id: string) {
    const row = await prisma.shuleAvanceApprover.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new AppError(404, 'Approver not found');
    await prisma.shuleAvanceApprover.update({
      where: { id },
      data: { isActive: false },
    });
    return { id, removed: true };
  }

  async resolveUserAccess(organizationId: string, userId: string, roles: string[]) {
    const isOrgAdmin = roles.includes('organization_admin');
    const financeByRole = roles.some((r) =>
      (FINANCE_ROLES as readonly string[]).includes(r)
    );
    const managerByRole = roles.some((r) =>
      (MANAGER_ROLES as readonly string[]).includes(r)
    );

    const approverRows = await prisma.shuleAvanceApprover.findMany({
      where: { organizationId, userId, isActive: true },
    });
    const designatedRoles = approverRows.map((r) => r.role as 'manager' | 'accountant');

    const canFinance =
      isOrgAdmin || financeByRole || designatedRoles.includes('accountant');
    const canManager =
      isOrgAdmin || managerByRole || designatedRoles.includes('manager');

    return {
      canFinance,
      canManager,
      canApprove: canFinance || canManager,
      canManageApprovers: isOrgAdmin,
      designatedRoles,
      isOrganizationAdmin: isOrgAdmin,
    };
  }
}

export const shuleAvanceService = new ShuleAvanceService();
