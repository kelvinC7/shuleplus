# ShuleTrip

School trip registration, safety, authorization, and government monitoring — a Shule+ module by EDUPOTO.

| Layer | Folder | Local port |
|-------|--------|------------|
| Backend | `Backend/` | **3076** |
| Frontend | `Frontend_react/` | **3077** |
| Guide / prototype | `GuideDocs/shuletrip_3.html` | — |

**IAM slug:** `shule-trip`

## Quick start

```bash
# Backend
cd Backend
cp .env.example .env
npm install
npm run prisma:migrate
npm run dev

# Frontend
cd Frontend_react
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:3077` — choose **School portal** (IAM SSO + module license) or **Government console** (IAM + official roles).

Register the module in IAM Module Catalog and assign `shule-trip` to organizations before school launch.

See [Docs/IMPLEMENTATION_PLAN.md](./Docs/IMPLEMENTATION_PLAN.md) for architecture, data model, and rollout stages.

## Production (`shuleplus.rw`)

| | Host | PM2 port | PM2 name |
|--|------|----------|----------|
| App | `https://shuletrip.shuleplus.rw` | (Nginx static) | — |
| API | `https://shuletrip-api.shuleplus.rw` | **4033** | `shule-trip-api` |

Slug: `shule-trip` · DB: `shule_trip_db`

Full server steps: [docs/DEPLOY.md](../docs/DEPLOY.md#shuletrip-shuletripshuleplusrw).
