import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { sendAfroBulkSms, isAfroBulkConfigured } from '../clients/afrobulk-sms.client';
import { normalizePhoneNumber } from '../utils/sms';

function createTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

export async function dispatchIamEmail(params: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<{ id: string; delivered: boolean }> {
  const transporter = createTransporter();
  if (!transporter) {
    console.log('\n========================================');
    console.log(`[DEV EMAIL] to ${params.to}`);
    console.log(`Subject: ${params.subject}`);
    console.log('========================================\n');
    return { id: `email-${Date.now()}`, delivered: false };
  }

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
  return { id: `email-${Date.now()}`, delivered: true };
}

export async function dispatchIamSms(params: {
  to: string;
  body: string;
}): Promise<{ id: string; delivered: boolean }> {
  const normalized = normalizePhoneNumber(params.to);
  if (!isAfroBulkConfigured()) {
    return { id: `sms-${Date.now()}`, delivered: false };
  }
  const result = await sendAfroBulkSms(normalized, params.body);
  return { id: `sms-${Date.now()}`, delivered: result.delivered };
}
