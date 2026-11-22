# Curriculum Intelligence (Shule+)

REB-aligned curriculum library, PDF extraction pipeline, and AI lesson plan generation for **TichaPortal** and the **Superadmin Curriculum Center**.

## Architecture

| Layer | Location | Role |
|-------|----------|------|
| Superadmin UI | `Authentication/Frontend` → `/super-admin/curriculum` | Upload books, review tree, publish |
| Teacher UI | `TichaPortal` → `/lesson-plans` | Select curriculum, generate & edit plans |
| API | `CurriculumIntelligence/Backend` (:3094) | Prisma/PostgreSQL, uploads, generation |
| PDF worker | `CurriculumIntelligence/worker/extract_pdf.py` | PyMuPDF text + unit hints |

Production flow uses **uploaded PDFs** (seed is template-only unless `SEED_PILOT_CURRICULUM=true`).

## Local setup

```bash
cd CurriculumIntelligence/Backend
npm install
cp .env.example .env
# Set DATABASE_URL to a dedicated PostgreSQL database

npm run prisma:migrate
npm run prisma:seed
npm run dev
```

PDF extraction (required for real curriculum):

```bash
pip install pymupdf
# Optional OCR for scanned pages: pip install pytesseract pillow + install Tesseract on OS
```

### Real-data workflow (P5 Mathematics TG)

1. Superadmin → **Curriculum Intelligence → Upload PDF** (official TG from [REB eLearning](https://elearning.reb.rw/)).
2. Wait for status **NEEDS_REVIEW** — pages + units/lessons are stored in PostgreSQL.
3. Open **Review** — compare **source PDF** vs **extracted text** page by page; fix titles if needed.
4. **Publish** — teachers only see **PUBLISHED** books in TichaPortal.
5. Teacher → **Lesson Plans** → generate from extracted lesson → edit, export PDF/DOCX, optional **AI improve** per stage (`OPENAI_API_KEY`).

Optional: set `REDIS_URL` for BullMQ background extraction on large books.

Environment (Backend `.env`):

- `DATABASE_URL` — PostgreSQL
- `JWT_ACCESS_SECRET` — must match IAM
- `SERVICE_API_KEY` — match IAM `MODULE_PROVISIONING_KEY` if using service calls
- **AI providers** — see [docs/AI-PROVIDERS.md](docs/AI-PROVIDERS.md) (Azure OpenAI, Groq, Gemini, Ollama); keys stay server-side only

## API (summary)

- `GET /api/health`
- **Platform (Super Admin JWT):** `/api/platform/books`, upload, tree, publish status
- **Teacher (school JWT):** `/api/teacher/catalog`, `/api/teacher/lesson-plans/generate`

## REB e-learning

Official teacher guidance and resources: [REB eLearning](https://elearning.reb.rw/).  
Ensure you have rights to store and process uploaded REB PDFs for your deployment.

## Next phases

- BullMQ job queue for large books
- OCR worker for scanned pages
- Side-by-side PDF review UI
- DOCX/PDF export, DOS approval workflow
- LLM section regeneration with strict JSON schema + validation
