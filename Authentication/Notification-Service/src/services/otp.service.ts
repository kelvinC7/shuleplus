import crypto from 'crypto';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { getRedis } from '../config/redis';
import { env } from '../config/env';
import { emailService } from './email.service';
import { smsService } from './sms.service';
import { logService } from './log.service';

function otpKey(purpose: string, recipient: string) {
  return `notification:otp:${purpose}:${recipient.toLowerCase()}`;
}

export const otpService = {
  async send(params: {
    sourceService: string;
    purpose: string;
    recipient: string;
    channel: 'email' | 'sms' | 'both';
    name?: string;
    metadata?: Record<string, unknown>;
  }) {
    const code = crypto.randomInt(100000, 999999).toString();
    const redis = getRedis();
    await redis.setex(otpKey(params.purpose, params.recipient), env.OTP_TTL_SECONDS, code);

    const results: Record<string, unknown> = { expiresInSeconds: env.OTP_TTL_SECONDS };

    if (params.channel === 'email' || params.channel === 'both') {
      const name = params.name ?? 'User';
      results.email = await emailService.send({
        sourceService: params.sourceService,
        to: params.recipient,
        subject: 'ShulePlus — Your verification code',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#000435;">ShulePlus Security</h2>
            <p>Hello ${name},</p>
            <p>Your verification code is:</p>
            <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#FCB038;background:#000435;padding:16px 24px;border-radius:8px;display:inline-block;">${code}</p>
            <p style="color:#64748b;font-size:13px;">Expires in ${Math.floor(env.OTP_TTL_SECONDS / 60)} minutes.</p>
          </div>`,
        metadata: { purpose: params.purpose, type: 'otp', ...params.metadata },
      });
    }

    if (params.channel === 'sms' || params.channel === 'both') {
      results.sms = await smsService.send({
        sourceService: params.sourceService,
        to: params.recipient,
        body: `Your ShulePlus verification code is ${code}. Expires in ${Math.floor(env.OTP_TTL_SECONDS / 60)} minutes.`,
        metadata: { purpose: params.purpose, type: 'otp', ...params.metadata },
      });
    }

    await logService.create({
      sourceService: params.sourceService,
      channel: NotificationChannel.EMAIL,
      recipient: params.recipient,
      body: '[OTP REDACTED]',
      templateSlug: 'otp',
      metadata: { purpose: params.purpose, channel: params.channel },
      sentAt: new Date(),
      status: NotificationStatus.SENT,
    });

    return results;
  },

  async verify(purpose: string, recipient: string, code: string) {
    const redis = getRedis();
    const stored = await redis.get(otpKey(purpose, recipient.toLowerCase()));
    if (!stored) return { valid: false, reason: 'expired' };
    if (stored !== code) return { valid: false, reason: 'invalid' };
    await redis.del(otpKey(purpose, recipient.toLowerCase()));
    return { valid: true };
  },
};
