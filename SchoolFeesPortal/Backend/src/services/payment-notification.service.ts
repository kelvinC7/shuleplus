import { env, receiptPublicUrl } from '../config/env';
import { notificationClient } from '../clients/notification.client';
import { parentMisClient } from '../clients/parent-mis.client';
import { studentManagementClient } from '../clients/student-management.client';

function money(n: number) {
  return `${Math.round(n).toLocaleString()} RWF`;
}

export type PaymentNotifyInput = {
  studentId: string;
  studentCode?: string | null;
  studentName: string;
  className?: string | null;
  academicYear?: string | null;
  term?: string | null;
  amount: number;
  previousBalance: number;
  remainingBalance: number;
  method: string;
  paymentId: string;
  paymentNumber: string;
  receiptNumber: string;
  paidAt?: Date;
  recordedBy?: string | null;
};

export const paymentNotificationService = {
  async notifyPayment(organizationId: string, input: PaymentNotifyInput) {
    const studentCode = (input.studentCode || input.studentId).trim();
    const receiptUrl = receiptPublicUrl(input.receiptNumber);
    const txnLink = `/transactions?id=${encodeURIComponent(input.paymentId)}`;
    const amount = money(input.amount);
    const remaining = money(input.remainingBalance);
    const title = 'Payment Received';
    const body = `Your payment of ${amount} for ${input.studentName} has been successfully recorded.\n\nRemaining balance: ${remaining}`;
    const pushBody = `${amount} has been received for ${input.studentName}. Remaining balance: ${remaining}.`;
    const receiptTitle = 'Receipt Ready';
    const receiptBody = `Your receipt ${input.receiptNumber} is ready to download.`;

    const parents = await studentManagementClient.parentsForStudent(organizationId, input.studentId);
    const extra = studentCode !== input.studentId
      ? await studentManagementClient.parentsForStudent(organizationId, studentCode)
      : [];
    const unique = new Map<string, (typeof parents)[number]>();
    for (const parent of [...parents, ...extra]) unique.set(parent.id, parent);

    const metadata = {
      event: 'PAYMENT_SUCCESSFUL',
      paymentId: input.paymentId,
      transactionId: input.paymentNumber,
      receiptNumber: input.receiptNumber,
      receiptUrl,
      amount: input.amount,
      previousBalance: input.previousBalance,
      remainingBalance: input.remainingBalance,
      method: input.method,
      className: input.className,
      academicYear: input.academicYear,
      term: input.term,
      paidAt: (input.paidAt ?? new Date()).toISOString(),
      recordedBy: input.recordedBy || 'School Finance Office',
    };

    await parentMisClient.ingestFeeEvent({
      organizationId,
      studentCode,
      studentId: input.studentId,
      studentName: input.studentName,
      title,
      body,
      eventType: 'PAYMENT_SUCCESSFUL',
      priority: 'NORMAL',
      link: txnLink,
      metadata,
    });

    await parentMisClient.ingestFeeEvent({
      organizationId,
      studentCode,
      studentId: input.studentId,
      studentName: input.studentName,
      title: receiptTitle,
      body: receiptBody,
      eventType: 'RECEIPT_GENERATED',
      priority: 'NORMAL',
      link: txnLink,
      metadata: { ...metadata, event: 'RECEIPT_GENERATED' },
    });

    for (const parent of unique.values()) {
      if (parent.email) {
        void notificationClient.sendEmail({
          to: parent.email,
          subject: `${title} — ${input.studentName}`,
          text: `Dear ${parent.fullName},\n\n${body}\n\nReceipt: ${receiptUrl}\nView: ${env.PAYMENT_PORTAL_URL}\n\nSchool Fees Office`,
          html: `<p>Dear ${parent.fullName},</p><p>${body.replace(/\n/g, '<br/>')}</p><p><a href="${receiptUrl}">View receipt ${input.receiptNumber}</a></p>`,
          metadata: { event: 'PAYMENT_SUCCESSFUL', paymentId: input.paymentId },
        });
      }
      if (parent.id) {
        void notificationClient.sendPush({
          userId: parent.id,
          title: 'Payment Successful',
          body: pushBody,
          data: { type: 'PAYMENT_SUCCESSFUL', link: txnLink, paymentId: input.paymentId },
        });
      }
      if (parent.phone && parent.smsEnabled) {
        void notificationClient.sendSms({
          to: parent.phone,
          body: `Shule+: ${amount} received for ${input.studentName}. Receipt ${input.receiptNumber}. Remaining ${remaining}.`,
          metadata: { event: 'PAYMENT_SUCCESSFUL', paymentId: input.paymentId },
        });
      }
    }

    return { parents: unique.size, receiptUrl, link: txnLink };
  },
};
