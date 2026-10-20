import { fetchSmParents, type SmParent } from '../clients/student-management.client';
import { notificationClient } from '../clients/notification.client';
import { env } from '../config/env';

export type DisciplineCaseNotifyPayload = {
  id: string;
  caseNumber: string;
  studentId: string;
  studentName: string;
  studentCode?: string | null;
  className: string;
  markName: string;
  appliedPoints: number;
  scoreBefore?: number | null;
  scoreAfter?: number | null;
  incidentDate: Date;
  description?: string | null;
};

function normalizeMethods(methods: string[]) {
  const set = new Set(methods.map((m) => m.trim().toLowerCase()));
  return {
    sms: set.has('sms'),
    email: set.has('email'),
    inApp: set.has('inapp') || set.has('in-app') || set.has('app'),
    webPush: set.has('webpush') || set.has('web push') || set.has('push'),
  };
}

function formatPoints(points: number) {
  return points > 0 ? `+${points}` : `${points}`;
}

function formatDateRw(date: Date) {
  return date.toLocaleDateString('rw-RW', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildSmsBodyRw(parentName: string, payload: DisciplineCaseNotifyPayload) {
  const dateStr = formatDateRw(payload.incidentDate);
  return (
    `Mubyeyi ${parentName}, ikibazo cy'imyitwarire (${payload.markName}) cyanditswe kuri ${payload.studentName} ` +
    `ku itariki ${dateStr}. Amanota: ${formatPoints(payload.appliedPoints)}. ` +
    `Amanota y'imyitwarire: ${payload.scoreAfter ?? '—'}/100. Nomero: ${payload.caseNumber}.`
  );
}

function buildSmsBody(parentName: string, payload: DisciplineCaseNotifyPayload) {
  const dateStr = payload.incidentDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return (
    `Dear ${parentName}, a discipline case (${payload.markName}) was recorded for ${payload.studentName} ` +
    `on ${dateStr}. Points: ${formatPoints(payload.appliedPoints)}. ` +
    `Discipline score: ${payload.scoreAfter ?? '—'}/100. Case ref: ${payload.caseNumber}.`
  );
}

function buildSmsBodyBilingual(parentName: string, payload: DisciplineCaseNotifyPayload) {
  return `${buildSmsBodyRw(parentName, payload)}\n\n${buildSmsBody(parentName, payload)}`;
}

function buildEmailContent(parentName: string, payload: DisciplineCaseNotifyPayload) {
  const dateStr = payload.incidentDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const dateStrRw = payload.incidentDate.toLocaleDateString('rw-RW', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const subject = `Itangazo ry'imyitwarire / Discipline notice — ${payload.studentName} (${payload.caseNumber})`;
  const text =
    `Mubyeyi ${parentName},\n\n` +
    `Ikibazo cy'imyitwarire cyanditswe ku mwana wawe ${payload.studentName} (${payload.studentCode ?? '—'}).\n` +
    `Ubwoko: ${payload.markName}\nNomero: ${payload.caseNumber}\nIshuri / Class: ${payload.className}\nItariki: ${dateStrRw}\n` +
    `Amanota: ${formatPoints(payload.appliedPoints)}\nAmanota y'imyitwarire: ${payload.scoreBefore ?? '—'} → ${payload.scoreAfter ?? '—'} / 100\n\n` +
    `--- English ---\n\nDear ${parentName},\n\n` +
    `A discipline case has been recorded for your child ${payload.studentName} (${payload.studentCode ?? '—'}).\n\n` +
    `Case: ${payload.markName}\nReference: ${payload.caseNumber}\nClass: ${payload.className}\nDate: ${dateStr}\n` +
    `Points applied: ${formatPoints(payload.appliedPoints)}\nDiscipline score: ${payload.scoreBefore ?? '—'} → ${payload.scoreAfter ?? '—'} / 100\n\n` +
    (payload.description ? `Details / Ibisobanuro:\n${payload.description}\n\n` : '') +
    `Hamagara ishuri niba ufite ibibazo. / Please contact the school if you have questions.\n\nShulePlus`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="color:#000435;margin-bottom:4px">Itangazo ry'imyitwarire</h2>
      <h3 style="color:#FCB038;margin-top:0;font-size:15px">Discipline case recorded</h3>
      <p>Mubyeyi <strong>${parentName}</strong>,</p>
      <p>Ikibazo cy'imyitwarire cyanditswe ku mwana wawe <strong>${payload.studentName}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px">
        <tr><td style="padding:6px 0;color:#64748b">Ubwoko / Case</td><td><strong>${payload.markName}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Nomero / Ref</td><td>${payload.caseNumber}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Ishuri / Class</td><td>${payload.className}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Itariki / Date</td><td>${dateStrRw} · ${dateStr}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Amanota / Points</td><td><strong>${formatPoints(payload.appliedPoints)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Score</td><td>${payload.scoreBefore ?? '—'} → ${payload.scoreAfter ?? '—'} / 100</td></tr>
      </table>
      ${payload.description ? `<p style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0">${payload.description}</p>` : ''}
      <p style="color:#64748b;font-size:13px">Hamagara ishuri niba ufite ibibazo. / Please contact the school if you have questions.</p>
    </div>`;

  return { subject, text, html };
}

function buildInAppBody(payload: DisciplineCaseNotifyPayload) {
  return (
    `[KR] Ikibazo ${payload.markName} cyanditswe kuri ${payload.studentName}. Amanota: ${formatPoints(payload.appliedPoints)}. ` +
    `Score: ${payload.scoreAfter ?? '—'}/100. ` +
    `[EN] A ${payload.markName} case was recorded for ${payload.studentName}. Points: ${formatPoints(payload.appliedPoints)}.`
  );
}

function parentDisplayName(parent: SmParent) {
  return parent.fullName || [parent.firstName, parent.lastName].filter(Boolean).join(' ').trim() || 'Parent/Guardian';
}

async function notifyParent(
  parent: SmParent,
  payload: DisciplineCaseNotifyPayload,
  channels: ReturnType<typeof normalizeMethods>
) {
  const name = parentDisplayName(parent);
  const results: Record<string, boolean> = {};
  const actionUrl = `${env.CORS_ORIGIN.replace(/\/$/, '')}/discipline/${payload.id}`;
  const title = `Discipline case — ${payload.studentName}`;

  if (channels.sms && parent.phone && parent.smsEnabled !== false) {
    const res = await notificationClient.sendSms({
      to: parent.phone,
      body: buildSmsBodyBilingual(name, payload),
      metadata: {
        type: 'discipline_case',
        caseId: payload.id,
        caseNumber: payload.caseNumber,
        studentId: payload.studentId,
        parentId: parent.id,
      },
    });
    results.sms = Boolean(res?.delivered ?? res?.id);
  }

  if (channels.email && parent.email) {
    const { subject, text, html } = buildEmailContent(name, payload);
    const res = await notificationClient.sendEmail({
      to: parent.email,
      subject,
      text,
      html,
      metadata: {
        type: 'discipline_case',
        caseId: payload.id,
        caseNumber: payload.caseNumber,
        studentId: payload.studentId,
        parentId: parent.id,
      },
    });
    results.email = Boolean(res?.delivered ?? res?.id);
  }

  if (channels.inApp) {
    const res = await notificationClient.sendInApp({
      userId: parent.id,
      title,
      body: buildInAppBody(payload),
      priority: Math.abs(payload.appliedPoints) >= 8 ? 'HIGH' : 'NORMAL',
      actionUrl,
      metadata: {
        type: 'discipline_case',
        caseId: payload.id,
        caseNumber: payload.caseNumber,
        studentId: payload.studentId,
        parentId: parent.id,
      },
    });
    results.inApp = Boolean(res?.delivered ?? res?.id);
  }

  if (channels.webPush) {
    const res = await notificationClient.sendPush({
      userId: parent.id,
      title,
      body: buildInAppBody(payload),
      data: {
        type: 'discipline_case',
        caseId: payload.id,
        caseNumber: payload.caseNumber,
        studentId: payload.studentId,
        actionUrl,
      },
    });
    results.webPush = Boolean(res?.delivered ?? res?.id);
  }

  return results;
}

export const parentNotificationService = {
  async notifyDisciplineCase(
    organizationId: string,
    payload: DisciplineCaseNotifyPayload,
    notifyMethods: string[]
  ) {
    const channels = normalizeMethods(notifyMethods);
    if (!channels.sms && !channels.email && !channels.inApp && !channels.webPush) {
      return { sent: 0, skipped: true, reason: 'no_channels' as const };
    }

    if (!notificationClient.isEnabled()) {
      console.warn('[Discipline] Notification service not configured — skipping parent notify');
      return { sent: 0, skipped: true, reason: 'notification_disabled' as const };
    }

    const parents = await fetchSmParents(organizationId, payload.studentId);
    if (!parents.length) {
      console.warn(`[Discipline] No parents linked to student ${payload.studentId}`);
      return { sent: 0, skipped: true, reason: 'no_parents' as const, parents: [] as SmParent[] };
    }

    const deliveries: Array<{ parentId: string; channels: Record<string, boolean> }> = [];
    for (const parent of parents) {
      const channelResults = await notifyParent(parent, payload, channels);
      deliveries.push({ parentId: parent.id, channels: channelResults });
    }

    const sent = deliveries.reduce(
      (sum, d) => sum + Object.values(d.channels).filter(Boolean).length,
      0
    );

    return { sent, skipped: false, parents: parents.length, deliveries };
  },
};
