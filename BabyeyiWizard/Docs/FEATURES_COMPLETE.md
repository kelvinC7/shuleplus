# Babyeyi Wizard — Complete Feature Manual

> **Module:** Pro Manager Portal — School Console  
> **Route:** `/manager/school-console?tab=babyeyi`  
> **Version:** Production (8-step wizard)  
> **Last updated:** July 2026

---

## Table of contents

1. [Overview](#1-overview)
2. [Access & navigation](#2-access--navigation)
3. [Wizard step 1 — School & Classes](#3-wizard-step-1--school--classes)
4. [Wizard step 2 — Payments & NESA](#4-wizard-step-2--payments--nesa)
5. [Wizard step 3 — Requirements](#5-wizard-step-3--requirements)
6. [Wizard step 4 — Bank Account](#6-wizard-step-4--bank-account)
7. [Wizard step 5 — Authorization](#7-wizard-step-5--authorization)
8. [Wizard step 6 — Class Notes](#8-wizard-step-6--class-notes)
9. [Wizard step 7 — Leaders](#9-wizard-step-7--leaders)
10. [Wizard step 8 — Preview & Submit](#10-wizard-step-8--preview--submit)
11. [Babyeyi List & documents](#11-babyeyi-list--documents)
12. [School console dashboard](#12-school-console-dashboard)
13. [Business rules summary](#13-business-rules-summary)
14. [API endpoints summary](#14-api-endpoints-summary)
15. [Developer file reference](#15-developer-file-reference)

---

## 1. Overview

The **Babyeyi Wizard** is an 8-step guided form that lets school managers create official **Babyeyi** fee documents — structured publications listing tuition payments, student requirements, bank accounts, authorization assets, and school leadership contacts.

### What the wizard produces

| Output | Description |
|--------|-------------|
| **Official Babyeyi document** | Printable HTML/PDF for parents |
| **QR verification code** | Scannable link to public verify page |
| **Database record** | Persisted in `babyeyi_documents` |
| **Approval workflow** | District/NESA review when fees exceed limits |

### Architecture at a glance

```
Manager Portal
  └── School Console (/manager/school-console)
        ├── Dashboard        — stats & alerts
        ├── Babyeyi Wizard   — 8-step create/edit ★
        └── Babyeyi List     — registry, PDF, share
              ↓
        BabyeyiSystem API (/api/babyeyi/*)
              ↓
        MySQL + file storage + Puppeteer PDF
```

---

## 2. Access & navigation

### Who can access

| Condition | Access |
|-----------|--------|
| School has `pro_access_effective = true` | ✅ Full school console |
| User has `pro.school_console.access` permission | ✅ Full school console |
| User has wildcard `*` permission | ✅ Full school console |
| Neither | ❌ Redirected / hidden |

**Gate file:** `manager/utils/schoolConsoleAccess.js`

### How to open the wizard

| Entry point | Path |
|-------------|------|
| Sidebar → Babyeyi School Admin → Babyeyi Wizard | `/manager/school-console?tab=babyeyi` |
| Dashboard → Create New Babyeyi | Sets tab to `babyeyi` |
| Dashboard → NESA exceed alert | Sets tab to `babyeyi` |
| Babyeyi List → Edit | Opens wizard modal |

### School console tabs

| Tab | Param | Component |
|-----|-------|-----------|
| Dashboard | `dashboard` | `Dashboard.jsx` |
| **Babyeyi Wizard** | `babyeyi` | `Babyeyi.jsx` |
| **Babyeyi List** | `babyeyi_list` | `BabyeyiList.jsx` |
| Students | `students` | `StudentsPage.jsx` |
| Student Transfer | `student_transfer` | `StudentTransferPage.jsx` |
| School Website | `school_mini_website` | `SchoolMiniWebsitePage.jsx` |

### Environment setup

```bash
# Backend
cd BabyeyiSystem/backend && npm run dev    # :5100

# Frontend
cd babyeyipro/Frontend/web && npm run dev   # :5174
```

| Env variable | Purpose |
|--------------|---------|
| `VITE_API_URL` | Backend origin |
| `VITE_BABYEYI_VERIFY_PUBLIC_URL` | Public QR verify domain |
| `VITE_BABYEYI_LOGIN_URL` | Login redirect for verify |

---

## 3. Wizard step 1 — School & Classes

**Purpose:** Set academic context, school identity, target classes, and parent message.

### Features

| # | Feature | Details |
|---|---------|---------|
| 1 | Include School Details toggle | Show/hide school block on printed document |
| 2 | Auto-fill from school profile | Name, location loaded from `/babyeyi/school-info` |
| 3 | Rwanda location cascades | Province → District → Sector → Cell → Village |
| 4 | School logo upload | Saved to school profile; reused on future Babyeyi |
| 5 | Other logo (optional) | Secondary brand image |
| 6 | Ownership context banners | Government / Private / Government-Aided info panels |
| 7 | Student cohort picker | Government-Aided only: public vs private students |
| 8 | Academic year selector | From AcademicContext; current year marked |
| 9 | Term selector | Term 1 / 2 / 3 from settings |
| 10 | Category selector | Public / Boarding / TVET / Private |
| 11 | Category lock | Auto-locked for private schools and certain cohorts |
| 12 | Education level picker | Filters class list (P1, S1, etc.) |
| 13 | Class stream picker | Multi-select from registered school classes |
| 14 | Select all / clear level | Bulk class selection for current level |
| 15 | Multi-class Babyeyi | One document shared across multiple classes |
| 16 | Parent message | Freeform notice on document |

### Validation

- At least **one class** must be selected before proceeding.
- Classes must finish loading from API.

### Ownership rules

| School type | NESA checker | Category |
|-------------|--------------|----------|
| Private | Off | Locked: Private |
| Government | On | Public or Boarding |
| Government-Aided (public cohort) | On | Public / Boarding / TVET |
| Government-Aided (private cohort) | Off | Locked: Private |

---

## 4. Wizard step 2 — Payments & NESA

**Purpose:** Define fee payment lines and validate against NESA national limits.

### Features

| # | Feature | Details |
|---|---------|---------|
| 1 | Payment line items | Name, amount (RWF), pay channel per row |
| 2 | Add / remove rows | Dynamic payment list |
| 3 | Pay channel | "Other requirements" or "Paid to School Account" |
| 4 | Grand total | Live sum display |
| 5 | NESA Smart Checker | Compares total vs national limit |
| 6 | Limit progress bar | Visual fee vs limit indicator |
| 7 | Over-limit alert | Red highlight with excess amount |
| 8 | Request Increase Approval | Toggle for above-limit fees |
| 9 | Increase request modal | Title, description, two document uploads |
| 10 | Private bypass | No checker for private schools/cohorts |

### NESA Smart Checker

Active when school is not private AND fee target is public students.

**Limit sources (in order):**
1. `GET /api/babyeyi/nesa-limit`
2. `GET /api/fee-limits`
3. Client defaults

### Increase request requirements

When total fee exceeds NESA limit:

| Field | Required |
|-------|----------|
| Request title | ✅ |
| Description | ✅ |
| Parent approval document | ✅ |
| School budget document | ✅ |

Without these, submit is blocked. PDF and WhatsApp remain locked until DEO + NESA approve.

---

## 5. Wizard step 3 — Requirements

**Purpose:** Build the student requirements checklist for the document.

### Features

| # | Feature | Details |
|---|---------|---------|
| 1 | Standard package checklist | From `student_requirements` DB catalog |
| 2 | Select all | Bulk-add all catalog items |
| 3 | Loading / error / empty states | Retry on failure; setup hint when empty |
| 4 | Custom requirements | Manual rows: item, description, quantity |
| 5 | Pay channel per item | Other requirements vs Paid to School Account |
| 6 | Cost field | RWF amount when paid at school |
| 7 | Other school information | Freeform policy notes (shared with Step 6) |

---

## 6. Wizard step 4 — Bank Account

**Purpose:** Capture bank details for fee payment instructions.

### Features

| # | Feature | Details |
|---|---------|---------|
| 1 | Primary bank account | Bank dropdown, account number, account name |
| 2 | Rwanda bank presets | 11 preset banks (BK, Equity, I&M, etc.) |
| 3 | Live card preview | Navy gradient preview of primary account |
| 4 | Additional bank accounts | Add/remove Bank 2, 3, … |
| 5 | Primary badge | Visual distinction for main account |

---

## 7. Wizard step 5 — Authorization

**Purpose:** Upload signature and stamp for the official document.

### Features

| # | Feature | Details |
|---|---------|---------|
| 1 | Head teacher signature | Image upload with preview |
| 2 | Official school stamp | Image upload with preview |
| 3 | Load from school profile | Auto-load existing DB assets |
| 4 | Persist to profile | Uploads saved for reuse on future Babyeyi |
| 5 | Format guidance | PNG transparent background recommended |

---

## 8. Wizard step 6 — Class Notes

**Purpose:** Add other school information / policy notes.

### Features

| # | Feature | Details |
|---|---------|---------|
| 1 | Other school information list | Dynamic text rows (A, B, C…) |
| 2 | Add / remove items | Unlimited entries |
| 3 | Shared with Step 3 | Same `otherInfos` state |

---

## 9. Wizard step 7 — Leaders

**Purpose:** School leadership contacts on the document.

### Features

| # | Feature | Details |
|---|---------|---------|
| 1 | Multiple leader cards | Add/remove leaders |
| 2 | Full name | Required |
| 3 | Role / position | Preset dropdown + custom "Other" |
| 4 | Phone number | Contact phone |
| 5 | Email address | Contact email |
| 6 | Live card preview | Header updates as user types |

---

## 10. Wizard step 8 — Preview & Submit

**Purpose:** Review, validate, save, and generate QR codes.

### Features

| # | Feature | Details |
|---|---------|---------|
| 1 | Summary cards | Classes, total fee, NESA status, bank, leaders |
| 2 | Document preview | Live official layout preview |
| 3 | Validation checklist | Pass/fail indicators |
| 4 | Submit | POST (create) or PUT (edit) |
| 5 | QR generation | Server QR after save |
| 6 | Success screen | Confirmation + QR grid |
| 7 | Copy verify link | Clipboard copy |
| 8 | Create Another | Reset wizard for new document |

### Post-submit status

| Condition | Status shown |
|-----------|--------------|
| Private / no NESA | Submitted |
| Within NESA limit | Approved (UI) |
| Over limit + increase request | Pending review |

---

## 11. Babyeyi List & documents

**Route:** `/manager/school-console?tab=babyeyi_list`

### Features

| # | Feature | Details |
|---|---------|---------|
| 1 | Record cards | Class, term, year, fee, status badge |
| 2 | Search & filters | Status, class, term filters |
| 3 | View document | Full-screen official doc modal |
| 4 | Edit | Wizard modal with hydrated form |
| 5 | Delete | With confirmation |
| 6 | PDF download | Client WYSIWYG or server fallback |
| 7 | Print | Autoprint HTML view |
| 8 | WhatsApp share | Share verify link |
| 9 | QR code | Client or server generated |
| 10 | Multi-language | EN / RW / FR with machine translation |
| 11 | Kinyarwanda edit | Role-gated inline narrative edit |
| 12 | Regenerate docs | Rebuild QR + PDF |
| 13 | PDF/WhatsApp lock | Until approved (+ NESA increase if applicable) |

### Document lock rules

| Scenario | Unlocked when |
|----------|---------------|
| Normal Babyeyi | `status === approved` |
| Over NESA limit | `status === approved` AND NESA increase approved |

---

## 12. School console dashboard

**Route:** `/manager/school-console?tab=dashboard`

### Babyeyi-related features

| Feature | Description |
|---------|-------------|
| Total Babyeyi count | From `GET /babyeyi/stats` |
| NESA exceed alert | Banner when records exceed limits |
| Recent Babyeyi list | Last 4 records |
| Quick action | "Create New Babyeyi" → wizard tab |
| Fee compliance rate | Stats visualization |

---

## 13. Business rules summary

### School ownership → fee scope

| Ownership | Fee scope | NESA | Category |
|-----------|-----------|------|----------|
| Private | private | Off | Private (locked) |
| Government | public | On | Public / Boarding |
| Government-Aided | aided | Depends on cohort | Depends on cohort |

### Payment pay channels

| Channel | Label | Use |
|---------|-------|-----|
| `babyeyi` | Other requirements | Not paid to school bank |
| `school` | Paid to School Account | Collected at school office |

### Approval workflow

```
Create → draft
  ├── Within NESA limit → approved → PDF unlocked
  └── Over limit + increase → pending → DEO/NESA review → approved/rejected
```

### QR verification

Format: `{PUBLIC_ORIGIN}/babyeyi/verify/{docId}?h={hash16}`

---

## 14. API endpoints summary

### Wizard

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/babyeyi/school-info` | School profile |
| POST | `/babyeyi/upload-asset` | Logo, signature, stamp |
| GET | `/babyeyi/nesa-limit` | NESA fee limit |
| GET | `/babyeyi/student-requirements-catalog` | Requirements checklist |
| GET | `/schools/:id/classes` | Class options |
| POST | `/babyeyi` | Create document |
| PUT | `/babyeyi/:id` | Update document |
| GET | `/babyeyi/:id/qrcode` | QR code |

### List & documents

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/babyeyi` | List records |
| GET | `/babyeyi/:id` | Full record |
| DELETE | `/babyeyi/:id` | Delete |
| GET | `/babyeyi/:id/pdf` | PDF download |
| GET | `/babyeyi/:id/print` | Print view |
| POST | `/babyeyi/:id/regenerate-docs` | Regenerate assets |
| PATCH | `/babyeyi/:id/content-i18n/rw` | Kinyarwanda edit |
| GET | `/babyeyi/stats` | Dashboard stats |

Full reference: [API_REFERENCE.md](./API_REFERENCE.md)

---

## 15. Developer file reference

| Layer | File | Role |
|-------|------|------|
| Wizard UI | `manager/pages/schoolLite/Babyeyi.jsx` | 8-step wizard |
| List UI | `manager/pages/schoolLite/BabyeyiList.jsx` | Registry + documents |
| Scope rules | `manager/pages/schoolLite/babyeyiWizardSchoolScope.js` | Ownership logic |
| Shell | `manager/pages/SchoolLiteSuite.jsx` | Tab router |
| Access | `manager/utils/schoolConsoleAccess.js` | Permission gate |
| API helpers | `manager/lib/schoolLiteApi.js` | Base URL, verify links |
| PDF export | `manager/pages/schoolLite/babyeyiPdfExport.js` | Client PDF |
| Doc frame | `manager/pages/schoolLite/babyeyiDocFrame.js` | HTML template |
| Class picker | `manager/components/ClassStreamPicker.jsx` | Multi-select |
| Level picker | `manager/components/EducationLevelPicker.jsx` | Education level |
| Academic ctx | `manager/context/AcademicContext.jsx` | Year/term |
| Backend | `BabyeyiSystem/backend/BabyeyiRoutes/babyeyi.js` | All APIs |
| Schema | `BabyeyiSystem/backend/utils/babyeyiSchema.js` | DB schema |

### Legacy files (do not use)

| File | Status |
|------|--------|
| `pages/BabyeyiWizard.jsx` | Prototype — mock data |
| `UpdateBabyeyi.jsx` | Duplicate — not routed |
| `BabyeyiListServer.jsx` | Old list — not imported |
| `pages/BabyeyiHub.jsx` | Orphan — not routed |

---

## Export to Word

```powershell
cd babyeyipro/docs/babyeyi-wizard
pandoc FEATURES_COMPLETE.md -o Babyeyi-Wizard-Manual.docx
```

---

*Babyeyi Wizard — Pro Manager Portal — Complete Feature Manual*
