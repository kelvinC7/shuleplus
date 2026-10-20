# School Fees Portal (ShulePlus)

Student fee collection module — Next.js frontend + Express/Prisma backend, matching the HR module architecture and design system.

## Ports

| Layer | Port | URL |
|-------|------|-----|
| Frontend | **3015** | http://localhost:3015 |
| Backend | **3014** | http://localhost:3014/api |

Module slug (IAM): `school-fees`

## Features

1. Smart Fee Structure Management  
2. Intelligent Student Billing  
3. Modern Payment Management  
4. Smart Installment Management  
5. Outstanding Balance Management  
6. Scholarship & Sponsorship Management  
7. Smart Receipt Management (QR)  
8. Notification Center  
9. Finance Dashboard  
10. Advanced Fee Analytics  
11. AI Financial Assistant  
12. Audit & Security  
13. Modern Financial Reports  

## Setup

### Backend

```bash
cd SchoolFeesPortal/Backend
cp .env.example .env
# Set DATABASE_URL and JWT_ACCESS_SECRET (same as IAM)
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

### Frontend

```bash
cd SchoolFeesPortal/Frontend
cp .env.example .env
npm install
npm run dev
```

### Register module in IAM

With Authentication backend and School Fees backend running:

```bash
cd Authentication/Backend
npx tsx prisma/seed-school-fees.ts
```

Then open the module from Organization Admin (or visit http://localhost:3015/dashboard with a valid IAM token).

## Design

Same tokens and UI patterns as HR:

- Navy `#000435` / Primary `#FCB038` / Montserrat  
- Sidebar sections, navy KPI cards, `hr-card`, `input`, `btn-primary`  
- Data tables, multi-step wizards, chart cards  
