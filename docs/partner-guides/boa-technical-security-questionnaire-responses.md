# Bank of Africa Rwanda  
## Technical and Security Due Diligence — Vendor Response

> **Preferred format for BOA:** open [`boa-technical-security-questionnaire-responses.html`](./boa-technical-security-questionnaire-responses.html) (Montserrat + logo, honest transparency notes) and **Print → Save as PDF**.  
> Live URL after deploy: `https://shuleplus.rw/partner-guides/boa-technical-security-questionnaire-responses.html`


**Vendor:** ShulePlus (Theoneste IT Ltd)  
**Product:** ShulePlus Education & Payments Platform  
**Integration scope:** School fees payment APIs (student validation, fee quotation, payment initiation, status, digital receipt)  
**Document date:** March 2026  
**Version:** 1.0  
**Primary contact:** [Full name, title] · [email] · [phone]  
**Technical contact:** [Name] · [email]  

**Enclosures:**  
1. School Fees Payment API Integration Guide (v1.1)  
2. Postman integration pack (collections 0–7 + sandbox environment)  
3. Sandbox access credentials (transmitted separately via secure channel)

---

## Section A — Technical Readiness

### 1. Complete API documentation (endpoints, request/response formats, error codes)

ShulePlus provides full documentation for the bank integration scope:

| Resource | Description |
|----------|-------------|
| **Official HTML guide** | Step-by-step flow, production base URLs, JSON request/response examples, HTTP error codes, and bank integration notes. Available at: `https://shuleplus.rw/partner-guides/school-fees-payment-api-guide.html` (printable to PDF). |
| **Postman collections** | Executable examples for authentication, end-to-end pay-fees flow, Student Management, School Fees Portal, and Babyeyi BFF. |
| **Developer Portal** | Authenticated API catalog and OpenAPI JSON per module at `https://shuleplus.rw/developers/docs`. |

**Production API bases (school fees journey):**

- `GET https://students-api.shuleplus.rw/api/public/students/lookup?code={studentCode}`
- `GET https://fees.shuleplus.rw/api/public/student-fees?organizationId=…&studentCode=…&academicYear=…&term=…`
- `POST https://fees.shuleplus.rw/api/public/payments/initiate`
- `GET https://fees.shuleplus.rw/api/public/payments/{reference}/status`
- `GET https://fees.shuleplus.rw/api/public/receipts/{receiptNumber}`

**Standard success response:** `{ "success": true, "data": { … } }`  
**Standard error response:** `{ "success": false, "message": "Human-readable description" }` with appropriate HTTP status (400, 401, 403, 404, 409).

---

### 2. Is API documentation versioned? Current version and deprecation of older versions

Yes. Partner-facing documentation is versioned and traceable:

- **Integration guide:** v1.1 (March 2026), identified in the document header and footer.
- **Postman pack:** Generated from the production codebase; version history maintained in Git.
- **OpenAPI:** Per-module specifications exposed through the Developer Portal.

**Deprecation policy:** Material breaking changes are communicated in writing to registered integration partners with a minimum notice period agreed in the partnership schedule (typically 90 days for production). Previous documentation versions remain available to partners during the transition. Non-breaking additive changes may be deployed without service interruption.

---

### 3. Authentication method (OAuth2, mTLS, API keys, etc.)

ShulePlus uses **layered authentication** depending on the API surface:

| Surface | Method |
|---------|--------|
| **Public school fees APIs** (lookup, fees, initiate, status, receipt) | **HTTPS only** — same model as the public parent payment channel. No API key in the request path for these endpoints; transport security and optional network controls apply at the edge. |
| **Developer Portal & partner OAuth applications** | **OAuth 2.0 Client Credentials** — `POST https://shuleplus.rw/api/v1/developers/oauth/token` returns a Bearer access token (15-minute TTL). Used for partner testing, scoped school APIs, and operational tooling. |
| **Internal school administration APIs** | **JWT** issued by ShulePlus IAM, with role- and module-based authorization. |
| **Service-to-service** | Signed service tokens between microservices (not exposed to the bank). |

**Bank Core Banking integration (debit, account validation, settlement):** Expected to follow **Bank of Africa’s** prescribed standards (OAuth2, API keys, and/or mTLS as defined in BOA’s API specification). ShulePlus will implement the bank-side contract as a separate integration layer; technical workshops are scheduled during UAT.

ShulePlus does not require mutual TLS on the public fees endpoints today; all public traffic is **TLS-terminated** on production reverse proxies.

---

### 4. How API credentials are issued, rotated, and revoked

**OAuth partner credentials (Developer Portal):**

1. **Issuance:** ShulePlus provisions a Developer Partner account and sandbox school. Authorized bank technical users receive an activation link (72-hour expiry), set password and MFA, then create a **SANDBOX** or **PRODUCTION** OAuth application. The `client_id` and `client_secret` are displayed once at creation.
2. **Rotation:** Authorized users invoke **Rotate Secret** in the Developer Portal; the previous secret is invalidated immediately and a new secret is shown once.
3. **Revocation:** ShulePlus or the partner may **suspend** the OAuth application, **suspend** developer users, or **delete** developer access. Active sessions and refresh tokens are invalidated. Audit log entries record credential lifecycle events.

Client secrets are stored using **one-way hashing**; plaintext secrets are never persisted after the initial display.

**Operational credentials** (server, database, deployment) are held by a limited operations team, stored in environment configuration (not in source code), and rotated on role change or suspected compromise.

---

### 5. Dedicated sandbox / UAT environment separate from production

**Yes.** ShulePlus operates a logical **SANDBOX** environment for partners:

- Separate **OAuth applications** flagged SANDBOX versus PRODUCTION.
- Dedicated **sandbox school organization** (`organization_id` issued at onboarding) with test students and fee structures.
- **Postman environment** file preconfigured with sandbox URLs and sample student codes.
- Developer Portal access for Bank of Africa technical staff (MFA enforced).

Sandbox uses the same API hostnames and TLS policies as production, with **isolated test data** and non-production payment behavior (payments remain **PENDING** until confirmed per integration rules; optional auto-confirm for UAT only).

**Access:** Provided after partnership approval via secure channel (not email body): portal login, `client_id`, `client_secret`, `organization_id`, and Postman pack.

---

### 6. Uptime percentage over the last 12 months (evidence)

ShulePlus production services run on a dedicated infrastructure stack with process supervision (PM2), health endpoints per module, and controlled deployments from version-controlled releases.

**Target availability** for partner-facing payment APIs: **99.5%** monthly (excluding agreed maintenance windows).

Formal public status page and audited SLA reports are being finalized for the partner program. Until publication, ShulePlus provides:

- Module health endpoints (e.g. `GET …/health` on IAM, Student Management, School Fees).
- Incident notification to registered integration contacts.
- Monthly uptime summary **on request** during the integration phase.

Supporting evidence (monitoring exports, incident log summary) can be shared under NDA upon request.

---

### 7. Maximum supported throughput (requests per second / minute)

Public fees endpoints are **stateless HTTP** services behind Nginx, backed by PostgreSQL with connection pooling. Throughput scales with allocated compute and database capacity.

ShulePlus has not yet published a formal certified TPS figure for external partners. For Bank of Africa, we will:

1. Agree a **UAT load profile** (peak and sustained transaction rates).
2. Execute joint performance testing before production go-live.
3. Document results and any required scaling actions.

As a planning baseline, the current production node is sized for **typical school-fees peaks** (batch parent payments, term opening). Horizontal scaling (additional API worker processes / nodes) is supported in our deployment architecture if BOA volume requires it.

---

### 8. Process for failed requests, timeouts, and retries

**Client-side (Bank of Africa) recommendations:**

| Operation | Guidance |
|-----------|----------|
| **Timeouts** | Connect timeout 15–30s; read timeout 30–60s for payment initiation. |
| **GET** (lookup, fees, status, receipt) | Safe to retry on **5xx** or network errors with exponential backoff (e.g. 2s, 5s, 10s; maximum 5 attempts). |
| **POST** (initiate payment) | Do **not** repeat blindly. Use a **bank-side idempotency key** mapped to ShulePlus `reference` (see Question 9). |
| **4xx responses** | Do not retry; correct the request using the `message` field. |

**Server-side:** ShulePlus returns explicit HTTP status codes and structured error messages. Payment records remain **PENDING** until the bank confirms settlement through the agreed callback or reconciliation process (production). Status polling via `GET …/payments/{reference}/status` is the supported completion pattern.

---

### 9. Idempotency for repeated / duplicate requests

**Current behavior:**

- Each successful `POST /public/payments/initiate` creates a **new** payment with a **unique `reference`** identifier.
- **GET** operations (lookup, fees, status, receipt) are inherently idempotent.

**Partner pattern (recommended for BOA):**

1. Generate a **unique idempotency key** per customer transaction in the bank channel.
2. Store the mapping between that key and the ShulePlus `reference` after the first successful initiate.
3. On timeout or ambiguous response, **query status** by `reference` before initiating again.

**`POST /public/payments/initiate`** accepts optional header **`Idempotency-Key`** (scoped per `organizationId`). Same key and same JSON body replays the original **201** response (same `reference`). Same key with a **different** body returns **409** with message *Idempotency key already used with different payload* — do not auto-retry; investigate.

---

### 10. Encryption in transit (TLS)

**Yes.** All partner-accessible APIs are available **only over HTTPS**.

- TLS is terminated at the production **reverse proxy (Nginx)** on ShulePlus domains (`*.shuleplus.rw`).
- **Minimum TLS 1.2**; TLS 1.3 supported where client and server negotiate it.
- Certificates are issued and renewed through an automated certificate management process.

Internal inter-service calls on the application host may use localhost networking; these paths are **not exposed** to external partners.

---

### 11. Encryption at rest

ShulePlus applies defense-in-depth for data at rest:

| Data type | Protection |
|-----------|------------|
| **User and developer passwords** | Bcrypt hashing (configurable work factor). |
| **OAuth client secrets** | One-way hash; plaintext never stored after issuance. |
| **Payment card data** | **PCI-aligned minimization:** full PAN and CVV are **not persisted**. Only **last four digits** may be stored for display; full card data must flow through a PCI-compliant bank or PSP channel in production. |
| **Bank account numbers** | Stored in masked form (`****` + last four digits) in payment metadata. |
| **Database** | PostgreSQL on controlled production infrastructure; access restricted to authorized operations roles. **Full-disk encryption** on production volumes [confirm with operations and attach infrastructure statement if BOA requires certification letter from host]. |
| **Backups** | Encrypted backup copies; retention and restore procedures documented internally [retention period: specify per contract]. |

---

### 12. Physical hosting (country / region / data center)

ShulePlus production workloads for Rwandan schools and partner integrations are hosted on **infrastructure located in Rwanda**, operated under ShulePlus / Theoneste IT operational control.

Detailed data center provider name, address, and tier certification are documented in the **Infrastructure & Data Processing Appendix** available to Bank of Africa under NDA [insert provider name: e.g. local ISP / cloud VPS provider / colocation facility].

**Primary data processing region:** Rwanda. Cross-border transfer of personal data, if any (e.g. email delivery), is limited to subprocessors disclosed in the privacy schedule.

---

### 13. Third-party cloud providers and shared responsibility

**Application hosting:** Primary production environment is **self-managed** on dedicated/virtual servers in Rwanda (not a multi-tenant SaaS on hyperscale public cloud for core student and fee data).

**Subprocessors and tools (non-exhaustive):**

| Provider | Purpose | Data exposure |
|----------|---------|-------------|
| **GitHub** | Source code, CI/CD (self-hosted runner on production for deploy) | No production customer database content |
| **Email / SMS gateways** | Notifications, OTP | Message content and recipient metadata only |
| **[Hosting / ISP vendor]** | Compute, network | All application and database data |

**Shared responsibility:**

- **ShulePlus:** Application security, access control, patching, secure SDLC, tenant isolation, API security, incident response for the platform.
- **Infrastructure provider:** Physical and network security of the facility or virtualisation layer per contract.
- **Bank of Africa:** Security of bank channel, customer authentication, and core banking credentials.

A full subprocessor list is available in the Data Processing Agreement.

---

## Section B — Security Specifics

### 1. Third-party penetration test within the last 6–12 months

ShulePlus engages or will engage an **independent external assessor** to perform penetration testing on partner-relevant surfaces (IAM, public fees APIs, Developer Portal).

- **Most recent report:** [If completed: attach executive summary under NDA. If in progress: “Assessment scheduled [month/year]; summary will be shared upon completion.”]
- **Scope:** External black-box/grey-box testing of HTTPS APIs and authentication flows.

---

### 2. Penetration tests: independent external vs internal

**Policy:** Production partner integrations are tested by an **independent external party** where possible. Internal security review and automated dependency scanning supplement external tests but do not replace them.

---

### 3. Incident response process and client notification

ShulePlus maintains an **Incident Response Procedure** covering detection, classification, containment, eradication, recovery, and post-incident review.

**Notification to affected clients (including Bank of Africa):**

1. **Initial notification** within **72 hours** of confirming an incident that materially affects partner data, API availability, or confidentiality of integration credentials.
2. **Content:** Nature of incident, affected systems, data categories involved, actions taken, and recommended partner actions (e.g. secret rotation).
3. **Updates** at agreed intervals until closure.
4. **Final report** with root cause and preventive measures.

**Primary communication channel:** designated integration security contact (email + phone). Critical incidents may use direct phone escalation.

Developer and administrative actions on partner accounts are recorded in **audit logs** on the IAM platform.

---

### 4. Security breaches in the last 3 years

[Select one and remove the other after legal review:]

**Option A — No reportable breach:**  
To the best of our knowledge, ShulePlus has **not** experienced a security breach that resulted in unauthorized disclosure of partner integration secrets or bulk student/financial records to unrelated third parties in the **last three years**.

**Option B — If applicable:**  
[Describe incident factually: date, scope, data types, remediation, and notifications sent. Attach timeline if required.]

---

### 5. Process and timeline for patching known vulnerabilities

| Severity | Target remediation |
|----------|-------------------|
| **Critical** (remote code execution, authentication bypass, active exploitation) | **72 hours** or emergency change window |
| **High** | **7 calendar days** |
| **Medium** | **30 days** (next release train) |
| **Low** | **90 days** or scheduled maintenance |

**Process:** Vulnerability intake (dependency scan, vendor advisory, researcher report) → triage → patch in Git → tested deploy via controlled release → verification on production health checks.

Operating system and runtime patches are applied on a **monthly** cadence or faster when critical.

---

### 6. Vulnerability disclosure or bug bounty program

ShulePlus accepts **responsible disclosure** from partners and researchers via **[security@shuleplus.rw]** (or designated security inbox).

- Acknowledgment within **5 business days**.
- Coordinated disclosure timeline agreed with reporter.
- A formal **bug bounty program** is under evaluation for 2026; not publicly advertised today.

---

### 7. Security certifications (ISO 27001, PCI-DSS, SOC 2)

| Standard | Status |
|----------|--------|
| **PCI-DSS** | ShulePlus is architected so that **full cardholder data is not stored** on the platform (last-four-only policy). Card presentment in production is intended to occur through **Bank of Africa / PCI-certified payment rails**. ShulePlus acts as integration facilitator; **entity-level PCI-DSS certification:** [Not held / SAQ scope to be confirmed with QSA — specify after review]. |
| **ISO/IEC 27001** | [Not currently certified / roadmap: target assessment year — specify]. |
| **SOC 2** | [Not currently certified]. |

ShulePlus can provide a **controls overview** mapping to ISO 27001 Annex A and partner due-diligence questionnaires pending formal certification.

---

### 8. Access control for staff on systems handling bank-related data

- **Role-based access control (RBAC)** across Super Admin, organization admin, and Developer Portal roles.
- **Least privilege:** Bank developers receive only scopes required for fees and student lookup (`fees.read`, `payment.create`, `payment.read`, `student.search`, etc.).
- **Multi-factor authentication** for Developer Portal users after activation.
- **Production server access** limited to named DevOps administrators; SSH key-based authentication; no shared root passwords.
- **Access reviews:** [Quarterly / semi-annual — specify] for privileged accounts.
- **Separation of duties:** Production database credentials are not issued to general developers.

---

### 9. Regular security audits — frequency

| Activity | Frequency |
|----------|-----------|
| Dependency and vulnerability scanning (application) | **Continuous / each release** |
| Access review (privileged accounts) | **Quarterly** |
| Internal security checklist (IAM, backups, TLS) | **Semi-annual** |
| External penetration test | **Annual** (partner scope) |
| Code change control | **All production changes via Git** with review |

---

### 10. Segregation of sensitive data between clients

ShulePlus is a **multi-tenant** platform. Segregation is enforced as follows:

- Every student, fee, bill, and payment record is bound to an **`organizationId`** (school tenant).
- API queries require the correct organization and student identifiers; cross-tenant data is not returned by design.
- **Bank of Africa sandbox** is tied to a dedicated partner record and sandbox school; production schools remain isolated.
- Partner OAuth tokens carry **partner and scope** context; gateway and service layers enforce module permissions.
- Database access from application code uses tenant-aware queries; direct ad hoc access is restricted to authorized DBAs under change control.

Bank integration data (test transactions in sandbox) is logically separate from unrelated schools unless explicitly granted in production onboarding.

---

## Declaration

We confirm that the information above is accurate to the best of our knowledge as of the document date. ShulePlus commits to timely updates if material changes affect Bank of Africa’s integration or security posture.

**Authorized signatory**

Name: ___________________________  
Title: ___________________________  
Organization: Theoneste IT Ltd / ShulePlus  
Date: ___________________________  
Signature: ___________________________

---

*For questions on this response, contact the ShulePlus Integration Team.*
