# RFID Device Module (ShulePlus)

School RFID reader dashboard for gate attendance, device health, card events, and remote commands.

## Ports

| Service  | Port |
|----------|------|
| Backend  | 3062 |
| Frontend | 3063 |

## Setup

```powershell
cd Device/Backend
npm run setup:env   # copies .env.example → .env
npm install
npx prisma db push --schema prisma/schema.prisma
npm run dev

cd ../Frontend
copy .env.example .env.local
npm install
npm run dev
```

## Platform registration

1. Super Admin → **Module Catalog** — slug: `device`
2. frontendUrl: `http://localhost:3063`
3. backendUrl: `http://localhost:3062/api`
4. Assign module to a school org → tenant auto-seeds demo RFID devices

## Super Admin

Authentication Frontend → **RFID Network** (`/super-admin/rfid-network`)

Requires Device backend running and super_admin JWT.

## School navigation

- Dashboard — KPIs, device table, live attendance, timeline
- Devices — register, online/offline filters, device detail with health
- Live Attendance — animated counter, by-gate breakdown
- Card Events — all scans with sync status
- Unknown Cards — identify / block / ignore
- Commands — remote command center with bulk actions
- Configuration — Wi-Fi, time, profiles, firmware
- Logs — filtered device logs
- Alerts — device notifications

## Demo data

On first tenant provision, seeds RFID-001..004 with card events, alerts, and unknown cards matching the product spec.
