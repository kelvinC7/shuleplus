import { notificationClient } from '../clients/notification.client';
import { normalizeAfroBulkPhone } from '../clients/afrobulk-sms.client';

export function normalizePhoneNumber(phone: string): string {
  return normalizeAfroBulkPhone(phone);
}

export type SmsSendResult = {
  delivered: boolean;
  channel?: 'AfroBulkSMS' | 'NotificationService' | 'none';
  providerCode?: string;
  error?: string;
};

export async function sendSmsDetailed(to: string, body: string): Promise<SmsSendResult> {
  if (!notificationClient.isEnabled()) {
    return {
      delivered: false,
      channel: 'none',
      error: 'SMS not configured. Set SMS_API_KEY, SMS_SENDER_ID on Authentication Backend .env',
    };
  }

  const result = await notificationClient.sendSms({
    to,
    body,
    metadata: { type: 'transactional' },
  });

  if (result?.delivered) {
    return {
      delivered: true,
      channel: result.id === 'afrobulk' ? 'AfroBulkSMS' : 'NotificationService',
      providerCode: (result as { providerCode?: string }).providerCode,
    };
  }

  return {
    delivered: false,
    channel: 'none',
    error: 'SMS provider did not confirm delivery. Check auth-api logs and AfroBulk balance.',
  };
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  const result = await sendSmsDetailed(to, body);
  if (!result.delivered) {
    console.warn(`[SMS] Not delivered to ${to}: ${result.error ?? 'unknown'}`);
  }
  return result.delivered;
}

export async function sendOtpSms(to: string, otp: string): Promise<boolean> {
  return sendSms(
    to,
    `Your ShulePlus verification code is ${otp}. It expires in 10 minutes. Do not share this code.`
  );
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `***${digits.slice(-4)}`;
}
