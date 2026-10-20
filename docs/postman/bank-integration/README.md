# ShulePlus — Bank Integration API Pack

Postman collections and environment for **bank / fintech partners** integrating with ShulePlus school fees payments.

**Prepared for:** External integration partners  
**Platform:** ShulePlus (Rwanda)  
**Version:** March 2026

---

## Quick Start (5 minutes)

1. **Import into Postman**
   - Import **all 5 collection** JSON files + **1 environment** file from this folder
   - Select environment: **ShulePlus — Bank Sandbox** (top-right dropdown)

2. **Set credentials** (provided by ShulePlus when your partner account is created)
   | Variable | Description |
   |----------|-------------|
   | `client_id` | OAuth application client ID |
   | `client_secret` | OAuth application secret |
   | `organization_id` | Sandbox school UUID |

3. **Authenticate**
   - Open collection **0. IAM Authentication**
   - Run **1. Get OAuth Access Token**
   - Token is saved automatically to `access_token`

4. **Test payment flow**
   - Open collection **1. End-to-End Pay Fees Flow**
   - Run requests in order (Step 1 → Step 4)

---

## Files in This Pack

| File | Purpose |
|------|---------|
| `00-iam-authentication.postman_collection.json` | Login, OAuth token, organization context |
| `01-end-to-end-pay-fees-flow.postman_collection.json` | Full journey: lookup → fees → pay → receipt |
| `02-student-management.postman_collection.json` | List/get/lookup students |
| `03-webpage-babyeyi-pay-fees.postman_collection.json` | babyeyi.rw BFF (public parent portal) |
| `04-school-fees-portal.postman_collection.json` | Fee structures, collection, bills, payments |
| `05-payroll.postman_collection.json` | Payroll runs, staff, bank disbursement |
| `06-tichaavance-teacher.postman_collection.json` | TichaAvance teacher flow (TichaPortal BFF) |
| `07-kaziavance-approval.postman_collection.json` | Org-admin approve / reject / disburse advances |
| `ShulePlus-Bank-Sandbox.postman_environment.json` | Shared variables (URLs, org, tokens) |

---

## Architecture Overview

```
Bank / Partner System
        │
        ├──► Student Management API   (students-api.shuleplus.rw/api)
        │         GET /public/students/lookup
        │
        ├──► School Fees Portal API   (fees.shuleplus.rw/api)
        │         GET  /public/student-fees
        │         POST /public/payments/initiate
        │         GET  /public/payments/{ref}/status
        │         GET  /public/receipts/{receiptNo}
        │
        └──► WebpageBabyeyi BFF (optional single host — babyeyi-api.shuleplus.rw/api)
                  GET /students/lookup · /fees/student-fees · …
```

### Production URLs (Postman environment)

| Variable | Service | URL |
|----------|---------|-----|
| `students_api_url` | Student Management | `https://students-api.shuleplus.rw/api` |
| `fees_api_url` | School Fees Portal | `https://fees.shuleplus.rw/api` |
| `babyeyi_bff_url` | WebpageBabyeyi BFF | `https://babyeyi-api.shuleplus.rw/api` |
| `babyeyi_wizard_api_url` | Babyeyi Wizard | `https://babyeyi-wizard-api.shuleplus.rw/api` |
| `iam_base_url` | IAM (OAuth optional) | `https://shuleplus.rw/api/v1` |

> **Pay-fees public routes** do not require OAuth. Use the **direct module URLs** above (collections **1**, **3**, **4**).

---

## Authentication

### OAuth 2.0 Client Credentials (recommended)

```http
POST /api/v1/developers/oauth/token
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "client_id": "<your_client_id>",
  "client_secret": "<your_client_secret>"
}
```

**Response:** `access_token` (Bearer, 15-minute TTL)

### Headers on public pay-fees calls

```http
Accept: application/json
Content-Type: application/json
```

No `Authorization` header is required for `/public/…` on the fees and students APIs.

---

## Sandbox Test Data

| Field | Value |
|-------|-------|
| Organization | ST THEO SCHOOL |
| organization_id | `b4e8c3c3-b510-44e1-9f92-696c2a1506f3` |
| organization_code | `04001` |
| Sample student_code | `04001042426` |
| academic_year | `2025-2026` |
| term | `Term 1` |

---

## API Scopes (permissions)

Your OAuth application is granted specific scopes. Typical bank integration:

| Scope | Module | Allows |
|-------|--------|--------|
| `student.search` | Student Management | Public student lookup |
| `student.read` | Student Management | List/get students |
| `fees.read` | School Fees | Fee structures, bills, collection lookup |
| `fees.write` | School Fees | Create fee structures |
| `payment.create` | School Fees | Initiate & record payments |
| `payment.read` | School Fees | Payment status, receipts |
| `webpage.read` | WebpageBabyeyi | BFF health, directory |
| `payroll.read` | Payroll | Dashboard, staff, runs, disbursement |
| `payroll.process` | Payroll | Trigger runs, mark paid, apply deductions |
| `kazi.read` | KaziAvance | Employee dashboard, request queue |
| `kazi.write` | KaziAvance | Submit advances, manage employees |
| `kazi.approve` | KaziAvance | Approve, reject, disburse requests |
| `ticha.read` | TichaPortal | Teacher TichaAvance via BFF |
| `ticha.write` | TichaPortal | Submit advance via BFF |
| `payment.create` | WebpageBabyeyi | Pay fees via BFF |

---

## End-to-End Payment Flow (direct APIs)

```
1. GET  {students_api_url}/public/students/lookup?code=…
2. GET  {fees_api_url}/public/student-fees?organizationId=…&studentCode=…
3. POST {fees_api_url}/public/payments/initiate (header `Idempotency-Key` recommended)
4. GET  {fees_api_url}/public/payments/{reference}/status
5. GET  {fees_api_url}/public/receipts/{receiptNumber}
```

### Idempotency (initiate only)

| Header | Behavior |
|--------|----------|
| `Idempotency-Key` | Unique per customer payment, scoped to `organizationId` in the body |
| Same key + same JSON | **201** replay with the original `reference` |
| Same key + different JSON | **409** `Idempotency key already used with different payload` — investigate, do not auto-retry |

Without the header, each POST creates a new payment (legacy parent-portal behavior).

### Initiate payment body (important)

Use **`method`**, not `channel`:

```json
{
  "studentCode": "04001042426",
  "amount": 5000,
  "method": "MOMO",
  "phone": "0788123456",
  "academicYear": "2025-2026",
  "term": "Term 1"
}
```

| method | Extra fields |
|--------|--------------|
| `MOMO` | `phone`, optional `provider` (`MTN` \| `AIRTEL`) |
| `BANK` | `bankName`, `accountNumber`, `accountHolder` |
| `CARD` | Use hosted PSP page in production (not raw PAN) |

---

## Collection Guides

### 0 — IAM Authentication
Start here. Get OAuth token and verify gateway access.

### 1 — End-to-End Pay Fees Flow
Complete parent payment journey through the developer gateway (recommended demo for banks).

### 2 — Student Management
- Public lookup by ShuleCode
- List/get students (authenticated)
- Classes and parents

### 3 — WebpageBabyeyi (BFF)
Same pay-fees flow as **babyeyi.rw** public website. Use when integrating the parent-facing channel.

### 4 — School Fees Portal
School-side operations:
- **Fee structures** — list, get, create
- **Fee collection** — lookup student, record bursar payment
- **Bills & outstanding** — reporting

### 5 — Payroll
- Staff directory, payroll runs, mark paid
- Bank disbursement export (grouped by bank)
- Advance deduction sync with KaziAvance

### 6 — TichaAvance Teacher (TichaPortal BFF)
Teacher salary advance flow via **ticha.shuleplus.rw** paths:
- Dashboard, catalog, calculator
- Submit / cancel advance request

### 7 — KaziAvance Approval (Org Admin)
School finance approval workflow:
- List requests → review → approve → disburse
- Active advances, repayments, audit logs

---

## Bank Integration Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| API access & sandbox | ✅ Available | OAuth, gateway, test data |
| Payment initiation API | ✅ Available | Creates PENDING payment record |
| Payment status & receipts | ✅ Available | Poll + verify receipt |
| Bank webhook callback | 🔜 Planned | `POST /webhooks/payments/{provider}` |
| MoMo STK / bank debit | 🔜 Planned | Real-time payment execution |
| Reconciliation API | 🔜 Planned | Match bank deposits to payments |

---

## Support & Onboarding

1. ShulePlus creates your **Developer Partner** account
2. You receive `client_id`, `client_secret`, and sandbox `organization_id`
3. Import this Postman pack and run collection **0** then **1**
4. Contact ShulePlus for production access approval

**Developer Portal:** https://app.shuleplus.rw/developers

---

## Regenerate This Pack

After API changes in the codebase:

```bash
node scripts/generate-bank-postman-pack.mjs
```

Output: `docs/postman/bank-integration/`
