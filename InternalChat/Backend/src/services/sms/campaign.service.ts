import {
  SmsCampaignMode,
  SmsCampaignStatus,
  SmsParentTarget,
  SmsRecipientStatus,
  type Prisma,
} from '../../generated/prisma';
import { prisma } from '../../config/database';
import { sendSmsViaNotification } from '../../clients/notification-sms.client';
import {
  loadStudentDirectory,
  resolveBulkParents,
  resolveCustomNumberRecipients,
  resolveRecipientsFromStudents,
  type ResolvedSmsRecipient,
} from './recipient-resolver.service';
import { assertCanSend, getOrCreateSmsSettings, reserveSegments } from './quota.service';

import { SMS_TEMPLATE_SINGLE } from './sms-message-templates';

const DEFAULT_TEMPLATE = SMS_TEMPLATE_SINGLE;

export type SendCampaignInput = {
  organizationId: string;
  schoolName: string;
  senderUserId: string;
  senderEmail?: string;
  mode: SmsCampaignMode;
  parentTarget?: SmsParentTarget;
  className?: string;
  studentIds?: string[];
  customNumbers?: string[];
  message: string;
  template?: string;
};

async function deliverRecipients(
  organizationId: string,
  campaignId: string,
  recipients: ResolvedSmsRecipient[]
) {
  let delivered = 0;
  let failed = 0;
  let pending = 0;

  for (const r of recipients) {
    const row = await prisma.smsRecipient.findFirst({
      where: { campaignId, phoneNormalized: r.phoneNormalized },
    });
    if (!row) continue;

    const result = await sendSmsViaNotification(r.phoneE164, r.messageBody);
    if (result.delivered) {
      delivered += 1;
      await prisma.smsRecipient.update({
        where: { id: row.id },
        data: {
          status: SmsRecipientStatus.DELIVERED,
          sentAt: new Date(),
          deliveredAt: new Date(),
        },
      });
    } else {
      failed += 1;
      await prisma.smsRecipient.update({
        where: { id: row.id },
        data: {
          status: SmsRecipientStatus.FAILED,
          failureReason: result.error ?? 'Send failed',
          sentAt: new Date(),
        },
      });
    }
  }

  pending = recipients.length - delivered - failed;

  await prisma.smsCampaign.update({
    where: { id: campaignId },
    data: {
      status: failed === recipients.length ? SmsCampaignStatus.FAILED : SmsCampaignStatus.COMPLETED,
      deliveredCount: delivered,
      failedCount: failed,
      pendingCount: pending,
      completedAt: new Date(),
    },
  });
}

export async function previewCampaign(input: SendCampaignInput) {
  const rows = await loadStudentDirectory(input.organizationId);
  const template = input.template?.trim() || DEFAULT_TEMPLATE;
  let resolved: { recipients: ResolvedSmsRecipient[]; missingContacts: number; duplicatePhones: number };

  if (input.mode === SmsCampaignMode.CUSTOM_NUMBERS) {
    const recipients = resolveCustomNumberRecipients(
      input.customNumbers ?? [],
      input.message,
      input.schoolName
    );
    resolved = { recipients, missingContacts: 0, duplicatePhones: 0 };
  } else if (input.mode === SmsCampaignMode.BULK_SCHOOL) {
    resolved = resolveBulkParents({
      rows,
      scope: 'school',
      parentTarget: input.parentTarget ?? SmsParentTarget.BOTH,
      schoolName: input.schoolName,
      template,
      customMessage: input.message,
    });
  } else if (input.mode === SmsCampaignMode.BULK_CLASS) {
    resolved = resolveBulkParents({
      rows,
      scope: 'class',
      className: input.className,
      parentTarget: input.parentTarget ?? SmsParentTarget.BOTH,
      schoolName: input.schoolName,
      template,
      customMessage: input.message,
    });
  } else {
    resolved = resolveRecipientsFromStudents({
      rows,
      selectedStudentIds: input.studentIds ?? [],
      parentTarget: input.parentTarget ?? SmsParentTarget.BOTH,
      schoolName: input.schoolName,
      template,
      customMessage: input.message,
    });
  }

  const segmentsTotal = resolved.recipients.reduce((n, r) => n + r.segments, 0);
  return {
    recipientCount: resolved.recipients.length,
    segmentsTotal,
    missingContacts: resolved.missingContacts,
    duplicatePhones: resolved.duplicatePhones,
    preview: resolved.recipients.slice(0, 20),
  };
}

export async function sendCampaign(input: SendCampaignInput) {
  const preview = await previewCampaign(input);
  if (!preview.recipientCount) {
    return { campaignId: null, ...preview, sent: false };
  }

  await getOrCreateSmsSettings(input.organizationId);
  await assertCanSend(input.organizationId, preview.segmentsTotal);

  const rows = await loadStudentDirectory(input.organizationId);
  const template = input.template?.trim() || DEFAULT_TEMPLATE;
  let recipients: ResolvedSmsRecipient[] = [];

  if (input.mode === SmsCampaignMode.CUSTOM_NUMBERS) {
    recipients = resolveCustomNumberRecipients(input.customNumbers ?? [], input.message, input.schoolName);
  } else if (input.mode === SmsCampaignMode.BULK_SCHOOL) {
    recipients = resolveBulkParents({
      rows,
      scope: 'school',
      parentTarget: input.parentTarget ?? SmsParentTarget.BOTH,
      schoolName: input.schoolName,
      template,
      customMessage: input.message,
    }).recipients;
  } else if (input.mode === SmsCampaignMode.BULK_CLASS) {
    recipients = resolveBulkParents({
      rows,
      scope: 'class',
      className: input.className,
      parentTarget: input.parentTarget ?? SmsParentTarget.BOTH,
      schoolName: input.schoolName,
      template,
      customMessage: input.message,
    }).recipients;
  } else {
    recipients = resolveRecipientsFromStudents({
      rows,
      selectedStudentIds: input.studentIds ?? [],
      parentTarget: input.parentTarget ?? SmsParentTarget.BOTH,
      schoolName: input.schoolName,
      template,
      customMessage: input.message,
    }).recipients;
  }

  const segmentsTotal = recipients.reduce((n, r) => n + r.segments, 0);

  const campaign = await prisma.smsCampaign.create({
    data: {
      organizationId: input.organizationId,
      mode: input.mode,
      status: SmsCampaignStatus.SENDING,
      templateBody: template,
      parentTarget: input.parentTarget,
      classFilter: input.className,
      senderUserId: input.senderUserId,
      senderEmail: input.senderEmail,
      recipientCount: recipients.length,
      segmentsTotal,
      recipients: {
        create: recipients.map((r) => ({
          organizationId: input.organizationId,
          phoneNormalized: r.phoneNormalized,
          phoneMasked: r.phoneMasked,
          parentName: r.parentName,
          parentRole: r.parentRole,
          studentSummary: r.studentSummary,
          messageBody: r.messageBody,
          segments: r.segments,
          status: SmsRecipientStatus.QUEUED,
        })),
      },
    },
  });

  await reserveSegments(input.organizationId, segmentsTotal, campaign.id, input.senderUserId);
  await deliverRecipients(input.organizationId, campaign.id, recipients);

  return {
    campaignId: campaign.id,
    recipientCount: recipients.length,
    segmentsTotal,
    sent: true,
  };
}

export async function listCampaigns(organizationId: string, limit = 50) {
  return prisma.smsCampaign.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getCampaignRecipients(campaignId: string, organizationId: string) {
  return prisma.smsRecipient.findMany({
    where: { campaignId, organizationId },
    orderBy: { createdAt: 'asc' },
  });
}

export type DeliveryReportFilters = {
  organizationId: string;
  campaignId?: string;
  status?: string;
  student?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

function termRange(term: string): { from: Date; to: Date } | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (term === 'MONTH') {
    return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0, 23, 59, 59) };
  }
  if (term === 'TERM') {
    const termStartMonth = m < 4 ? 0 : m < 8 ? 4 : 8;
    return { from: new Date(y, termStartMonth, 1), to: now };
  }
  if (term === 'YEAR') {
    return { from: new Date(y, 0, 1), to: new Date(y, 11, 31, 23, 59, 59) };
  }
  return null;
}

export async function listDeliveryReport(filters: DeliveryReportFilters & { term?: string }) {
  const where: Prisma.SmsRecipientWhereInput = {
    organizationId: filters.organizationId,
  };

  if (filters.campaignId) where.campaignId = filters.campaignId;
  if (filters.status && filters.status !== 'ALL') {
    where.status = filters.status as import('../../generated/prisma').SmsRecipientStatus;
  }
  if (filters.student?.trim()) {
    const q = filters.student.trim();
    where.studentSummary = { contains: q, mode: 'insensitive' };
  }

  let from = filters.dateFrom;
  let to = filters.dateTo;
  if (filters.term && filters.term !== 'ALL') {
    const range = termRange(filters.term);
    if (range) {
      from = range.from;
      to = range.to;
    }
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  const rows = await prisma.smsRecipient.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 2000,
    include: {
      campaign: {
        select: { id: true, createdAt: true, status: true, mode: true, recipientCount: true },
      },
    },
  });

  let delivered = 0;
  let failed = 0;
  let pending = 0;
  let segments = 0;
  for (const r of rows) {
    segments += r.segments;
    if (r.status === 'DELIVERED') delivered += 1;
    else if (r.status === 'FAILED') failed += 1;
    else pending += 1;
  }

  return {
    rows,
    summary: {
      totalMessages: rows.length,
      delivered,
      failed,
      pending,
      segments,
    },
  };
}

export async function listParentSmsHistory(organizationId: string, phoneNormalized: string, limit = 80) {
  const phone = phoneNormalized.trim();
  if (!phone) return [];
  return prisma.smsRecipient.findMany({
    where: { organizationId, phoneNormalized: phone },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      campaign: {
        select: { id: true, createdAt: true, status: true, mode: true, recipientCount: true },
      },
    },
  });
}
