import { NotificationChannel } from '@prisma/client';
import { prisma } from '../config/database';

const DEFAULT_TEMPLATES = [
  {
    slug: 'admin-invitation',
    name: 'Platform Administrator Invitation',
    channel: NotificationChannel.EMAIL,
    subject: 'ShulePlus — You have been invited',
    bodyHtml: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <div style="background:#000435;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <h2 style="color:#FCB038;margin:0;">ShulePlus Platform</h2>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:28px;">
        <p>Hello {{name}},</p>
        <p>You have been invited as <strong>{{role}}</strong>.</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="{{inviteUrl}}" style="background:#FCB038;color:#000435;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:10px;display:inline-block;">Accept Invitation</a>
        </p>
      </div>
    </div>`,
    variables: ['name', 'role', 'inviteUrl'],
  },
  {
    slug: 'fee-receipt',
    name: 'Fee Receipt',
    channel: NotificationChannel.EMAIL,
    subject: 'ShulePlus — Fee Receipt for {{studentName}}',
    bodyHtml: `<p>Dear {{parentName}},</p><p>We received <strong>{{amount}}</strong> for {{studentName}} ({{receiptNo}}).</p>`,
    variables: ['parentName', 'studentName', 'amount', 'receiptNo'],
  },
  {
    slug: 'mfa-otp',
    name: 'MFA OTP',
    channel: NotificationChannel.EMAIL,
    subject: 'ShulePlus — Your verification code',
    bodyHtml: `<p>Hello {{name}}, your code is <strong>{{code}}</strong></p>`,
    variables: ['name', 'code'],
  },
  {
    slug: 'developer-activation',
    name: 'Developer Portal Activation',
    channel: NotificationChannel.EMAIL,
    subject: 'Activate your ShulePlus Developer Portal access',
    bodyHtml: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <div style="background:#000435;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <h2 style="color:#FCB038;margin:0;">ShulePlus Developer Portal</h2>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:28px;">
        <p>Hello {{name}},</p>
        <p>You have been granted <strong>{{accessType}}</strong> access for <strong>{{partnerName}}</strong>.</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="{{activationUrl}}" style="background:#FCB038;color:#000435;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:10px;display:inline-block;">Activate Developer Access</a>
        </p>
        <p style="color:#64748b;font-size:13px;">This link expires in 72 hours.</p>
      </div>
    </div>`,
    variables: ['name', 'partnerName', 'activationUrl', 'accessType'],
  },
];

export async function seedDefaultTemplates() {
  for (const tpl of DEFAULT_TEMPLATES) {
    await prisma.notificationTemplate.upsert({
      where: { slug: tpl.slug },
      create: tpl,
      update: { name: tpl.name, subject: tpl.subject, bodyHtml: tpl.bodyHtml, variables: tpl.variables },
    });
  }
  console.log('[Seed] Default notification templates ready');
}
