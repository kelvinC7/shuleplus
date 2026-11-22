import { notificationClient } from '../clients/notification.client';

export async function sendSchoolRegistrationConfirmationEmail(input: {
  to: string;
  schoolName: string;
  reference: string;
  username: string;
  password: string;
  loginUrl?: string;
}): Promise<boolean> {
  const loginUrl = input.loginUrl ?? 'http://localhost:3077/login';
  const subject = `ShuleTrip registration received · ${input.reference}`;
  const body = [
    `Hello,`,
    ``,
    `Thank you for registering ${input.schoolName} on ShuleTrip.`,
    ``,
    `Your application was submitted successfully and is now under review.`,
    ``,
    `Reference: ${input.reference}`,
    ``,
    `Save these login details. You can sign in after your school is approved:`,
    `Username: ${input.username}`,
    `Password: ${input.password}`,
    ``,
    `Sign in: ${loginUrl}`,
    ``,
    `We will email you again when your registration is approved or if we need more information.`,
    ``,
    `ShuleTrip · Edupoto`,
  ].join('\n');

  const html = `
    <p>Hello,</p>
    <p>Thank you for registering <strong>${escapeHtml(input.schoolName)}</strong> on ShuleTrip.</p>
    <p>Your application was submitted successfully and is now <strong>under review</strong>.</p>
    <p><strong>Reference:</strong> ${escapeHtml(input.reference)}</p>
    <p>Save these login details. You can sign in after your school is approved:</p>
    <ul>
      <li><strong>Username:</strong> ${escapeHtml(input.username)}</li>
      <li><strong>Password:</strong> ${escapeHtml(input.password)}</li>
    </ul>
    <p><a href="${escapeHtml(loginUrl)}">Sign in to ShuleTrip</a></p>
    <p>We will contact you when your registration is approved or if we need more information.</p>
    <p>ShuleTrip · Edupoto</p>
  `.trim();

  if (notificationClient.isEnabled()) {
    const sent = await notificationClient.sendEmail({ to: input.to, subject, body, html });
    return Boolean(sent);
  }

  console.info('[ShuleTrip] Registration confirmation email (notification service not configured):');
  console.info(`  To: ${input.to}`);
  console.info(`  Subject: ${subject}`);
  console.info(body);
  return false;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
