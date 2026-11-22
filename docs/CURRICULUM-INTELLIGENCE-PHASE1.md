# Curriculum Intelligence — Phase 1 (completed baseline)

## Existing Shule+ architecture (inspection summary)

| Area | Finding |
|------|---------|
| **IAM** | `Authentication/Backend` — JWT (`JWT_ACCESS_SECRET`), Superadmin Next.js UI on :3000, API :3001 |
| **Teacher app** | `TichaPortal/` — Vite React frontend :5173, Express BFF :4000, proxies to Academic, Timetable, etc. |
| **Module pattern** | TypeScript + Express + Prisma + PostgreSQL per service (e.g. `SampleModule`, `Academic`, `ShuleKitMIS`) |
| **Superadmin integrations** | Direct API clients from IAM frontend (e.g. `shulekit-admin-api.ts`) with Bearer token |
| **TichaAI** | Generic chat via `/api/tools/ticha-ai/*` — separate from curriculum-grounded plans |
| **Lesson plans today** | Timetable field `nextLessonPlan` text only — no REB template or curriculum DB |

No second IAM or duplicate auth was introduced. Curriculum Intelligence is one new PostgreSQL-backed service.

## REB e-learning alignment

[REB eLearning](https://elearning.reb.rw/) hosts official **Primary → Advanced** course categories, **Syllabi and Content Distribution**, and downloadable **Teacher’s Guides (TG)** / **Pupils’ Books (PB)** (e.g. [P1 revised TG/PB 2025 folder](https://elearning.reb.rw/mod/folder/view.php?id=14416)).  
Superadmin upload metadata defaults `sourceUrl` to the e-learning portal; confirm **copyright and redistribution** before production use.

## Milestone 1 delivered

1. **`CurriculumIntelligence/Backend`** — Prisma schema, platform + teacher APIs, PDF upload, PyMuPDF worker hook, P5 Mathematics **Unit 1** seed (published).
2. **Superadmin UI** — `/super-admin/curriculum` book library + book review/publish.
3. **TichaPortal** — Teaching → **Lesson Plans** wizard, REB-structured viewer with **source / AI / missing** provenance badges.
4. **BFF proxy** — `TichaPortal/backend` → `CURRICULUM_API_URL`.

## Run locally

```powershell
cd ShulePlus\CurriculumIntelligence\Backend
copy .env.example .env
# Edit DATABASE_URL (dedicated DB recommended)

npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

```powershell
# IAM frontend — add to .env.local:
# NEXT_PUBLIC_CURRICULUM_API_URL=http://localhost:3094/api

# TichaPortal backend .env:
# CURRICULUM_API_URL=http://localhost:3094/api
```

Pilot flow: Superadmin sees seeded **P5 Mathematics TG** → Teacher selects **Unit 1 → Place values…** → Generate 40 min plan.

## Next phases (from roadmap)

- Phase 2: Full template editor, section regenerate, PDF/DOCX export, revision UI
- Phase 3: LLM structured JSON + retrieval; quality gate suite
- Phase 4: DOS approval, calendar, school permissions via IAM modules
- Phase 5: Scheme of work, multilingual, offline cache, analytics
