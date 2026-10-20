# View & Print — Official Circular Document

> **Route:** `/circulars` → **View & Print**  
> **Goal:** Clean official A4 printouts — professional, not overdesigned  
> **Primary files:** `official-doc-modal.tsx`, `official-doc-document.tsx`, `babyeyi-pdf-export.ts`, `build-official-doc-html.ts`, Backend `babyeyi-doc-html.ts`

## Flow

1. List → **View & Print** opens `OfficialDocModal` (toolbar is product UI).
2. White `#babyeyi-pdf-doc` is the print artifact (794px A4, Georgia, navy rules).
3. Language EN / RW / FR switches section labels + `contentI18n` parent message.
4. **Print** → `GET /api/babyeyi/:id/print?lang=&autoprint=1` (JWT), falls back to client HTML.
5. **PDF** → html2canvas + jsPDF from `#babyeyi-pdf-doc` (≤2 A4 pages).
6. Print/PDF locked until status is `APPROVED` or `PUBLISHED`.

## Anatomy

Header (logos + school) → parent message → fees → banking → requirements → other → leaders → notes → auth (signature · QR · stamp).
