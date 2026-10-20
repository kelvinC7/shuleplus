# Sector MIS — SEI Attendance Intelligence

Shule+ module for Sector Education Inspectors (SEI): real-time sector attendance monitoring, intelligence, verification, and follow-up.

| Service  | Port | Folder |
|----------|------|--------|
| Frontend | 3071 | `Frontend_react/` |
| Backend  | 3070 | `Backend/` |

## Local setup

```bash
cd SectorMIS/Backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev

cd ../Frontend_react
npm install
npm run dev
```

Register the module in IAM (`sector-mis` slug), provision the tenant, and open the app from the organization dashboard with a licensed JWT.
