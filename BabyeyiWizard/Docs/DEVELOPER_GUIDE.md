# Babyeyi Wizard — Developer Guide

Onboarding guide for developers working on the Pro Manager Babyeyi Wizard.

---

## Before you start

1. Read [00-architecture.md](./00-architecture.md) for the file map.
2. Read [BUSINESS_RULES.md](./BUSINESS_RULES.md) for NESA and ownership logic.
3. Use **`schoolLite/Babyeyi.jsx`** — not `pages/BabyeyiWizard.jsx` (prototype) or `UpdateBabyeyi.jsx` (legacy).

---

## Local development

```bash
# Terminal 1 — Backend
cd BabyeyiSystem/backend && npm run dev

# Terminal 2 — Frontend
cd babyeyipro/Frontend/web && npm run dev
```

Open: `http://localhost:5174/manager/school-console?tab=babyeyi`

**Test account requirements:**
- School with `pro_access_effective = true`, OR
- User permission `pro.school_console.access`

---

## Core component: `BabyeyiWizard`

```jsx
// Exported from Babyeyi.jsx
export function BabyeyiWizard({
  session,        // { schoolId, schoolName, userRole, ... }
  editRecord,     // Full record when editing (optional)
  onClose,        // Modal close callback
  onSuccess,      // Called after save in modal mode
  layout,         // "page" | "modal"
})
```

### Entry points

| Export | Usage |
|--------|-------|
| `BabyeyiWizard` | Main wizard (page or modal) |
| `CreateBabyeyiModal` | Wrapper for list edit flow |
| Default export | Page layout at `?tab=babyeyi` |

---

## Adding a new wizard step

1. Add to `STEPS` array (~line 253):
   ```js
   { id: 9, label: "New Step", Icon: SomeIcon }
   ```
2. Add `case 9:` in `renderStep()` switch.
3. Update validation in `handleNext()` if the step has required fields.
4. Add FormData fields in `handleSave()` if persisting new data.
5. Update backend `babyeyi.js` POST/PUT handler and schema.
6. Add a feature doc in `docs/babyeyi-wizard/features/`.

---

## Extending form state

Form is built from `buildBlankForm()` and updated via `up(key, value)`:

```js
const up = (key, val) => setForm(f => ({ ...f, [key]: val }));
```

When adding fields:
1. Add default in `buildBlankForm()`.
2. Map in `hydrateFormFromEditRecord()` for edit mode.
3. Append to FormData in `handleSave()`.
4. Parse on backend in POST/PUT handler.

---

## NESA integration checklist

When changing fee logic:

- [ ] Update `nesaApplies` condition (ownership + cohort)
- [ ] Verify `GET /nesa-limit` query params match selected class/category/term
- [ ] Test government, private, and government-aided schools
- [ ] Test over-limit flow with increase request documents
- [ ] Confirm PDF lock in `BabyeyiList.jsx` still correct

---

## Class picker integration

Classes come from `GET /api/schools/:id/classes` merged with default catalog via `mergeWithDefaultClassCatalog()`.

Key utils:
- `inferNesaFeeLimitLevelFromClass()` — NESA level from class label
- `filterLabelsByLevel()` — filter picker by education level
- `sortSelectedClassesByCatalog()` — consistent ordering

---

## Document rendering pipeline

```
BabyeyiList OfficialDoc modal
  → wrapBabyeyiDocHtml()        (babyeyiDocFrame.js)
  → BabyeyiDocFrame             (babyeyiDocFrameView.jsx)
  → renderBabyeyiPdfFromRoot()  (babyeyiPdfExport.js) — client PDF
  → OR GET /babyeyi/:id/pdf     — server Puppeteer PDF
```

Prefer client PDF for WYSIWYG; server PDF as fallback.

---

## i18n

- UI strings: `manager/schoolLiteSupport/i18n/en.json` (+ rw, fr)
- Hook: `useBabyeyiUiT()`
- Machine translation: `lingvaTranslate.js` for on-demand EN → RW/FR in view modal
- Stored Kinyarwanda edits: `PATCH /content-i18n/rw`

---

## Common pitfalls

| Pitfall | Fix |
|---------|-----|
| Wizard shows at `/finance/wizard` but doesn't save | That route uses mock prototype — use school console |
| NESA checker always off | Check school ownership and `feeTargetStudents` |
| Classes empty | Ensure school has registered classes in DB |
| QR link opens manager origin | Set `VITE_BABYEYI_VERIFY_PUBLIC_URL` in production |
| Edit modal doesn't hydrate | Check `hydrateFormFromEditRecord()` field mapping |
| PDF locked after approval | Check both `status` and `increase_request.nesa_status` |

---

## Testing checklist

- [ ] Create Babyeyi — all 8 steps, submit, QR generated
- [ ] Edit existing from list modal
- [ ] Delete from list
- [ ] View document in EN / RW / FR
- [ ] Download PDF (approved record)
- [ ] WhatsApp share (approved record)
- [ ] Over-limit + increase request flow
- [ ] Private school (no NESA checker)
- [ ] Government-aided — public vs private cohort
- [ ] Multi-class selection

---

## Related backend files

| File | When to edit |
|------|--------------|
| `BabyeyiRoutes/babyeyi.js` | New endpoints, FormData parsing |
| `utils/babyeyiSchema.js` | New DB columns |
| `utils/babyeyiDocHtml.js` | Document HTML template changes |
| `utils/babyeyiPuppeteerPdf.js` | Server PDF layout |
