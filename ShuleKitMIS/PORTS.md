# ShuleKitMIS — ports

## Local development

| Service | Port | URL |
|---------|------|-----|
| Frontend | **3039** | http://localhost:3039 |
| Backend  | **3038** | http://localhost:3038 |

Slug: `shulekit-mis`

## Production (shuleplus.rw)

| Service | Port | Host |
|---------|------|------|
| Frontend (Vite static via Nginx) | — | https://materials.shuleplus.rw |
| Backend (PM2 `materials-api`) | **4021** | https://materials-api.shuleplus.rw |

Landing env:

- `NEXT_PUBLIC_SHULEKIT_URL=https://materials.shuleplus.rw`
- `NEXT_PUBLIC_SHULEKIT_API_URL=https://materials-api.shuleplus.rw/api`

See the full platform map: [docs/PORTS.md](../docs/PORTS.md)

```bash
# Backend
cd ShuleKitMIS/Backend
# ensure DB exists, then:
npx prisma migrate dev
npm run dev

# Frontend
cd ShuleKitMIS/Frontend && npm run dev
```

### Production redeploy (server)

```bash
cd /root/apps/shuleplus/ShulePlus
bash scripts/generate-nginx-modules.sh
bash scripts/redeploy-module.sh true ShuleKitMIS materials-api materials-web
bash scripts/redeploy-module.sh true Authentication auth-api auth-web
node scripts/apply-module-subdomains.mjs
pm2 save
```
