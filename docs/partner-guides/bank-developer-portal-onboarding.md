# Bank Developer Portal — Onboarding Email Guide

Use this guide when emailing a bank or fintech partner (e.g. BOA) after creating their ShulePlus developer sandbox.

**Super Admin shortcut:** Developer Access → Partner card → **Copy bank guide** (copies ready-to-send text with partner-specific org ID).

**Official API documentation (HTML):** [school-fees-payment-api-guide.html](./school-fees-payment-api-guide.html) — share with banks or open at `https://shuleplus.rw/partner-guides/school-fees-payment-api-guide.html` after deploy.

---

## Email subject

```
ShulePlus API Sandbox Access — {Partner Name}
```

Example: `ShulePlus API Sandbox Access — Bank of Africa`

---

## Email body (plain text)

```
Dear Partner Team,

Welcome to the ShulePlus Developer Portal. {Partner Name} now has sandbox access to integrate with ShulePlus APIs (school fees, student data, payroll, and TichaAvance).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — Activate your developer account
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Open the activation link we sent separately (valid 72 hours).
2. Create your password and set up MFA.
3. Sign in at: https://shuleplus.rw/developers/login

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — Create OAuth credentials (client_id & secret)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. After login, go to: Integrations → My Applications
2. Click "+ Create Application" (environment: SANDBOX).
3. Copy the Client ID and Client Secret immediately — the secret is shown only once.
4. If you lose the secret, use "Rotate Secret" to generate a new one.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — Import Postman & set credentials
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Download Postman: https://www.postman.com/downloads/
2. Import the ShulePlus Postman pack (collections 0–7 + environment file).
3. Select environment: "ShulePlus — Bank Sandbox" (top-right dropdown).
4. Open environment variables (eye icon) and set CURRENT VALUE for:
   • client_id     → from My Applications
   • client_secret → from My Applications (after create or rotate)
   • organization_id → {sandbox organization UUID}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — Get access token & test APIs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Collection "0. IAM Authentication" → run "Get OAuth Access Token".
2. Token saves automatically to access_token (valid 15 minutes).
3. Run Collection "1. End-to-End Pay Fees Flow" (Steps 1–4).

Recommended test order:
  • 0 → OAuth token
  • 1 → Pay fees flow (student lookup → fees → payment)
  • 5 → Payroll
  • 6 → TichaAvance teacher
  • 7 → KaziAvance approval

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API reference
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Developer Portal:  https://shuleplus.rw/developers
API documentation: https://shuleplus.rw/developers/docs
IAM API base:      https://shuleplus.rw/api/v1
Gateway base:      https://shuleplus.rw/api/v1/developers/gateway/{module}/{path}
OAuth token:       POST https://shuleplus.rw/api/v1/developers/oauth/token

Sandbox school: {School Name} — Organization ID: {UUID}

Support: reply to this email or contact your ShulePlus integration manager.

— ShulePlus Integration Team
https://shuleplus.rw
```

---

## Postman checklist (for bank IT)

| Variable | Where to get it | Postman location |
|----------|-----------------|------------------|
| `client_id` | Developer Portal → My Applications | Environment → **Current value** |
| `client_secret` | Same (shown once on create; use Rotate Secret if lost) | Environment → **Current value** |
| `organization_id` | Super Admin partner card or sandbox overview | Environment → **Current value** |
| `access_token` | Auto-filled after Collection 0 runs | Environment (auto) |

**Common mistake:** Initial value is set but **Current value** is empty — OAuth will return 401 Invalid client credentials.

---

## Two emails to send

1. **Activation email** — sent automatically when you create developer access (password setup link).
2. **This onboarding guide** — copy from Super Admin or use the template above (API + Postman steps).

Send both to the bank’s integration team.
