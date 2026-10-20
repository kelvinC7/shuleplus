# 10 — Babyeyi List & Documents

The **Babyeyi List** (`?tab=babyeyi_list`) is the registry for viewing, editing, sharing, and exporting published Babyeyi documents.

---

## Features

| Feature | Description |
|---------|-------------|
| **Record cards** | Class, term, year, total fee, status badge |
| **Search & filters** | Filter by status, class, term |
| **View document** | Full-screen official document modal |
| **Edit** | Opens `CreateBabyeyiModal` (wizard in modal mode) |
| **Delete** | Remove record with confirmation |
| **PDF download** | Client WYSIWYG capture or server fallback |
| **Print** | Opens print view with autoprint |
| **WhatsApp share** | Share verify link via WhatsApp |
| **QR code display** | Client-generated or server PNG |
| **Multi-language view** | EN / RW / FR with machine translation |
| **Kinyarwanda edit** | Role-gated inline edit of narrative fields |
| **Regenerate docs** | Rebuild QR and PDF assets |
| **Status badges** | Draft, Pending, Approved, Rejected |
| **PDF/WhatsApp lock** | Locked until approved (and NESA increase approved) |

---

## Frontend design

| Item | Detail |
|------|--------|
| **Route** | `/manager/school-console?tab=babyeyi_list` |
| **Component** | `schoolLite/BabyeyiList.jsx` |
| **Edit modal** | `CreateBabyeyiModal` from `Babyeyi.jsx` |
| **Theme** | Navy `#000435` + amber accents, MTN font |

### Key sub-components

| Component | Purpose |
|-----------|---------|
| `OfficialDoc` | View modal with language tabs |
| `KinyarwandaSectionEditModal` | Edit RW narrative slices |
| `ShareModal` | WhatsApp share flow |
| `ensureQRCode()` | Client or server QR generation |

### Status configuration

```js
draft, pending, approved, rejected
// Each with label, bg, text, dot, border colors
```

### Lock logic

```js
isPdfWhatsappLocked(rec):
  if fee exceeds NESA limit:
    locked unless status === "approved" AND nesa_request_status === "approved"
  else:
    locked unless status === "approved"
```

---

## Backend logic

| Endpoint | Purpose |
|----------|---------|
| `GET /babyeyi?limit=200&school_id=` | List records |
| `GET /babyeyi/:id?lang=` | Full record for view/edit |
| `DELETE /babyeyi/:id` | Delete |
| `GET /babyeyi/:id/pdf?download=1&lang=` | Server PDF |
| `GET /babyeyi/:id/print?lang=&autoprint=1` | Print view |
| `POST /babyeyi/:id/regenerate-docs` | Regenerate assets |
| `PATCH /babyeyi/:id/content-i18n/rw` | Save Kinyarwanda edits |

### PDF generation (two paths)

1. **Client (preferred):** `renderBabyeyiPdfFromRoot()` — html2canvas + jsPDF, WYSIWYG from view modal
2. **Server fallback:** `GET /:id/pdf` — Puppeteer via `babyeyiPuppeteerPdf.js`

### Verify URL

```js
babyeyiVerifyScanUrl(docId, integrityHash)
// → {ORIGIN}/babyeyi/verify/{docId}?h={hash16}
```

Set `VITE_BABYEYI_VERIFY_PUBLIC_URL` in production.

### i18n roles

Roles allowed to edit Kinyarwanda content:
MANAGER, SCHOOL_MANAGER, SCHOOL_ADMIN, HEAD_TEACHER, DIRECTOR, PRINCIPAL, ADMIN

### Translation services

- UI strings: `useBabyeyiUiT()` hook + `i18n/en.json`
- On-demand translation: `lingvaTranslate.js` for view modal language switch

---

## User flows

### View & share (approved document)

1. Open Babyeyi List
2. Click **View** on card
3. Select language tab (EN / RW / FR)
4. Click **PDF** or **WhatsApp** (unlocked when approved)

### Edit existing

1. Click **Edit** on card
2. Wizard opens in modal with hydrated form
3. Save → `PUT /babyeyi/:id`
4. List refreshes

### Kinyarwanda content edit

1. Open View modal in RW language
2. Click edit icon on a section (payment, requirement, leader, etc.)
3. Save → `PATCH /content-i18n/rw`
4. PDF regenerated on server
