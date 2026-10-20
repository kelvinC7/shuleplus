# Babyeyi Wizard — API Reference

Endpoints used by the Pro Manager Babyeyi Wizard and List modules.

**Base URL:** `{VITE_API_URL}/api` (default `http://localhost:5100/api`)  
**Auth:** Session cookie, `credentials: "include"`

---

## Wizard lifecycle

### GET `/babyeyi/school-info`

Load school profile for Step 1 auto-fill.

**Returns:** School name, code, location, ownership type, logo/signature/stamp paths.

**Used by:** `Babyeyi.jsx` on mount.

---

### POST `/babyeyi/upload-asset`

Upload logo, signature, or stamp to school profile.

| Field | Type | Values |
|-------|------|--------|
| `file` | File | PNG/JPG image |
| `asset_type` | string | `logo`, `signature`, `stamp` |

**Used by:** Step 1 (logo), Step 5 (signature, stamp).

---

### GET `/babyeyi/nesa-limit`

Fetch NESA fee limit for Smart Checker.

| Query param | Description |
|-------------|-------------|
| `level` | Education level (P1, S1, etc.) |
| `term` | Term 1 / 2 / 3 |
| `category` | Public, Boarding, TVET, Private |
| `district` | School district |

**Fallback:** `GET /api/fee-limits`

---

### GET `/babyeyi/student-requirements-catalog`

Standard requirement checklist for Step 3.

**Source table:** `student_requirements`

**Returns:** `{ id, name, description, quantity }[]`

---

### GET `/schools/:id/classes`

Registered class/stream labels for `ClassStreamPicker`.

**Returns:** Distinct class labels from school registry + student records.

---

### POST `/babyeyi`

Create new Babyeyi document (multipart FormData).

#### FormData fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `school_id` | string | Yes | Session school ID |
| `academic_year` | string | Yes | e.g. `2025-2026` |
| `term` | string | Yes | Term 1 / 2 / 3 |
| `class_name` | string | Yes | Primary class label |
| `class` | string | Yes | Same as class_name |
| `classes` | JSON string | Yes | Array of selected class labels |
| `education_level` | string | Yes | Inferred from class |
| `level` | string | Yes | NESA fee limit level |
| `school_category` | string | Yes | Public / Boarding / TVET / Private |
| `category` | string | Yes | Same as school_category |
| `ownership_type` | string | Yes | Government / Government-Aided / Private |
| `fee_target_students` | string | Yes | `public` or `private` |
| `school_province` | string | | Rwanda province |
| `province` | string | | Duplicate for compatibility |
| `school_district` | string | | |
| `district` | string | | |
| `school_sector` | string | | |
| `sector` | string | | |
| `cell` | string | | |
| `village` | string | | |
| `language` | string | | Default `en` |
| `parent_message` | string | | Freeform parent notice |
| `bank_name` | string | | Primary bank |
| `bank_account_no` | string | | |
| `bank_account_name` | string | | |
| `banks_json` | JSON string | | All banks including primary |
| `extra_bank_accounts` | JSON string | | Additional banks only |
| `payments` | JSON string | | `[{ name, amount, pay_channel }]` |
| `requirements` | JSON string | | `[{ item, description, quantity, pay_channel, cost }]` |
| `classReqs` | JSON string | | Class-specific notes |
| `other_infos` | JSON string | | `[{ item }]` |
| `leaders` | JSON string | | `[{ name, role, phone, email }]` |
| `request_increase` | string | | `"true"` or `"false"` |
| `increase_reason` | string | | Request title |
| `increase_desc` | string | | Request description |
| `request_reasons` | JSON string | | Checkbox reasons |
| `request_other_reason` | string | | Free text reason |
| `school_logo` | File | | Optional |
| `other_logo` | File | | Optional |
| `director_signature` | File | | Optional |
| `stamp` | File | | Optional |
| `parent_rep_doc` | File | | Required if increase request |
| `budget_doc` | File | | Required if increase request |

---

### PUT `/babyeyi/:id`

Update existing document. Same FormData fields as POST.

**Used by:** Edit modal from Babyeyi List.

---

### GET `/babyeyi/:id/qrcode`

Generate or retrieve QR code after save.

**Returns:**

```json
{
  "success": true,
  "data": {
    "qr_code_url": "/uploads/...",
    "qr_view_url": "https://babyeyi.rw/babyeyi/verify/..."
  }
}
```

---

## List & documents

### GET `/babyeyi`

List Babyeyi records for school.

| Query | Description |
|-------|-------------|
| `school_id` | Filter by school |
| `limit` | Max rows (default 200) |
| `lang` | Content language |

---

### GET `/babyeyi/:id`

Full record for view/edit modal.

| Query | Description |
|-------|-------------|
| `lang` | Display language |

---

### DELETE `/babyeyi/:id`

Delete a Babyeyi record.

---

### GET `/babyeyi/:id/pdf`

Server-side PDF download.

| Query | Description |
|-------|-------------|
| `download=1` | Force download |
| `lang` | PDF language |

---

### GET `/babyeyi/:id/print`

Print-friendly HTML view.

| Query | Description |
|-------|-------------|
| `autoprint=1` | Auto-trigger print dialog |
| `lang` | Content language |

---

### POST `/babyeyi/:id/regenerate-docs`

Regenerate QR code and PDF assets.

---

### PATCH `/babyeyi/:id/content-i18n/rw`

Update Kinyarwanda narrative content (role-gated).

---

### GET `/babyeyi/stats`

Dashboard metrics for school console.

| Query | Description |
|-------|-------------|
| `school_id` | Filter by school |

---

## Approval endpoints (district / NESA portals)

| Method | Path | Action |
|--------|------|--------|
| PATCH | `/babyeyi/:id/district-approve` | DEO approves |
| PATCH | `/babyeyi/:id/district-recommend` | DEO recommends to NESA |
| PATCH | `/babyeyi/:id/district-reject` | DEO rejects |
| PATCH | `/babyeyi/:id/nesa-approve` | NESA approves (increase) |
| PATCH | `/babyeyi/:id/nesa-reject` | NESA rejects |
| POST | `/babyeyi/:id/submit-request` | Submit increase request |

---

## Public verification

### GET `/babyeyi/verify/:docId`

Public document verification (no auth).

| Query | Description |
|-------|-------------|
| `h` | Integrity hash (16 hex chars) |

---

## Leaders CRUD (optional direct API)

| Method | Path |
|--------|------|
| GET | `/babyeyi/:id/leaders` |
| POST | `/babyeyi/:id/leaders` |
| PUT | `/babyeyi/:id/leaders/:leaderId` |
| DELETE | `/babyeyi/:id/leaders/:leaderId` |

Leaders are also embedded in the main POST/PUT FormData as `leaders` JSON.

---

## Postman collection

Full request examples: `BabyeyiSystem/docs/postman/BabyeyiSystem.postman_collection.json` — section **06 - Babyeyi Core**.
