# 06 — Authorization (Step 5)

Step 5 uploads the head teacher signature and official school stamp that appear on the printed Babyeyi document.

---

## Features

| Feature | Description |
|---------|-------------|
| **Head teacher signature** | Image upload with preview |
| **Official school stamp** | Image upload with preview |
| **Load from school profile** | Auto-load existing assets from DB |
| **Persist to school profile** | Uploads saved via upload-asset for reuse |
| **Replace existing** | Upload new file to replace profile asset |
| **Format guidance** | PNG with transparent background recommended |

---

## Frontend design

| Item | Detail |
|------|--------|
| **Component** | `Babyeyi.jsx` → `renderStep()` case 5 |
| **Upload helper** | `uploadSchoolAsset(assetType, file, showToast)` |
| **Preview state** | `previews.directorSignature`, `previews.stamp` |
| **DB flag state** | `dbAssets.directorSignature`, `dbAssets.stamp` |

### Asset types

| UI label | `asset_type` param | Form field |
|----------|-------------------|------------|
| Head Teacher Signature | `signature` | `directorSignature` |
| Official School Stamp | `stamp` | `stamp` |

### Load flow

1. On wizard open, `GET /school-info` returns asset paths.
2. If paths exist, preview shown with green "Loaded from school profile" banner.
3. New upload calls `POST /upload-asset` immediately (not deferred to submit).
4. On submit, File objects also appended to FormData if changed.

---

## Backend logic

| Endpoint | Purpose |
|----------|---------|
| `POST /babyeyi/upload-asset` | Save to school profile |
| FormData on submit | `director_signature`, `stamp` files |

### Storage

Assets stored on school record and referenced by all future Babyeyi documents for that school.

### Document rendering

Signature and stamp rendered in the authorization block at the bottom of the official document via `buildBabyeyiAuthBlockHtml()` in `babyeyiPdfExport.js`.
