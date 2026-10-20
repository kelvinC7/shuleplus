# 07 — Class Notes (Step 6)

Step 6 adds **Other School Information** — freeform policy notes and reminders shown on the Babyeyi document.

---

## Features

| Feature | Description |
|---------|-------------|
| **Other school information list** | Dynamic text rows labeled A, B, C… |
| **Add / remove items** | Unlimited bullet-style entries |
| **Placeholder examples** | "Parents must clear all fees before mid-term exams…" |
| **Empty state** | Dashed border prompt when no items added |

---

## Frontend design

| Item | Detail |
|------|--------|
| **Component** | `Babyeyi.jsx` → `renderStep()` case 6 |
| **Note** | Same `otherInfos` array also editable in Step 3 |

### Row shape

```js
{ item: "" }
```

Changes in Step 3 or Step 6 share the same `form.otherInfos` state.

---

## Backend logic

### FormData field

```
other_infos → JSON [{ item }]
```

Stored in `babyeyi_documents` and rendered in the document "Other Information" section.

### i18n

Kinyarwanda edits for other-info items available in the List view modal via `PATCH /content-i18n/rw` (type: `otherInfo`).
