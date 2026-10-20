# Print Card MIS

Standalone ShulePlus module for previewing and exporting student and staff **Smart Cards** (ID cards).

| | |
|---|---|
| **Domain** | `https://printcard.shuleplus.rw` |
| **API** | `https://printcard-api.shuleplus.rw` |
| **IAM slug** | `print-card` |
| **Local FE** | http://localhost:3092 |
| **Local BE** | http://localhost:3093/api |
| **Prod PM2** | `print-card-web` / `print-card-api` |

## Features

- Same Smart Card design as Super Admin (canvas renderer, PNG/JPEG/PDF/ZIP export)
- Super Admin: browse all schools, filter by location
- Licensed org users: print cards for their school only
- Education level labels derived from Student Management class data

## Setup (local)

```bash
# Database
# Ensure print_card_module_db exists (see scripts/init-module-databases.sql)

cd PrintCardMIS/Backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev

cd ../Frontend
cp .env.example .env
npm install
npm run dev
```

Register the module in IAM:

```bash
node scripts/apply-module-subdomains.mjs
```

Then in **Super Admin → Module Catalog**, assign **Print Card** to organizations and grant users access under **Users & Access**.

Super Admins open the module from **Smart Access & IDs → Smart Cards** (redirects to this app) or directly at `printcard.shuleplus.rw`.

## Production deploy

```bash
bash scripts/redeploy-module.sh true PrintCardMIS print-card-api print-card-web
bash scripts/generate-nginx-modules.sh
```
