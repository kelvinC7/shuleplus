import {
  AuditAction,
  OrgSubscriptionStatus,
  Prisma,
  SubscriptionPeriod,
} from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

function addPeriod(from: Date, period: SubscriptionPeriod): Date | null {
  const d = new Date(from);
  switch (period) {
    case SubscriptionPeriod.MONTHLY:
      d.setMonth(d.getMonth() + 1);
      return d;
    case SubscriptionPeriod.YEARLY:
      d.setFullYear(d.getFullYear() + 1);
      return d;
    case SubscriptionPeriod.TRIAL:
      d.setDate(d.getDate() + 14);
      return d;
    case SubscriptionPeriod.LIFETIME:
    case SubscriptionPeriod.ENTERPRISE:
    case SubscriptionPeriod.CUSTOM:
      return null;
    default:
      return null;
  }
}

export class SubscriptionService {
  async listPlans() {
    const plans = await prisma.subscriptionPlan.findMany({ orderBy: { name: 'asc' } });
    if (plans.length > 0) return plans;
    return this.ensureDefaultPlans();
  }

  private async ensureDefaultPlans() {
    const defaults: {
      code: string;
      name: string;
      period: SubscriptionPeriod;
      amount: number;
      description: string;
    }[] = [
      {
        code: 'TRIAL_14',
        name: '14-Day Trial',
        period: SubscriptionPeriod.TRIAL,
        amount: 0,
        description: 'Full access trial for new organizations',
      },
      {
        code: 'STANDARD_MONTHLY',
        name: 'Standard Monthly',
        period: SubscriptionPeriod.MONTHLY,
        amount: 50000,
        description: 'Month-to-month standard plan',
      },
      {
        code: 'STANDARD_YEARLY',
        name: 'Standard Yearly',
        period: SubscriptionPeriod.YEARLY,
        amount: 500000,
        description: 'Annual billing with savings',
      },
      {
        code: 'LIFETIME',
        name: 'Lifetime',
        period: SubscriptionPeriod.LIFETIME,
        amount: 2500000,
        description: 'One-time lifetime license',
      },
      {
        code: 'ENTERPRISE',
        name: 'Enterprise',
        period: SubscriptionPeriod.ENTERPRISE,
        amount: 0,
        description: 'Custom enterprise agreement',
      },
    ];

    for (const plan of defaults) {
      await prisma.subscriptionPlan.upsert({
        where: { code: plan.code },
        create: {
          ...plan,
          currency: 'RWF',
          features: [] as Prisma.InputJsonValue,
          isActive: true,
        },
        update: {},
      });
    }

    return prisma.subscriptionPlan.findMany({ orderBy: { name: 'asc' } });
  }

  async createPlan(
    actorId: string,
    data: {
      code: string;
      name: string;
      period?: SubscriptionPeriod;
      amount?: number;
      currency?: string;
      description?: string;
      features?: string[];
      isActive?: boolean;
    }
  ) {
    const code = data.code.trim().toUpperCase().replace(/\s+/g, '_');
    const existing = await prisma.subscriptionPlan.findUnique({ where: { code } });
    if (existing) throw new AppError(409, 'Plan code already exists');

    const plan = await prisma.subscriptionPlan.create({
      data: {
        code,
        name: data.name.trim(),
        period: data.period ?? SubscriptionPeriod.MONTHLY,
        amount: data.amount ?? 0,
        currency: data.currency ?? 'RWF',
        description: data.description,
        features: (data.features ?? []) as Prisma.InputJsonValue,
        isActive: data.isActive ?? true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.MODULE_ENABLED,
        resource: 'subscription_plan',
        resourceId: plan.id,
        metadata: { operation: 'CREATED', code: plan.code },
      },
    });

    return plan;
  }

  async updatePlan(
    planId: string,
    actorId: string,
    data: Partial<{
      name: string;
      period: SubscriptionPeriod;
      amount: number;
      currency: string;
      description: string;
      features: string[];
      isActive: boolean;
    }>
  ) {
    const plan = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.period !== undefined ? { period: data.period } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.features !== undefined
          ? { features: data.features as Prisma.InputJsonValue }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.MODULE_ENABLED,
        resource: 'subscription_plan',
        resourceId: planId,
        metadata: { operation: 'UPDATED' },
      },
    });

    return plan;
  }

  async listOrgSubscriptions() {
    return prisma.organizationSubscription.findMany({
      include: {
        plan: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            organizationCode: true,
            status: true,
            subscriptionTier: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getOrgSubscription(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        organizationCode: true,
        status: true,
        subscriptionTier: true,
      },
    });
    if (!org) throw new AppError(404, 'Organization not found');

    const subscription = await prisma.organizationSubscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    return { organization: org, subscription };
  }

  async assignPlan(
    organizationId: string,
    actorId: string,
    planId: string,
    options?: { notes?: string; status?: OrgSubscriptionStatus }
  ) {
    const [org, plan] = await Promise.all([
      prisma.organization.findUnique({ where: { id: organizationId } }),
      prisma.subscriptionPlan.findUnique({ where: { id: planId } }),
    ]);
    if (!org) throw new AppError(404, 'Organization not found');
    if (!plan || !plan.isActive) throw new AppError(400, 'Plan not found or inactive');

    const startsAt = new Date();
    const endsAt = addPeriod(startsAt, plan.period);
    const status =
      options?.status ??
      (plan.period === SubscriptionPeriod.TRIAL
        ? OrgSubscriptionStatus.TRIAL
        : OrgSubscriptionStatus.ACTIVE);

    const subscription = await prisma.organizationSubscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        planId,
        status,
        startsAt,
        endsAt,
        notes: options?.notes,
      },
      update: {
        planId,
        status,
        startsAt,
        endsAt,
        renewedAt: null,
        cancelledAt: null,
        notes: options?.notes,
      },
      include: { plan: true },
    });

    await prisma.organization.update({
      where: { id: organizationId },
      data: { subscriptionTier: plan.name },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: actorId,
        action: AuditAction.MODULE_ENABLED,
        resource: 'organization_subscription',
        resourceId: subscription.id,
        metadata: { operation: 'ASSIGN', planCode: plan.code, status },
      },
    });

    return subscription;
  }

  async subscriptionAction(
    organizationId: string,
    actorId: string,
    action: 'activate' | 'suspend' | 'renew' | 'upgrade' | 'downgrade' | 'cancel',
    options?: { planId?: string; notes?: string }
  ) {
    const existing = await prisma.organizationSubscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
    if (!existing && !['upgrade', 'downgrade'].includes(action)) {
      throw new AppError(404, 'No subscription assigned to this organization');
    }

    if ((action === 'upgrade' || action === 'downgrade') && options?.planId) {
      return this.assignPlan(organizationId, actorId, options.planId, {
        notes: options.notes ?? `${action} to new plan`,
      });
    }

    if (!existing) throw new AppError(404, 'No subscription assigned');

    const data: Prisma.OrganizationSubscriptionUpdateInput = {};
    const now = new Date();

    switch (action) {
      case 'activate':
        data.status = OrgSubscriptionStatus.ACTIVE;
        data.cancelledAt = null;
        break;
      case 'suspend':
        data.status = OrgSubscriptionStatus.SUSPENDED;
        break;
      case 'renew': {
        data.status = OrgSubscriptionStatus.ACTIVE;
        data.renewedAt = now;
        data.cancelledAt = null;
        const base = existing.endsAt && existing.endsAt > now ? existing.endsAt : now;
        data.endsAt = addPeriod(base, existing.plan.period);
        break;
      }
      case 'cancel':
        data.status = OrgSubscriptionStatus.CANCELLED;
        data.cancelledAt = now;
        break;
      case 'upgrade':
      case 'downgrade':
        throw new AppError(400, 'Provide planId to upgrade or downgrade');
      default:
        throw new AppError(400, 'Unknown subscription action');
    }

    if (options?.notes !== undefined) data.notes = options.notes;

    const subscription = await prisma.organizationSubscription.update({
      where: { organizationId },
      data,
      include: { plan: true },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: actorId,
        action: AuditAction.MODULE_ENABLED,
        resource: 'organization_subscription',
        resourceId: subscription.id,
        metadata: { operation: action.toUpperCase() },
      },
    });

    return subscription;
  }
}

export const subscriptionService = new SubscriptionService();
