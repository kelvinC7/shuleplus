# RFID Attendance Module

Ports: **Backend 3024** · **Frontend 3025** · slug `attendance`

## Features

- Smart Card Management (register, activate/block/lost, bulk, replacements, history, QR payload)
- Entry / Exit tap desks with parent notifications
- RFID Devices (register, online/offline, test, battery/signal)
- Attendance settings (late rules, channels, school times)
- Parents, notifications, permissions workflow
- Live monitor, student movement, reports, security alerts & audit logs

## Run

```bash
# DB
createdb attendance_rfid_db   # or create in pgAdmin

cd Attendance/Backend
cp .env.example .env
# REQUIRED: set JWT_ACCESS_SECRET to the same value as Authentication/Backend/.env
npm install
npx prisma generate
npx prisma db push
npm run dev                   # :3024

cd ../Frontend
cp .env.example .env.local
npm install
npm run dev                   # :3025

# IAM (with Attendance backend running)
cd Authentication/Backend
npm run seed:attendance
```

Open from Organization Admin, or `http://localhost:3025/dashboard?token=...`

Demo login (if seeded): `admin@demoschool.com` / `DemoAdmin@2026`  
Demo cards: `CARD-10001`, `CARD-10002`, `CARD-10003`  
Demo devices: `RFID-001` (entry), `RFID-002` (exit)
