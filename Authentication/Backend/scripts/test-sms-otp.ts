/**
 * Quick SMS connectivity test for login MFA OTP delivery.
 * Usage: npx tsx scripts/test-sms-otp.ts [phone]
 */
import 'dotenv/config';
import { notificationClient } from '../src/clients/notification.client';
import { sendOtpSms, normalizePhoneNumber } from '../src/utils/sms';
import { env } from '../src/config/env';

const testPhone = process.argv[2] ?? env.ROOT_ADMIN_PHONE ?? '0796898894';
const testOtp = '123456';

async function main() {
  console.log('=== ShulePlus SMS OTP Diagnostic ===\n');
  console.log('Phone (raw):', testPhone);
  console.log('Phone (normalized):', normalizePhoneNumber(testPhone));
  console.log('Notification Service URL:', env.NOTIFICATION_SERVICE_URL || '(not set)');
  console.log('Direct SMS API:', env.SMS_API_URL ? 'configured' : 'not configured');
  console.log('Sender ID:', env.SMS_SENDER_ID || '(missing)');
  console.log('');

  if (notificationClient.isEnabled()) {
    console.log('1) Testing Notification Service /sms ...');
    const viaService = await notificationClient.sendSms({
      to: testPhone,
      body: `[TEST] ShulePlus OTP test code: ${testOtp}`,
      metadata: { type: 'diagnostic' },
    });
    console.log('   Result:', viaService ?? 'unreachable (will use direct fallback on login)');
  } else {
    console.log('1) Notification Service disabled — login uses direct SMS API only');
  }

  console.log('\n2) Testing IAM sendOtpSms (same path as login MFA) ...');
  const sent = await sendOtpSms(testPhone, testOtp);
  console.log('   Delivered:', sent ? 'YES' : 'NO (check console log above)');

  console.log('\n=== Done ===');
  if (!sent) {
    console.log('Tips:');
    console.log('- Ensure Notification-Service is running: cd Notification-Service && npm run dev');
    console.log('- Or configure SMS_API_URL, SMS_API_KEY, SMS_SENDER_ID in Backend/.env');
    console.log('- ROOT_ADMIN must have phone on file for SMS during login MFA');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
