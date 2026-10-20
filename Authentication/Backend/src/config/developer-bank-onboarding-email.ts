import { resolveDeveloperGatewayBaseUrl, resolvePublicApiBaseUrl } from './developer-public-url';

export type BankOnboardingEmailInput = {
  partnerName: string;
  contactName?: string;
  sandboxOrganizationId?: string | null;
  sandboxOrganizationName?: string | null;
  portalUrl?: string;
};

export function generateBankOnboardingEmail(input: BankOnboardingEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const portal = (input.portalUrl ?? 'https://shuleplus.rw').replace(/\/$/, '');
  const apiBase = resolvePublicApiBaseUrl();
  const gatewayBase = resolveDeveloperGatewayBaseUrl();
  const orgLine = input.sandboxOrganizationId
    ? `${input.sandboxOrganizationName ?? 'Your linked school'} — Organization ID: ${input.sandboxOrganizationId}`
    : 'Your sandbox school will be confirmed by ShulePlus after partner setup.';

  const subject = `ShulePlus API Sandbox Access — ${input.partnerName}`;

  const text = [
    `Dear ${input.contactName ?? 'Partner Team'},`,
    '',
    `Welcome to the ShulePlus Developer Portal. ${input.partnerName} now has sandbox access to integrate with ShulePlus APIs (school fees, student data, payroll, and TichaAvance).`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'STEP 1 — Activate your developer account',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `1. Open the activation link we sent separately (valid 72 hours).`,
    `2. Create your password and set up MFA.`,
    `3. Sign in at: ${portal}/developers/login`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'STEP 2 — Create OAuth credentials (client_id & secret)',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `1. After login, go to: Integrations → My Applications`,
    `2. Click "+ Create Application" (environment: SANDBOX).`,
    `3. Copy the Client ID and Client Secret immediately — the secret is shown only once.`,
    `4. If you lose the secret, use "Rotate Secret" to generate a new one.`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'STEP 3 — Import Postman & set credentials',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `1. Download Postman: https://www.postman.com/downloads/`,
    `2. Import the ShulePlus Postman pack (collections 0–7 + environment file).`,
    `3. Select environment: "ShulePlus — Bank Sandbox" (top-right dropdown).`,
    `4. Open environment variables (eye icon) and set CURRENT VALUE for:`,
    `   • client_id     → from My Applications`,
    `   • client_secret → from My Applications (after create or rotate)`,
    `   • organization_id → ${input.sandboxOrganizationId ?? '(provided by ShulePlus)'}`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'STEP 4 — Get access token & test APIs',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `1. Collection "0. IAM Authentication" → run "Get OAuth Access Token".`,
    `2. Token saves automatically to access_token (valid 15 minutes).`,
    `3. Run Collection "1. End-to-End Pay Fees Flow" (Steps 1–4).`,
    '',
    'Recommended test order:',
    '  • 0 → OAuth token',
    '  • 1 → Pay fees flow (student lookup → fees → payment)',
    '  • 5 → Payroll',
    '  • 6 → TichaAvance teacher',
    '  • 7 → KaziAvance approval',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'API reference',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `Developer Portal:  ${portal}/developers`,
    `API documentation: ${portal}/developers/docs`,
    `IAM API base:      ${apiBase}`,
    `Gateway base:      ${gatewayBase}/{module}/{path}`,
    `OAuth token:       POST ${apiBase}/developers/oauth/token`,
    '',
    `Sandbox school: ${orgLine}`,
    '',
    'Support: reply to this email or contact your ShulePlus integration manager.',
    '',
    '— ShulePlus Integration Team',
    'https://shuleplus.rw',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:linear-gradient(135deg,#000435 0%,#1e3a5f 100%);padding:32px 28px;text-align:center;">
      <p style="margin:0;color:#FCB038;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">ShulePlus Developer Portal</p>
      <h1 style="margin:12px 0 0;color:#fff;font-size:22px;font-weight:700;">API Sandbox Access</h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">${input.partnerName}</p>
    </div>
    <div style="padding:28px;">
      <p style="font-size:15px;line-height:1.65;margin:0 0 16px;">Dear ${input.contactName ?? 'Partner Team'},</p>
      <p style="font-size:15px;line-height:1.65;margin:0 0 24px;">
        Welcome to ShulePlus. You can now integrate with our APIs for <strong>school fees payments</strong>,
        <strong>student lookup</strong>, <strong>payroll</strong>, and <strong>TichaAvance</strong> salary advances.
      </p>

      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:20px;border-left:4px solid #FCB038;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Step 1 — Activate account</p>
        <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;color:#334155;">
          <li>Use the <strong>activation link</strong> sent in a separate email (72h expiry).</li>
          <li>Create password + MFA, then sign in at <a href="${portal}/developers/login" style="color:#000435;">${portal}/developers/login</a></li>
        </ol>
      </div>

      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:20px;border-left:4px solid #FCB038;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Step 2 — Get client_id & client_secret</p>
        <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;color:#334155;">
          <li><strong>Integrations → My Applications → Create Application</strong> (SANDBOX)</li>
          <li>Copy <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">client_id</code> and <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">client_secret</code> immediately</li>
          <li>Secret shown once — use <strong>Rotate Secret</strong> if lost</li>
        </ol>
      </div>

      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:20px;border-left:4px solid #FCB038;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Step 3 — Postman setup</p>
        <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;color:#334155;">
          <li>Import ShulePlus Postman collections + environment file</li>
          <li>Select environment <strong>ShulePlus — Bank Sandbox</strong></li>
          <li>Set <strong>Current value</strong>: <code>client_id</code>, <code>client_secret</code>, <code>organization_id</code></li>
        </ol>
      </div>

      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;border-left:4px solid #FCB038;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Step 4 — Test</p>
        <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;color:#334155;">
          <li>Collection <strong>0</strong> → Get OAuth Access Token</li>
          <li>Collection <strong>1</strong> → Pay fees flow (Steps 1–4)</li>
        </ol>
      </div>

      <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:8px 0;color:#64748b;width:140px;">Portal</td><td style="padding:8px 0;"><a href="${portal}/developers" style="color:#000435;">${portal}/developers</a></td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">API docs</td><td style="padding:8px 0;"><a href="${portal}/developers/docs" style="color:#000435;">${portal}/developers/docs</a></td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Gateway</td><td style="padding:8px 0;font-family:monospace;font-size:12px;">${gatewayBase}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Sandbox school</td><td style="padding:8px 0;">${orgLine}</td></tr>
      </table>

      <p style="font-size:13px;color:#64748b;margin:0;">Questions? Reply to this email or contact your ShulePlus integration manager.</p>
    </div>
    <div style="background:#000435;padding:16px 28px;text-align:center;">
      <p style="margin:0;color:#64748b;font-size:12px;">© ShulePlus · <a href="https://shuleplus.rw" style="color:#FCB038;text-decoration:none;">shuleplus.rw</a></p>
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}
