# Director Console — local ports

| Layer | Port | URL |
| --- | --- | --- |
| Frontend (Next.js) | **3081** | http://localhost:3081 |
| Backend API (Express) | **3080** | http://localhost:3080/api/director |
| Backend health | **3080** | http://localhost:3080/health |
| IAM API (upstream) | **3001** | http://localhost:3001/api/v1 |

Ports **3080/3081** are reserved for this module in the root
[`docs/PORTS.md`](../docs/PORTS.md).

## Start

```powershell
# Backend
cd SchoolRepresentative/Backend
npm.cmd install
npx.cmd prisma generate
npx.cmd prisma db push
npm.cmd run db:seed
npm.cmd run dev          # :3080

# Frontend (new terminal)
cd SchoolRepresentative/Frontend
npm.cmd install
npm.cmd run dev          # :3081
```

Open `http://localhost:3081/director/overview`.

## Entry with an IAM token

The platform opens the module with a token query parameter:

```
http://localhost:3081/director/overview?token=<IAM_ACCESS_TOKEN>
```

The token is captured once and stored in `localStorage` under
`DirectorConsole_module_token`. Without a token, the backend falls back to
seeded demo data when `ALLOW_DEMO=true` (responses carry `meta.mode: "demo"`
and the UI shows a demo banner).
