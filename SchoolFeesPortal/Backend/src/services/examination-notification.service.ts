import { env } from '../config/env';
import { notificationClient } from '../clients/notification.client';
import { parentMisClient } from '../clients/parent-mis.client';
import { studentManagementClient } from '../clients/student-management.client';
import { examinationEligibilityService } from './examination-eligibility.service';

type NotifyParams = {
  academicYear: string;
  term: string;
  className: string;
  examName?: string;
  onlyBlocked?: boolean;
  studentIds?: string[];
  channels?: { sms?: boolean; email?: boolean; push?: boolean; inApp?: boolean };
};

function money(n: number) {
  return `${Math.round(n).toLocaleString()} RWF`;
}

export const examinationNotificationService = {
  async notifyParents(organizationId: string, params: NotifyParams) {
    const examName = params.examName?.trim() || 'End of Term Examination';
    const preview = await examinationEligibilityService.preview(organizationId, {
      academicYear: params.academicYear,
      term: params.term,
      className: params.className,
      examName,
    });

    const targets = preview.students.filter((s) => {
      if (params.studentIds?.length) return params.studentIds.includes(s.studentId);
      if (params.onlyBlocked) return !s.allowed;
      return true;
    });

    const channels = {
      sms: params.channels?.sms !== false,
      email: params.channels?.email !== false,
      push: params.channels?.push !== false,
      inApp: params.channels?.inApp !== false,
    };

    const payLink = env.PAYMENT_PORTAL_URL;
    let parentsNotified = 0;
    let smsSent = 0;
    let emailSent = 0;
    let pushSent = 0;
    let inAppSent = 0;

    for (const student of targets) {
      const parents = await studentManagementClient.parentsForStudent(organizationId, student.studentId);
      if (!parents.length) continue;

      const allowed = student.allowed;
      const title = allowed
        ? `${student.studentName} is allowed to sit ${examName}`
        : `${student.studentName} is not allowed to sit ${examName}`;
      const body = allowed
        ? `${student.studentName} (${student.className}) is ALLOWED to enter ${examName} · ${params.term} ${params.academicYear}.`
        : `${student.studentName} (${student.className}) is NOT ALLOWED to enter ${examName} because of outstanding fees of ${money(student.balance)}. Please pay or contact the school office. ${payLink}`;
      const smsBody = allowed
        ? `Shule+: ${student.studentName} is ALLOWED to sit ${examName} (${student.className}).`
        : `Shule+: ${student.studentName} is NOT ALLOWED to sit ${examName}. Balance ${money(student.balance)}. Pay: ${payLink}`;

      for (const parent of parents) {
        parentsNotified += 1;

        if (channels.inApp) {
          const inApp = await parentMisClient.ingestExamEvent({
            organizationId,
            studentCode: student.studentCode,
            studentId: student.studentId,
            studentName: student.studentName,
            title,
            body,
            eventType: allowed ? 'EXAM_ALLOWED' : 'EXAM_NOT_ALLOWED',
            priority: allowed ? 'NORMAL' : 'URGENT',
            link: '/exams',
            metadata: {
              examName,
              className: student.className,
              balance: student.balance,
              allowed,
            },
          });
          if (inApp) inAppSent += 1;
        }

        if (channels.email && parent.email) {
          const sent = await notificationClient.sendEmail({
            to: parent.email,
            subject: title,
            text: `Dear ${parent.fullName},\n\n${body}\n\nSchool Fees Office`,
            html: `<p>Dear ${parent.fullName},</p><p>${body}</p><p>School Fees Office</p>`,
            metadata: { event: allowed ? 'EXAM_ALLOWED' : 'EXAM_NOT_ALLOWED', studentId: student.studentId },
          });
          if (sent) emailSent += 1;
        }

        if (channels.push && parent.id) {
          const sent = await notificationClient.sendPush({
            userId: parent.id,
            title,
            body: allowed ? body : `${student.studentName} cannot sit ${examName}. Balance ${money(student.balance)}.`,
            data: { type: 'exam_eligibility', studentId: student.studentId, allowed: String(allowed) },
          });
          if (sent) pushSent += 1;
        }

        if (channels.sms && parent.phone && parent.smsEnabled) {
          const sent = await notificationClient.sendSms({
            to: parent.phone,
            body: smsBody,
            metadata: { event: allowed ? 'EXAM_ALLOWED' : 'EXAM_NOT_ALLOWED', studentId: student.studentId },
          });
          if (sent) smsSent += 1;
        }
      }
    }

    return {
      students: targets.length,
      blocked: targets.filter((s) => !s.allowed).length,
      allowed: targets.filter((s) => s.allowed).length,
      parentsNotified,
      channels: { inApp: inAppSent, email: emailSent, push: pushSent, sms: smsSent },
    };
  },
};
