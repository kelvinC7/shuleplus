import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import type { AuthState } from '../middleware/auth.middleware';

export interface Actor {
  id: string;
  name: string;
}

export function actorOf(auth: AuthState): Actor {
  if (auth.user) {
    const name =
      auth.user.name ??
      (auth.user.email?.split('@')[0] ?? 'Director')
        .split(/[._-]/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
    return { id: auth.user.sub, name };
  }
  return { id: auth.demoUser.sub, name: auth.demoUser.name };
}

export async function recordAudit(input: {
  actor: Actor;
  action: string;
  module: string;
  targetType: string;
  targetId: string;
  summary: string;
  organizationId?: string | null;
  meta?: Record<string, unknown>;
}) {
  await prisma.auditEvent.create({
    data: {
      actorId: input.actor.id,
      actorName: input.actor.name,
      action: input.action,
      module: input.module,
      targetType: input.targetType,
      targetId: input.targetId,
      summary: input.summary,
      organizationId: input.organizationId ?? null,
      meta: JSON.stringify(input.meta ?? {}),
    },
  });
}

// ── approvals ────────────────────────────────────────────────────────

export const approvalCategories = [
  { id: 'CIRCULAR', label: 'Circular' },
  { id: 'PROCUREMENT', label: 'Procurement' },
  { id: 'LEAVE', label: 'Leave' },
  { id: 'KAZI_ADVANCE', label: 'KaziAdvance' },
  { id: 'TRIP', label: 'ShuleTrip' },
  { id: 'BUDGET', label: 'Budget' },
  { id: 'EXPENDITURE', label: 'Expenditure' },
];

export function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function serializeMeeting<
  T extends {
    meetingDate: Date;
    agenda: string;
    participants: string;
    createdAt: Date;
    updatedAt: Date;
  },
>(meeting: T) {
  return {
    ...meeting,
    meetingDate: meeting.meetingDate.toISOString(),
    agenda: parseJson<string[]>(meeting.agenda, []),
    participants: parseJson<string[]>(meeting.participants, []),
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
  };
}

export function serializeApproval(item: {
  id: string;
  organizationId: string | null;
  reference: string;
  category: string;
  title: string;
  requester: string;
  requesterRole: string | null;
  amount: number | null;
  currency: string;
  description: string;
  dueDate: Date | null;
  priority: string;
  workflowSteps: string;
  attachments: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  decisions?: Array<{ action: string; reason: string | null; comment: string | null; decidedByName: string; createdAt: Date }>;
}) {
  return {
    id: item.id,
    organizationId: item.organizationId,
    reference: item.reference,
    category: item.category,
    title: item.title,
    requester: item.requester,
    requesterRole: item.requesterRole,
    amount: item.amount,
    currency: item.currency,
    description: item.description,
    dueDate: item.dueDate?.toISOString() ?? null,
    priority: item.priority,
    workflowSteps: parseJson<Array<{ name: string; status: string }>>(item.workflowSteps, []),
    attachments: parseJson<Array<{ name: string; kind: string }>>(item.attachments, []),
    status: item.status,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    decisionHistory: item.decisions?.map((d) => ({
      action: d.action,
      reason: d.reason,
      comment: d.comment,
      decidedByName: d.decidedByName,
      createdAt: d.createdAt.toISOString(),
    })),
  };
}

export type ApprovalRow = Parameters<typeof serializeApproval>[0];

export const consoleService = {
  async listApprovals(query: {
    status?: string;
    category?: string;
    organizationId?: string;
    search?: string;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.ApprovalItemWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.organizationId && query.organizationId !== 'all') {
      where.organizationId = query.organizationId;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { reference: { contains: query.search } },
        { requester: { contains: query.search } },
      ];
    }
    const [rows, total] = await Promise.all([
      prisma.approvalItem.findMany({
        where,
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { decisions: { orderBy: { createdAt: 'desc' } } },
      }),
      prisma.approvalItem.count({ where }),
    ]);
    return {
      items: rows.map(serializeApproval),
      pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    };
  },

  async getApproval(id: string) {
    const item = await prisma.approvalItem.findFirst({
      where: { OR: [{ id }, { reference: id }] },
      include: { decisions: { orderBy: { createdAt: 'desc' } } },
    });
    if (!item) throw new AppError(404, 'Approval request not found');
    return serializeApproval(item as ApprovalRow);
  },

  async decide(
    auth: AuthState,
    id: string,
    input: { action: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'; reason?: string; comment?: string }
  ) {
    const item = await prisma.approvalItem.findFirst({ where: { OR: [{ id }, { reference: id }] } });
    if (!item) throw new AppError(404, 'Approval request not found');
    if (item.status !== 'PENDING') {
      throw new AppError(409, `This request was already ${item.status.toLowerCase()} on ${item.updatedAt.toDateString()}`);
    }
    if (input.action === 'REJECTED' && !input.reason?.trim()) {
      throw new AppError(400, 'A reason is required when rejecting a request');
    }

    const actor = actorOf(auth);
    const [decision] = await prisma.$transaction([
      prisma.decision.create({
        data: {
          approvalId: item.id,
          action: input.action,
          reason: input.reason?.trim() ?? null,
          comment: input.comment?.trim() ?? null,
          decidedBy: actor.id,
          decidedByName: actor.name,
        },
      }),
      prisma.approvalItem.update({
        where: { id: item.id },
        data: { status: input.action },
      }),
    ]);

    await recordAudit({
      actor,
      action: 'APPROVAL_DECIDED',
      module: 'Approvals',
      targetType: 'ApprovalItem',
      targetId: item.reference,
      summary: `${input.action} · ${item.title}`,
      organizationId: item.organizationId,
      meta: { reason: input.reason ?? null, comment: input.comment ?? null },
    });

    return { decisionId: decision.id, status: input.action, reference: item.reference };
  },

  async approvalStats(organizationId?: string) {
    const where = organizationId && organizationId !== 'all' ? { organizationId } : {};
    const [pending, approved, rejected, changes] = await Promise.all([
      prisma.approvalItem.count({ where: { ...where, status: 'PENDING' } }),
      prisma.approvalItem.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.approvalItem.count({ where: { ...where, status: 'REJECTED' } }),
      prisma.approvalItem.count({ where: { ...where, status: 'CHANGES_REQUESTED' } }),
    ]);
    const pendingAmount = await prisma.approvalItem.aggregate({
      where: { ...where, status: 'PENDING' },
      _sum: { amount: true },
    });
    const dueToday = await prisma.approvalItem.count({
      where: { ...where, status: 'PENDING', dueDate: { lte: new Date() } },
    });
    return {
      pending,
      approved,
      rejected,
      changes,
      pendingAmount: pendingAmount._sum.amount ?? 0,
      dueToday,
    };
  },

  // ── action plan tasks ──────────────────────────────────────────────

  async listTasks(query: { status?: string; organizationId?: string; page: number; pageSize: number }) {
    const where: Prisma.TaskItemWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.organizationId && query.organizationId !== 'all') {
      where.organizationId = query.organizationId;
    }
    const [rows, total] = await Promise.all([
      prisma.taskItem.findMany({
        where,
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.taskItem.count({ where }),
    ]);
    return {
      items: rows.map((t) => ({ ...t, dueDate: t.dueDate?.toISOString() ?? null })),
      pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    };
  },

  async createTask(auth: AuthState, input: {
    title: string;
    description?: string;
    owner: string;
    ownerRole?: string;
    priority?: string;
    category?: string;
    dueDate?: string;
    organizationId?: string;
  }) {
    const actor = actorOf(auth);
    const task = await prisma.taskItem.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        owner: input.owner,
        ownerRole: input.ownerRole ?? null,
        priority: input.priority ?? 'MEDIUM',
        category: input.category ?? 'OPERATIONS',
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        organizationId: input.organizationId ?? null,
      },
    });
    await recordAudit({
      actor,
      action: 'TASK_CREATED',
      module: 'Action Plan',
      targetType: 'TaskItem',
      targetId: task.id,
      summary: `Created task · ${task.title}`,
      organizationId: task.organizationId,
    });
    return { ...task, dueDate: task.dueDate?.toISOString() ?? null };
  },

  async updateTask(auth: AuthState, id: string, input: { status?: string; progress?: number; title?: string }) {
    const actor = actorOf(auth);
    const task = await prisma.taskItem.update({
      where: { id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(typeof input.progress === 'number'
          ? { progress: Math.max(0, Math.min(100, input.progress)), status: input.progress >= 100 ? 'COMPLETED' : 'IN_PROGRESS' }
          : {}),
        ...(input.title ? { title: input.title } : {}),
      },
    });
    await recordAudit({
      actor,
      action: 'TASK_UPDATED',
      module: 'Action Plan',
      targetType: 'TaskItem',
      targetId: task.id,
      summary: `Updated task · ${task.title} (${input.status ?? `${input.progress}%`})`,
      organizationId: task.organizationId,
    });
    return { ...task, dueDate: task.dueDate?.toISOString() ?? null };
  },

  async taskStats() {
    const [open, inProgress, completed, overdue] = await Promise.all([
      prisma.taskItem.count({ where: { status: 'OPEN' } }),
      prisma.taskItem.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.taskItem.count({ where: { status: 'COMPLETED' } }),
      prisma.taskItem.count({
        where: { status: { not: 'COMPLETED' }, dueDate: { lt: new Date() } },
      }),
    ]);
    return { open, inProgress, completed, overdue, total: open + inProgress + completed };
  },

  // ── action plan meetings ───────────────────────────────────────────

  async listMeetings(query: {
    status?: string;
    organizationId?: string;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.MeetingWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.organizationId && query.organizationId !== 'all') {
      where.organizationId = query.organizationId;
    }
    const [rows, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        orderBy: [{ meetingDate: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.meeting.count({ where }),
    ]);
    return {
      items: rows.map(serializeMeeting),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  },

  async createMeeting(
    auth: AuthState,
    input: {
      title: string;
      description?: string;
      agenda?: string[];
      location?: string;
      meetingDate: string;
      startTime?: string;
      endTime?: string;
      participants?: string[];
      organizationId?: string;
    }
  ) {
    const actor = actorOf(auth);
    const meeting = await prisma.meeting.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        agenda: JSON.stringify(input.agenda ?? []),
        location: input.location ?? null,
        meetingDate: new Date(input.meetingDate),
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        participants: JSON.stringify(input.participants ?? []),
        organizationId: input.organizationId ?? null,
        createdBy: actor.id,
        createdByName: actor.name,
      },
    });
    await recordAudit({
      actor,
      action: 'MEETING_CREATED',
      module: 'Action Plan',
      targetType: 'Meeting',
      targetId: meeting.id,
      summary: `Scheduled meeting · ${meeting.title}`,
      organizationId: meeting.organizationId,
    });
    return serializeMeeting(meeting);
  },

  async updateMeeting(auth: AuthState, id: string, input: { status: string }) {
    const actor = actorOf(auth);
    const meeting = await prisma.meeting.update({
      where: { id },
      data: { status: input.status },
    });
    await recordAudit({
      actor,
      action: 'MEETING_UPDATED',
      module: 'Action Plan',
      targetType: 'Meeting',
      targetId: meeting.id,
      summary: `Updated meeting · ${meeting.title} (${meeting.status})`,
      organizationId: meeting.organizationId,
    });
    return serializeMeeting(meeting);
  },

  // ── notifications ──────────────────────────────────────────────────

  async listNotifications(query: { category?: string; unreadOnly?: boolean }) {
    const where: Prisma.NotificationItemWhereInput = {};
    if (query.category) where.category = query.category;
    if (query.unreadOnly) where.read = false;
    const rows = await prisma.notificationItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
    return rows.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }));
  },

  async unreadCount() {
    return prisma.notificationItem.count({ where: { read: false } });
  },

  async markRead(id: string) {
    await prisma.notificationItem.update({ where: { id }, data: { read: true } });
    return { id, read: true };
  },

  async markAllRead() {
    await prisma.notificationItem.updateMany({ where: { read: false }, data: { read: true } });
    return { read: true };
  },

  // ── incidents ─────────────────────────────────────────────────────

  async listIncidents(query: { status?: string; type?: string }) {
    const where: Prisma.IncidentWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    const rows = await prisma.incident.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
    return rows.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    }));
  },

  async createIncident(auth: AuthState, input: {
    type: string;
    title: string;
    description?: string;
    priority?: string;
    organizationId?: string;
    assignedTo?: string;
  }) {
    const actor = actorOf(auth);
    const incident = await prisma.incident.create({
      data: {
        type: input.type,
        title: input.title,
        description: input.description ?? '',
        priority: input.priority ?? 'MEDIUM',
        organizationId: input.organizationId ?? null,
        assignedTo: input.assignedTo ?? null,
      },
    });
    await recordAudit({
      actor,
      action: 'INCIDENT_CREATED',
      module: 'Live Campus',
      targetType: 'Incident',
      targetId: incident.id,
      summary: `Logged incident · ${incident.title}`,
      organizationId: incident.organizationId,
    });
    return { ...incident, createdAt: incident.createdAt.toISOString(), updatedAt: incident.updatedAt.toISOString() };
  },

  async updateIncident(auth: AuthState, id: string, input: { status?: string; assignedTo?: string }) {
    const actor = actorOf(auth);
    const incident = await prisma.incident.update({
      where: { id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.assignedTo !== undefined ? { assignedTo: input.assignedTo } : {}),
      },
    });
    await recordAudit({
      actor,
      action: 'INCIDENT_UPDATED',
      module: 'Live Campus',
      targetType: 'Incident',
      targetId: incident.id,
      summary: `Incident ${input.status ? `→ ${input.status}` : 'updated'} · ${incident.title}`,
      organizationId: incident.organizationId,
    });
    return { ...incident, createdAt: incident.createdAt.toISOString(), updatedAt: incident.updatedAt.toISOString() };
  },

  // ── cover assignments (teaching now) ─────────────────────────────

  async listCovers(organizationId?: string) {
    const where = organizationId && organizationId !== 'all' ? { organizationId } : {};
    const rows = await prisma.coverAssignment.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
    return rows.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }));
  },

  async assignCover(auth: AuthState, input: {
    classId: string;
    subject: string;
    period: string;
    absentTeacher?: string;
    coverTeacher: string;
    organizationId?: string;
  }) {
    const actor = actorOf(auth);
    const absentTeacher = input.absentTeacher?.trim() || 'Unassigned';
    const cover = await prisma.coverAssignment.create({
      data: {
        classId: input.classId,
        subject: input.subject,
        period: input.period,
        absentTeacher,
        coverTeacher: input.coverTeacher,
        organizationId: input.organizationId ?? null,
        createdBy: actor.id,
        createdByName: actor.name,
      },
    });
    await recordAudit({
      actor,
      action: 'COVER_ASSIGNED',
      module: 'Teaching Now',
      targetType: 'ClassSession',
      targetId: input.classId,
      summary: `Cover for ${input.classId} ${input.subject} → ${input.coverTeacher} (for ${absentTeacher})`,
      organizationId: input.organizationId ?? null,
    });
    return { ...cover, createdAt: cover.createdAt.toISOString() };
  },

  // ── broadcasts ────────────────────────────────────────────────────

  async listBroadcasts() {
    const rows = await prisma.broadcast.findMany({ orderBy: { createdAt: 'desc' }, take: 30 });
    return rows.map((b) => ({
      ...b,
      channels: parseJson<string[]>(b.channels, []),
      scheduledFor: b.scheduledFor?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
    }));
  },

  async sendBroadcast(auth: AuthState, input: {
    organizationId?: string;
    audience: string;
    channels: string[];
    subject: string;
    message: string;
    recipientCount: number;
    smsCost?: number;
    scheduledFor?: string;
  }) {
    const actor = actorOf(auth);
    const broadcast = await prisma.broadcast.create({
      data: {
        organizationId: input.organizationId ?? null,
        audience: input.audience,
        channels: JSON.stringify(input.channels),
        subject: input.subject,
        message: input.message,
        recipientCount: input.recipientCount,
        smsCost: input.smsCost ?? 0,
        status: input.scheduledFor ? 'SCHEDULED' : 'SENT',
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
        sentBy: actor.id,
        sentByName: actor.name,
      },
    });
    await recordAudit({
      actor,
      action: 'BROADCAST_SENT',
      module: 'Communication',
      targetType: 'Broadcast',
      targetId: broadcast.id,
      summary: `${input.scheduledFor ? 'Scheduled' : 'Sent'} broadcast to ${input.audience} (${input.recipientCount} recipients)`,
      organizationId: input.organizationId ?? null,
      meta: { channels: input.channels, subject: input.subject },
    });
    return {
      ...broadcast,
      channels: input.channels,
      scheduledFor: broadcast.scheduledFor?.toISOString() ?? null,
      createdAt: broadcast.createdAt.toISOString(),
    };
  },

  // ── audit ─────────────────────────────────────────────────────────

  async listAudit(query: { module?: string; action?: string; actor?: string; page: number; pageSize: number }) {
    const where: Prisma.AuditEventWhereInput = {};
    if (query.module) where.module = query.module;
    if (query.action) where.action = { contains: query.action };
    if (query.actor) {
      where.OR = [{ actorName: { contains: query.actor } }, { summary: { contains: query.actor } }];
    }
    const [rows, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.auditEvent.count({ where }),
    ]);
    return {
      items: rows.map((e) => ({ ...e, meta: parseJson<Record<string, unknown>>(e.meta, {}), createdAt: e.createdAt.toISOString() })),
      pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    };
  },
};
