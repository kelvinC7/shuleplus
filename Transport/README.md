# Smart School Transport

Ports: **Backend 3064** · **Frontend 3065** · slug `transport`

RFID boarding/exit, live trip control, GPS, parent alerts, safety, fleet, fees, fuel and maintenance.

```bash
cd Transport/Backend
cp .env.example .env
# Set JWT_ACCESS_SECRET to the same value as Authentication/Backend/.env
npm install
npx prisma generate
npm run dev                   # :3064 — creates transport_db and schema on first run

cd ../Frontend
cp .env.example .env.local
npm install
npm run dev                   # :3065
```

Open from Organization Admin, or `http://localhost:3065/dashboard?token=...`

Demo RFID: `RFID-004821` (Jean Claude) · Device: `BUS-014-RFID`
