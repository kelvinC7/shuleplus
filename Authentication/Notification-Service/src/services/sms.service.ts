import { NotificationChannel } from '@prisma/client';
import { env } from '../config/env';
import { logService } from './log.service';

function normalizeNumber(phone: string): string {
  const trimmed = phone.trim().replace(/\s+/g, '');
  if (trimmed.startsWith('+')) return trimmed.slice(1);
  if (trimmed.startsWith('0')) return `25${trimmed}`;
  return trimmed;
}

export const smsService = {
  async send(params: {
    sourceService: string;
    to: string;
    body: string;
    templateSlug?: string;
    metadata?: Record<string, unknown>;
  }) {
    const log = await logService.create({
      sourceService: params.sourceService,
      channel: NotificationChannel.SMS,
      recipient: params.to,
      body: params.body,
      templateSlug: params.templateSlug,
      metadata: params.metadata,
    });

    if (!env.SMS_API_URL || !env.SMS_API_KEY) {
      console.log(`\n[DEV SMS] to ${params.to}\n${params.body}\n`);
      await logService.markSent(log.id);
      return { id: log.id, delivered: false, devMode: true };
    }

    const url = new URL(env.SMS_API_URL);
    url.searchParams.set('api_key', env.SMS_API_KEY);
    url.searchParams.set('from_type', 'sender_id');
    if (env.SMS_FROM_NUMBER) url.searchParams.set('from_number', env.SMS_FROM_NUMBER);
    url.searchParams.set('sender_id', env.SMS_SENDER_ID);
    url.searchParams.set('to_numbers', normalizeNumber(params.to));
    url.searchParams.set('body', params.body);

    try {
      const res = await fetch(url.toString());
      const text = await res.text();
      if (!res.ok) {
        await logService.markFailed(log.id, text);
        throw new Error(`SMS failed: ${text}`);
      }

      // AfroBulkSMS returns JSON like {"response":"1000"} on success; other codes are failures.
      let providerCode = '';
      try {
        const parsed = JSON.parse(text) as { response?: string | number };
        providerCode = String(parsed.response ?? '').trim();
      } catch {
        providerCode = text.trim();
      }

      // AfroBulkSMS: 1000-1003 success; 1016 also delivers on Rwanda routes for this account
      const okCodes = new Set(['1000', '1001', '1002', '1003', '1016', 'OK', 'SUCCESS']);
      if (providerCode && !okCodes.has(providerCode.toUpperCase()) && !okCodes.has(providerCode)) {
        await logService.markFailed(log.id, text);
        throw new Error(`SMS provider rejected send (code ${providerCode})`);
      }

      await logService.markSent(log.id);
      return { id: log.id, delivered: true, providerCode: providerCode || undefined };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'SMS send failed';
      if (!(err instanceof Error && err.message.startsWith('SMS failed')) &&
          !(err instanceof Error && err.message.startsWith('SMS provider'))) {
        await logService.markFailed(log.id, message);
      }
      throw err;
    }
  },
};
