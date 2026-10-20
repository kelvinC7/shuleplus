# NESA Dashboard

National Education Standards Authority console for ShulePlus.

| Layer | Port | Path |
|-------|------|------|
| Frontend | **3015** | `NesaDashboard/Frontend` |
| Backend | **3014** | `NesaDashboard/Backend` |
| Module slug | `nesa` | JWT `modules` claim |

## Design system

- **Navy** `#000435` — structure, text, sidebar, primary buttons  
- **Amber** `#FCB038` — active / interactive / data highlight only  
- Cards: `rounded-2xl border border-navy/10 bg-white p-5` (no shadows)  
- Inputs: reuse `inputClass` from `components/fee-policy/wizard-ui.tsx`  
- Sidebar + routes: `config/nesa-nav.tsx` is the single source of truth  

## Start

```bash
# Backend
cd NesaDashboard/Backend
cp .env.example .env
npm install
npm run dev

# Frontend
cd NesaDashboard/Frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3015` → redirects to `/nesa/dashboard`.

## Modules

1. **Dashboard** — national KPIs, map, activity, AI insights, quick actions  
2. **Schools** — list, details, profile, circulars, payments, analytics  
3. **Circulars** — dashboard, list, details, approval  
4. **Fee Policy** — dashboard + **6-step create wizard**, versions, comparison, publish, archived, compliance, violations  
5. **Approvals** — shared `ApprovalQueueTable` by status  
6–8. **Provinces / Districts / Sectors** — territorial ops  
9. **Academic Years** — years, terms, holidays, exam & school calendars  

Mock data lives at the top of each page (swap for API hooks later without rewriting JSX).

### Backend API

See section below for `GET /api/dashboard`, `/api/schools`, `/api/circulars`, `/api/approvals`, geography, academic years, fee policies, and `POST /api/tenant/create`.

## Direct login (Nesa Admin)

1. Ensure catalog has slug `nesa` (run `npx tsx prisma/seed-nesa.ts` in Authentication Backend if needed).
2. Super Admin → assign & provision `nesa` to the organization.
3. Super Admin → **Users & Access** → create user as **Organization Member**, assign only **nesa** (Module Head optional).
4. That user logs in → IAM redirects straight to `http://localhost:3015/nesa/dashboard?token=…` (no Organization Admin step).

Do **not** use Organization Admin role for a single-module specialist — org admins land on the org launcher. 
