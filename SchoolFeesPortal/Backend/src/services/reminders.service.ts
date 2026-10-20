import { BillStatus, PaymentStatus, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { seedService } from './seed.service';
import { notificationClient } from '../clients/notification.client';
import { parentMisClient } from '../clients/parent-mis.client';
import { studentManagementClient, fetchOrganizationClasses, type ParentContact } from '../clients/student-management.client';
import { env } from '../config/env';

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

type ChannelFlags = { sms?: boolean; email?: boolean; push?: boolean; inApp?: boolean };
type TemplateSet = {
  sms?: string;
  emailSubject?: string;
  emailBody?: string;
  pushTitle?: string;
  pushBody?: string;
  inApp?: string;
};

const DEFAULT_TEMPLATES: TemplateSet = {
  sms: 'Dear {{parent_name}}, {{student_name}} has {{balance}} RWF school fees due on {{due_date}}. Pay: {{payment_link}} — {{school_name}}',
  emailSubject: 'School Fee Reminder — {{student_name}}',
  emailBody:
    '<p>Dear {{parent_name}},</p><p>{{student_name}} ({{class_name}}) has an outstanding balance of <strong>{{balance}} RWF</strong> due on {{due_date}}.</p><p><a href="{{payment_link}}">Pay securely online</a></p>',
  pushTitle: 'School Fee Reminder',
  pushBody: '{{student_name}} has {{balance}} RWF remaining.',
  inApp: '{{student_name}} — Outstanding {{balance}} RWF. Due {{due_date}}.',
};

const VARIABLES = [
  'parent_name',
  'student_name',
  'student_code',
  'class_name',
  'academic_year',
  'term',
  'total_fee',
  'amount_paid',
  'balance',
  'installment_amount',
  'due_date',
  'receipt_number',
  'school_name',
  'school_phone',
  'payment_link',
];

async function ensureCategories(organizationId: string) {
  await seedService.ensureFeeCategories(organizationId);
}

async function ensureReminderDefaults(organizationId: string) {
  const existing = await prisma.reminderAutomation.count({ where: { organizationId } });
  if (existing > 0) return;

  await prisma.reminderAutomation.createMany({
    data: [
      {
        organizationId,
        name: 'Fee Due Reminder',
        trigger: 'PAYMENT_DUE_SOON',
        timingDays: 3,
        timingType: 'before',
        audience: 'parents_outstanding',
        channels: { sms: true, email: true, push: true, inApp: true },
        templates: DEFAULT_TEMPLATES,
        escalation: [
          { days: 3, timingType: 'before', channels: { inApp: true, push: true } },
          { days: 1, timingType: 'before', channels: { push: true, email: true } },
          { days: 0, timingType: 'on', channels: { sms: true, push: true, inApp: true } },
          { days: 3, timingType: 'after', channels: { sms: true, email: true } },
        ],
        status: 'ACTIVE',
        quietHoursStart: 22,
        quietHoursEnd: 6,
      },
      {
        organizationId,
        name: 'Overdue Reminder',
        trigger: 'PAYMENT_OVERDUE',
        timingDays: 3,
        timingType: 'after',
        audience: 'parents_outstanding',
        channels: { sms: true, email: true, push: false, inApp: true },
        templates: {
          ...DEFAULT_TEMPLATES,
          sms: 'OVERDUE: {{student_name}} owes {{balance}} RWF ({{due_date}}). Please pay urgently: {{payment_link}}',
        },
        status: 'ACTIVE',
        quietHoursStart: 22,
        quietHoursEnd: 6,
      },
      {
        organizationId,
        name: 'Receipt Notification',
        trigger: 'RECEIPT_GENERATED',
        timingDays: 0,
        timingType: 'on',
        audience: 'parents',
        channels: { sms: false, email: true, push: true, inApp: true },
        templates: {
          pushTitle: 'Payment received',
          pushBody: 'Receipt {{receipt_number}} for {{student_name}} — {{amount_paid}} RWF',
          inApp: 'Payment of {{amount_paid}} RWF received for {{student_name}}.',
          emailSubject: 'Payment Receipt — {{student_name}}',
          emailBody: '<p>We received {{amount_paid}} RWF for {{student_name}}. Receipt: {{receipt_number}}</p>',
        },
        status: 'ACTIVE',
      },
    ],
  });

  await prisma.reminderTemplate.createMany({
    data: [
      {
        organizationId,
        name: 'Payment Due Soon',
        channel: 'SMS',
        body: DEFAULT_TEMPLATES.sms!,
        isDefault: true,
      },
      {
        organizationId,
        name: 'Payment Due Soon',
        channel: 'EMAIL',
        subject: DEFAULT_TEMPLATES.emailSubject!,
        body: DEFAULT_TEMPLATES.emailBody!,
        isDefault: true,
      },
    ],
  });
}

function renderTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

function smsParts(body: string) {
  const len = body.length;
  const parts = len <= 160 ? 1 : Math.ceil(len / 153);
  return { characters: len, parts, estimatedCostRwf: parts * 25 };
}

function inQuietHours(now: Date, start?: number | null, end?: number | null) {
  if (start == null || end == null) return false;
  const hour = now.getHours();
  if (start > end) return hour >= start || hour < end;
  return hour >= start && hour < end;
}

function nextAllowedSend(now: Date, start?: number | null, end?: number | null) {
  if (!inQuietHours(now, start, end)) return now;
  const next = new Date(now);
  next.setDate(next.getDate() + (now.getHours() >= (start ?? 22) ? 1 : 0));
  next.setHours(end ?? 6, 30, 0, 0);
  return next;
}

export class RemindersService {
  async dashboard(organizationId: string) {
    await ensureCategories(organizationId);
    await ensureReminderDefaults(organizationId);

    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [activeAutomations, sentToday, scheduled, failed, deliveries, parents] = await Promise.all([
      prisma.reminderAutomation.count({ where: { organizationId, status: 'ACTIVE' } }),
      prisma.reminderDelivery.count({
        where: { organizationId, queuedAt: { gte: today, lt: tomorrow }, status: { in: ['SENT', 'DELIVERED'] } },
      }),
      prisma.reminderDelivery.count({ where: { organizationId, status: 'QUEUED' } }),
      prisma.reminderDelivery.count({
        where: { organizationId, queuedAt: { gte: today, lt: tomorrow }, status: 'FAILED' },
      }),
      prisma.reminderDelivery.groupBy({
        by: ['channel'],
        where: { organizationId, queuedAt: { gte: today, lt: tomorrow } },
        _count: true,
      }),
      studentManagementClient.listParents(organizationId),
    ]);

    const deliveredToday = await prisma.reminderDelivery.count({
      where: { organizationId, queuedAt: { gte: today, lt: tomorrow }, status: 'DELIVERED' },
    });
    const attemptedToday = sentToday + failed;
    const deliveryRate = attemptedToday > 0 ? Math.round((deliveredToday / attemptedToday) * 1000) / 10 : 0;

    const channelOverview = ['SMS', 'EMAIL', 'PUSH', 'IN_APP'].map((ch) => ({
      channel: ch,
      count: deliveries.find((d) => d.channel === ch)?._count ?? 0,
    }));

    const [unpaidBills, partialBills, allOpen] = await Promise.all([
      prisma.studentBill.findMany({
        where: { organizationId, status: { in: [BillStatus.PENDING, BillStatus.OVERDUE] }, balance: { gt: 0 } },
        select: { studentId: true, balance: true },
      }),
      prisma.studentBill.findMany({
        where: { organizationId, status: BillStatus.PARTIALLY_PAID, balance: { gt: 0 } },
        select: { studentId: true, balance: true },
      }),
      prisma.studentBill.aggregate({
        where: { organizationId, balance: { gt: 0 }, status: { not: BillStatus.CANCELLED } },
        _sum: { balance: true },
      }),
    ]);
    const remindersAll = await prisma.reminderDelivery.count({ where: { organizationId } });
    const deliveredAll = await prisma.reminderDelivery.count({
      where: { organizationId, status: { in: ['SENT', 'DELIVERED'] } },
    });
    const openedAll = await prisma.reminderDelivery.count({
      where: { organizationId, OR: [{ readAt: { not: null } }, { status: 'DELIVERED' }] },
    });
    const failedAll = await prisma.reminderDelivery.count({ where: { organizationId, status: 'FAILED' } });

    return {
      activeAutomations,
      sentToday,
      scheduled,
      deliveredRate: deliveryRate,
      failed,
      parentsUsingSms: (parents ?? []).filter((p) => p.smsEnabled && p.phone).length,
      channelOverview,
      unpaidStudents: new Set(unpaidBills.map((b) => b.studentId)).size,
      partialStudents: new Set(partialBills.map((b) => b.studentId)).size,
      outstandingBalance: num(allOpen._sum.balance),
      remindersSent: remindersAll,
      delivered: deliveredAll,
      opened: openedAll,
      failedTotal: failedAll,
    };
  }

  /** Classes for the filter dropdown — live from Student Management. */
  async classes(organizationId: string) {
    const rows = await fetchOrganizationClasses(organizationId);
    return rows
      .map((c) => ({ id: c.id, name: c.name, label: c.label ?? c.name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }

  async recipients(organizationId: string, query: Record<string, string | undefined>) {    const year = query.academicYear?.trim();
    const term = query.term?.trim();
    const className = query.className?.trim();
    const stream = query.stream?.trim();
    const status = (query.paymentStatus ?? 'outstanding').toLowerCase();
    const minBalance = query.minBalance ? Number(query.minBalance) : 0;
    const daysSince = query.daysSince ? Number(query.daysSince) : 0;

    const bills = await prisma.studentBill.findMany({
      where: {
        organizationId,
        status: { not: BillStatus.CANCELLED },
        ...(year ? { academicYear: year } : {}),
        ...(term && term !== 'ALL' ? { term } : {}),
        ...(className && className !== 'ALL' ? { className: { contains: className, mode: 'insensitive' } } : {}),
      },
      orderBy: { studentName: 'asc' },
    });

    const since = daysSince > 0 ? new Date(Date.now() - daysSince * 86400000) : null;
    const lastPays = since
      ? await prisma.payment.findMany({
          where: { organizationId, status: PaymentStatus.COMPLETED, paidAt: { gte: since } },
          select: { studentId: true },
        })
      : [];
    const recentlyPaid = new Set(lastPays.map((p) => p.studentId));

    const rows = bills.filter((b) => {
      const bal = num(b.balance);
      if (status === 'unpaid' && !(b.status === 'PENDING' || b.status === 'OVERDUE') && bal <= 0) return false;
      if (status === 'unpaid' && num(b.paidAmount) > 0) return false;
      if (status === 'partial' && b.status !== 'PARTIALLY_PAID') return false;
      if (status === 'paid' && b.status !== 'PAID') return false;
      if ((status === 'outstanding' || status === 'all') && status === 'outstanding' && bal <= 0) return false;
      if (minBalance > 0 && bal < minBalance) return false;
      if (stream && stream !== 'ALL' && !(b.className ?? '').toLowerCase().includes(stream.toLowerCase())) return false;
      if (since && recentlyPaid.has(b.studentId)) return false;
      return true;
    });

    const students = rows.map((b) => ({
      studentId: b.studentId,
      studentCode: b.studentCode,
      studentName: b.studentName,
      className: b.className,
      academicYear: b.academicYear,
      term: b.term,
      totalFees: num(b.netAmount),
      amountPaid: num(b.paidAmount),
      balance: num(b.balance),
      status: b.status,
      dueDate: b.dueDate?.toISOString() ?? null,
    }));

    return { count: students.length, students };
  }

  async listAutomations(organizationId: string, status?: string) {
    await ensureReminderDefaults(organizationId);
    const where: Prisma.ReminderAutomationWhereInput = { organizationId };
    if (status && status !== 'all') where.status = status.toUpperCase();
    const rows = await prisma.reminderAutomation.findMany({ where, orderBy: { updatedAt: 'desc' } });
    return rows.map((r) => ({
      ...r,
      channels: r.channels as ChannelFlags,
      templates: r.templates as TemplateSet,
      escalation: r.escalation as unknown[] | null,
    }));
  }

  async createAutomation(organizationId: string, body: Record<string, unknown>) {
    const row = await prisma.reminderAutomation.create({
      data: {
        organizationId,
        name: String(body.name ?? 'New automation'),
        trigger: String(body.trigger ?? 'PAYMENT_DUE_SOON'),
        timingDays: Number(body.timingDays ?? 3),
        timingType: String(body.timingType ?? 'before'),
        audience: String(body.audience ?? 'parents_outstanding'),
        channels: (body.channels as object) ?? { sms: true, email: true, push: true, inApp: true },
        templates: (body.templates as object) ?? DEFAULT_TEMPLATES,
        escalation: body.escalation ?? undefined,
        status: String(body.status ?? 'DRAFT'),
        maxSmsPerDay: Number(body.maxSmsPerDay ?? 1),
        maxSmsPerWeek: Number(body.maxSmsPerWeek ?? 3),
        quietHoursStart: body.quietHoursStart != null ? Number(body.quietHoursStart) : 22,
        quietHoursEnd: body.quietHoursEnd != null ? Number(body.quietHoursEnd) : 6,
        combineSiblings: body.combineSiblings !== false,
      },
    });
    return row;
  }

  async updateAutomation(organizationId: string, id: string, body: Record<string, unknown>) {
    const existing = await prisma.reminderAutomation.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Automation not found');
    return prisma.reminderAutomation.update({
      where: { id },
      data: {
        name: body.name != null ? String(body.name) : undefined,
        trigger: body.trigger != null ? String(body.trigger) : undefined,
        timingDays: body.timingDays != null ? Number(body.timingDays) : undefined,
        timingType: body.timingType != null ? String(body.timingType) : undefined,
        audience: body.audience != null ? String(body.audience) : undefined,
        channels: body.channels != null ? (body.channels as object) : undefined,
        templates: body.templates != null ? (body.templates as object) : undefined,
        escalation: body.escalation != null ? (body.escalation as object) : undefined,
        status: body.status != null ? String(body.status) : undefined,
        maxSmsPerDay: body.maxSmsPerDay != null ? Number(body.maxSmsPerDay) : undefined,
        maxSmsPerWeek: body.maxSmsPerWeek != null ? Number(body.maxSmsPerWeek) : undefined,
        quietHoursStart: body.quietHoursStart != null ? Number(body.quietHoursStart) : undefined,
        quietHoursEnd: body.quietHoursEnd != null ? Number(body.quietHoursEnd) : undefined,
        combineSiblings: body.combineSiblings != null ? Boolean(body.combineSiblings) : undefined,
      },
    });
  }

  async setAutomationStatus(organizationId: string, id: string, status: string) {
    const existing = await prisma.reminderAutomation.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Automation not found');
    return prisma.reminderAutomation.update({
      where: { id },
      data: { status: status.toUpperCase(), lastError: status.toUpperCase() === 'ERROR' ? existing.lastError : null },
    });
  }

  async deleteAutomation(organizationId: string, id: string) {
    const existing = await prisma.reminderAutomation.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Automation not found');
    await prisma.reminderAutomation.delete({ where: { id } });
    return { deleted: true };
  }

  async listTemplates(organizationId: string) {
    await ensureReminderDefaults(organizationId);
    return prisma.reminderTemplate.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
  }

  async createTemplate(organizationId: string, body: Record<string, unknown>) {
    return prisma.reminderTemplate.create({
      data: {
        organizationId,
        name: String(body.name ?? 'Template'),
        channel: String(body.channel ?? 'SMS').toUpperCase(),
        subject: body.subject ? String(body.subject) : null,
        body: String(body.body ?? ''),
        isDefault: Boolean(body.isDefault),
      },
    });
  }

  async history(organizationId: string, query: Record<string, string | undefined>) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const pageSize = Math.min(100, Math.max(5, parseInt(query.pageSize ?? '20', 10)));
    const where: Prisma.ReminderDeliveryWhereInput = { organizationId };
    if (query.channel?.trim() && query.channel !== 'all') where.channel = query.channel.toUpperCase();
    if (query.status?.trim() && query.status !== 'all') where.status = query.status.toUpperCase();

    const [total, rows] = await Promise.all([
      prisma.reminderDelivery.count({ where }),
      prisma.reminderDelivery.findMany({
        where,
        orderBy: { queuedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { automation: { select: { name: true } } },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      data: rows,
    };
  }

  async analytics(organizationId: string) {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const rows = await prisma.reminderDelivery.findMany({
      where: { organizationId, queuedAt: { gte: since } },
    });
    const byChannel = ['SMS', 'EMAIL', 'PUSH', 'IN_APP'].map((ch) => {
      const subset = rows.filter((r) => r.channel === ch);
      const delivered = subset.filter((r) => r.status === 'DELIVERED' || r.status === 'SENT').length;
      return {
        channel: ch,
        deliveryRate: subset.length ? Math.round((delivered / subset.length) * 1000) / 10 : 0,
      };
    });
    const remindersSent = rows.length;
    const opened = rows.filter((r) => r.readAt || r.status === 'DELIVERED').length;
    const paidAfter = await prisma.payment.count({
      where: { organizationId, paidAt: { gte: since }, status: 'COMPLETED' },
    });
    return {
      deliveryPerformance: byChannel,
      reminderEffectiveness: {
        remindersSent,
        opened,
        paymentsRecorded: paidAfter,
        paymentConversion: remindersSent ? Math.round((paidAfter / remindersSent) * 1000) / 10 : 0,
      },
    };
  }

  preview(body: Record<string, unknown>) {
    const templates = (body.templates as TemplateSet) ?? DEFAULT_TEMPLATES;
    const vars: Record<string, string> = {
      parent_name: String(body.parent_name ?? "Jean Claude's parent"),
      student_name: String(body.student_name ?? 'Jean Claude'),
      student_code: String(body.student_code ?? 'STU-001'),
      class_name: String(body.class_name ?? 'S3'),
      balance: String(body.balance ?? '50,000'),
      due_date: String(body.due_date ?? '25 August 2026'),
      payment_link: env.PAYMENT_PORTAL_URL,
      school_name: String(body.school_name ?? 'Your School'),
      school_phone: String(body.school_phone ?? '+250 788 000 000'),
      amount_paid: String(body.amount_paid ?? '50,000'),
      receipt_number: String(body.receipt_number ?? 'RC-2026-00421'),
    };
    const sms = renderTemplate(templates.sms ?? DEFAULT_TEMPLATES.sms!, vars);
    return {
      variables: VARIABLES,
      rendered: {
        sms,
        smsMeta: smsParts(sms),
        emailSubject: renderTemplate(templates.emailSubject ?? DEFAULT_TEMPLATES.emailSubject!, vars),
        emailBody: renderTemplate(templates.emailBody ?? DEFAULT_TEMPLATES.emailBody!, vars),
        pushTitle: renderTemplate(templates.pushTitle ?? DEFAULT_TEMPLATES.pushTitle!, vars),
        pushBody: renderTemplate(templates.pushBody ?? DEFAULT_TEMPLATES.pushBody!, vars),
        inApp: renderTemplate(templates.inApp ?? DEFAULT_TEMPLATES.inApp!, vars),
      },
    };
  }

  async testSend(organizationId: string, body: Record<string, unknown>) {
    const channel = String(body.channel ?? 'SMS').toUpperCase();
    const to = String(body.to ?? '').trim();
    const preview = this.preview(body);
    const message =
      channel === 'EMAIL'
        ? preview.rendered.emailBody
        : channel === 'PUSH'
          ? preview.rendered.pushBody
          : channel === 'IN_APP'
            ? preview.rendered.inApp
            : preview.rendered.sms;

    let ok = false;
    let providerRef: string | null = null;

    if (channel === 'SMS' && to) {
      const res = await notificationClient.sendSms({ to, body: preview.rendered.sms });
      ok = Boolean(res);
      providerRef = res?.id ?? null;
    } else if (channel === 'EMAIL' && to) {
      const res = await notificationClient.sendEmail({
        to,
        subject: preview.rendered.emailSubject,
        html: preview.rendered.emailBody,
      });
      ok = Boolean(res);
      providerRef = res?.id ?? null;
    } else if (channel === 'PUSH' || channel === 'IN_APP') {
      const userId = String(body.userId ?? 'test-parent');
      const res =
        channel === 'PUSH'
          ? await notificationClient.sendPush({
              userId,
              title: preview.rendered.pushTitle,
              body: preview.rendered.pushBody,
            })
          : await notificationClient.sendInApp({
              userId,
              title: preview.rendered.pushTitle,
              body: preview.rendered.inApp,
            });
      ok = Boolean(res);
      providerRef = res?.id ?? null;
    }

    await prisma.reminderDelivery.create({
      data: {
        organizationId,
        parentName: 'Test',
        channel,
        event: 'TEST',
        status: ok ? 'DELIVERED' : 'FAILED',
        message,
        providerRef,
        sentAt: ok ? new Date() : null,
        deliveredAt: ok ? new Date() : null,
        failedReason: ok ? null : 'Notification service unavailable',
      },
    });

    return { ok, channel, preview: preview.rendered, smsMeta: preview.rendered.smsMeta };
  }

  private async canSendSms(organizationId: string, parent: ParentContact) {
    if (!parent.phone || !parent.smsEnabled) return false;
    const today = startOfDay(new Date());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const [todayCount, weekCount] = await Promise.all([
      prisma.reminderDelivery.count({
        where: {
          organizationId,
          parentId: parent.id,
          channel: 'SMS',
          queuedAt: { gte: today },
          status: { not: 'FAILED' },
        },
      }),
      prisma.reminderDelivery.count({
        where: {
          organizationId,
          parentId: parent.id,
          channel: 'SMS',
          queuedAt: { gte: weekAgo },
          status: { not: 'FAILED' },
        },
      }),
    ]);
    const automation = await prisma.reminderAutomation.findFirst({
      where: { organizationId, status: 'ACTIVE' },
    });
    const maxDay = automation?.maxSmsPerDay ?? 1;
    const maxWeek = automation?.maxSmsPerWeek ?? 3;
    return todayCount < maxDay && weekCount < maxWeek;
  }

  private buildVars(input: {
    parent: ParentContact;
    studentName: string;
    studentCode: string;
    className?: string | null;
    balance: number;
    dueDate?: Date | null;
    receiptNumber?: string;
    amountPaid?: number;
  }) {
    return {
      parent_name: input.parent.fullName || 'Parent',
      student_name: input.studentName,
      student_code: input.studentCode,
      class_name: input.className ?? '—',
      balance: input.balance.toLocaleString(),
      due_date: input.dueDate
        ? input.dueDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
        : '—',
      payment_link: env.PAYMENT_PORTAL_URL,
      school_name: 'School',
      school_phone: '+250 788 000 000',
      receipt_number: input.receiptNumber ?? '',
      amount_paid: (input.amountPaid ?? 0).toLocaleString(),
    };
  }

  async sendNow(organizationId: string, body: Record<string, unknown>) {
    const studentIds = Array.isArray(body.studentIds) ? (body.studentIds as string[]) : [];
    const channels = (body.channels as ChannelFlags) ?? { sms: true, email: true, push: true, inApp: true };
    const templates = (body.templates as TemplateSet) ?? DEFAULT_TEMPLATES;
    const event = String(body.event ?? 'PAYMENT_OVERDUE');
    const customMessage = body.message ? String(body.message) : null;

    const bills = await prisma.studentBill.findMany({
      where: {
        organizationId,
        balance: { gt: 0 },
        ...(studentIds.length ? { studentId: { in: studentIds } } : {}),
      },
    });

    const parents = await studentManagementClient.listParents(organizationId);
    const parentMap = new Map<string, ParentContact>();
    for (const p of parents ?? []) parentMap.set(p.id, p);

    const byParent = new Map<string, typeof bills>();
    for (const bill of bills) {
      const linked = (parents ?? []).filter((p) => p.students.some((s) => s.studentId === bill.studentId));
      for (const parent of linked) {
        const list = byParent.get(parent.id) ?? [];
        list.push(bill);
        byParent.set(parent.id, list);
      }
    }

    const results: Array<{ parentId: string; status: string }> = [];
    const now = new Date();

    for (const [parentId, parentBills] of byParent) {
      const parent = parentMap.get(parentId);
      if (!parent) continue;

      const combine = Boolean(body.combineSiblings ?? true) && parentBills.length > 1;
      const totalBalance = parentBills.reduce((s, b) => s + num(b.balance), 0);
      const primary = parentBills[0];

      const vars = this.buildVars({
        parent,
        studentName: combine
          ? parentBills.map((b) => b.studentName).join(', ')
          : primary.studentName,
        studentCode: primary.studentId,
        className: primary.className,
        balance: totalBalance,
        dueDate: primary.dueDate,
      });

      let smsBody = customMessage ?? renderTemplate(templates.sms ?? DEFAULT_TEMPLATES.sms!, vars);
      if (combine && parentBills.length > 1) {
        const parts = parentBills.map((b) => `${b.studentName} — ${num(b.balance).toLocaleString()} RWF`);
        smsBody = `Dear ${parent.fullName}, outstanding school fees: ${parts.join('; ')}. Total: ${totalBalance.toLocaleString()} RWF. Pay: ${env.PAYMENT_PORTAL_URL}`;
      }

      const sendAt = nextAllowedSend(now, 22, 6);
      const queued = sendAt.getTime() > now.getTime();

      const recordDelivery = async (
        channel: string,
        message: string,
        ok: boolean,
        ref?: string | null
      ) => {
        await prisma.reminderDelivery.create({
          data: {
            organizationId,
            parentId: parent.id,
            parentName: parent.fullName,
            studentId: primary.studentId,
            studentName: primary.studentName,
            channel,
            event,
            status: queued ? 'QUEUED' : ok ? 'DELIVERED' : 'FAILED',
            message,
            providerRef: ref ?? null,
            queuedAt: sendAt,
            sentAt: queued ? null : ok ? new Date() : null,
            deliveredAt: queued ? null : ok ? new Date() : null,
            failedReason: ok ? null : 'Delivery failed',
          },
        });
      };

      if (queued) {
        results.push({ parentId, status: 'QUEUED' });
        continue;
      }

      if (channels.sms && parent.phone && parent.smsEnabled && (await this.canSendSms(organizationId, parent))) {
        const res = await notificationClient.sendSms({ to: parent.phone, body: smsBody });
        await recordDelivery('SMS', smsBody, Boolean(res), res?.id);
      }

      if (channels.email && parent.email) {
        const html = renderTemplate(templates.emailBody ?? DEFAULT_TEMPLATES.emailBody!, vars);
        const res = await notificationClient.sendEmail({
          to: parent.email,
          subject: renderTemplate(templates.emailSubject ?? DEFAULT_TEMPLATES.emailSubject!, vars),
          html,
        });
        await recordDelivery('EMAIL', html, Boolean(res), res?.id);
      }

      if (channels.push) {
        const res = await notificationClient.sendPush({
          userId: parent.id,
          title: renderTemplate(templates.pushTitle ?? DEFAULT_TEMPLATES.pushTitle!, vars),
          body: renderTemplate(templates.pushBody ?? DEFAULT_TEMPLATES.pushBody!, vars),
        });
        await recordDelivery('PUSH', smsBody, Boolean(res), res?.id);
      }

      if (channels.inApp) {
        // Push into ParentMIS so parents see the reminder in the portal notification bell.
        // studentCode must be the ShuleCode (ParentMIS matches on it), not the fees-DB id.
        const ingest = await parentMisClient.ingestFeeEvent({
          organizationId,
          studentCode: primary.studentCode || primary.studentId,
          studentId: primary.studentId,
          studentName: primary.studentName,
          title: event.includes('OVERDUE') ? 'Overdue fee reminder' : 'Payment reminder',
          body: smsBody,
          eventType: event,
          priority: event.includes('OVERDUE') ? 'URGENT' : 'IMPORTANT',
          link: '/fees',
        });
        const matched = Number((ingest as { matched?: number } | null)?.matched ?? 0);
        const okInApp = matched > 0;
        await recordDelivery('IN_APP', smsBody, okInApp, null);
        if (!okInApp) {
          console.warn(
            `[Fees reminders] ParentMIS ingest matched 0 parents for student ${primary.studentCode || primary.studentId} — check PARENT_MIS_API_URL / parent links`
          );
        }
      }

      results.push({ parentId, status: 'SENT' });
    }

    return { recipients: results.length, results };
  }

  async runAutomation(organizationId: string, automationId: string) {
    const automation = await prisma.reminderAutomation.findFirst({
      where: { id: automationId, organizationId },
    });
    if (!automation) throw new AppError(404, 'Automation not found');

    try {
      const result = await this.sendNow(organizationId, {
        event: automation.trigger,
        channels: automation.channels,
        templates: automation.templates,
        combineSiblings: automation.combineSiblings,
      });
      await prisma.reminderAutomation.update({
        where: { id: automationId },
        data: { lastRunAt: new Date(), lastError: null, status: 'ACTIVE' },
      });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Run failed';
      await prisma.reminderAutomation.update({
        where: { id: automationId },
        data: { lastError: msg, status: 'ERROR' },
      });
      throw err;
    }
  }

  async processScheduled(organizationId: string) {
    await ensureReminderDefaults(organizationId);
    const automations = await prisma.reminderAutomation.findMany({
      where: { organizationId, status: 'ACTIVE' },
    });
    const results = [];
    for (const a of automations) {
      if (['PAYMENT_DUE_SOON', 'PAYMENT_OVERDUE', 'INSTALLMENT_DUE_SOON', 'INSTALLMENT_OVERDUE'].includes(a.trigger)) {
        results.push({ id: a.id, ...(await this.runAutomation(organizationId, a.id)) });
      }
    }
    return { processed: results.length, results };
  }

  triggerTypes() {
    return {
      fees: [
        'PAYMENT_DUE_SOON',
        'PAYMENT_DUE_TODAY',
        'PAYMENT_OVERDUE',
        'PARTIAL_PAYMENT_RECEIVED',
        'PAYMENT_COMPLETED',
        'NEW_FEE_ASSIGNED',
      ],
      receipts: ['RECEIPT_GENERATED', 'RECEIPT_REVERSED', 'PAYMENT_RECEIVED'],
      scholarships: ['SCHOLARSHIP_APPROVED', 'SCHOLARSHIP_REJECTED', 'SCHOLARSHIP_PENDING', 'SCHOLARSHIP_EXPIRING'],
      installments: [
        'INSTALLMENT_CREATED',
        'INSTALLMENT_DUE_SOON',
        'INSTALLMENT_DUE_TODAY',
        'INSTALLMENT_OVERDUE',
        'INSTALLMENT_COMPLETED',
      ],
    };
  }
}

export const remindersService = new RemindersService();
