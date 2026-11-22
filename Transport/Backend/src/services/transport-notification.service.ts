import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotifyLanguage,
  TransportEventType,
  type Prisma,
} from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { notificationClient } from "../clients/notification.client";
import { parentMisClient } from "../clients/parent-mis.client";
import { internalChatSmsClient } from "../clients/internal-chat-sms.client";

async function loadSettings(organizationId: string) {
  return prisma.transportSettings.upsert({
    where: { organizationId },
    update: {},
    create: { organizationId },
  });
}

export type TemplateVars = {
  studentName: string;
  busCode?: string | null;
  time?: string | null;
  routeName?: string | null;
  schoolName?: string | null;
  stopName?: string | null;
};

const PLACEHOLDER_RE = /\{\{\s*(\w+)\s*\}\}/g;

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(PLACEHOLDER_RE, (_, key: string) => {
    const v = vars[key as keyof TemplateVars];
    return v != null && v !== "" ? String(v) : "—";
  });
}

type TemplateSeed = {
  eventType: TransportEventType;
  channel: NotificationChannel;
  language: NotifyLanguage;
  title: string;
  body: string;
};

export const DEFAULT_TRANSPORT_TEMPLATES: TemplateSeed[] = [
  {
    eventType: TransportEventType.BOARDING_TO_SCHOOL,
    channel: NotificationChannel.SMS,
    language: NotifyLanguage.RW,
    title: "Yuriye bisi",
    body:
      "Mubyeyi, umwana wawe {{studentName}} yuriye bisi {{busCode}} saa {{time}} ajya ku ishuri. Inzira: {{routeName}}. — {{schoolName}} | Shule+",
  },
  {
    eventType: TransportEventType.BOARDING_TO_SCHOOL,
    channel: NotificationChannel.APP,
    language: NotifyLanguage.EN,
    title: "Boarded the school bus",
    body:
      "Your child, {{studentName}}, boarded {{busCode}} on the {{routeName}} route at {{time}}. — {{schoolName}}",
  },
  {
    eventType: TransportEventType.BOARDING_TO_SCHOOL,
    channel: NotificationChannel.SMS,
    language: NotifyLanguage.EN,
    title: "Bus boarding",
    body:
      "{{studentName}} boarded {{busCode}} at {{time}} ({{routeName}}). — {{schoolName}} | Shule+",
  },
  {
    eventType: TransportEventType.ARRIVED_AT_SCHOOL,
    channel: NotificationChannel.SMS,
    language: NotifyLanguage.RW,
    title: "Yageze ku ishuri",
    body: "Mubyeyi, {{studentName}} yageze ku ishuri saa {{time}}. — {{schoolName}} | Shule+",
  },
  {
    eventType: TransportEventType.ARRIVED_AT_SCHOOL,
    channel: NotificationChannel.APP,
    language: NotifyLanguage.EN,
    title: "Arrived at school",
    body: "Your child, {{studentName}}, arrived at school at {{time}}. — {{schoolName}}",
  },
  {
    eventType: TransportEventType.BOARDING_TO_HOME,
    channel: NotificationChannel.SMS,
    language: NotifyLanguage.RW,
    title: "Yavuye ku ishuri",
    body:
      "Mubyeyi, {{studentName}} yavuye ku ishuri akajya mu rugo kuri bisi {{busCode}} saa {{time}}. — {{schoolName}} | Shule+",
  },
  {
    eventType: TransportEventType.BOARDING_TO_HOME,
    channel: NotificationChannel.APP,
    language: NotifyLanguage.EN,
    title: "Left school on the bus",
    body:
      "Your child, {{studentName}}, left school on {{busCode}} ({{routeName}}) at {{time}}. — {{schoolName}}",
  },
  {
    eventType: TransportEventType.DROPPED_OFF_HOME,
    channel: NotificationChannel.SMS,
    language: NotifyLanguage.RW,
    title: "Yageze aho akorera",
    body:
      "Mubyeyi, {{studentName}} yamanutse kuri {{stopName}} saa {{time}}. — {{schoolName}} | Shule+",
  },
  {
    eventType: TransportEventType.DROPPED_OFF_HOME,
    channel: NotificationChannel.APP,
    language: NotifyLanguage.EN,
    title: "Dropped off safely",
    body:
      "Your child, {{studentName}}, was dropped off at {{stopName}} at {{time}}. — {{schoolName}}",
  },
  {
    eventType: TransportEventType.TRIP_DELAY,
    channel: NotificationChannel.SMS,
    language: NotifyLanguage.EN,
    title: "Bus delayed",
    body: "School transport: {{busCode}} on {{routeName}} is delayed. — {{schoolName}} | Shule+",
  },
  {
    eventType: TransportEventType.TRIP_CANCELLED,
    channel: NotificationChannel.SMS,
    language: NotifyLanguage.EN,
    title: "Transport cancelled",
    body: "Today's transport for {{routeName}} has been cancelled. — {{schoolName}} | Shule+",
  },
  {
    eventType: TransportEventType.EXCEPTION,
    channel: NotificationChannel.APP,
    language: NotifyLanguage.EN,
    title: "Transport alert",
    body: "There is a transport exception for {{studentName}}. Please contact the school. — {{schoolName}}",
  },
  {
    eventType: TransportEventType.ROUTE_PICKUP_STARTED,
    channel: NotificationChannel.SMS,
    language: NotifyLanguage.RW,
    title: "Bisi iratangira urugendo",
    body:
      "Mwaramutse, Mubyeyi! Bisi {{busCode}} yatangiye gukurura abanyeshuri kuri {{routeName}}. Umwana wawe {{studentName}} azakorwa kuri {{stopName}} — bitegure. Saa {{time}}. — {{schoolName}} | Shule+",
  },
  {
    eventType: TransportEventType.ROUTE_PICKUP_STARTED,
    channel: NotificationChannel.APP,
    language: NotifyLanguage.EN,
    title: "School bus is on the way",
    body:
      "The bus {{busCode}} has started the morning route ({{routeName}}). Please be ready at {{stopName}} for {{studentName}}. Started at {{time}}. — {{schoolName}}",
  },
  {
    eventType: TransportEventType.ROUTE_HOME_STARTED,
    channel: NotificationChannel.SMS,
    language: NotifyLanguage.RW,
    title: "Bisi igiye mu rugo",
    body:
      "Muraho, Mubyeyi! Bisi {{busCode}} yavuye ku ishuri igiye mu rugo ({{routeName}}). Umwana wawe {{studentName}} azamanuka kuri {{stopName}} — bitegure. Saa {{time}}. — {{schoolName}} | Shule+",
  },
  {
    eventType: TransportEventType.ROUTE_HOME_STARTED,
    channel: NotificationChannel.APP,
    language: NotifyLanguage.EN,
    title: "Bus heading home",
    body:
      "The bus {{busCode}} has left school on the {{routeName}} route. Expect {{studentName}} at {{stopName}} around {{time}}. — {{schoolName}}",
  },
];

export async function ensureDefaultNotificationTemplates(organizationId: string) {
  for (const seed of DEFAULT_TRANSPORT_TEMPLATES) {
    await prisma.transportNotificationTemplate.upsert({
      where: {
        organizationId_eventType_channel_language: {
          organizationId,
          eventType: seed.eventType,
          channel: seed.channel,
          language: seed.language,
        },
      },
      update: {},
      create: {
        organizationId,
        eventType: seed.eventType,
        channel: seed.channel,
        language: seed.language,
        title: seed.title,
        body: seed.body,
      },
    });
  }
}

export async function listNotificationTemplates(organizationId: string) {
  await ensureDefaultNotificationTemplates(organizationId);
  return prisma.transportNotificationTemplate.findMany({
    where: { organizationId },
    orderBy: [{ eventType: "asc" }, { channel: "asc" }, { language: "asc" }],
  });
}

export async function updateNotificationTemplate(
  organizationId: string,
  id: string,
  body: { title?: string; body?: string; isActive?: boolean }
) {
  const row = await prisma.transportNotificationTemplate.findFirst({ where: { id, organizationId } });
  if (!row) throw new AppError(404, "Template not found");
  return prisma.transportNotificationTemplate.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.body !== undefined ? { body: body.body } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  });
}

function channelsForSettings(settings: {
  enableSms: boolean;
  enableEmail: boolean;
  enablePush: boolean;
  enableWhatsapp: boolean;
}): NotificationChannel[] {
  const channels: NotificationChannel[] = [NotificationChannel.APP];
  if (settings.enablePush) channels.push(NotificationChannel.PUSH);
  if (settings.enableEmail) channels.push(NotificationChannel.EMAIL);
  if (settings.enableSms) channels.push(NotificationChannel.SMS);
  if (settings.enableWhatsapp) channels.push(NotificationChannel.WHATSAPP);
  return [...new Set(channels)];
}

export async function queueTransportEventNotifications(params: {
  organizationId: string;
  eventType: TransportEventType;
  studentName: string;
  studentCode?: string | null;
  boardingEventId?: string;
  vars: TemplateVars;
}) {
  const settings = await loadSettings(params.organizationId);
  if (!settings.enableParentNotify) return;

  await ensureDefaultNotificationTemplates(params.organizationId);

  const language = settings.defaultNotifyLanguage ?? NotifyLanguage.RW;
  const channels = channelsForSettings(settings);

  const parents = await prisma.parentContact.findMany({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      OR: [
        ...(params.studentCode ? [{ studentCode: params.studentCode }] : []),
        { studentName: { equals: params.studentName, mode: "insensitive" as Prisma.QueryMode } },
      ],
    },
  });

  const templates = await prisma.transportNotificationTemplate.findMany({
    where: {
      organizationId: params.organizationId,
      eventType: params.eventType,
      isActive: true,
      channel: { in: channels },
      language: { in: [language, NotifyLanguage.EN] },
    },
  });

  const parentRows = parents.length ? parents : [null];

  for (const parent of parentRows) {
    for (const channel of channels) {
      if (parent) {
        if (channel === NotificationChannel.SMS && !parent.notifySms) continue;
        if (channel === NotificationChannel.EMAIL && !parent.notifyEmail) continue;
        if (channel === NotificationChannel.WHATSAPP && !parent.notifyWhatsapp) continue;
        if (channel === NotificationChannel.PUSH && !parent.notifyPush) continue;
      }

      const template =
        templates.find((t) => t.channel === channel && t.language === language) ??
        templates.find((t) => t.channel === channel && t.language === NotifyLanguage.EN);

      const title = template
        ? renderTemplate(template.title, params.vars)
        : params.eventType.replace(/_/g, " ");
      const message = template
        ? renderTemplate(template.body, params.vars)
        : `${params.studentName} — ${params.eventType}`;

      await prisma.parentNotification.create({
        data: {
          organizationId: params.organizationId,
          parentId: parent?.id,
          boardingEventId: params.boardingEventId,
          studentName: params.studentName,
          studentCode: params.studentCode,
          eventType: params.eventType,
          language,
          channel,
          title,
          message,
          status: NotificationDeliveryStatus.QUEUED,
        },
      });
    }
  }

  if (params.boardingEventId) {
    void processQueuedNotifications(params.organizationId, params.boardingEventId).catch((err) =>
      console.warn("[Transport] Notification delivery error:", err)
    );
  }
}

async function processQueuedNotifications(organizationId: string, boardingEventId: string) {
  const rows = await prisma.parentNotification.findMany({
    where: { organizationId, boardingEventId, status: NotificationDeliveryStatus.QUEUED },
    include: { parent: true },
  });
  if (!rows.length) return;

  const sample = rows[0]!;
  const inAppRow =
    rows.find((r) => r.channel === NotificationChannel.APP || r.channel === NotificationChannel.PUSH) ??
    sample;

  let inAppOk = false;
  let inAppReason: string | undefined;
  let smsAggregate: "QUEUED" | "SENT" | "FAILED" | "NONE" = rows.some((r) => r.channel === NotificationChannel.SMS)
    ? "QUEUED"
    : "NONE";

  const smsSentPhones = new Set<string>();

  for (const row of rows) {
    if (row.channel === NotificationChannel.APP || row.channel === NotificationChannel.PUSH) {
      continue;
    }

    if (row.channel !== NotificationChannel.SMS) {
      await prisma.parentNotification.update({
        where: { id: row.id },
        data: { status: NotificationDeliveryStatus.SENT, sentAt: new Date() },
      });
      continue;
    }

    const phone = row.parent?.phone?.trim();
    if (!phone) {
      await prisma.parentNotification.update({
        where: { id: row.id },
        data: {
          status: NotificationDeliveryStatus.FAILED,
          providerRef: "No parent phone on transport parent contact",
        },
      });
      continue;
    }

    const phoneKey = phone.replace(/\D/g, "");
    if (smsSentPhones.has(phoneKey)) {
      await prisma.parentNotification.update({
        where: { id: row.id },
        data: { status: NotificationDeliveryStatus.SENT, sentAt: new Date() },
      });
      continue;
    }
    smsSentPhones.add(phoneKey);

    await prisma.parentNotification.update({
      where: { id: row.id },
      data: { status: NotificationDeliveryStatus.SENDING },
    });

    let delivered = false;
    let providerRef: string | undefined;

    if (internalChatSmsClient.isEnabled()) {
      const parentCredit = await internalChatSmsClient.sendTransactionalParentSms({
        organizationId,
        parentPhone: phone,
        studentName: row.studentName,
        messageBody: row.message,
        sourceModule: "transport",
        referenceId: row.id,
      });
      delivered = parentCredit.delivered;
      if (!delivered && parentCredit.reason) providerRef = parentCredit.reason;
    } else {
      providerRef = "INTERNAL_CHAT_API_URL not configured — parent SMS packages unavailable";
    }

    if (!delivered && notificationClient.isEnabled()) {
      const res = await notificationClient.sendSms({
        to: phone,
        body: row.message,
        metadata: {
          type: "transport",
          eventType: row.eventType,
          organizationId,
          notificationId: row.id,
        },
      });
      delivered = res.delivered;
    }

    await prisma.parentNotification.update({
      where: { id: row.id },
      data: {
        status: delivered ? NotificationDeliveryStatus.SENT : NotificationDeliveryStatus.FAILED,
        sentAt: delivered ? new Date() : undefined,
        providerRef,
        retryCount: delivered ? row.retryCount : row.retryCount + 1,
      },
    });
    smsAggregate = delivered ? "SENT" : "FAILED";
  }

  if (!parentMisClient.isEnabled()) {
    inAppReason = "Parent portal API not configured (set PARENT_MIS_API_URL on Transport backend)";
  } else {
    const language = sample.language ? String(sample.language).toLowerCase() : "rw";
    const ingest = await parentMisClient.ingestTransportEvent({
      organizationId,
      studentCode: sample.studentCode,
      studentName: sample.studentName,
      title: inAppRow.title,
      body: inAppRow.message,
      eventType: sample.eventType ?? "TRANSPORT_EVENT",
      priority: sample.eventType === "EXCEPTION" ? "URGENT" : "NORMAL",
      link: "/transport",
      metadata: {
        eventId: boardingEventId,
        idempotencyKey: boardingEventId,
        boardingEventId,
        eventType: sample.eventType,
        language,
        smsStatus: smsAggregate === "NONE" ? undefined : smsAggregate,
      },
    });
    if (ingest && ingest.matched > 0) {
      inAppOk = true;
    } else if (!ingest) {
      inAppReason = "Parent portal unreachable or rejected the event";
    } else {
      inAppReason =
        (ingest as { reason?: string }).reason === "student-not-found"
          ? "Learner not found in Parent portal (check ShuleCode matches)"
          : (ingest as { reason?: string }).reason === "no-parents-linked"
            ? "No parent account linked to this learner in Parent portal"
            : `No in-app notification created (matched=${ingest.matched})`;
    }
  }

  for (const row of rows) {
    if (row.channel === NotificationChannel.APP || row.channel === NotificationChannel.PUSH) {
      await prisma.parentNotification.update({
        where: { id: row.id },
        data: {
          status: inAppOk ? NotificationDeliveryStatus.DELIVERED : NotificationDeliveryStatus.FAILED,
          sentAt: inAppOk ? new Date() : undefined,
          providerRef: inAppOk ? undefined : inAppReason,
        },
      });
    }
  }
}

export function resolveTransportEventType(
  tripDirection: "TO_SCHOOL" | "TO_HOME",
  boardingType: "BOARDING" | "EXIT"
): TransportEventType {
  if (tripDirection === "TO_SCHOOL") {
    return boardingType === "BOARDING"
      ? TransportEventType.BOARDING_TO_SCHOOL
      : TransportEventType.ARRIVED_AT_SCHOOL;
  }
  return boardingType === "BOARDING"
    ? TransportEventType.BOARDING_TO_HOME
    : TransportEventType.DROPPED_OFF_HOME;
}
