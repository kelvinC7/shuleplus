import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { notificationClient } from '../clients/notification.client';

export type EmailDeliveryResult = {
  delivered: boolean;
  channel: 'notification' | 'smtp' | 'none';
  devMode?: boolean;
};

function createTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export async function sendOtpEmail(to: string, otp: string, name: string): Promise<boolean> {
  const subject = 'ShulePlus — Your verification code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #000435;">ShulePlus Security</h2>
      <p>Hello ${name},</p>
      <p>Your one-time verification code is:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #FCB038; background: #000435; padding: 16px 24px; border-radius: 8px; display: inline-block;">${otp}</p>
      <p style="color: #64748b; font-size: 13px;">This code expires in 10 minutes. If you did not request this, ignore this email.</p>
    </div>
  `;

  if (notificationClient.isEnabled()) {
    const result = await notificationClient.sendEmail({
      to,
      subject,
      html,
      templateSlug: 'mfa-otp',
      templateVariables: { name, code: otp },
      metadata: { type: 'mfa_otp' },
    });
    if (result?.delivered) return true;
  }

  const transporter = createTransporter();

  if (!transporter) {
    console.log('\n========================================');
    console.log(`[DEV EMAIL] MFA OTP for ${to}`);
    console.log(`Code: ${otp}`);
    console.log('========================================\n');
    return false;
  }

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('[EMAIL] Send failed, falling back to console:', err);
    console.log('\n========================================');
    console.log(`[DEV EMAIL] MFA OTP for ${to}`);
    console.log(`Code: ${otp}`);
    console.log('========================================\n');
    return false;
  }
}

export async function sendPasswordResetOtpEmail(
  to: string,
  otp: string,
  name: string
): Promise<boolean> {
  const subject = 'ShulePlus — Password reset code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #000435;">Reset your password</h2>
      <p>Hello ${name},</p>
      <p>Use this one-time code to reset your password on Shule Ticha:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #FCB038; background: #000435; padding: 16px 24px; border-radius: 8px; display: inline-block;">${otp}</p>
      <p style="color: #64748b; font-size: 13px;">This code expires in 10 minutes. If you did not request a reset, ignore this email.</p>
    </div>
  `;

  if (notificationClient.isEnabled()) {
    const result = await notificationClient.sendEmail({
      to,
      subject,
      html,
      templateSlug: 'password-reset-otp',
      templateVariables: { name, code: otp },
      metadata: { type: 'password_reset_otp' },
    });
    if (result?.delivered) return true;
  }

  const transporter = createTransporter();

  if (!transporter) {
    console.log('\n========================================');
    console.log(`[DEV EMAIL] Password reset OTP for ${to}`);
    console.log(`Code: ${otp}`);
    console.log('========================================\n');
    return false;
  }

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('[EMAIL] Password reset OTP send failed, falling back to console:', err);
    console.log('\n========================================');
    console.log(`[DEV EMAIL] Password reset OTP for ${to}`);
    console.log(`Code: ${otp}`);
    console.log('========================================\n');
    return false;
  }
}

export async function sendInvitationEmail(params: {
  to: string;
  name: string;
  inviteUrl: string;
  role: string;
  invitedBy?: string;
}): Promise<boolean> {
  const { to, name, inviteUrl, role, invitedBy } = params;
  const roleLabel = role.replace(/_/g, ' ');
  const subject = `Complete your ShulePlus ${roleLabel} account setup`;
  const invitedByLine = invitedBy ? `${invitedBy} invited you` : 'You have been invited';

  const text = [
    `Hello ${name},`,
    '',
    `${invitedByLine} to join ShulePlus as ${roleLabel}.`,
    '',
    'To finish setup, open this link in your browser:',
    inviteUrl,
    '',
    'You will set your password and enable multi-factor authentication.',
    'This link expires in 7 days.',
    '',
    'If you did not expect this email, you can ignore it.',
    '',
    '— ShulePlus Platform Team',
  ].join('\n');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:#000435;padding:24px;text-align:center;">
          <h1 style="color:#FCB038;margin:0;font-size:22px;">ShulePlus Platform</h1>
        </div>
        <div style="padding:28px;color:#0f172a;">
          <p style="font-size:15px;line-height:1.6;">Hello ${name},</p>
          <p style="font-size:15px;line-height:1.6;">
            ${invitedByLine} to join the ShulePlus platform as <strong>${roleLabel}</strong>.
          </p>
          <p style="font-size:15px;line-height:1.6;">
            Use the button below to finish your account setup — set your password and enable multi-factor authentication.
          </p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${inviteUrl}" style="background:#FCB038;color:#000435;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:10px;display:inline-block;">
              Complete Setup
            </a>
          </p>
          <p style="color:#64748b;font-size:13px;line-height:1.5;">Or copy this link:</p>
          <p style="word-break:break-all;font-size:12px;color:#475569;line-height:1.5;">${inviteUrl}</p>
          <p style="color:#64748b;font-size:13px;margin-top:20px;line-height:1.5;">
            This link expires in 7 days. If you did not expect this message, you can safely ignore it.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: env.SMTP_FROM,
    to,
    subject,
    text,
    html,
    replyTo: env.SMTP_USER || undefined,
    headers: {
      'X-Mailer': 'ShulePlus-IAM',
      'X-Priority': '3',
    },
  };

  if (notificationClient.isEnabled()) {
    const result = await notificationClient.sendEmail({
      to,
      subject,
      html,
      text,
      templateSlug: 'admin-invitation',
      templateVariables: { name, role: roleLabel, inviteUrl },
      metadata: { role, invitedBy, type: 'admin_invitation' },
    });
    if (result?.delivered) return true;
  }

  const transporter = createTransporter();

  if (!transporter) {
    console.log('\n========================================');
    console.log(`[DEV EMAIL] Admin invitation for ${to}`);
    console.log(`Accept link: ${inviteUrl}`);
    console.log('========================================\n');
    return false;
  }

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('[EMAIL] Invitation send failed, falling back to console:', err);
    console.log('\n========================================');
    console.log(`[DEV EMAIL] Admin invitation for ${to}`);
    console.log(`Accept link: ${inviteUrl}`);
    console.log('========================================\n');
    return false;
  }
}

export async function sendDeveloperActivationEmail(params: {
  to: string;
  name: string;
  partnerName: string;
  activationUrl: string;
  accessType: string;
}): Promise<EmailDeliveryResult> {
  const { to, name, partnerName, activationUrl, accessType } = params;
  const accessLabel = accessType.replace(/_/g, ' ');
  const subject = 'You have been granted access to the ShulePlus Developer Portal';

  const text = [
    `Hello ${name},`,
    '',
    `You have been granted ${accessLabel} access to the ShulePlus Developer Portal for ${partnerName}.`,
    '',
    'Activate your account using this one-time link:',
    activationUrl,
    '',
    'You will create your password, set up multi-factor authentication, and receive backup recovery codes.',
    'This link expires in 72 hours.',
    '',
    'If you did not expect this email, contact your ShulePlus administrator.',
    '',
    '— ShulePlus Developer Portal',
  ].join('\n');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:#000435;padding:24px;text-align:center;">
          <h1 style="color:#FCB038;margin:0;font-size:20px;">ShulePlus Developer Portal</h1>
        </div>
        <div style="padding:28px;color:#0f172a;">
          <p style="font-size:15px;line-height:1.6;">Hello ${name},</p>
          <p style="font-size:15px;line-height:1.6;">
            You have been granted <strong>${accessLabel}</strong> access for
            <strong>${partnerName}</strong> on the ShulePlus Developer Portal.
          </p>
          <p style="font-size:15px;line-height:1.6;">
            No password has been set for you. Use the secure link below to activate your account,
            create a strong password, and configure multi-factor authentication.
          </p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${activationUrl}" style="background:#FCB038;color:#000435;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:10px;display:inline-block;">
              Activate Developer Access
            </a>
          </p>
          <p style="color:#64748b;font-size:13px;line-height:1.5;word-break:break-all;">
            Or copy this link:<br />
            <span style="color:#475569;">${activationUrl}</span>
          </p>
          <p style="color:#64748b;font-size:13px;margin-top:20px;line-height:1.5;">
            🔒 This link expires in 72 hours and can only be used once.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (notificationClient.isEnabled()) {
    const result = await notificationClient.sendEmail({
      to,
      subject,
      html,
      text,
      templateSlug: 'developer-activation',
      templateVariables: { name, partnerName, activationUrl, accessType: accessLabel },
      metadata: { type: 'developer_activation', partnerName },
    });
    if (result?.delivered) {
      return { delivered: true, channel: 'notification' };
    }
    if ((result as { devMode?: boolean } | undefined)?.devMode) {
      console.log(
        `[EMAIL] Notification service has no SMTP — falling back to IAM for developer activation (${to})`
      );
    }
  }

  const transporter = createTransporter();
  if (!transporter) {
    console.log('\n========================================');
    console.log(`[DEV EMAIL] Developer activation for ${to}`);
    console.log(`Partner: ${partnerName}`);
    console.log(`Activation link: ${activationUrl}`);
    console.log('========================================\n');
    return { delivered: false, channel: 'none', devMode: true };
  }

  try {
    await transporter.sendMail({ from: env.SMTP_FROM, to, subject, text, html });
    console.log(`[EMAIL] Developer activation sent via SMTP to ${to}`);
    return { delivered: true, channel: 'smtp' };
  } catch (err) {
    console.error('[EMAIL] Developer activation send failed:', err);
    console.log(`[DEV EMAIL] Activation link: ${activationUrl}`);
    return { delivered: false, channel: 'none' };
  }
}

export function buildOrgCredentialsLoginUrl(requirePasswordChange: boolean): string {
  const base = env.FRONTEND_URL.replace(/\/$/, '');
  return requirePasswordChange ? `${base}/login?next=/change-password` : `${base}/login`;
}

export async function sendOrganizationAdminCredentialsEmail(params: {
  to: string;
  name: string;
  organizationName: string;
  loginUrl: string;
  email: string;
  password: string;
  requirePasswordChange?: boolean;
}): Promise<boolean> {
  const { to, name, organizationName, loginUrl, email, password, requirePasswordChange = true } =
    params;
  const subject = `Your ${organizationName} login credentials — ShulePlus`;
  const ctaLabel = requirePasswordChange ? 'Sign in & change password' : 'Sign in to dashboard';
  const afterSignInNote = requirePasswordChange
    ? 'You will be asked to change your password after signing in. Keep these credentials secure.'
    : 'Use the password above to sign in and open your organization dashboard.';

  const text = [
    `Hello ${name},`,
    '',
    `Your organization administrator account for ${organizationName} on ShulePlus has been set up.`,
    '',
    'Login details:',
    `  Email: ${email}`,
    `  Password: ${password}`,
    '',
    `Sign in at: ${loginUrl}`,
    '',
    afterSignInNote,
    '',
    'If you did not expect this email, contact your platform administrator.',
    '',
    '— ShulePlus Platform Team',
  ].join('\n');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:#000435;padding:24px;text-align:center;">
          <h1 style="color:#FCB038;margin:0;font-size:22px;">ShulePlus</h1>
        </div>
        <div style="padding:28px;color:#0f172a;">
          <p style="font-size:15px;line-height:1.6;">Hello ${name},</p>
          <p style="font-size:15px;line-height:1.6;">
            Your administrator account for <strong>${organizationName}</strong> is ready.
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 8px;font-size:14px;"><strong>Email:</strong> ${email}</p>
            <p style="margin:0;font-size:14px;"><strong>Password:</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px;">${password}</code></p>
          </div>
          <p style="text-align:center;margin:28px 0;">
            <a href="${loginUrl}" style="background:#FCB038;color:#000435;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:10px;display:inline-block;">
              ${ctaLabel}
            </a>
          </p>
          <p style="color:#64748b;font-size:13px;line-height:1.5;">
            ${afterSignInNote}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (notificationClient.isEnabled()) {
    const result = await notificationClient.sendEmail({
      to,
      subject,
      html,
      text,
      templateSlug: 'org-admin-credentials',
      templateVariables: { name, organizationName, email, password, loginUrl },
      metadata: { type: 'org_admin_credentials', organizationName },
    });
    if (result?.delivered) return true;
  }

  const transporter = createTransporter();

  if (!transporter) {
    console.log('\n========================================');
    console.log(`[DEV EMAIL] Organization admin credentials for ${to}`);
    console.log(`Organization: ${organizationName}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Login: ${loginUrl}`);
    console.log('========================================\n');
    return false;
  }

  try {
    await transporter.sendMail({ from: env.SMTP_FROM, to, subject, text, html });
    return true;
  } catch (err) {
    console.error('[EMAIL] Org admin credentials send failed, falling back to console:', err);
    console.log('\n========================================');
    console.log(`[DEV EMAIL] Organization admin credentials for ${to}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Login: ${loginUrl}`);
    console.log('========================================\n');
    return false;
  }
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<boolean> {
  const { to, name, resetUrl } = params;
  const subject = 'Reset your ShulePlus password';
  const text = [
    `Hello ${name},`,
    '',
    'We received a request to reset your ShulePlus password.',
    '',
    'Open this link to choose a new password:',
    resetUrl,
    '',
    'This link expires in 1 hour. If you did not request a reset, you can ignore this email.',
    '',
    '— ShulePlus Platform Team',
  ].join('\n');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:#000435;padding:24px;text-align:center;">
          <h1 style="color:#FCB038;margin:0;font-size:22px;">ShulePlus</h1>
        </div>
        <div style="padding:28px;color:#0f172a;">
          <p style="font-size:15px;line-height:1.6;">Hello ${name},</p>
          <p style="font-size:15px;line-height:1.6;">
            We received a request to reset your password. Click the button below to choose a new one.
          </p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}" style="background:#FCB038;color:#000435;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:10px;display:inline-block;">
              Reset password
            </a>
          </p>
          <p style="color:#64748b;font-size:13px;line-height:1.5;word-break:break-all;">
            Or copy this link into your browser:<br />
            <a href="${resetUrl}" style="color:#000435;">${resetUrl}</a>
          </p>
          <p style="color:#64748b;font-size:13px;line-height:1.5;margin-top:20px;">
            This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (notificationClient.isEnabled()) {
    const result = await notificationClient.sendEmail({
      to,
      subject,
      html,
      text,
      templateSlug: 'password-reset',
      templateVariables: { name, resetUrl },
      metadata: { type: 'password_reset' },
    });
    if (result?.delivered) return true;
  }

  const transporter = createTransporter();

  if (!transporter) {
    console.log('\n========================================');
    console.log(`[DEV EMAIL] Password reset for ${to}`);
    console.log(`Reset link: ${resetUrl}`);
    console.log('========================================\n');
    return false;
  }

  try {
    await transporter.sendMail({ from: env.SMTP_FROM, to, subject, text, html });
    return true;
  } catch (err) {
    console.error('[EMAIL] Password reset send failed, falling back to console:', err);
    console.log('\n========================================');
    console.log(`[DEV EMAIL] Password reset for ${to}`);
    console.log(`Reset link: ${resetUrl}`);
    console.log('========================================\n');
    return false;
  }
}
