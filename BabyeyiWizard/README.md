# Babyeyi Wizard Module

Modern school circular manager for ShulePlus — frontend + backend microservice following the HR module architecture.

## Stack

| Layer | Tech | Port |
|-------|------|------|
| Frontend | Next.js 15, Tailwind 4, Axios | `3013` |
| Backend | Express 5, Prisma, PostgreSQL | `3012` |

## Quick start

```bash
# Backend
cd BabyeyiWizard/Backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev

# Frontend
cd BabyeyiWizard/Frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3013` with a valid IAM token (`?token=...`) and `babyeyi` module license.

## Features

- **Dashboard** — KPIs, timeline, charts, quick actions, school profile
- **Create Circular** — 9-step wizard with NESA checker, AI assistant sidebar, auto-save
- **Circular List** — Modern cards, filters, bulk actions, hover actions
- **Circular Details** — Tabbed dashboard (overview, payments, timeline, approvals…)
- **Approval Center** — Multi-stage workflow (Director → Accountant → District → NESA)
- **Analytics** — Charts, heat map, top downloaded/shared
- **School Assets** — Logo, stamp, signature upload
- **Templates** — System templates by school type
- **Parent Preview** — Desktop/tablet/mobile/PDF preview
- **QR Verification** — Public verify page at `/verify/:docId`
- **Notifications, Versions, Collaboration, Settings**

## API

Base: `http://localhost:3012/api`

See [Docs/API_REFERENCE.md](./Docs/API_REFERENCE.md) for full endpoint documentation.

## IAM Integration

- `MODULE_SLUG=babyeyi`
- Provision tenant: `POST /api/tenant/create` with `x-service-key`
- JWT must include `modules: ["babyeyi"]`
